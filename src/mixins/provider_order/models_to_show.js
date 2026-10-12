export default {
	computed: {
		afip_ticket_show_option() {
			return this.$store.state.provider_order.afip_ticket_show_option
		},
		/**
		 * Compras que se ven en la tabla, ya filtradas por el select de facturacion.
		 *
		 * 🔴 La lista de partida es la que la tabla esta mostrando, no siempre `models`: el modo
		 * Historico y el buscador son un FILTRO del store (`runGlobalSearch` carga `filtered` y
		 * pone `is_filtered` en true), asi que la tabla sale de `filtered`. Filtrar `models` --la
		 * lista de "Por fecha", el ultimo dia mirado-- dejaba el select de facturacion sin efecto
		 * en Historico, y TOTAL COMPRADO sumaba compras que ni estaban en pantalla. Mismo patron
		 * que `mixins/sale.js::sales()`.
		 */
		provider_orders_to_show() {
			let provider_orders = this.$store.state.provider_order.is_filtered
				? this.$store.state.provider_order.filtered
				: this.$store.state.provider_order.models
			
			if (this.afip_ticket_show_option == 'solo-con-factura') {
				provider_orders = provider_orders.filter(prov_order => {
					return prov_order.provider_order_afip_tickets.length  > 0
				})
			} else if (this.afip_ticket_show_option == 'solo-sin-factura') {
				provider_orders = provider_orders.filter(prov_order => {
					return prov_order.provider_order_afip_tickets.length == 0
				})
			}

			return provider_orders 
		},
		total() {
			let total = 0
			this.provider_orders_to_show.forEach(prov_order => {
				total += Number(prov_order.total)
			})
			return total
		}
	}
}