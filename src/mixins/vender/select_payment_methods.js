import vender_set_total from '@/mixins/vender_set_total'
import payment_methods from '@/mixins/vender/guardar_venta/chequeos/payment_methods'
export default {
	mixins: [vender_set_total, payment_methods],
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
				return this.$store.state.vender.current_acount_payment_methods.payment_methods
			},
			set(value) {
				this.$store.commit('vender/current_acount_payment_methods/set_payment_methods', value)
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
		// current_acount_payment_method_discounts() {
		// 	return this.$store.state.current_acount_payment_method_discount.models
		// },
		vender_current_acount_payment_method_id() {
			return this.$store.state.vender.current_acount_payment_method_id
		},
		modal_payment_metohds() {
			return this.$store.state.vender.current_acount_payment_methods.payment_methods
		},

		has_payment_methods_with_disconts() {
			return this.current_acount_payment_method_discounts.length
		}
	},
	data() {
		return {
			discount_percentage: null,
			discount_amount: null,
		}
	},
	methods: {
        // get_price_with_discount_in_vender(article, prop) {
        //     console.log('get_price_with_discount_in_vender article:')
        //     console.log(article)
        //     console.log(prop)
        //     if (typeof article != 'undefined' && typeof prop != 'undefined') {

        //         console.log('payment_method id: '+prop.key.substr(15))
        //         return this.get_monto_descuento(article.price_vender, prop.key.substr(15))
        //     }
        // },
		init_modal_payment_metohds() {

			let payment_methods = []

			this.current_acount_payment_methods.forEach(payment_method => {
				payment_methods.push({
					...payment_method,
					caja_id: 0,
					amount: ''
				})
			})

			this.$store.commit('vender/current_acount_payment_methods/set_payment_methods', payment_methods)
			this.total_repartido = 0
		},

		set_total_desde_previus_sale() {
			console.log('set_total_desde_previus_sale')

			let payment_methods_para_modal = []
			let total_repartido = 0

			this.previus_sale.current_acount_payment_methods.forEach(payment_method => {

				// payment_methods_para_modal[payment_method.id] = payment_method.pivot.amount 

				payment_methods_para_modal.push({
					...payment_method,
					amount: payment_method.pivot.amount
				})

				total_repartido += Number(payment_method.pivot.amount)
				
				if (payment_method.pivot.discount_amount) {

					total_repartido -= Number(payment_method.pivot.discount_amount)
				}
			})

			this.$store.commit('vender/current_acount_payment_methods/set_payment_methods', payment_methods_para_modal)
			this.$store.commit('vender/current_acount_payment_methods/set_total_repartido', total_repartido)
			this.$store.commit('vender/setSelectedPaymentMethods', payment_methods_para_modal);

			this.setTotal()
		},

		

		guardarMetodosPago() {

			if (this.check_sobrante_a_repartir()) {
				
				this.$store.commit('vender/setSelectedPaymentMethods', this.modal_payment_metohds);
				this.$store.commit('vender/setCurrentAcountPaymentMethodId', 0);
				
				this.$store.commit('vender/current_acount_payment_methods/set_watch_activado', false);

				this.setTotal()
				
				if (this.has_payment_methods_with_disconts) {

					this.set_payment_methods_with_discounts()

				} else {

					this.set_vender_payment_methods()

					this.$bvModal.hide('payment-method-modal')
				}

				setTimeout(() => {
					this.$store.commit('vender/current_acount_payment_methods/set_watch_activado', true);
				}, 1000)

				this.$store.commit('vender/set_caja_id', 0)

				return true 
			}
			console.log('No paso guardarMetodosPago')
			return false 
		},

		set_payment_methods_with_discounts() {

			let payment_methods = []

			this.modal_payment_metohds.forEach(payment_method => {

				if (payment_method.amount) {

					payment_methods.push({
						...payment_method,
						amount: '',
					})
				}
			})
			
			this.$store.commit('vender/current_acount_payment_methods_with_discounts/set_payment_methods', payment_methods)

		},

		set_vender_payment_methods() {

			let payment_methods = []

			this.modal_payment_metohds.forEach(payment_method => {

				if (payment_method.amount) {

					payment_methods.push({
						...payment_method,
					})
				}
			})
			
			this.$store.commit('vender/setSelectedPaymentMethods', payment_methods);

		},

		limpiar_descuentos_anteriores() {
			this.discount_percentage = null
			this.discount_amount = null
		},

		aplicar_current_acount_payment_method_discounts(total) {

			if (this.current_acount_payment_method_discounts.length) {

				let descuento = 0

				this.limpiar_descuentos_anteriores()

				if (this.modal_payment_metohds.length) {
					
					this.modal_payment_metohds.forEach(selected_payment_method => {
						
						descuento = this.get_monto_descuento(selected_payment_method.amount, Number(selected_payment_method.id), selected_payment_method)

						this.$set(selected_payment_method, 'monto_descuento', descuento)

						console.log('descontando '+descuento+' de '+selected_payment_method.name)

						total -= descuento

						selected_payment_method.discount_percentage = this.discount_percentage
						selected_payment_method.discount_amount = this.discount_amount

					})
				}

			}

			return total
		},

		aplicar_monto_descuento(total, current_acount_payment_method_id, selected_payment_method = null) {
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

			return total - monto_descuento
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

		// limpiar_array(metodos_de_pago) {
		// 	const modal_payment_metohds = [];
		// 	for (const [key, value] of Object.entries(metodos_de_pago)) {
		// 		if (value !== 0 && value !=='') {
		// 			modal_payment_metohds.push({ id:key , monto: value });
		// 		}
		// 	}

		// 	return modal_payment_metohds
		// },
	}
}