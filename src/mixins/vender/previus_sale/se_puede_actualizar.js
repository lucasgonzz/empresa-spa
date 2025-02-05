export default {
	methods: {
		se_puede_actualizar_venta(sale = null) {

			if (sale) {

				if (sale.afip_ticket) {

					return false 
				}

				if (sale.caja_id 
					&& sale.caja_id != 0) {

					return false
				}

				if (sale.current_acount_payment_methods.length
					&& sale.current_acount_payment_methods.length > 1) {

					return false
				}
			}

			return true
		},
	}
}