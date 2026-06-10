/**
 * Alerta cuando la acción usa solo los registros filtrados ya descargados en pantalla.
 */
export default {
	inject: {
		options_dropdown_model_name: {
			default: null,
		},
	},
	props: {
		/**
		 * Nombre del módulo Vuex (p. ej. article, client, sale).
		 */
		model_name: {
			type: String,
			default: null,
		},
	},
	computed: {
		/**
		 * Módulo Vuex resuelto para la alerta de paginación parcial.
		 *
		 * @return {string}
		 */
		alert_model_name() {
			if (this.model_name) {
				return this.model_name
			}
			if (this.resolved_model_name) {
				return this.resolved_model_name
			}
			if (this.options_dropdown_model_name) {
				return this.options_dropdown_model_name
			}
			return 'article'
		},
	},
	methods: {
		/**
		 * Avisa si solo se procesan los registros ya paginados en pantalla.
		 *
		 * @return {void}
		 */
		alert_filtrados() {
			let module_state = this.$store.state[this.alert_model_name]
			let filtered = module_state.filtered || []
			let total_filter_results = module_state.total_filter_results || 0

			if (filtered.length < total_filter_results) {
				let label = this.plural ? this.plural(this.alert_model_name) : 'registros'
				alert(
					'Solo se tienen en cuenta los ' + filtered.length + ' '
					+ label + ' descargados. No de los ' + total_filter_results + ' filtrados'
				)
			}
		},
	},
}
