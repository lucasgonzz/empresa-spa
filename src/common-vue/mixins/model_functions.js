import dates from '@/common-vue/mixins/dates'
// import select_payment_methods_vender from '@/mixins/vender/select_payment_methods'
// import select_payment_methods_expense from '@/mixins/expense/select_payment_methods'
export default {
	mixins: [dates],
	methods: {

	    has_many_slot_items(properties) {
	        const items = []

	        properties.forEach((prop) => {
	            if (prop.has_many) {
		            const child_props = this.modelPropertiesFromName(prop.has_many.model_name) || []

		            child_props.forEach((child_prop) => {
		                items.push({
		                    slot_name: this.get_slot_has_many(child_prop),
		                    has_many_prop: prop,
		                    child_prop: child_prop,
		                })
		            })
	            }

	        })

	        return items
	    },
	    
		get_slot_has_many(prop) {
			return 'has-many-prop-'+prop.key
		},
	    
		getBadgeValue(prop, model) {
			if (prop.badge && prop.badge.function) {
				return this[prop.badge.function](model, prop);
			}
			return 0;
		},
		get_payment_methods_count(model) {
			if (model.payment_methods) {
				return model.payment_methods.length
			}
			return 0
		},
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
			console.log(prop)
            if (prop.button && prop.button.emit) {
                this.$emit(prop.button.emit, model)
                return
            }
			prop.button.call_functions.forEach(funcion => {
				this[funcion.name](...funcion.params)
			})
		},
		/**
		 * Prompt 517 (v_if_function usado en src/models/provider_order_extra_cost.js): muestra los
		 * campos de alicuota ("iva_id") y "en_factura_compra" de un costo extra de la compra solo
		 * cuando ese costo extra esta marcado como facturado.
		 *
		 * @param {Object} prop propiedad del modelo que declara este v_if_function.
		 * @param {Object} model el costo extra (provider_order_extra_cost) que se esta editando.
		 * @returns {Boolean}
		 */
		show_costo_extra_si_facturado(prop, model) {
			return !!(model && model.facturado)
		},
		/**
		 * Prompt 517 (v_if_function usado en src/models/provider_order_extra_cost.js): muestra los
		 * campos de emisor ("emisor_cuit"/"emisor_razon_social") de un costo extra solo cuando esta
		 * facturado Y la factura NO va dentro de la factura de la compra (se factura aparte).
		 *
		 * @param {Object} prop propiedad del modelo que declara este v_if_function.
		 * @param {Object} model el costo extra (provider_order_extra_cost) que se esta editando.
		 * @returns {Boolean}
		 */
		show_costo_extra_si_factura_aparte(prop, model) {
			return !!(model && model.facturado && !model.en_factura_compra)
		},
	}
}