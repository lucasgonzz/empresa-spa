import vender_set_total from '@/mixins/vender_set_total'
export default {
	mixins: [vender_set_total],
	computed: {
		total_a_repartir_with_discounts: {
			get() {
				return this.$store.state.vender.current_acount_payment_methods_with_discounts.total_a_repartir
			},
			set(value) {
				this.$store.commit('vender/current_acount_payment_methods_with_discounts/set_total_a_repartir', value)
			}
		},
		total_repartido_with_discounts: {
			get() {
				return this.$store.state.vender.current_acount_payment_methods_with_discounts.total_repartido
			},
			set(value) {
				this.$store.commit('vender/current_acount_payment_methods_with_discounts/set_total_repartido', value)
			}
		},
		payment_methods_with_discounts: {
			get() {
				return this.$store.state.vender.current_acount_payment_methods_with_discounts.payment_methods
			},
			set(value) {
				this.$store.commit('vender/current_acount_payment_methods_with_discounts/set_payment_methods', value)
			}
		},

		sobrante_a_repartir_with_discounts(){
			return this.total_a_repartir_with_discounts - this.total_repartido_with_discounts;
		},
	},
	methods: {

		check_sobrante_a_repartir_with_discounts(){
			console.log('check_sobrante_a_repartir with_discounts')
			console.log('sobrante_a_repartir_with_discounts:')
			console.log(this.sobrante_a_repartir_with_discounts)

			if (this.sobrante_a_repartir_with_discounts != 0) {

				if (this.sobrante_a_repartir_with_discounts > 0) {
					
					this.$toast.error('Todavia faltan repartir ' + this.price(this.sobrante_a_repartir_with_discounts))
				} else {
					
					this.$toast.error('Se repartieron ' + this.price(Math.abs(this.sobrante_a_repartir_with_discounts)) + ' de mas')
				}

				return false
			} 

			console.log('aprobo check_sobrante_a_repartir')
			return true
		},

		save_payment_methods_with_discounts() {

			if (this.check_sobrante_a_repartir_with_discounts()) {

				this.$store.commit('vender/setSelectedPaymentMethods', this.payment_methods_with_discounts);
				this.$store.commit('vender/setCurrentAcountPaymentMethodId', 0);
				
				this.$bvModal.hide('payment-methods-with-discounts-modal')
				this.$bvModal.hide('payment-method-modal')

			} 
		},
	}
}