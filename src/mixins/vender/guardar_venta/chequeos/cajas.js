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
		check_cajas() {
			console.log('check_cajas asdasd')

			if (
				this.$store.state.vender.client
				&& !this.$store.state.vender.omitir_en_cuenta_corriente
			) {
				return true
			}

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

				if (
					!this.$store.state.vender.caja_id
					&& this.selected_payment_methods.length > 0
				) {

					console.log(this.selected_payment_methods)


					let ok = true

					this.selected_payment_methods.forEach(pay => {
						if (!pay.caja_id) {

							this.$toast.error('Indique una CAJA para esta '+pay.name)
							ok = false
						}
					})


					return ok 
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