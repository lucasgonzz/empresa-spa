export default {
	computed: {
		total_a_repartir: {
			get() {
				return this.$store.state.vender.current_acount_payment_methods.total_a_repartir
			},
			set(value) {
				this.$store.commit('vender/current_acount_payment_methods/set_total_a_repartir', value)
			}
		},
		total_repartido: {
			get() {
				return this.$store.state.vender.current_acount_payment_methods.total_repartido
			},
			set(value) {
				this.$store.commit('vender/current_acount_payment_methods/set_total_repartido', value)
			}
		},
		metodos_de_pago_seleccionados: {
			get() {
				return this.$store.state.vender.current_acount_payment_methods.metodos_de_pago_seleccionados
			},
			set(value) {
				this.$store.commit('vender/current_acount_payment_methods/set_metodos_de_pago_seleccionados', value)
			}
		},

		sobrante_a_repartir(){
			return this.total_a_repartir - this.total_repartido;
		},
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
	},
	methods: {
		set_total_desde_previus_sale() {
			console.log('set_total_desde_previus_sale')

			let payment_methods_para_modal = []
			let total_repartido = 0


			console.log('this.previus_sale.current_acount_payment_methods:')
			console.log(this.previus_sale.current_acount_payment_methods)
			
			this.previus_sale.current_acount_payment_methods.forEach(payment_method => {
				payment_methods_para_modal[payment_method.id] = payment_method.pivot.amount 
				total_repartido += Number(payment_method.pivot.amount)
			})

			console.log('payment_methods_para_modal')
			console.log(payment_methods_para_modal)

			
			let payment_methods_para_vender = this.limpiar_array(payment_methods_para_modal)
			console.log('payment_methods_para_vender:')
			console.log(payment_methods_para_vender)

			this.$store.commit('vender/current_acount_payment_methods/set_metodos_de_pago_seleccionados', payment_methods_para_modal)
			this.$store.commit('vender/current_acount_payment_methods/set_total_repartido', total_repartido)
			this.$store.commit('vender/setSelectedPaymentMethods', payment_methods_para_vender);

		},

		check_sobrante_a_repartir(){
			console.log('check_sobrante_a_repartir')
			if (this.sobrante_a_repartir != 0) {
				if (this.sobrante_a_repartir > 0) {
					this.$toast.error('Todavia faltan repartir ' + this.price(this.sobrante_a_repartir))
				} else {
					this.$toast.error('Se repartieron ' + this.price(Math.abs(this.sobrante_a_repartir)) + ' de mas')
				}
				return false
			} else {
				console.log('aprobo check_sobrante_a_repartir')
				return true
			}
		},

		limpiar_array(metodos_de_pago) {
			const array_con_los_metodos_de_pago = [];
			for (const [key, value] of Object.entries(metodos_de_pago)) {
				if (value !== 0 && value !=='') {
					array_con_los_metodos_de_pago.push({ id:key , monto: value });
				}
			}

			return array_con_los_metodos_de_pago
		},

		guardarMetodosPago() {

			let array_con_los_metodos_de_pago = this.limpiar_array(this.metodos_de_pago_seleccionados)

			if (this.check_sobrante_a_repartir()) {
				this.$store.commit('vender/setSelectedPaymentMethods', array_con_los_metodos_de_pago);
				this.$store.commit('vender/setCurrentAcountPaymentMethodId', 0);
				this.$bvModal.hide('payment-method-modal')
				return true 
			}
			console.log('No paso guardarMetodosPago')
			return false 
		},
	}
}