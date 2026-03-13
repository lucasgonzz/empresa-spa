import vender_set_total from '@/mixins/vender_set_total'
import payment_methods from '@/mixins/vender/guardar_venta/chequeos/payment_methods'
export default {
	mixins: [vender_set_total, payment_methods],
	computed: {
	
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		current_acount_payment_methods() {
			return this.$store.state.current_acount_payment_method.models
		},
		
		vender_current_acount_payment_method_id() {
			return this.$store.state.vender.current_acount_payment_method_id
		},
		modal_payment_metohds() {
			return this.$store.state.vender.modal_payment_methods
		},

	},
	methods: {


		aplicar_monto_descuento(total, current_acount_payment_method_id, selected_payment_method = null) {
			let monto_descuento = 0

			let descuento = this.get_payment_method_discount(current_acount_payment_method_id)

			if (typeof descuento != 'undefined') {
				monto_descuento = total * Number(descuento.discount_percentage) / 100

			} 

			return total - monto_descuento
		},
		get_monto_descuento(total, current_acount_payment_method_id, selected_payment_method = null) {
			let monto_descuento = 0

			let descuento = this.get_payment_method_discount(current_acount_payment_method_id)

			if (typeof descuento != 'undefined') {
				monto_descuento = total * Number(descuento.discount_percentage) / 100
			} 

			return monto_descuento
		},

		get_payment_method_discount(payment_method_id) {
			return this.current_acount_payment_method_discounts.find(payment_method_discount => {
				return payment_method_discount.current_acount_payment_method_id == payment_method_id
			})
		},

		aplicar_cuotas(price, current_acount_payment_method_id) {
			console.log('aplicar_cuotas')

			price = Number(price)

			if (this.es_credito(current_acount_payment_method_id)) {

				console.log('aplicando cuotas a '+price)

				console.log('cuota_descuento '+this.cuota_descuento)
				console.log('cuota_recargo '+this.cuota_recargo)

				if (this.cuota_descuento) {

					// this.des.push('Aplicando descuento de '+this.cuota_descuento+'% por pago en '+this.cantidad_cuotas+' cuotas')

					let monto_descuento = price * Number(this.cuota_descuento) / 100
					// this.des.push('Monto descuento: '+this.price(monto_descuento))

					// monto_credito_real = price - monto_descuento

					// this.$store.commit('vender/set_cuota_monto_descuento', monto_descuento)

					price -= monto_descuento
					// this.des.push('Total con descuento: '+this.price(total))
				
				} else if (this.cuota_recargo) {

					console.log('sumando '+this.cuota_recargo+' a '+price)
					// this.des.push('Aplicando recargo de '+this.cuota_recargo+'% por pago en '+this.cantidad_cuotas+' cuotas')

					let monto_recargo = price * Number(this.cuota_recargo) / 100
					console.log('monto_recargo: '+monto_recargo)
					// this.des.push('Monto recargo: '+this.price(monto_recargo))

					// monto_credito_real = price + monto_recargo
				
					// this.$store.commit('vender/set_cuota_monto_recargo', monto_recargo)

					price += monto_recargo
					console.log('price: '+price)
					// this.des.push('Total con recargo: '+this.price(total))
				}
			}

			return price
		}

	}
}