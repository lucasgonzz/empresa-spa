import dates from '@/common-vue/mixins/dates'
import select_payment_methods_vender from '@/mixins/vender/select_payment_methods'
import select_payment_methods_expense from '@/mixins/expense/select_payment_methods'
export default {
	mixins: [dates, select_payment_methods_vender, select_payment_methods_expense],
	methods: {
		getFunctionValue(prop, model) {
			return this[prop.function](model, prop)
		},
		showSelectPaymentMethodModal(model_name) {
			console.log('showSelectPaymentMethodModal', model_name)
			if (model_name == 'vender') {
				this.init_modal_payment_metohds()
				this.$store.commit('vender/current_acount_payment_methods/set_total_a_repartir', this.$store.state.vender.sub_total)
				this.$bvModal.show('payment-method-modal')
			} else if (model_name == 'expense') {
				this.init_modal_payment_metohds_expense() 
				this.$store.commit('expense/payment_methods/set_total_a_repartir', this.$store.state.expense.model.amount)
				this.$bvModal.show('select-expense-payment-method-modal')
			}
		},
		callMethod(prop, model) {
			console.log('callMethod called')
			prop.button.call_functions.forEach(funcion => {
				this[funcion.name](...funcion.params)
			})
		}
	}
}