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
		 * Criterios activos del store listos para exportación masiva por filtro.
		 *
		 * @return {Array}
		 */
		resolve_active_filters_for_export() {
			return this.get_active_filters_for_export(this.filters)
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
