import vender_set_total from '@/mixins/vender_set_total'
export default {
	mixins: [vender_set_total],
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
		modal_payment_methods: {
			get() {
				return this.$store.state.vender.current_acount_payment_methods.metodos_de_pago_seleccionados
			},
			set(value) {
				console.log('se esta llamando desde aca')
				this.$store.commit('vender/current_acount_payment_methods/set_metodos_de_pago_seleccionados', value)
			}
		},

		sobrante_a_repartir(){
			return this.total_a_repartir - this.total_repartido;
		},
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		current_acount_payment_methods() {
			return this.$store.state.current_acount_payment_method.models
		},
		current_acount_payment_method_discounts() {
			return this.$store.state.current_acount_payment_method_discount.models
		},
		vender_current_acount_payment_method_id() {
			return this.$store.state.vender.current_acount_payment_method_id
		},
		modal_payment_metohds() {
			return this.$store.state.vender.current_acount_payment_methods.metodos_de_pago_seleccionados
		},
	},
	data() {
		return {
			discount_percentage: null,
			discount_amount: null,
		}
	},
	methods: {
		init_modal_payment_metohds() {
			let payment_methods = []
			this.current_acount_payment_methods.forEach(payment_method => {
				payment_methods.push({
					...payment_method,
					amount: ''
				})
			})
			console.log('init_modal_payment_metohds:')
			console.log(payment_methods)
			this.$store.commit('vender/current_acount_payment_methods/set_metodos_de_pago_seleccionados', payment_methods)
		},
		set_total_desde_previus_sale() {
			console.log('set_total_desde_previus_sale')

			let payment_methods_para_modal = []
			let total_repartido = 0

			this.previus_sale.current_acount_payment_methods.forEach(payment_method => {
				payment_methods_para_modal[payment_method.id] = payment_method.pivot.amount 
				total_repartido += Number(payment_method.pivot.amount)
			})

			let payment_methods_para_vender = this.limpiar_array(payment_methods_para_modal)

			this.$store.commit('vender/current_acount_payment_methods/set_metodos_de_pago_seleccionados', payment_methods_para_modal)
			this.$store.commit('vender/current_acount_payment_methods/set_total_repartido', total_repartido)
			this.$store.commit('vender/setSelectedPaymentMethods', payment_methods_para_vender);

			this.setTotal()
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

			let array_con_los_metodos_de_pago = this.modal_payment_metohds

			console.log('antes de entrar')
			if (this.check_sobrante_a_repartir()) {
				
				this.$store.commit('vender/setSelectedPaymentMethods', array_con_los_metodos_de_pago);
				this.$store.commit('vender/setCurrentAcountPaymentMethodId', 0);
				
				this.$store.commit('vender/current_acount_payment_methods/set_watch_activado', false);

				this.setTotal()
				console.log('paso setTotal')
				
				if (this.current_acount_payment_method_discounts.length) {

					this.set_payment_methods_with_discounts(array_con_los_metodos_de_pago)
					console.log('ENTRO')

					// this.$bvModal.show('payment-methods-with-discounts-modal')
				} else {

					this.$bvModal.hide('payment-method-modal')
				}

				setTimeout(() => {
					this.$store.commit('vender/current_acount_payment_methods/set_watch_activado', true);
				}, 1000)

				return true 
			}
			console.log('No paso guardarMetodosPago')
			return false 
		},

		set_payment_methods_with_discounts(array_con_los_metodos_de_pago) {
			console.log('se setearon payment_methods con descuentos:')
			console.log(array_con_los_metodos_de_pago)
			this.$store.commit('vender/current_acount_payment_methods_with_discounts/set_metodos_de_pago_seleccionados', array_con_los_metodos_de_pago)
		},

		limpiar_descuentos_anteriores() {
			this.discount_percentage = null
			this.discount_amount = null
		},

		_aplicar_current_acount_payment_method_discounts(total) {

			if (this.current_acount_payment_method_discounts.length) {

				let descuento = 0

				this.limpiar_descuentos_anteriores()

				if (this.vender_current_acount_payment_method_id) {

					descuento = this.get_monto_descuento(total, this.vender_current_acount_payment_method_id)

					total -= descuento

					this.$store.commit('vender/set_payment_method_discount_percentage', this.discount_percentage)
					this.$store.commit('vender/set_payment_method_discount_amount', this.discount_amount)

				} else if (this.modal_payment_metohds.length) {
					
					this.modal_payment_metohds.forEach(selected_payment_method => {
						
						descuento = this.get_monto_descuento(selected_payment_method.amount, Number(selected_payment_method.id), selected_payment_method)

						selected_payment_method.monto_descuento = descuento 

						total -= descuento

						selected_payment_method.discount_percentage = this.discount_percentage
						selected_payment_method.discount_amount = this.discount_amount

					})
				}

			}

			return total
		},

		get_monto_descuento(total, current_acount_payment_method_id, selected_payment_method = null) {
			let monto_descuento = 0

			let descuento = this.get_payment_method_discount(current_acount_payment_method_id)

			if (typeof descuento != 'undefined') {
				monto_descuento = total * Number(descuento.discount_percentage) / 100

				this.discount_percentage = descuento.discount_percentage
				this.discount_amount = monto_descuento

				// if (selected_payment_method) {
				// 	selected_payment_method.discount_percentage = descuento.discount_percentage
				// 	selected_payment_method.discount_amount = monto_descuento
				// }
			} else {
				this.limpiar_descuentos_anteriores()
			}

			return monto_descuento
		},

		get_payment_method_discount(payment_method_id) {
			return this.current_acount_payment_method_discounts.find(payment_method_discount => {
				return payment_method_discount.current_acount_payment_method_id == payment_method_id
			})
		}
	}
}