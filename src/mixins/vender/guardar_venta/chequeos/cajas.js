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
			}
			return true 
		},	
	}
}