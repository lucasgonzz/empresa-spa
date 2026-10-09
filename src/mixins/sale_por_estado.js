export default {
	computed: {
		/**
		 * Ventas de partida de la vista, antes de su filtro propio.
		 *
		 * 🔴 La lista de partida es la que la tabla esta mostrando, no siempre `models`: el modo
		 * Historico, el buscador y el modal de filtros son un FILTRO del store (cargan `filtered` y
		 * ponen `is_filtered` en true), y con eso el display dibuja `filtered`. Filtrar siempre
		 * `models` --la lista acotada que trae `getModels` (al entrar o en "Por fecha")-- dejaba el filtro de la vista sin efecto en Historico.
		 * Mismo patron que `mixins/sale.js::sales()` y `mixins/provider_order/models_to_show.js`.
		 */
		sales() {
			return this.$store.state.sale.is_filtered
				? this.$store.state.sale.filtered
				: this.$store.state.sale.models
		},
		sales_to_show() {

			let sale_status = this.$store.state.sale_status.models.find(m => m.name.toLowerCase() == this.view.replaceAll('-', ' '))
			
			if (typeof sale_status != 'undefined'){
				return this.get_sales_from_status(sale_status)
			}
			return []
		},
	},
	methods: {
		
		get_sales_from_status(sale_status) {

			return this.sales.filter(sale => {
				return sale.sale_status_id == sale_status.id  
			})

		}
	}
}