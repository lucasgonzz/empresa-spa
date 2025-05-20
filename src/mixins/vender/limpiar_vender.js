import start_methods from '@/mixins/start_methods'
import vender_set_total from '@/mixins/vender_set_total'
import set_price_type from '@/mixins/vender/price_types'
export default {
	mixins: [start_methods, vender_set_total, set_price_type],
	computed: {
		discounts() {
			return this.$store.state.discount.models
		},
		surchages() {
			return this.$store.state.surchage.models
		},
	},
	methods: {
		limpiar_vender() {
			console.log('limpiar_vender')
			
			this.$store.commit('vender/previus_sales/setIndex', 0)
			this.$store.commit('vender/previus_sales/setPreviusSale', {})
			this.$store.commit('vender/setToCheck', 0)
			this.$store.commit('vender/setChecked', 0)
			this.$store.commit('vender/setConfirmed', 0)
			this.$store.commit('vender/setItems', [])

			this.$store.commit('vender/set_descuento', null)
			this.$store.commit('vender/setDiscountsId', [])
			this.$store.commit('vender/setSurchagesId', [])

			this.$store.commit('vender/setClient', null)
			this.$store.commit('vender/setReturnedItems', [])
			this.$store.commit('vender/setSaveNotaCredito', 0)
			this.$store.commit('vender/setNotaCreditoDescription', '')
			// this.$store.commit('vender/setTotal')
			this.$store.commit('vender/setObservations', '')
			this.$store.commit('vender/setGuardarComoPresupuesto', 0)
			this.$store.commit('vender/setBudget', null)
			this.$store.commit('vender/setPriceType', null)
			this.$store.commit('vender/set_numero_orden_de_compra', '')
			this.$store.commit('vender/set_omitir_en_cuenta_corriente', 0)
			
			this.$store.commit('vender/setSelectedPaymentMethods', [])

			this.$store.commit('vender/current_acount_payment_methods/set_payment_methods', [])

			this.$store.commit('vender/setDiscountsInServices', 0)
			this.$store.commit('vender/setSurchagesInServices', 0)

			this.$store.commit('vender/set_omitir_en_cuenta_corriente', 0)
			
			this.$store.commit('vender/setSellerId', 0)

			this.$store.commit('vender/set_fecha_entrega', null)

			// this.$store.commit('vender/set_caja_id', 0)
			
			// this.$store.commit('vender/set_afip_tipo_comprobante_id', 0)

			this.setTotal()

			this.checkAddressCookie()

			this.limpiar_descuentos()

			this.limpiar_recargos()

			this.limpiar_cuotas()

			this.setPriceType()
		},
		limpiar_descuentos() {

			this.discounts.forEach(discount => {
				if (discount.deleted_at) {
					this.$store.commit('discount/setDelete', discount)
					this.$store.commit('discount/delete')
				} else if (discount.updated_percentage) {
					discount.percentage = discount.updated_percentage
					discount.updated_percentage = null
				}
			})

		},
		limpiar_recargos() {

			this.surchages.forEach(surchage => {
				if (surchage.deleted_at) {
					this.$store.commit('surchage/setDelete', surchage)
					this.$store.commit('surchage/delete')
				} else if (surchage.updated_percentage) {
					surchage.percentage = surchage.updated_percentage
					surchage.updated_percentage = null
				}
			})

		},
		limpiar_cuotas() {
			this.$store.commit('vender/set_cuota_id', 0)
			this.$store.commit('vender/set_cantidad_cuotas', null)
			this.$store.commit('vender/set_cuota_descuento', null)
			this.$store.commit('vender/set_cuota_recargo', null)
		},
	}
}