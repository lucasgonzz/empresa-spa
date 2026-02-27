export default {
	computed: {
		afip_ticket_show_option() {
			return this.$store.state.provider_order.afip_ticket_show_option
		},
		provider_orders_to_show() {
			let provider_orders = this.$store.state.provider_order.models
			
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