export default {
	computed: {
		expense_amount() {
			return this.$store.state.expense.model.amount
		},
		payment_methods() {
			return this.$store.state.expense.model.payment_methods 
		},
	},
	methods: {
		setTotal() {
			let total = Number(this.expense_amount)
			
			// If we had discounts/surcharges for expenses based on payment methods, we would apply them here.
			// For now, it's just the expense amount.
			// total = this.aplicar_current_acount_payment_method_discounts(total)

			this.$store.commit('expense/payment_methods/set_total_a_repartir', total)
			this.$store.commit('expense/payment_methods/set_total_repartido', this.getTotalRepartido())
		},
		getTotalRepartido() {
			let total_repartido = 0
			this.payment_methods.forEach(payment_method => {
				if (payment_method.amount) {
					total_repartido += Number(payment_method.amount)
				}
			})
			return total_repartido
		},
		check_sobrante_a_repartir() {
			if (this.sobrante_a_repartir != 0) {
				this.$toast.error('El sobrante a repartir debe ser 0');
				return false;
			}
			return true;
		},
	}
}