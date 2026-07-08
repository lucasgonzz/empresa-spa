import {
	default_column_width_for_property,
	fallback_column_width_px,
} from '@/common-vue/config/column_preference_defaults'
import app_generals from '@/mixins/generals'
import generals from '@/common-vue/mixins/generals'
import { add_article_dynamic_columns } from '@/common-vue/helpers/article_dynamic_table_columns'

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
 * Indica si el módulo soporta props_to_show en su store.
 *
 * @param {Object} store_context
 * @param {string} model_name
 * @returns {boolean}
 */
export function module_supports_props_to_show(store_context, model_name) {
	let root_state = get_root_state(store_context)
	return !!(root_state[model_name] && Array.isArray(root_state[model_name].props_to_show))
}

/**
 * Indica si el módulo ya tiene columnas aplicadas en sesión.
 *
 * @param {Object} store_context
 * @param {string} model_name
 * @returns {boolean}
 */
export function module_already_has_column_preferences(store_context, model_name) {
	if (!module_supports_props_to_show(store_context, model_name)) {
		return false
	}

	let module_state = get_root_state(store_context)[model_name]
	return module_state.props_to_show.length > 0
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

	props.push({
		key: 'created_at',
		text: 'Creado',
		type: 'date',
		is_date: true,
	})
	props.push({
		key: 'updated_at',
		text: 'Actualizado',
		type: 'date',
		is_date: true,
	})

	return props.filter(prop => prop.type != 'button')
}

/**
 * Filas por defecto según el modelo (sin preferencia guardada).
 *
 * @param {Object} store
 * @param {string} model_name
 * @returns {Array}
 */
export function get_default_rows_for_model(store_context, model_name) {
	let context = build_generals_context(
		store_context.rootState ? { state: store_context.rootState } : store_context
	)
	let all_properties = get_all_properties_for_model(store_context, model_name)

	return all_properties.map((prop, index) => ({
		key: prop.key,
		label: context.getLabel(prop),
		visible: prop.locked_visible ? true : !prop.not_show,
		order: index,
		width: default_column_width_for_property(prop),
		wrap_content: !!prop.table_wrap_content,
		/* Columnas bloqueadas (ej. Cantidad en vender): visibilidad no editable, posicion si. */
		locked: !!prop.locked_visible,
	}))
}

/**
 * Alinea filas persistidas con las columnas vigentes del modelo.
 *
 * @param {Array} rows
 * @param {Array} default_rows
 * @returns {Array}
 */
export function normalize_column_preference_rows(rows, default_rows) {
	let defaults_by_key = {}

	default_rows.forEach(item => {
		defaults_by_key[item.key] = item
	})

	let normalized = rows
		.filter(item => defaults_by_key[item.key])
		.sort((a, b) => Number(a.order) - Number(b.order))
		.map((item, index) => {
			let default_item = defaults_by_key[item.key]
			return {
				key: item.key,
				label: default_item.label,
				visible: default_item.locked ? true : !!item.visible,
				order: index,
				width: item.width || default_item.width || fallback_column_width_px(item.key),
				wrap_content: !!item.wrap_content,
				locked: !!default_item.locked,
			}
		})

	default_rows.forEach(default_item => {
		let exists = normalized.find(item => item.key == default_item.key)
		if (!exists) {
			normalized.push({
				...default_item,
				order: normalized.length,
			})
		}
	})

	return normalized
}

/**
 * Convierte filas de preferencia en props_to_show del módulo.
 *
 * @param {Object} store
 * @param {string} model_name
 * @param {Array}  rows
 * @returns {Array}
 */
export function build_props_to_show_from_rows(store_context, model_name, rows) {
	let all_properties = get_all_properties_for_model(store_context, model_name)
	let properties_by_key = {}

	all_properties.forEach(prop => {
		properties_by_key[prop.key] = prop
	})

	let props_to_show = []

	rows
		.filter(row => {
			if (row.visible) {
				return true
			}
			let base_prop = properties_by_key[row.key]
			return !!(base_prop && base_prop.locked_visible)
		})
		.sort((a, b) => Number(a.order) - Number(b.order))
		.forEach(row => {
			let base_prop = properties_by_key[row.key]

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
		})

	return props_to_show
}

/**
 * Persiste props_to_show en el store del módulo.
 *
 * @param {Object} store
 * @param {string} model_name
 * @param {Array}  rows
 * @return {void}
 */
export function apply_column_preference_rows_to_module_store(store_context, model_name, rows) {
	if (!module_supports_props_to_show(store_context, model_name)) {
		return
	}

	let props_to_show = build_props_to_show_from_rows(store_context, model_name, rows)
	commit_to_module(store_context, model_name, 'set_props_to_show', props_to_show)
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
	let default_rows = get_default_rows_for_model(store_context, model_name)
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
	if (module_already_has_column_preferences(store_context, model_name)) {
		return false
	}

	let rows = resolve_column_preference_rows(store_context, model_name, preference_type)
	apply_column_preference_rows_to_module_store(store_context, model_name, rows)
	return true
}

/**
 * Precarga props_to_show de todos los módulos con preferencia en cache global.
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
		if (!preference || preference.preference_type !== 'table') {
			return
		}

		bootstrap_module_column_preferences_if_needed(store_context, preference.model_name, 'table')
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
