export default {
	computed: {
		cajas() {
			return this.$store.state.caja.models 
		},
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods
		},
	},
	methods: {
		// ELimianrrrr
		check_cajas_eliminar() {
			console.log('check_cajas')
			if (this.cajas.length) {

				if (!this.cajas_abiertas.length) {
					this.$toast.error('Habra al menos una CAJA para poder indicarla en esta venta')
					return false 
				}

				if (
					!this.$store.state.vender.caja_id
					&& this.selected_payment_methods.length == 0
					&& (
						!this.$store.state.vender.client
						|| this.$store.state.vender.omitir_en_cuenta_corriente
					)
				) {

					this.$toast.error('Indique una CAJA para esta venta')
					return false 
				}

				let caja_seleccionada = this.cajas_abiertas.find(caja => caja.id == this.$store.state.vender.caja_id)
				console.log('caja_seleccionada:')
				console.log(caja_seleccionada)
				
				if (typeof caja_seleccionada == 'undefined') {

					this.$toast.error('Indique una CAJA para esta venta')
					return false 
				}


			}
			return true 
		},	
	}
}