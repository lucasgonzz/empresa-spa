import expense_set_total from '@/mixins/expense_set_total'
// import payment_methods from '@/mixins/vender/guardar_venta/chequeos/payment_methods' // No es necesario, lo manejamos directamente
export default {
	mixins: [expense_set_total], // mixin_vender_set_total adaptado
	computed: {
		total_a_repartir: {
			get() {
				return this.$store.state.expense.payment_methods.total_a_repartir
			},
			set(value) {
				this.$store.commit('expense/payment_methods/set_total_a_repartir', value)
			}
		},
		total_repartido: {
			get() {
				return this.$store.state.expense.payment_methods.total_repartido
			},
			set(value) {
				this.$store.commit('expense/payment_methods/set_total_repartido', value)
			}
		},
		modal_payment_methods: {
			get() {
				return this.$store.state.expense.payment_methods.payment_methods
			},
			set(value) {
				this.$store.commit('expense/payment_methods/set_payment_methods', value)
			}
		},
		sobrante_a_repartir(){
			return this.total_a_repartir - this.total_repartido;
		},
		current_acount_payment_methods() {
			return this.$store.state.current_acount_payment_method.models
		},
		selected_payment_methods() {
			return this.$store.state.expense.selected_payment_methods
		},
	},
	data() {
		return {
			discount_percentage: null,
			discount_amount: null,
		}
	},
	methods: {
		init_modal_payment_metohds_expense() {
			let payment_methods = []
			let total_repartido = 0
			this.current_acount_payment_methods.forEach(payment_method => {
				let selected = this.selected_payment_methods.find(selected => selected.id == payment_method.id)
				let amount = ''
				let caja_id = payment_method.caja_id
				if (typeof selected != 'undefined') {
					amount = selected.pivot.amount
					total_repartido += Number(amount)
					if (selected.pivot.caja_id) {
						caja_id = selected.pivot.caja_id
					}
				}

				payment_methods.push({
					...payment_method,
					caja_id,
					amount,
				})
			})

			this.$store.commit('expense/payment_methods/set_payment_methods', payment_methods)
			this.total_repartido = total_repartido
		},
		guardarMetodosPago() {

			if (this.check_sobrante_a_repartir()) {
				
				this.$store.commit('expense/set_selected_payment_methods', this.modal_payment_methods);
				
				this.$store.commit('expense/payment_methods/set_watch_activado', false);

				this.setTotal() // Calcula el total del gasto con los metodos de pago
				
				// No tenemos descuentos aplicados a metodos de pago en gastos por ahora, asi que simplemente los guardamos
				this.set_expense_payment_methods()

				this.$bvModal.hide('select-expense-payment-method-modal')

				setTimeout(() => {
					this.$store.commit('expense/payment_methods/set_watch_activado', true);
				}, 1000)

				// this.$store.commit('expense/set_caja_id', 0) // No seteamos caja_id a 0, se mantiene la del gasto

				return true 
			}
			console.log('No paso guardarMetodosPago')
			return false 
		},

		set_expense_payment_methods() {
			let payment_methods = []
			this.modal_payment_methods.forEach(payment_method => {
				if (payment_method.amount) {
					payment_methods.push({
						...payment_method,
					})
				}
			})
			this.$store.commit('expense/set_selected_payment_methods', payment_methods);
		},

		limpiar_descuentos_anteriores() {
			this.discount_percentage = null
			this.discount_amount = null
		},

		// No se utilizan en expenses por ahora
		// aplicar_current_acount_payment_method_discounts(total) {
		// 	return total
		// },

		// aplicar_monto_descuento(total, current_acount_payment_method_id, selected_payment_method = null) {
		// 	return total
		// },
		// get_monto_descuento(total, current_acount_payment_method_id, selected_payment_method = null) {
		// 	return 0
		// },

		// get_payment_method_discount(payment_method_id) {
		// 	return undefined
		// }
	}
}