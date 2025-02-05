export default {
	computed: {
		current_acount_payment_method_id() {
			return this.$store.state.vender.current_acount_payment_method_id
		},
		client() {
			return this.$store.state.vender.client
		},
		omitir_en_cuenta_corriente() {
			return this.$store.state.vender.omitir_en_cuenta_corriente
		},
		hay_mas_de_un_metodo_de_pago() {
			return !this.current_acount_payment_method_id 
		},
	},
	methods: {
		check_payment_methods() {

			if (this.hay_mas_de_un_metodo_de_pago
				&& (
					!this.client 
					|| this.omitir_en_cuenta_corriente
					)
				) {

				if (!this.check_sobrante_a_repartir()) {
					return false 
				} 
			} 
			return true
		},
		check_sobrante_a_repartir(){


			if (this.sobrante_a_repartir != 0) {

				if (this.sobrante_a_repartir > 0) {
					
					this.$toast.error('Todavia faltan repartir ' + this.price(this.sobrante_a_repartir))
				} else {
					
					this.$toast.error('Se repartieron ' + this.price(Math.abs(this.sobrante_a_repartir)) + ' de mas')
				}

				return false
			} 

			return true
		},
	}
}