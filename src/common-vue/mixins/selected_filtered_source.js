import alert_filtrados from '@/common-vue/mixins/alert_filtrados'
import filters from '@/common-vue/mixins/filters'

/**
 * Resuelve la fuente de registros (seleccionados vs filtrados) según el dropdown
 * desde el que se invocó la acción masiva en cualquier módulo con view-component.
 */
export default {
	mixins: [alert_filtrados, filters],
	inject: {
		options_from_filter: {
			default: false,
		},
		options_dropdown_model_name: {
			default: null,
		},
	},
	props: {
		/**
		 * Nombre del módulo Vuex cuando no viene por inject del dropdown.
		 */
		model_name: {
			type: String,
			default: null,
		},
	},
	computed: {
		/**
		 * Nombre del store module (article, client, sale, etc.).
		 *
		 * @return {string}
		 */
		resolved_model_name() {
			if (this.model_name) {
				return this.model_name
			}
			if (this.options_dropdown_model_name) {
				return this.options_dropdown_model_name
			}
			return 'article'
		},
		/**
		 * Estado Vuex del módulo activo.
		 *
		 * @return {Object}
		 */
		module_state() {
			return this.$store.state[this.resolved_model_name]
		},
		/**
		 * Registros seleccionados manualmente en la grilla.
		 *
		 * @return {Array}
		 */
		selected() {
			return this.module_state.selected || []
		},
		/**
		 * Registros descargados del filtro activo.
		 *
		 * @return {Array}
		 */
		filtered() {
			return this.module_state.filtered || []
		},
		/**
		 * Criterios de filtrado persistidos en el store.
		 *
		 * @return {Array}
		 */
		filters() {
			return this.module_state.filters || []
		},
		/**
		 * Indica si hay filtrado formal activo.
		 *
		 * @return {boolean}
		 */
		is_filtered() {
			return !!this.module_state.is_filtered
		},
		/**
		 * true cuando la acción se disparó desde el dropdown de filtrados.
		 *
		 * @return {boolean}
		 */
		use_filtered_source() {
			return !!this.options_from_filter
		},
	},
	methods: {
		/**
		 * Devuelve registros según el dropdown que originó la acción.
		 *
		 * @return {Array|null}
		 */
		resolve_models() {
			if (this.use_filtered_source) {
				if (!this.filtered.length) {
					return null
				}
				this.alert_filtrados()
				return this.filtered
			}

			if (this.selected.length) {
				return this.selected
			}

			if (this.filtered.length) {
				this.alert_filtrados()
				return this.filtered
			}

			return null
		},
		/**
		 * Devuelve ids listos para endpoints que reciben lista puntual.
		 *
		 * @return {Array}
		 */
		resolve_model_ids() {
			let models = this.resolve_models()
			if (!models || !models.length) {
				return []
			}

			let ids = []
			models.forEach(function (model) {
				ids.push(model.id)
			})
			return ids
		},
		/**
		 * Filas tal como las ve el usuario en la tabla ahora mismo, en el orden en que las
		 * devolvió el backend (ahí ya está aplicado el `ordenar_de` de la columna que eligió).
		 *
		 * Misma regla que `display/Index.vue -> models_to_show`: mientras `is_filtered` está
		 * prendido la tabla muestra `filtered` (ordenar una columna pasa por runGlobalSearch y
		 * escribe ahí), y si no, `models`. Mirar siempre `models` daría el orden del listado
		 * por defecto aunque el usuario esté viendo otro.
		 *
		 * @return {Array}
		 */
		resolve_visible_table_models() {
			if (this.is_filtered) {
				return this.filtered
			}
			return this.module_state.models || []
		},
		/**
		 * Como resolve_model_ids(), pero con los ids ORDENADOS como están en la tabla, y no
		 * en el orden en que el usuario los tildó (`addSelected` hace push, así que
		 * `selected` guarda el orden de los clics). Los ids que no están en la página
		 * visible (una selección que quedó de otra página) van al final, en su orden original.
		 *
		 * Lo usa el PDF del catálogo (ArticleTablePdfProfiles.vue) para que "seleccionados"
		 * salga en el mismo orden que la tabla; los demás consumidores de resolve_model_ids()
		 * (ofertas, tickets, códigos de barra) no cambian.
		 *
		 * @return {Array}
		 */
		resolve_model_ids_in_table_order() {
			let ids = this.resolve_model_ids()
			if (!ids.length) {
				return ids
			}

			/* Posición de cada id en la tabla visible */
			let position_by_id = {}
			this.resolve_visible_table_models().forEach(function (model, index) {
				if (model && typeof position_by_id[model.id] === 'undefined') {
					position_by_id[model.id] = index
				}
			})

			let in_table = []
			let not_in_table = []
			ids.forEach(function (id) {
				if (typeof position_by_id[id] !== 'undefined') {
					in_table.push(id)
				} else {
					not_in_table.push(id)
				}
			})

			in_table.sort(function (a, b) {
				return position_by_id[a] - position_by_id[b]
			})

			return in_table.concat(not_in_table)
		},
		/**
		 * Criterios activos del store listos para exportación masiva por filtro.
		 *
		 * @return {Array}
		 */
		resolve_active_filters_for_export() {
			return this.get_active_filters_for_export(this.filters)
		},
		/**
		 * Filtros que SOLO tienen orden (`ordenar_de` puesto y ningún criterio de valor), para
		 * que un endpoint que recibe `filters` pueda respetar el orden elegido en la tabla.
		 *
		 * No confundir con resolve_active_filters_for_export(): esa deja afuera a propósito
		 * los filtros de solo orden, porque "ordenar no es filtrar" (ver la doctrina en
		 * common-vue/mixins/filters.js). Estos se suman DESPUÉS de que el consumidor ya
		 * decidió, mirando solo los de valor, que hay filtros activos: así el orden viaja al
		 * backend sin que ordenar una columna cuente como haber filtrado. Un filtro que tiene
		 * valor Y orden ya viaja entre los activos con su `ordenar_de`, por eso acá no entra.
		 *
		 * @return {Array}
		 */
		resolve_order_only_filters() {
			let self = this
			let order_only = []

			this.filters.forEach(function (filter) {
				if (!filter) {
					return
				}
				let has_order = filter.ordenar_de !== null
					&& filter.ordenar_de !== ''
					&& typeof filter.ordenar_de !== 'undefined'
				if (has_order && !self.filter_has_value_criteria(filter)) {
					order_only.push(filter)
				}
			})

			return order_only
		},
		/**
		 * Persiste el origen del dropdown para modales fuera del menú.
		 *
		 * @return {void}
		 */
		remember_options_from_filter() {
			this.$store.commit(this.resolved_model_name + '/set_options_from_filter', this.use_filtered_source)
		},
		/**
		 * Lee el origen guardado al confirmar un modal global.
		 *
		 * @return {boolean}
		 */
		remembered_options_from_filter() {
			return !!this.module_state.options_from_filter
		},
	},
}
