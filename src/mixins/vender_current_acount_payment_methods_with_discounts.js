export default {
	computed: {
		total_a_repartir: {
			get() {
				return this.$store.state.vender.current_acount_payment_methods_with_discounts.total_a_repartir
			},
			set(value) {
				this.$store.commit('vender/current_acount_payment_methods/set_total_a_repartir', value)
			}
		},
		total_repartido: {
			get() {
				return this.$store.state.vender.current_acount_payment_methods_with_discounts.total_repartido
			},
			set(value) {
				this.$store.commit('vender/current_acount_payment_methods/set_total_repartido', value)
			}
		},
		metodos_de_pago_seleccionados: {
			get() {
				return this.$store.state.vender.current_acount_payment_methods_with_discounts.metodos_de_pago_seleccionados
			},
			set(value) {
				// this.$store.commit('vender/current_acount_payment_methods/set_metodos_de_pago_seleccionados', value)
			}
		},

		sobrante_a_repartir(){
			return this.total_a_repartir - this.total_repartido;
		},
		total_vender() {
			return this.$store.state.vender.total 
		},
	},
}