<template>
	<!--
		Buscador general: input unico estilo Apple (pill blanco, bordes redondeados). A la izquierda,
		dentro del mismo pill, el icono que abre el desplegable de propiedades a incluir en la busqueda;
		a la derecha, el icono de lupa. La busqueda se dispara con Enter (la lupa es un atajo opcional).
		Las props tildadas se persisten por usuario y por modelo al buscar (preference_type global_search)
		y se recargan como default en cada montaje. Los filtros propios del modulo (slot search_extra) van
		fuera del pill para no romper su diseno.
	-->
	<div class="buscador-general">
		<div class="buscador-general__row">

			<!-- Pill unico: icono de propiedades + input + limpiar + lupa -->
			<div class="buscador-general__pill">
				<properties-dropdown
				class="buscador-general__props"
				:ordered_props="ordered_props"
				:selected_props="selected_props"
				:selected_relations="selected_relations"
				:filtros_fijos_activos="filtros_fijos_activos"
				@toggle="onToggle"
				@select-all="selectAll"
				@deselect-all="deselectAll"
				@configure="onConfigure"></properties-dropdown>

				<input
				class="buscador-general__input"
				type="text"
				autocomplete="off"
				v-model="query_value"
				:placeholder="placeholder"
				@keyup.enter="buscar">

				<!-- Limpiar: solo cuando hay una busqueda del buscador general activa -->
				<button
				v-if="is_filtered_by_buscador"
				type="button"
				class="buscador-general__icon-btn"
				title="Limpiar busqueda"
				@click="limpiar">
					<i class="icon-undo"></i>
				</button>

				<!-- Lupa: la busqueda se dispara con Enter; el click es un atajo opcional -->
				<button
				type="button"
				class="buscador-general__icon-btn buscador-general__search"
				title="Buscar"
				@click="buscar">
					<i class="icon-search"></i>
				</button>
			</div>

			<!-- Filtros propios del modulo (ej: categoria / stock del listado). Fuera del pill. -->
			<div class="buscador-general__extra">
				<slot name="search_extra"></slot>
			</div>
		</div>

		<!--
			Modal de configuracion de filtro fijo (prompt 05 del grupo 179): se abre al hacer clic en
			el NOMBRE de una propiedad del desplegable. Todavia no persiste ni renderiza controles
			(eso es el prompt 06): solo emite 'agregar'/'quitar' con la config elegida.
		-->
		<filtro-fijo-modal
		:model_name="model_name"
		:property="property_en_configuracion"
		:config_actual="config_actual_en_edicion"
		@agregar="onAgregarFiltroFijo"
		@quitar="onQuitarFiltroFijo"></filtro-fijo-modal>
	</div>
</template>
<script>
export default {
	/**
	 * BuscadorGeneral — buscador unico por modelo, derivado de la definicion declarativa
	 * (src/models/<model_name>.js). Las props propias del modelo (text/textarea/number) y las
	 * relaciones (props type 'search' con key terminada en "_id") se muestran en una sola lista
	 * ordenada como props_to_show, cada una con un toggle. La seleccion se persiste por usuario y
	 * modelo (preference_type global_search) al buscar, y se recarga como default al montar.
	 *
	 * Uso minimo:
	 *   <buscador-general model_name="article"></buscador-general>
	 */
	components: {
		PropertiesDropdown: () => import('@/common-vue/components/view/header/buscador-general/PropertiesDropdown'),
		FiltroFijoModal: () => import('@/common-vue/components/view/header/buscador-general/FiltroFijoModal'),
	},
	props: {
		/**
		 * Nombre del modelo en el store, en la ruta del endpoint y en src/models.
		 */
		model_name: {
			type: String,
			required: true,
		},

		/**
		 * Texto de placeholder del input de busqueda.
		 */
		placeholder: {
			type: String,
			default: 'Buscar...',
		},

		/**
		 * Filtros extra propios del modulo (ej: categoria, con/sin stock del Listado de articulos).
		 * Formato esperado por el backend: [{ key, operator, value }].
		 */
		extra_filters: {
			type: Array,
			default: function () {
				return []
			},
		},

		/**
		 * Keys de props propias que se suman a 'name' en la seleccion por defecto (sin preferencia
		 * guardada). Pensada para modulos donde conviene buscar tambien por otros campos frecuentes
		 * (ej: el Listado de articulos suma codigo de barras, SKU, codigo de proveedor y N°). Si una
		 * key no existe en own_props para este modelo, se ignora sin error.
		 */
		default_extra_props: {
			type: Array,
			default: function () {
				return []
			},
		},
	},
	data() {
		return {
			// Texto ingresado por el usuario en el buscador.
			query_value: '',
			// Keys de own_props tildadas para la busqueda.
			selected_props: [],
			// Keys de relation_props tildadas para la busqueda.
			selected_relations: [],
			// True apenas el usuario toca la seleccion a mano: evita que la carga async del backend
			// pise una eleccion que el usuario ya empezo a hacer mientras se resolvia el GET.
			selection_touched: false,
			// Propiedad que se esta configurando como filtro fijo en FiltroFijoModal.vue (null si
			// el modal esta cerrado o no hay ninguna en edicion).
			property_en_configuracion: null,
			// Filtros fijos agregados hasta ahora: [{ key, filter_kind, operator, default_value }].
			// Prompt 05 (este): solo estado local en memoria. La persistencia contra el backend y
			// el render de los controles al lado del input es el prompt 06, no se adelanta aca.
			filtros_fijos: [],
		}
	},
	computed: {
		/**
		 * Props propias del modelo, buscables por texto/numero: type en text/textarea/number,
		 * que no sean relacion, que no tengan el flag `not_use_in_global_search`, y que tengan
		 * `key` (descarta las entradas `group_title`, que no representan una columna).
		 *
		 * @returns {Array} [{ key, text, ... }]
		 */
		own_props() {
			let model_properties = require('@/models/' + this.model_name).default.properties
			// Filtra por extension activa del cliente: sin esto, props gateadas por distintas
			// extensiones que comparten `key` generan keys duplicadas en el v-for y clientes ven
			// props de extensiones que no tienen.
			model_properties = this.check_extencions(model_properties)
			return model_properties.filter(function (property) {
				return property.key
					&& ['text', 'textarea', 'number'].indexOf(property.type) !== -1
					&& !property.not_use_in_global_search
					// Excluye props ocultas (not_show): suelen no tener `text` y rompen el render
					// y el filtro del dropdown (ver bug reportado en prompt 547).
					&& !property.not_show
			})
		},

		/**
		 * Relaciones buscables del modelo: props con type "search" y key terminada en "_id".
		 * Para cada una se deriva la relacion Eloquent (sin el sufijo "_id") y las props por las
		 * que se busca dentro de esa relacion (`global_search_relation_props`, default ['name']).
		 *
		 * @returns {Array} [{ key, text, relation, props }]
		 */
		relation_props() {
			let model_properties = require('@/models/' + this.model_name).default.properties
			// Mismo filtro por extension que en own_props, ver comentario ahi.
			model_properties = this.check_extencions(model_properties)
			let relations = []
			model_properties.forEach(function (property) {
				// Misma exclusion de props ocultas (not_show) que en own_props: evita relaciones
				// sin `text` colandose en el dropdown.
				if (!property.key || property.type !== 'search' || property.key.slice(-3) !== '_id' || property.not_show) {
					return
				}
				relations.push({
					key: property.key,
					text: property.text,
					relation: property.key.replace('_id', ''),
					props: property.global_search_relation_props || ['name'],
				})
			})
			return relations
		},

		/**
		 * Mapa key -> indice segun el orden de columnas visibles del usuario (props_to_show del
		 * store del modulo). Se usa para ordenar la lista de props del desplegable igual que las
		 * columnas de la tabla. Si el modulo no usa props_to_show, queda vacio y se cae al orden
		 * de definicion del modelo.
		 *
		 * @returns {Object}
		 */
		props_to_show_order() {
			let order_map = {}
			let module_state = this.$store.state[this.model_name]
			let props_to_show = module_state && Array.isArray(module_state.props_to_show)
				? module_state.props_to_show
				: []
			props_to_show.forEach(function (property, index) {
				if (property && property.key) {
					order_map[property.key] = index
				}
			})
			return order_map
		},

		/**
		 * Lista unica de props buscables (propias + relaciones), ordenada como props_to_show.
		 * Las props que no estan en props_to_show quedan al final, conservando el orden original
		 * (primero propias, despues relaciones).
		 *
		 * @returns {Array} [{ key, text, kind }] con kind 'own' o 'relation'.
		 */
		ordered_props() {
			// Lista base con el tipo de cada prop.
			let items = []
			this.own_props.forEach(function (property) {
				// Fallback defensivo: segunda capa de seguridad por si en el futuro se cuela otra
				// prop sin `text` (el filtro de not_show de arriba deberia evitarlo, pero no cuesta
				// nada blindarlo aca tambien).
				items.push({ key: property.key, text: property.text || property.table_text || property.key, kind: 'own' })
			})
			this.relation_props.forEach(function (property) {
				items.push({ key: property.key, text: property.text || property.key, kind: 'relation' })
			})
			// Se envuelve cada item con su clave de orden para un sort estable.
			let order_map = this.props_to_show_order
			let entries = []
			items.forEach(function (item, original_index) {
				let has_order = Object.prototype.hasOwnProperty.call(order_map, item.key)
				entries.push({
					item: item,
					// Los que estan en props_to_show ordenan por su indice; el resto va al final
					// conservando el orden original (offset grande + indice original).
					sort_key: has_order ? order_map[item.key] : (1000000 + original_index),
				})
			})
			entries.sort(function (a, b) {
				return a.sort_key - b.sort_key
			})
			let result = []
			entries.forEach(function (entry) {
				result.push(entry.item)
			})
			return result
		},

		/**
		 * Indica si hay una busqueda del buscador general activa (payload persistido en el store).
		 * Controla la visibilidad del boton limpiar.
		 *
		 * @returns {Boolean}
		 */
		is_filtered_by_buscador() {
			return !!this.$store.state[this.model_name].global_search_payload
		},

		/**
		 * Props candidatas a "filtro fijo" (control propio a la par del input del buscador). A
		 * diferencia de own_props/relation_props, esta lista NO excluye las props con
		 * `not_show: true`: esa exclusion es correcta para la busqueda por texto (evita romper el
		 * render de props sin `text`) pero descartaria justamente el caso mas pedido
		 * (category_id, que en src/models/article.js tiene not_show: true). Criterio: tiene key y
		 * text (sin text no se puede etiquetar el control), pasa check_extencions, y es relacion
		 * (type search/select con key terminada en "_id") o numerica (type number).
		 *
		 * @returns {Array} [{ key, text, type }]
		 */
		props_filtrables() {
			let model_properties = require('@/models/' + this.model_name).default.properties
			// Mismo filtro por extension que own_props/relation_props: un cliente no debe ver
			// propiedades de extensiones que no tiene habilitadas.
			model_properties = this.check_extencions(model_properties)
			let result = []
			model_properties.forEach(function (property) {
				if (!property.key || !property.text) {
					return
				}
				let es_relacion = (property.type === 'search' || property.type === 'select')
					&& property.key.slice(-3) === '_id'
				let es_numerica = property.type === 'number'
				if (!es_relacion && !es_numerica) {
					return
				}
				result.push({ key: property.key, text: property.text, type: property.type })
			})
			return result
		},

		/**
		 * Keys de los filtros fijos ya agregados, para pintar el indicador visual en el
		 * desplegable (PropertiesDropdown.vue).
		 *
		 * @returns {Array}
		 */
		filtros_fijos_activos() {
			let keys = []
			this.filtros_fijos.forEach(function (filtro) {
				keys.push(filtro.key)
			})
			return keys
		},

		/**
		 * Configuracion ya guardada de la propiedad en edicion en el modal, si ya estaba agregada
		 * como filtro fijo. null si es la primera vez que se configura.
		 *
		 * @returns {Object|null}
		 */
		config_actual_en_edicion() {
			if (!this.property_en_configuracion) {
				return null
			}
			let self = this
			let encontrado = this.filtros_fijos.find(function (filtro) {
				return filtro.key === self.property_en_configuracion.key
			})
			return encontrado || null
		},
	},
	created() {
		// Default inmediato (nunca queda vacio mientras carga) y despues se pisa con lo guardado.
		this.applyDefaultSelection()
		this.loadSelection()
	},
	methods: {
		/**
		 * Seleccion por defecto (sin preferencia guardada): 'name' (si el modelo lo tiene) mas las
		 * keys de default_extra_props que existan en own_props. Ninguna relacion por defecto.
		 *
		 * @return {void}
		 */
		applyDefaultSelection() {
			// Keys disponibles entre las props propias del modelo, para validar que 'name' y las
			// default_extra_props realmente existan antes de tildarlas.
			let own_keys = []
			this.own_props.forEach(function (property) {
				own_keys.push(property.key)
			})
			let default_props = []
			if (own_keys.indexOf('name') !== -1) {
				default_props.push('name')
			}
			// Suma las keys extra del modulo (ej: bar_code/sku/provider_code/id en el Listado de
			// articulos) que existan en own_props, sin duplicar.
			this.default_extra_props.forEach(function (key) {
				if (own_keys.indexOf(key) !== -1 && default_props.indexOf(key) === -1) {
					default_props.push(key)
				}
			})
			this.selected_props = default_props
			this.selected_relations = []
		},

		/**
		 * Carga la seleccion guardada por usuario y modelo (preference_type global_search).
		 * Cache-first: si el cache global ya la trae, la aplica sincronico. Si no, la pide al
		 * backend (el show resuelve el fallback duenio->empleado). Nunca pisa una eleccion que el
		 * usuario ya empezo a tocar (selection_touched).
		 *
		 * @return {void}
		 */
		loadSelection() {
			let cached = this.tableColumnPreferenceColumnsFromStore(this.model_name, 'global_search')
			if (cached && cached.length) {
				this.applySelectionFromColumns(cached)
				return
			}
			this.$api.get('table-column-preference/' + this.model_name + '/global_search')
			.then(res => {
				if (this.selection_touched) {
					return
				}
				if (res.data && res.data.model && Array.isArray(res.data.model.columns) && res.data.model.columns.length) {
					this.applySelectionFromColumns(res.data.model.columns)
				} else {
					this.applyDefaultSelection()
				}
			})
			.catch(() => {
				if (!this.selection_touched) {
					this.applyDefaultSelection()
				}
			})
		},

		/**
		 * Reconstruye la seleccion desde las columnas guardadas: visible=true => tildada. Separa
		 * en props propias vs relaciones por pertenencia de la key (las relaciones terminan en
		 * "_id" y nunca colisionan con una prop propia).
		 *
		 * @param {Array} columns [{ key, visible, order }]
		 * @return {void}
		 */
		applySelectionFromColumns(columns) {
			let own_available = {}
			this.own_props.forEach(function (property) {
				own_available[property.key] = true
			})
			let relation_available = {}
			this.relation_props.forEach(function (property) {
				relation_available[property.key] = true
			})
			let own_keys = []
			let relation_keys = []
			columns.forEach(function (column) {
				if (!column || !column.visible || !column.key) {
					return
				}
				if (own_available[column.key]) {
					own_keys.push(column.key)
				} else if (relation_available[column.key]) {
					relation_keys.push(column.key)
				}
			})
			this.selected_props = own_keys
			this.selected_relations = relation_keys
		},

		/**
		 * Handler unico del toggle emitido por el desplegable. Marca que el usuario toco la
		 * seleccion y enruta al metodo correcto segun el tipo de prop.
		 *
		 * @param {Object} payload { key, kind }
		 * @return {void}
		 */
		onToggle(payload) {
			this.selection_touched = true
			if (payload.kind === 'own') {
				this.toggleProp(payload.key)
			} else {
				this.toggleRelation(payload.key)
			}
		},

		/**
		 * Handler del click en el NOMBRE de una propiedad (evento 'configure' del desplegable).
		 * Busca la prop primero en props_filtrables (relacion/numerica); si no esta ahi (ej: una
		 * prop de texto, que no es filtrable como control fijo) cae a la definicion cruda del
		 * modelo, para que el modal igual se abra y muestre el mensaje de "no soportado" en vez de
		 * quedarse sin reaccionar al click.
		 *
		 * @param {Object} payload { key, kind }
		 * @return {void}
		 */
		onConfigure(payload) {
			let self = this
			let encontrada = this.props_filtrables.find(function (property) {
				return property.key === payload.key
			})
			if (!encontrada) {
				let model_properties = this.check_extencions(require('@/models/' + this.model_name).default.properties)
				let cruda = model_properties.find(function (property) {
					return property.key === payload.key
				})
				encontrada = cruda ? { key: cruda.key, text: cruda.text, type: cruda.type } : { key: payload.key, text: payload.key, type: null }
			}
			this.property_en_configuracion = encontrada
			this.$bvModal.show(this.model_name + '-filtro-fijo-modal')
		},

		/**
		 * Handler del evento 'agregar' de FiltroFijoModal.vue: guarda (o actualiza, si ya existia)
		 * la configuracion del filtro fijo en el estado local `filtros_fijos`. Prompt 05 (este):
		 * solo estado local, sin persistir contra el backend ni renderizar el control todavia
		 * (eso lo hace el prompt 06, que conecta esto con el store).
		 *
		 * @param {Object} config { key, filter_kind, operator, default_value }
		 * @return {void}
		 */
		onAgregarFiltroFijo(config) {
			let index = -1
			this.filtros_fijos.forEach(function (filtro, i) {
				if (filtro.key === config.key) {
					index = i
				}
			})
			if (index === -1) {
				this.filtros_fijos.push(config)
			} else {
				this.filtros_fijos.splice(index, 1, config)
			}
		},

		/**
		 * Handler del evento 'quitar' de FiltroFijoModal.vue: saca la propiedad del estado local
		 * `filtros_fijos`.
		 *
		 * @param {Object} payload { key }
		 * @return {void}
		 */
		onQuitarFiltroFijo(payload) {
			let index = -1
			this.filtros_fijos.forEach(function (filtro, i) {
				if (filtro.key === payload.key) {
					index = i
				}
			})
			if (index !== -1) {
				this.filtros_fijos.splice(index, 1)
			}
		},

		/**
		 * Tilda/destilda una prop propia de la busqueda.
		 *
		 * @param {String} key
		 * @return {void}
		 */
		toggleProp(key) {
			let index = this.selected_props.indexOf(key)
			if (index === -1) {
				this.selected_props.push(key)
			} else {
				this.selected_props.splice(index, 1)
			}
		},

		/**
		 * Tilda/destilda una relacion de la busqueda.
		 *
		 * @param {String} key
		 * @return {void}
		 */
		toggleRelation(key) {
			let index = this.selected_relations.indexOf(key)
			if (index === -1) {
				this.selected_relations.push(key)
			} else {
				this.selected_relations.splice(index, 1)
			}
		},

		/**
		 * Tilda todas las props buscables (propias + relaciones).
		 *
		 * @return {void}
		 */
		selectAll() {
			this.selection_touched = true
			let own_keys = []
			this.own_props.forEach(function (property) {
				own_keys.push(property.key)
			})
			let relation_keys = []
			this.relation_props.forEach(function (property) {
				relation_keys.push(property.key)
			})
			this.selected_props = own_keys
			this.selected_relations = relation_keys
		},

		/**
		 * Destilda todas las props buscables.
		 *
		 * @return {void}
		 */
		deselectAll() {
			this.selection_touched = true
			this.selected_props = []
			this.selected_relations = []
		},

		/**
		 * Ejecuta la busqueda general: arma el payload (props/relaciones tildadas + extra_filters)
		 * y lo despacha a `runGlobalSearch`. Requiere al menos 2 caracteres de texto, salvo que
		 * haya extra_filters activos. Ademas persiste la seleccion actual.
		 *
		 * @return {void}
		 */
		buscar() {
			// Si hay extra_filters activos, se permite buscar sin texto (ej: solo por categoria).
			let has_extra_filters = this.extra_filters && this.extra_filters.length > 0

			if (this.query_value.trim().length < 2 && !has_extra_filters) {
				this.$toast.error('Ingrese al menos 2 caracteres')
				return
			}

			// Arma relation_props con la forma que espera el backend: { relation, props }.
			let relation_props_payload = []
			let relation_props_disponibles = this.relation_props
			this.selected_relations.forEach(function (relation_key) {
				let relation_prop = relation_props_disponibles.find(function (item) {
					return item.key === relation_key
				})
				if (relation_prop) {
					relation_props_payload.push({
						relation: relation_prop.relation,
						props: relation_prop.props,
					})
				}
			})

			let payload = {
				// Se llama `query_value`, no `query`: en el backend `$request->query` es el
				// InputBag de Symfony y no el input del mismo nombre.
				query_value: this.query_value,
				props: this.selected_props,
				relation_props: relation_props_payload,
				extra_filters: this.extra_filters,
				page: 1,
			}

			this.$store.dispatch(this.model_name + '/runGlobalSearch', payload)

			// Guarda la seleccion actual como preferencia del usuario para este modelo.
			this.persistSelection()
		},

		/**
		 * Persiste que props quedan tildadas para la busqueda rapida (preference_type
		 * global_search), por usuario y modelo. visible=true => tildada. Fire and forget: no
		 * bloquea la busqueda. Al guardar, refresca el cache global para que la proxima vez
		 * (u otra vista) se cargue la seleccion nueva.
		 *
		 * @return {void}
		 */
		persistSelection() {
			let columns = []
			let order = 0
			let self = this
			this.ordered_props.forEach(function (item) {
				let is_selected = item.kind === 'own'
					? self.selected_props.indexOf(item.key) !== -1
					: self.selected_relations.indexOf(item.key) !== -1
				columns.push({ key: item.key, visible: is_selected, order: order })
				order++
			})
			this.$api.put('table-column-preference/' + this.model_name + '/global_search', { columns: columns })
			.then(() => {
				this.$store.dispatch('table_column_preference/getModels')
			})
			.catch(err => {
				console.log('buscador-general: no se pudo guardar la seleccion de propiedades', err)
			})
		},

		/**
		 * Limpia el criterio de texto, resetea el filtered del store (mismos commits que
		 * BuscadorRapido) y limpia el payload persistido del buscador general.
		 *
		 * @return {void}
		 */
		limpiar() {
			this.query_value = ''

			this.$store.commit(this.model_name + '/setFiltered', [])
			this.$store.commit(this.model_name + '/setIsFiltered', false)
			this.$store.commit(this.model_name + '/setSelected', [])
			this.$store.commit(this.model_name + '/setFilterPage', 1)
			this.$store.commit(this.model_name + '/setTotalFilterPages', null)
			this.$store.commit(this.model_name + '/setTotalFilterResults', 0)
			this.$store.commit(this.model_name + '/set_filtered_without_filter_form', false)
			this.$store.commit(this.model_name + '/setGlobalSearchPayload', null)
		},
	},
}
</script>
<style lang="sass">
// Estetica Apple: pill blanco, minimalista, sin ancho fijo (lo define el contenedor).
.buscador-general
	width: 100%

	.buscador-general__row
		display: flex
		align-items: center
		gap: 10px
		width: 100%

	// Pill unico y blanco, todos los bordes redondeados
	.buscador-general__pill
		display: flex
		align-items: center
		flex: 1 1 auto
		min-width: 0
		background: #fff
		border: 1px solid #e2e4e7
		border-radius: 22px
		height: 40px
		padding: 0 6px 0 4px
		transition: border-color 0.15s ease, box-shadow 0.15s ease
		// Sombra sutil permanente que envuelve el pill entero (icono + input + lupa),
		// mismo criterio que la sombra de las tablas del sistema.
		box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px

		// Anillo azul al enfocar el input (color $blue de _custom.scss): se suma a la
		// sombra base, no la reemplaza
		&:focus-within
			border-color: #007bff
			box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px, 0 0 0 3px rgba(0, 123, 255, 0.15)

	// El desplegable de propiedades se integra al pill (ver PropertiesDropdown.vue)
	.buscador-general__props
		display: flex
		align-items: center

	// Input sin bordes ni fondo: el pill es el borde
	.buscador-general__input
		flex: 1 1 auto
		min-width: 0
		border: none
		outline: none
		background: transparent
		height: 100%
		padding: 0 6px
		font-size: 0.9rem
		color: #1d1d1f
		// Anula la sombra global de input en _inputs.sass: la sombra la da el pill contenedor
		box-shadow: none

		&::placeholder
			color: #9aa0a6

	// Botones de icono dentro del pill (lupa, limpiar): planos, sin fondo
	.buscador-general__icon-btn
		display: flex
		align-items: center
		justify-content: center
		width: 30px
		height: 30px
		border: none
		background: transparent
		border-radius: 50%
		color: #86868b
		cursor: pointer
		transition: background 0.15s ease, color 0.15s ease
		// Blinda los botones de icono (lupa, limpiar) contra cualquier sombra heredada
		box-shadow: none

		&:hover
			background: #f2f3f4
			color: #1d1d1f

		i
			font-size: 0.95rem

	.buscador-general__search
		color: #6e6e73

	// Contenedor de filtros del modulo; si el slot esta vacio colapsa sin dejar hueco
	.buscador-general__extra
		display: flex
		align-items: center
		gap: 8px

		&:empty
			display: none
</style>
