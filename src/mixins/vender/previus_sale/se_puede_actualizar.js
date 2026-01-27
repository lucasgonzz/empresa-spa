export default {
	methods: {
		se_puede_actualizar_venta(sale = null) {

			if (!this.hasPermissionTo('sale.update')) {
				console.log('no puede 1')
				return false
			}
			
			if (sale) {

				if (sale.is_cerrada) {

					return false 
				}

				if (sale.afip_tickets.length) {
					console.log('no puede 2')

					return false 
				}

				if (sale.caja_id 
					&& sale.caja_id != 0) {
					console.log('no puede 3')

					return false
				}

				if (sale.current_acount_payment_methods
					&& sale.current_acount_payment_methods.length >= 1) {
					
					console.log('no puede 4')

					return false
				}
			}

			return true
		},
	}
}