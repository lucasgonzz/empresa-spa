import chequeos from '@/mixins/vender/guardar_venta/chequeos/index'
import limpiar_vender from '@/mixins/vender/limpiar_vender'
import default_payment_method from '@/mixins/vender/default_payment_method'
import omitir_en_cuenta_corriente from '@/mixins/vender/omitir_en_cuenta_corriente'
import default_articles from '@/mixins/vender/default_articles'
import facturar from '@/mixins/vender/guardar_venta/facturar'
import sonido_error from '@/mixins/sonido_error' 
export default {
	mixins: [
		chequeos, 
		limpiar_vender, 
		default_payment_method, 
		omitir_en_cuenta_corriente, 
		default_articles,
		sonido_error,
		facturar,
	],
	computed: {
		to_check() {
			return this.$store.state.vender.to_check
		},
		checked() {
			return this.$store.state.vender.checked
		},
		confirmed() {
			return this.$store.state.vender.confirmed
		},

		discounts_id() {
			return this.$store.state.vender.discounts_id
		},
		surchages_id() {
			return this.$store.state.vender.surchages_id
		},
		maked_sale() {
            return this.$store.state.vender.sale
        },
	},
	methods: {
		guardar_venta() {

			if (this.checkear_vender()) {

				
				// Aca antes descontaba el stock de los articulos ya descargados

				this.$store.dispatch('vender/vender', {
					discounts: this.get_discounts(),
					surchages: this.get_surchages(),
				})
				.then(() => {

					this.focus_bar_code()
					
					this.limpiar_vender()

					this.setDefaultPaymentMethod()

					this.set_omitir_en_cuenta_corriente()

					this.actualizar_cliente()

					this.set_default_articles()

					this.facturar_venta()

					this.redirect_a_remito()

				})
				.catch(err => {
					console.log(err)
					this.sonido_error()
					this.$toast.error('Error al guardar venta', {
						duration: 10000
					})
					this.$toast.error(err)
				})
			}
		},


		actualizar_cliente() {

			if (this.maked_sale.client_id && this.maked_sale.save_current_acount) {
				this.loadModel('client', this.maked_sale.client_id)
			}
		},

		redirect_a_remito() {

			if (this.view != 'remito') {
				this.$router.push({name: 'vender', params: {view: 'remito'}})
			}
		},


		get_discounts() {
			let discounts = []

			this.discounts_id.forEach(discount_id => {
				let store_discount = this.$store.state.discount.models.find(discount => {
					return discount.id == discount_id
				})
				if (typeof store_discount != 'undefined') {
					discounts.push(store_discount)
				}
			})

			return discounts
		},
		get_surchages() {
			let surchages = []

			this.surchages_id.forEach(surchage_id => {
				let store_surchage = this.$store.state.surchage.models.find(surchage => {
					return surchage.id == surchage_id
				})
				if (typeof store_surchage != 'undefined') {
					surchages.push(store_surchage)
				}
			})

			return surchages
		},

		focus_bar_code() {

			if (this.view == 'remito') {
				let bar_code_input = document.getElementById('article-bar-code')
				if (bar_code_input) {
					bar_code_input.focus()
				}
			}
		}
		
	}
}