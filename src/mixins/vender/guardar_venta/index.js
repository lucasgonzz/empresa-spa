import chequeos from '@/mixins/vender/guardar_venta/chequeos/index'
import limpiar_vender from '@/mixins/vender/limpiar_vender'
import default_payment_method from '@/mixins/vender/default_payment_method'
import omitir_en_cuenta_corriente from '@/mixins/vender/omitir_en_cuenta_corriente'
import default_articles from '@/mixins/vender/default_articles'
import facturar from '@/mixins/vender/guardar_venta/facturar'
import sonido_error from '@/mixins/sonido_error' 

import sync_sales from '@/offline/sync_sales' 
export default {
	mixins: [
		chequeos, 
		limpiar_vender, 
		default_payment_method, 
		omitir_en_cuenta_corriente, 
		default_articles,
		sonido_error,
		facturar,
		sync_sales,
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

				if (navigator.onLine) {
					this.guardar_venta_online()
				} else {
					this.guardar_venta_offline()
				}
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

		focus_bar_code() {

			if (this.view == 'remito') {
				let bar_code_input = document.getElementById('article-bar-code')
				if (bar_code_input) {
					bar_code_input.focus()
				}
			}
		},

		resetear_vender(online = true) {

			console.log('resetear_vender')

			this.focus_bar_code()
			
			this.limpiar_vender()

			this.setDefaultPaymentMethod()

			this.set_omitir_en_cuenta_corriente()


			this.set_default_articles()


			this.redirect_a_remito()

			if (online) {
				this.actualizar_cliente()
				this.facturar_venta()
			}
		},

		guardar_venta_online() {

			this.$store.dispatch('vender/vender', {
				discounts: this.get_models_by_id('discount', this.discounts_id),
				surchages: this.get_models_by_id('surchage', this.surchages_id),
			})
			.then(() => {
				this.resetear_vender()
			})
			.catch(err => {
				console.log(err)
				this.sonido_error()
				this.$toast.error('Error al guardar venta', {
					duration: 10000
				})
				this.$toast.error(err)
			})
		},

		async guardar_venta_offline() {

			let sale_data = {
				save_afip_ticket: this.$store.state.vender.save_afip_ticket,
				items: this.$store.state.vender.items,
				client_id: this.$store.state.vender.client ? this.$store.state.vender.client.id : null ,
				discounts: this.get_models_by_id('discount', this.discounts_id),
				surchages: this.get_models_by_id('surchage', this.surchages_id),
				save_current_acount: this.$store.state.vender.save_current_acount,
				make_current_acount_pago: this.$store.state.vender.make_current_acount_pago,
				sale_type_id: this.$store.state.vender.sale_type_id,
				discounts_in_services: this.$store.state.vender.discounts_in_services,
				surchages_in_services: this.$store.state.vender.surchages_in_services,
				current_acount_payment_method_id: this.$store.state.vender.current_acount_payment_method_id,
				afip_information_id: this.$store.state.vender.afip_information_id,
				employee_id: this.$store.state.vender.employee_id,
				address_id: this.$store.state.vender.address_id,
				to_check: this.$store.state.vender.to_check,
				checked: this.$store.state.vender.checked,
				confirmed: this.$store.state.vender.confirmed,
				observations: this.$store.state.vender.observations,
				omitir_en_cuenta_corriente: this.$store.state.vender.omitir_en_cuenta_corriente,
				numero_orden_de_compra: this.$store.state.vender.numero_orden_de_compra,
				selected_payment_methods: this.$store.state.vender.selected_payment_methods,
				discount_percentage: this.$store.state.vender.discount_percentage,
				discount_amount: this.$store.state.vender.discount_amount,
				sub_total: this.$store.state.vender.sub_total,
				price_type_id: this.$store.state.vender.price_type ? this.$store.state.vender.price_type.id : null,
				total: this.$store.state.vender.total,
				seller_id: this.$store.state.vender.seller_id,
				cuota_id: this.$store.state.vender.cuota_id,
				cantidad_cuotas: this.$store.state.vender.cantidad_cuotas,
				cuota_descuento: this.$store.state.vender.cuota_descuento,
				cuota_recargo: this.$store.state.vender.cuota_recargo,
				monto_credito_real: this.$store.state.vender.monto_credito_real,
				caja_id: this.$store.state.vender.caja_id,
				afip_tipo_comprobante_id: this.$store.state.vender.afip_tipo_comprobante_id,
				descuento: this.$store.state.vender.descuento,
				fecha_entrega: this.$store.state.vender.fecha_entrega,
			}

			await this.save_sale_offline(sale_data)

			this.resetear_vender(false)

		}
		
	}
}