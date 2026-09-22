import {
	default_column_width_for_property,
	fallback_column_width_px,
} from '@/common-vue/config/column_preference_defaults'
import app_generals from '@/mixins/generals'
import generals from '@/common-vue/mixins/generals'
import { add_article_dynamic_columns } from '@/common-vue/helpers/article_dynamic_table_columns'
import { article_dynamic_dependencies_ready } from '@/common-vue/helpers/dynamic_column_dependencies_status'

/** Relaciones mal declaradas ya avisadas por consola, por `<modelo>.<key>` (ver get_relation_column_groups). */
let relaciones_avisadas = {}

/**
 * Contexto mínimo para reutilizar métodos de generals fuera de componentes Vue.
 *
 * @param {Object} store Instancia Vuex.
 * @returns {Object}
 */
function build_generals_context(store_wrapper) {
	let root_state = get_root_state(store_wrapper)
	let auth_user = root_state.auth ? root_state.auth.user : null
	let is_owner = !!(auth_user && !auth_user.owner_id)
	let owner = null

	if (auth_user) {
		owner = is_owner ? auth_user : auth_user.owner
	}

	let context = {
		$store: { state: root_state },
		get user() {
			return auth_user
		},
		get authenticated() {
			return !!(root_state.auth && root_state.auth.authenticated)
		},
		get is_owner() {
			return is_owner
		},
		get owner() {
			return owner
		},
		get owner_extencions() {
			if (!auth_user) {
				return []
			}
			if (is_owner) {
				return auth_user.extencions || []
			}
			return auth_user.owner_extencions || []
		},
		get is_admin() {
			return !!(auth_user && (is_owner || auth_user.admin_access))
		},
	}

	context.can = function (permission_slug) {
		if (!context.authenticated) {
			return false
		}
		if (is_owner || (auth_user && auth_user.admin_access)) {
			return true
		}
		if (context.is_admin) {
			return true
		}
		let has_permission = false
		;(auth_user && auth_user.permissions ? auth_user.permissions : []).forEach(function (permission) {
			if (permission.slug == permission_slug) {
				has_permission = true
			}
		})
		return has_permission
	}

	context.ownerUsesListasDePrecio = function () {
		return app_generals.methods.ownerUsesListasDePrecio.call(context)
	}

	context.hasExtencion = function (slug, check_has_one_extencion_permission) {
		return app_generals.methods.hasExtencion.call(context, slug, check_has_one_extencion_permission)
	}

	context.check_has_not_extencions = function (prop) {
		return generals.methods.check_has_not_extencions.call(context, prop)
	}

	context.check_extencions = function (props) {
		return generals.methods.check_extencions.call(context, props)
	}

	context.getLabel = function (prop) {
		return generals.methods.getLabel.call(context, prop)
	}

	context.capitalize = function (text) {
		return generals.methods.capitalize.call(context, text)
	}

	context.propText = function (prop, capitalize, from_table) {
		return generals.methods.propText.call(context, prop, capitalize, from_table)
	}

	return context
}

/**
 * Commit en módulo raíz del store (p. ej. article/set_props_to_show).
 *
 * @param {Object} store_context { rootState, commit } o instancia Vuex ($store).
 * @param {string} model_name
 * @param {string} mutation
 * @param {*}      value
 * @return {void}
 */
function commit_to_module(store_context, model_name, mutation, value) {
	if (!store_context.commit) {
		return
	}

	if (store_context.rootState) {
		store_context.commit(model_name + '/' + mutation, value, { root: true })
		return
	}

	store_context.commit(model_name + '/' + mutation, value)
}

/**
 * Estado raíz del store según el contexto recibido.
 *
 * @param {Object} store_context
 * @returns {Object}
 */
function get_root_state(store_context) {
	if (store_context.rootState) {
		return store_context.rootState
	}

	return store_context.state
}

/**
 * Ámbito de tabla que declara un preference_type: 'por_entregar' para 'table_por_entregar'.
 *
 * Devuelve null para 'table' (la tabla principal del módulo, sin ámbito) y para cualquier tipo
 * que no sea de esta familia (search, global_search, btm_*, form_has_many): esos siguen por
 * el camino de siempre. El guion bajo es obligatorio, igual que en el backend
 * (TableColumnPreferenceController::assert_preference_type): 'tablex' no es un ámbito.
 *
 * @param {string} preference_type
 * @returns {string|null}
 */
export function ambito_from_preference_type(preference_type) {
	let match = /^table_([a-z0-9_]+)$/.exec(String(preference_type || ''))
	return match ? match[1] : null
}

/**
 * Indica si el módulo soporta props_to_show en su store.
 *
 * Con ámbito, lo que se mira es `props_to_show_por_ambito`, que solo tienen los stores que
 * salen de __base_store: los escritos a mano (recipe, pending, road_map, papelera/*...) no lo
 * tienen, y ahí no se aplica nada -- la vista se queda con su fallback de columnas fijas.
 *
 * @param {Object} store_context
 * @param {string} model_name
 * @param {string|null} ambito
 * @returns {boolean}
 */
export function module_supports_props_to_show(store_context, model_name, ambito = null) {
	let root_state = get_root_state(store_context)

	if (!root_state[model_name]) {
		return false
	}

	if (ambito) {
		let por_ambito = root_state[model_name].props_to_show_por_ambito
		return !!(por_ambito && typeof por_ambito == 'object')
	}

	return Array.isArray(root_state[model_name].props_to_show)
}

/**
 * Indica si el módulo ya tiene columnas aplicadas en sesión (para el ámbito, si se pasa uno).
 *
 * @param {Object} store_context
 * @param {string} model_name
 * @param {string|null} ambito
 * @returns {boolean}
 */
export function module_already_has_column_preferences(store_context, model_name, ambito = null) {
	if (!module_supports_props_to_show(store_context, model_name, ambito)) {
		return false
	}

	let module_state = get_root_state(store_context)[model_name]

	if (ambito) {
		let props = module_state.props_to_show_por_ambito[ambito]
		return Array.isArray(props) && props.length > 0
	}

	return module_state.props_to_show.length > 0
}

/**
 * Indica si el cache global de table_column_preference ya termino de descargarse.
 * Mientras sea false, la ausencia de una preferencia en el cache NO significa que el
 * usuario no tenga una guardada: significa que todavia no la bajamos.
 *
 * @param {Object} store_context
 * @returns {boolean}
 */
export function table_column_preference_cache_is_loaded(store_context) {
	let root_state = get_root_state(store_context)
	let preferences_store = root_state.table_column_preference

	return !!(preferences_store && preferences_store.loaded)
}

/**
 * Lee columnas guardadas del cache global table_column_preference.
 *
 * @param {Object} store
 * @param {string} model_name
 * @param {string} preference_type
 * @returns {Array|null}
 */
export function table_column_preference_columns_from_store(store_context, model_name, preference_type) {
	let vuex_store = store_context.rootState
		? { state: store_context.rootState }
		: store_context

	return generals.methods.tableColumnPreferenceColumnsFromStore.call({ $store: vuex_store }, model_name, preference_type)
}

/**
 * Id del modal "Columnas a mostrar" de una relación belongs_to_many.
 *
 * Vive acá y no en el componente porque hay dos lugares que lo necesitan: BelongsToManyTable, que
 * monta el modal, y ModelForm, que dibuja el botón que lo abre al lado del buscador de la relación.
 *
 * @param {string} parent_model_name Modelo padre (ej: 'provider_order').
 * @param {string} prop_key Clave de la relación (ej: 'articles').
 * @returns {string}
 */
export function belongs_to_many_columns_modal_id(parent_model_name, prop_key) {
	return `btm-cols-${parent_model_name}-${prop_key}`
}

/**
 * preference_type de la configuracion de columnas de una relación belongs_to_many.
 *
 * Vive acá por el mismo motivo que belongs_to_many_columns_modal_id: lo arma BelongsToManyTable
 * para guardar/leer la preferencia, y también lo necesita ModelForm para resolver el primer campo
 * del pivote a enfocar en el orden que el usuario configuró (ver setTableFocus).
 *
 * @param {string} parent_model_name Modelo padre (ej: 'provider_order').
 * @param {string} prop_key Clave de la relación (ej: 'articles').
 * @returns {string}
 */
export function belongs_to_many_preference_type(parent_model_name, prop_key) {
	return `btm_${parent_model_name}_${prop_key}`
}

/**
 * Id del modal "Propiedades para mostrar" de un modelo, con o sin ambito de tabla.
 *
 * Lo arman dos componentes distintos --props-to-show/Index.vue para el boton que lo abre y
 * props-to-show/Modal.vue para el modal-- y si divergieran el boton dejaria de abrir el modal
 * sin ningun error. Con ambito lleva sufijo porque el listado de Ventas y Por Entregar montan
 * cada uno su modal sobre el mismo modelo.
 *
 * @param {string} model_name
 * @param {string|null} preference_scope
 * @returns {string}
 */
export function props_to_show_modal_id(model_name, preference_scope) {
	return 'props-to-show-' + model_name + (preference_scope ? '-' + preference_scope : '')
}

/**
 * Propiedades base del modelo aptas para preferencias de tabla.
 *
 * @param {Object} store
 * @param {string} model_name
 * @returns {Array}
 */
export function get_all_properties_for_model(store_context, model_name) {
	let context = build_generals_context(
		store_context.rootState ? { state: store_context.rootState } : store_context
	)
	let props = require('@/models/' + model_name).default.properties

	props = props.filter(prop => {
		return typeof prop.group_title == 'undefined'
			&& typeof prop.no_mostrar_nunca == 'undefined'
			&& typeof prop.key != 'undefined'
			&& prop.key !== null
			&& prop.key !== ''
	})

	props = context.check_extencions(props)

	if (model_name == 'article') {
		let root_state = get_root_state(store_context)
		props = add_article_dynamic_columns(props, context, {
			price_types: root_state.price_type ? root_state.price_type.models : [],
			addresses: root_state.address ? root_state.address.models : [],
			payment_method_discounts: root_state.current_acount_payment_method_discount
				? root_state.current_acount_payment_method_discount.models
				: [],
		})
	}

	// Genéricos, SOLO si el modelo no declaró ya una prop con esa key. La mayoría de los modelos
	// no listan sus timestamps de Eloquent como prop propia, así que este agregado no colisiona
	// nunca. `current_acount` sí declara su propio `created_at` ("Fecha", la fecha del
	// movimiento, no el timestamp): sin la guarda, el push duplicaba la key y el mapa por key de
	// normalize_column_preference_rows/build_props_to_show_from_rows se quedaba con el texto
	// genérico, pisando el de la prop real (medido armando el modal de columnas de
	// current_acount: la fila "Fecha" pasaba a leerse "Creado" y aparecía una segunda fila con la
	// misma key). El mismo choque ya existía, sin que nadie lo hubiera notado, en
	// `movimiento_caja` ("Fecha"), `apertura_caja` ("Fecha apertura") y `expense` ("Fecha"): los
	// tres declaran su propio `created_at` Y ya tienen el botón de columnas activo desde antes de
	// esta misión. `road_map` NO es un caso real: su `created_at`/"Creada" vive anidado adentro
	// de `properties[].belongs_to_many.props_to_show` (la tabla de ventas embebida), no en su
	// array de properties de nivel superior, así que get_all_properties_for_model nunca lo lee.
	if (!props.some(prop => prop.key == 'created_at')) {
		props.push({
			key: 'created_at',
			text: 'Creado',
			type: 'date',
			is_date: true,
		})
	}
	if (!props.some(prop => prop.key == 'updated_at')) {
		props.push({
			key: 'updated_at',
			text: 'Actualizado',
			type: 'date',
			is_date: true,
		})
	}

	return props.filter(prop => prop.type != 'button')
}

/**
 * Relaciones del modelo cuyas propiedades se ofrecen como columnas del listado (belongsTo o
 * hasOne), con las props del modelo relacionado que pueden ser una columna.
 *
 * Solo entran las props que el modelo declara con `related_model_columns: true`: no se detectan
 * solas por terminar en `_id`, porque hay modelos relacionados con campos que jamas tienen que
 * poder elegirse como columna (employee.visible_password, "Contraseña"). Cada relacion la
 * habilita alguien a proposito, mirando que trae el modelo del otro lado.
 *
 * Como se llama la relacion: `store` de la prop si lo tiene; si no, la key sin `_id`; y si la
 * key no termina en `_id` es un hasOne, que se llama como la key. La foreign key solo existe
 * en el caso belongsTo (la key termina en `_id`); en un hasOne es null y la celda solo puede
 * leerse de la relacion embebida en la respuesta.
 *
 * El flag se llama `related_model_columns` y no `relation_columns` a proposito: `type:
 * 'relation_columns'` ya existe en el repo y es OTRO mecanismo (columnas dinamicas de un
 * pivote, ver deposit_movement.js y display/table/Index.vue), y `is_relation_column` es la
 * prop que ese mecanismo emite. Lo de aca emite `is_relation_prop`.
 *
 * La prop padre pasa por los mismos gates que cualquier columna (extension y admin): si el
 * dueño no tiene la extension que habilita `client_id`, tampoco se le ofrece el bloque.
 *
 * @param {Object} store_context
 * @param {string} model_name
 * @returns {Array<{relation: string, relation_model_name: string, foreign_key: string|null, label: string, children: Array}>}
 */
export function get_relation_column_groups(store_context, model_name) {
	let context = build_generals_context(
		store_context.rootState ? { state: store_context.rootState } : store_context
	)
	let parent_props = context.check_extencions(require('@/models/' + model_name).default.properties || [])
	let groups = []

	parent_props.forEach(prop => {
		if (!prop || !prop.related_model_columns || !prop.key) {
			return
		}
		if (prop.if_is_admin && !context.is_admin) {
			return
		}

		let es_belongs_to = prop.key.length > 3 && prop.key.substring(prop.key.length - 3) == '_id'
		let relation
		if (prop.store) {
			relation = prop.store
		} else if (es_belongs_to) {
			relation = prop.key.substring(0, prop.key.length - 3)
		} else {
			relation = prop.key
		}

		// require() de un modelo que no existe tira: la relacion se saltea avisando en consola,
		// que es mejor que tumbar el modal entero por una declaracion equivocada en un modelo.
		let related_model
		try {
			related_model = require('@/models/' + relation).default
		} catch (e) {
			// Una sola vez por relacion: esta funcion corre en cada apertura del modal y en cada
			// bootstrap, y un modelo mal declarado no tiene que llenar la consola.
			if (!relaciones_avisadas[model_name + '.' + prop.key]) {
				relaciones_avisadas[model_name + '.' + prop.key] = true
				console.warn('related_model_columns: no existe el modelo "' + relation + '" declarado en ' + model_name + '.' + prop.key)
			}
			return
		}

		let children = (related_model.properties || []).filter(related_prop => {
			return related_prop
				&& typeof related_prop.group_title == 'undefined'
				&& typeof related_prop.no_mostrar_nunca == 'undefined'
				&& typeof related_prop.not_show_on_table == 'undefined'
				&& typeof related_prop.belongs_to_many == 'undefined'
				&& typeof related_prop.has_many == 'undefined'
				&& typeof related_prop.function == 'undefined'
				&& typeof related_prop.button == 'undefined'
				&& typeof related_prop.show_in_input_if == 'undefined'
				&& typeof related_prop.key != 'undefined'
				&& related_prop.key !== null
				&& related_prop.key !== ''
				&& ['button', 'display', 'image', 'images', 'password'].indexOf(related_prop.type) === -1
		})

		groups.push({
			relation: relation,
			relation_model_name: relation,
			foreign_key: es_belongs_to ? prop.key : null,
			label: related_model.singular_model_name_spanish || context.getLabel(prop),
			// La prop del modelo relacionado va entera: la celda se renderiza con ella (ver
			// propertyText en mixins/generals.js), asi el formato es el mismo que en su ficha.
			children: context.check_extencions(children),
		})
	})

	return groups
}

/**
 * Fila de grupo del modal (una relacion plegable) a partir de un grupo de
 * get_relation_column_groups. `key`/`row_id` con el prefijo `rel:` son solo para la interfaz
 * (v-for, arrastre) y nunca se persisten: lo que viaja son las hijas, planas.
 *
 * @param {Object} context Contexto de build_generals_context (para getLabel).
 * @param {Object} group
 * @param {number} order
 * @returns {Object}
 */
function relation_group_row_from_group(context, group, order) {
	return {
		key: 'rel:' + group.relation,
		row_id: 'rel:' + group.relation,
		is_relation_group: true,
		relation: group.relation,
		relation_model_name: group.relation_model_name,
		foreign_key: group.foreign_key,
		label: group.label,
		expanded: false,
		order: order,
		children: group.children.map(prop => ({
			key: group.relation + '.' + prop.key,
			relation: group.relation,
			relation_prop_key: prop.key,
			label: context.getLabel(prop),
			visible: false,
			width: default_column_width_for_property(prop),
			wrap_content: !!prop.table_wrap_content,
		})),
	}
}

/**
 * Keys que arrancan visibles en un ambito de tabla, si el modelo lo declara
 * (`table_scopes[ambito].default_visible_keys`). null si no hay ambito o el modelo no lo
 * declara: en ese caso el ambito usa los mismos defaults que `table`.
 *
 * Solo admite keys de props PROPIAS del modelo: una hija de relacion (`client.name`) ahi se
 * ignora en silencio, porque los bloques se agregan despues de resolver estas keys y siempre
 * arrancan destildados.
 *
 * @param {string} model_name
 * @param {string|null} ambito
 * @returns {Array<string>|null}
 */
function scoped_default_visible_keys(model_name, ambito) {
	if (!ambito) {
		return null
	}

	let table_scopes = require('@/models/' + model_name).default.table_scopes

	if (!table_scopes || !table_scopes[ambito] || !Array.isArray(table_scopes[ambito].default_visible_keys)) {
		return null
	}

	return table_scopes[ambito].default_visible_keys
}

/**
 * Filas por defecto según el modelo (sin preferencia guardada).
 *
 * Primero las propias del modelo; con un ambito declarado en el modelo, las keys de
 * `default_visible_keys` van primero y visibles (en ese orden) y el resto detras y
 * destildado, salvo las bloqueadas. Al final, una fila de grupo por relacion habilitada con
 * `related_model_columns`, plegada y con todas las hijas destildadas.
 *
 * @param {Object} store
 * @param {string} model_name
 * @param {string} preference_type 'table' o 'table_<ambito>'.
 * @returns {Array}
 */
export function get_default_rows_for_model(store_context, model_name, preference_type = 'table') {
	let context = build_generals_context(
		store_context.rootState ? { state: store_context.rootState } : store_context
	)
	let all_properties = get_all_properties_for_model(store_context, model_name)

	let rows = all_properties.map((prop, index) => ({
		key: prop.key,
		label: context.getLabel(prop),
		visible: prop.locked_visible ? true : !prop.not_show,
		order: index,
		width: default_column_width_for_property(prop),
		wrap_content: !!prop.table_wrap_content,
		/* Columnas bloqueadas (ej. Cantidad en vender): visibilidad no editable, posicion si. */
		locked: !!prop.locked_visible,
	}))

	let default_visible_keys = scoped_default_visible_keys(model_name, ambito_from_preference_type(preference_type))

	if (default_visible_keys) {
		let primero = []
		default_visible_keys.forEach(key => {
			let row = rows.find(item => item.key == key)
			if (row) {
				primero.push({ ...row, visible: true })
			}
		})
		let resto = rows
			.filter(item => default_visible_keys.indexOf(item.key) === -1)
			.map(item => ({ ...item, visible: !!item.locked }))

		rows = primero.concat(resto).map((item, index) => ({ ...item, order: index }))
	}

	get_relation_column_groups(store_context, model_name).forEach(group => {
		rows.push(relation_group_row_from_group(context, group, rows.length))
	})

	return rows
}

/**
 * `order` de una fila guardada como numero, 0 si no viene o no es numerico.
 *
 * @param {Object} item
 * @returns {number}
 */
function orden_numerico(item) {
	let order = Number(item && item.order)
	return isNaN(order) ? 0 : order
}

/**
 * Separa filas de preferencia (guardadas o de la interfaz) en propias del modelo y en hijas de
 * relacion agrupadas por relacion.
 *
 * Una hija se reconoce por el punto de su key (`client.description`) -- pero solo si la key no es
 * de una prop propia y el prefijo es una relacion conocida: lo demas se descarta, como siempre
 * se descarto una key guardada que el modelo ya no tiene. Una fila de grupo de la interfaz
 * (`is_relation_group`) se abre en sus hijas, todas con el `order` del bloque, asi la misma
 * funcion sirve para las dos formas en que pueden llegar las filas.
 *
 * @param {Array}  rows
 * @param {Object} own_keys            Mapa key -> algo truthy, para las props propias.
 * @param {Object} groups_by_relation  Mapa relation -> grupo/fila de grupo por defecto.
 * @returns {{propias: Array, hijas_por_relacion: Object}}
 */
function separar_filas_de_preferencia(rows, own_keys, groups_by_relation) {
	let propias = []
	let hijas_por_relacion = {}

	function agregar_hija(item) {
		let punto = item.key.indexOf('.')
		if (punto === -1) {
			return
		}
		let relation = item.key.substring(0, punto)
		if (!groups_by_relation[relation]) {
			return
		}
		if (!hijas_por_relacion[relation]) {
			hijas_por_relacion[relation] = []
		}
		hijas_por_relacion[relation].push(item)
	}

	let lista = rows || []

	lista.forEach(item => {
		if (!item) {
			return
		}
		if (item.is_relation_group && Array.isArray(item.children)) {
			item.children.forEach(child => {
				if (child && typeof child.key == 'string') {
					agregar_hija({ ...child, order: item.order })
				}
			})
			return
		}
		if (typeof item.key != 'string' || item.key === '') {
			return
		}
		if (own_keys[item.key]) {
			propias.push(item)
			return
		}
		agregar_hija(item)
	})

	return { propias, hijas_por_relacion }
}

/**
 * Bloque de relacion a partir de sus hijas guardadas: el `order` del bloque es el menor de sus
 * hijas, y cada hija toma visible/ancho/salto de linea de lo guardado. El orden interno y las
 * etiquetas salen SIEMPRE de los defaults (o sea, del modelo relacionado): una hija guardada que
 * el modelo ya no tiene se descarta, y una nueva del modelo entra destildada.
 *
 * @param {Object} default_group Fila de grupo por defecto (relation_group_row_from_group).
 * @param {Array}  saved_children
 * @returns {Object}
 */
function bloque_desde_hijas_guardadas(default_group, saved_children) {
	let saved_by_key = {}
	let order = null

	saved_children.forEach(child => {
		saved_by_key[child.key] = child
		let child_order = orden_numerico(child)
		if (order === null || child_order < order) {
			order = child_order
		}
	})

	return {
		...default_group,
		order: order === null ? 0 : order,
		expanded: false,
		children: default_group.children.map(default_child => {
			let saved = saved_by_key[default_child.key]
			if (!saved) {
				return { ...default_child }
			}
			return {
				...default_child,
				visible: !!saved.visible,
				width: saved.width || default_child.width || fallback_column_width_px(default_child.key),
				wrap_content: !!saved.wrap_content,
			}
		}),
	}
}

/**
 * Copia de una fila de grupo por defecto, con sus hijas copiadas: el modal edita las filas en
 * el lugar (visible, ancho) y no tiene que escribir sobre el objeto de otro llamador.
 *
 * @param {Object} default_group
 * @param {number} order
 * @returns {Object}
 */
function bloque_por_defecto(default_group, order) {
	return {
		...default_group,
		order: order,
		expanded: false,
		children: default_group.children.map(child => ({ ...child })),
	}
}

/**
 * Ordena entradas `{ propia, order, row }` por `order`, de forma estable: a igual order va
 * primero lo propio y despues el bloque, y entre iguales se respeta el orden de llegada. El
 * empate es real y frecuente -- las hijas de un bloque viajan todas con el order del bloque --
 * asi que no se confia en la estabilidad del sort del motor.
 *
 * @param {Array} entradas
 * @returns {Array}
 */
function ordenar_entradas_estable(entradas) {
	return entradas
		.map((entrada, idx) => ({ ...entrada, idx }))
		.sort((a, b) => {
			if (a.order !== b.order) {
				return a.order - b.order
			}
			if (a.propia !== b.propia) {
				return a.propia ? -1 : 1
			}
			return a.idx - b.idx
		})
}

/**
 * Alinea filas persistidas con las columnas vigentes del modelo.
 *
 * Las filas propias siguen igual que siempre. Las hijas de relacion (key con punto) se juntan
 * por relacion en un bloque ubicado por el `order` de sus hijas; propias y bloques se intercalan
 * por `order`, se reindexa, y al final se agregan los defaults que faltaban: las propias nuevas
 * del modelo y los grupos sin ninguna hija guardada (plegados y destildados).
 *
 * @param {Array} rows
 * @param {Array} default_rows
 * @returns {Array}
 */
export function normalize_column_preference_rows(rows, default_rows) {
	let defaults_by_key = {}
	let default_groups_by_relation = {}

	default_rows.forEach(item => {
		if (item.is_relation_group) {
			default_groups_by_relation[item.relation] = item
			return
		}
		defaults_by_key[item.key] = item
	})

	let separadas = separar_filas_de_preferencia(rows, defaults_by_key, default_groups_by_relation)
	let entradas = []

	separadas.propias.forEach(item => {
		let default_item = defaults_by_key[item.key]
		entradas.push({
			propia: true,
			order: orden_numerico(item),
			row: {
				key: item.key,
				label: default_item.label,
				visible: default_item.locked ? true : !!item.visible,
				order: 0,
				width: item.width || default_item.width || fallback_column_width_px(item.key),
				wrap_content: !!item.wrap_content,
				locked: !!default_item.locked,
			},
		})
	})

	Object.keys(separadas.hijas_por_relacion).forEach(relation => {
		let bloque = bloque_desde_hijas_guardadas(default_groups_by_relation[relation], separadas.hijas_por_relacion[relation])
		entradas.push({
			propia: false,
			order: bloque.order,
			row: bloque,
		})
	})

	let normalized = ordenar_entradas_estable(entradas).map((entrada, index) => ({
		...entrada.row,
		order: index,
	}))

	default_rows.forEach(default_item => {
		let exists = normalized.find(item => item.key == default_item.key)
		if (exists) {
			return
		}
		if (default_item.is_relation_group) {
			normalized.push(bloque_por_defecto(default_item, normalized.length))
			return
		}
		normalized.push({
			...default_item,
			order: normalized.length,
		})
	})

	return normalized
}

/**
 * Prop de tabla para una hija de relacion visible: se renderiza como "Cliente: Descripcion",
 * solo lectura, sin filtro ni orden en el encabezado.
 *
 * No se hace spread de la prop relacionada: flags como show_in_input_if, button, v_if o
 * function se evaluarian contra la venta y no contra el cliente. Se copian solo las que el
 * encabezado y la celda necesitan; la prop entera viaja en `relation_prop`, y es con esa que
 * propertyText() formatea la celda contra el modelo relacionado.
 *
 * @param {Object} group         Grupo de get_relation_column_groups.
 * @param {Object} child         Hija (fila del modal o fila guardada ya alineada).
 * @param {Object} relation_prop Prop completa del modelo relacionado.
 * @param {string} child_label
 * @returns {Object}
 */
function relation_table_prop(group, child, relation_prop, child_label) {
	let prop = {
		key: child.key,
		text: group.label + ': ' + child_label,
		type: relation_prop.type,
		is_relation_prop: true,
		relation: group.relation,
		relation_store: group.relation_model_name,
		foreign_key: group.foreign_key,
		relation_prop: relation_prop,
		only_show: true,
		not_show: false,
		no_usar_en_filtros: true,
		table_width: child.width || fallback_column_width_px(child.key),
		table_wrap_content: !!child.wrap_content,
	}

	;['if_has_extencion', 'if_is_admin', 'is_price', 'is_date'].forEach(flag => {
		if (typeof relation_prop[flag] != 'undefined') {
			prop[flag] = relation_prop[flag]
		}
	})

	return prop
}

/**
 * Convierte filas de preferencia en props_to_show del módulo.
 *
 * Acepta las dos formas: filas de grupo con sus hijas (lo que devuelven
 * get_default_rows_for_model / normalize_column_preference_rows) y filas planas con key con
 * punto (lo que se persiste y lo que manda el modal al guardar). En las dos, cada hija visible
 * emite una prop de tabla en la posicion del bloque, con las hijas en el orden del modelo
 * relacionado.
 *
 * @param {Object} store
 * @param {string} model_name
 * @param {Array}  rows
 * @returns {Array}
 */
export function build_props_to_show_from_rows(store_context, model_name, rows) {
	let context = build_generals_context(
		store_context.rootState ? { state: store_context.rootState } : store_context
	)
	let all_properties = get_all_properties_for_model(store_context, model_name)
	let properties_by_key = {}

	all_properties.forEach(prop => {
		properties_by_key[prop.key] = prop
	})

	let groups_by_relation = {}
	let default_groups_by_relation = {}

	get_relation_column_groups(store_context, model_name).forEach(group => {
		groups_by_relation[group.relation] = group
		default_groups_by_relation[group.relation] = relation_group_row_from_group(context, group, 0)
	})

	let separadas = separar_filas_de_preferencia(rows, properties_by_key, default_groups_by_relation)
	let entradas = []

	separadas.propias.forEach(row => {
		entradas.push({
			propia: true,
			order: orden_numerico(row),
			row: row,
		})
	})

	Object.keys(separadas.hijas_por_relacion).forEach(relation => {
		let bloque = bloque_desde_hijas_guardadas(default_groups_by_relation[relation], separadas.hijas_por_relacion[relation])
		entradas.push({
			propia: false,
			order: bloque.order,
			row: bloque,
		})
	})

	let props_to_show = []

	ordenar_entradas_estable(entradas).forEach(entrada => {
		if (entrada.propia) {
			let row = entrada.row
			let base_prop = properties_by_key[row.key]

			if (!row.visible && !(base_prop && base_prop.locked_visible)) {
				return
			}

			if (
				!base_prop
				|| !base_prop.key
				|| base_prop.not_show_on_table
				|| base_prop.type === 'display'
			) {
				return
			}

			props_to_show.push({
				...base_prop,
				not_show: false,
				table_width: row.width || fallback_column_width_px(row.key),
				table_wrap_content: !!row.wrap_content,
			})
			return
		}

		let bloque = entrada.row
		let group = groups_by_relation[bloque.relation]

		bloque.children.forEach(child => {
			if (!child.visible) {
				return
			}
			let relation_prop = group.children.find(prop => prop.key == child.relation_prop_key)
			if (!relation_prop) {
				return
			}
			props_to_show.push(relation_table_prop(group, child, relation_prop, child.label || context.getLabel(relation_prop)))
		})
	})

	return props_to_show
}

/**
 * Persiste props_to_show en el store del módulo (en `props_to_show_por_ambito[ambito]` si hay
 * ambito; en `props_to_show` si no).
 *
 * @param {Object} store
 * @param {string} model_name
 * @param {Array}  rows
 * @param {string|null} ambito
 * @return {void}
 */
export function apply_column_preference_rows_to_module_store(store_context, model_name, rows, ambito = null) {
	if (!module_supports_props_to_show(store_context, model_name, ambito)) {
		return
	}

	let props_to_show = build_props_to_show_from_rows(store_context, model_name, rows)

	if (ambito) {
		commit_to_module(store_context, model_name, 'set_props_to_show_por_ambito', { ambito: ambito, props: props_to_show })
		return
	}

	commit_to_module(store_context, model_name, 'set_props_to_show', props_to_show)
}

/**
 * Filas planas para el PUT de table-column-preference, a partir de las filas del modal.
 *
 * Una fila de grupo en la posicion i no se guarda: se reemplaza por sus hijas, todas con
 * `order: i` (la posicion del bloque) y cada una con su visible/ancho/salto de linea. Asi no
 * hay ninguna fila `client` guardada que pueda chocar con una prop propia que se llame igual
 * que la relacion (pasa en los hasOne), y al leer el bloque se ubica por el order de sus hijas.
 * Nada de la interfaz (expanded, row_id, label) viaja.
 *
 * @param {Array} config_rows
 * @returns {Array}
 */
export function flatten_column_preference_rows_for_save(config_rows) {
	let flat = []
	let orden = 0

	;(config_rows || []).forEach(row => {
		if (!row || typeof row.key == 'undefined' || row.key === null || row.key === '') {
			return
		}

		if (row.is_relation_group) {
			let children = row.children || []
			children.forEach(child => {
				flat.push({
					key: child.key,
					visible: !!child.visible,
					order: orden,
					width: child.width ? Number(child.width) : null,
					wrap_content: !!child.wrap_content,
				})
			})
			orden++
			return
		}

		flat.push({
			key: row.key,
			visible: !!row.visible,
			order: orden,
			width: row.width ? Number(row.width) : null,
			wrap_content: !!row.wrap_content,
		})
		orden++
	})

	return flat
}

/**
 * Resuelve filas de preferencia desde cache global o defaults del modelo.
 *
 * @param {Object} store
 * @param {string} model_name
 * @param {string} preference_type
 * @returns {Array}
 */
export function resolve_column_preference_rows(store_context, model_name, preference_type) {
	let default_rows = get_default_rows_for_model(store_context, model_name, preference_type)
	let cached_rows = table_column_preference_columns_from_store(store_context, model_name, preference_type)

	if (cached_rows && cached_rows.length) {
		return normalize_column_preference_rows(cached_rows, default_rows)
	}

	return default_rows
}

/**
 * Limpia filtrado del módulo tras un cambio explícito de columnas por el usuario.
 *
 * @param {Object} store
 * @param {string} model_name
 * @return {void}
 */
export function clear_module_filters_after_column_change(store_context, model_name) {
	let root_state = get_root_state(store_context)

	if (!root_state[model_name]) {
		return
	}

	/* Modulos no-ABM (ej. vender) no tienen filtros de listado: nada que limpiar. */
	if (typeof root_state[model_name].is_filtered == 'undefined') {
		return
	}

	commit_to_module(store_context, model_name, 'setIsFiltered', false)
	commit_to_module(store_context, model_name, 'setFiltered', [])
	commit_to_module(store_context, model_name, 'setFilterPage', 1)
	commit_to_module(store_context, model_name, 'setTotalFilterPages', null)
	commit_to_module(store_context, model_name, 'setTotalFilterResults', 0)
	commit_to_module(store_context, model_name, 'setFilters', [])

	if (typeof root_state[model_name].filtered_without_filter_form !== 'undefined') {
		commit_to_module(store_context, model_name, 'set_filtered_without_filter_form', false)
	}
}

/**
 * Aplica preferencias de columnas a un módulo si aún no las tiene en sesión.
 *
 * @param {Object} store
 * @param {string} model_name
 * @param {string} preference_type
 * @returns {boolean} true si aplicó columnas.
 */
export function bootstrap_module_column_preferences_if_needed(store_context, model_name, preference_type) {
	// 'table_<ambito>' aplica sobre props_to_show_por_ambito[ambito] y no sobre props_to_show:
	// la tabla principal del modulo y la vista con ambito conviven en el mismo store (el primer
	// caso es Ventas y Ventas > Por Entregar, las dos sobre `sale`).
	let ambito = ambito_from_preference_type(preference_type)

	if (module_already_has_column_preferences(store_context, model_name, ambito)) {
		return false
	}

	// Guarda contra cache frio (bug real encontrado el 23/7/2026): si el cache global de
	// table_column_preference todavia no bajo, resolve_column_preference_rows() no encuentra
	// nada y devuelve los DEFAULTS del modelo. Aplicarlos aca y devolver true hacia que
	// props-to-show/Modal.vue diera por resuelto el asunto y nunca cayera al fallback de API,
	// asi que la preferencia guardada del usuario no se leia NUNCA en una recarga parado
	// dentro de un modulo (el modal se crea con el header, varios segundos antes de que
	// download-resources llegue a table_column_preference). Sin cache no se decide nada aca:
	// se devuelve false y resuelve el llamador contra la API.
	if (!table_column_preference_cache_is_loaded(store_context)) {
		return false
	}

	// Guarda contra condicion de carrera (ver dynamic_column_dependencies_status.js): 'article'
	// tiene columnas dinamicas (direcciones/sucursales, listas de precio, descuentos por metodo
	// de pago) calculadas a partir de colecciones que se descargan en paralelo/despues. Si estas
	// todavia no llegaron, NO fijar props_to_show ahora -- dejarlo vacio y que el fallback
	// reactivo (get_properties_to_show_ordenadas en generals/model-meta.js) siga mostrando la
	// tabla correctamente hasta que se pueda reconciliar (ver reconcile_article_dynamic_columns_if_needed,
	// prompt 461).
	if (model_name == 'article' && !article_dynamic_dependencies_ready()) {
		return false
	}

	let rows = resolve_column_preference_rows(store_context, model_name, preference_type)
	apply_column_preference_rows_to_module_store(store_context, model_name, rows, ambito)
	return true
}

/**
 * Precarga props_to_show de todos los módulos con preferencia en cache global: las de tipo
 * 'table' y tambien las de tipo 'table_<ambito>' (ver ambito_from_preference_type).
 *
 * @param {Object} store_context { rootState, commit } de acción Vuex o $store del componente.
 * @return {void}
 */
export function bootstrap_all_module_column_preferences_from_cache(store_context) {
	let root_state = get_root_state(store_context)
	let preferences_store = root_state.table_column_preference

	if (!preferences_store || !Array.isArray(preferences_store.models)) {
		return
	}

	preferences_store.models.forEach(preference => {
		if (!preference) {
			return
		}

		let es_de_tabla = preference.preference_type === 'table'
			|| ambito_from_preference_type(preference.preference_type) !== null

		if (!es_de_tabla) {
			return
		}

		bootstrap_module_column_preferences_if_needed(store_context, preference.model_name, preference.preference_type)
	})
}

/**
 * Lee el mapa { prop_key: cols } de anchos de has_many del formulario para un modelo padre,
 * desde el cache global de table_column_preference (preference_type 'form_has_many').
 * El fallback dueño→empleado ya viene resuelto por el backend en la carga inicial.
 *
 * @param {Object} store_context $store del componente o { rootState }
 * @param {string} parent_model_name
 * @returns {Object} mapa prop_key -> cols (1..12). {} si no hay preferencia.
 */
export function form_has_many_cols_from_store(store_context, parent_model_name) {
	let columns = table_column_preference_columns_from_store(store_context, parent_model_name, 'form_has_many')
	let cols_map = {}
	if (!columns || !columns.length) {
		return cols_map
	}
	columns.forEach(function (column) {
		if (column && column.key && column.cols) {
			cols_map[column.key] = Number(column.cols)
		}
	})
	return cols_map
}

/**
 * Persiste el mapa de anchos de has_many del formulario para un modelo padre.
 * Reusa el mismo endpoint/jerarquía que las props to show (cada usuario guarda su fila;
 * empleado sin fila propia hereda la del dueño). Refresca el cache global al terminar.
 *
 * @param {Object} api_component componente con this.$api y this.$store
 * @param {string} parent_model_name
 * @param {Object} cols_map  { prop_key: cols }
 * @returns {Promise}
 */
export function save_form_has_many_cols(api_component, parent_model_name, cols_map) {
	let columns = []
	let order = 0

	Object.keys(cols_map).forEach(function (prop_key) {
		let cols = Number(cols_map[prop_key])
		if (!prop_key || !cols) {
			return
		}
		/* visible/order/width/wrap_content son valores dummy para pasar la validación del backend;
		   para 'form_has_many' el único dato que importa es cols. */
		columns.push({
			key: prop_key,
			visible: true,
			order: order,
			width: null,
			wrap_content: false,
			cols: cols,
		})
		order++
	})

	return api_component.$api.put('table-column-preference/' + parent_model_name + '/form_has_many', {
		columns: columns,
	})
	.then(function () {
		return api_component.$store.dispatch('table_column_preference/getModels')
	})
}

/**
 * Ancho por defecto (unidades de grilla 1..12) para una tabla has_many del formulario,
 * según la cantidad de columnas visibles de la tabla hija. Más columnas → más ancho,
 * para minimizar el resize manual. Escalones que tilan limpio en la grilla de 12.
 *
 * @param {number} child_columns_count columnas visibles de la tabla hija
 * @returns {number} unidades de grilla
 */
export function default_has_many_form_cols(child_columns_count) {
	let count = Number(child_columns_count) || 0
	if (count <= 2) {
		return 4
	}
	if (count <= 4) {
		return 6
	}
	return 12
}

/**
 * Claves esperadas de columnas dinámicas de artículo (direcciones/sucursales, listas de
 * precio, descuentos por método de pago) según el estado ACTUAL del store — mismo gating
 * que add_article_dynamic_columns (puede_ver_address, usa_lista_de_precios, etc), sin
 * duplicar esa lógica: se obtiene filtrando el resultado de get_all_properties_for_model.
 *
 * @param {Object} store_context
 * @returns {Array<string>}
 */
function expected_article_dynamic_keys(store_context) {
	return get_all_properties_for_model(store_context, 'article')
		.filter(function (prop) { return prop.dynamic_article_column })
		.map(function (prop) { return prop.key })
}

/**
 * Reconciliación de columnas dinámicas de artículo: si 'article' ya tiene props_to_show
 * fijado (bootstrap ya corrió, en esta sesión o desde una preferencia guardada) pero le
 * faltan columnas dinámicas que HOY deberían estar disponibles, vuelve a resolver y aplicar
 * las filas — sin pisar el orden/ancho/visibilidad que el usuario ya eligió para las columnas
 * que ya conocía (normalize_column_preference_rows ya preserva eso; solo agrega al final las
 * columnas nuevas con su default).
 *
 * No hace nada si props_to_show todavía no se fijó (esa primera fijación la hace
 * bootstrap_module_column_preferences_if_needed, no esta función) ni si ya tiene todo lo
 * esperado.
 *
 * @param {Object} store_context
 * @return {void}
 */
export function reconcile_article_dynamic_columns_if_needed(store_context) {
	if (!module_supports_props_to_show(store_context, 'article')) {
		return
	}

	let root_state = get_root_state(store_context)
	let current_props_to_show = root_state.article.props_to_show

	if (!current_props_to_show.length) {
		return
	}

	let expected_keys = expected_article_dynamic_keys(store_context)
	let current_keys = current_props_to_show.map(function (prop) { return prop.key })
	let missing_keys = expected_keys.filter(function (key) { return current_keys.indexOf(key) === -1 })

	if (!missing_keys.length) {
		return
	}

	let rows = resolve_column_preference_rows(store_context, 'article', 'table')
	apply_column_preference_rows_to_module_store(store_context, 'article', rows)
}
