import mercado_pago_qr from '@/mixins/mercado_pago_qr'
import vender_set_total from '@/mixins/vender_set_total'

/**
 * Lo que comparten el botón "Cobrar con QR" (components/vender/components/CobrarConQr.vue) y el
 * modal "Esperando el pago" (components/vender/modals/CobroQrMercadoPago.vue) sobre la venta en
 * curso (misión cobro-qr-mercado-pago, 26/10/2026):
 *
 * - La FOTO del cobro de la venta antes de que el QR ponga su método: método único, reparto en
 *   varios métodos, cuotas y caja. Si el cobro no se llega a crear, el cajero lo cancela, lo cierra
 *   sin pago o quita el cobro QR de la venta, la venta vuelve a como estaba. Sin esto, cancelar un
 *   QR dejaba la venta con el método de Mercado Pago puesto y el reparto que había armado perdido.
 * - Poner un método de pago como método único (lo que hace el QR).
 * - Refrescar la lista de pagos QR sin venta (`GET /api/mercado-pago/qr/cobros?pagados_sin_venta=1`).
 *
 * La foto vive en el store (`vender.mercado_pago_qr_foto_del_pago`) porque la saca el botón y la
 * puede restaurar el modal; limpiar_vender() la borra.
 */
export default {
	mixins: [mercado_pago_qr, vender_set_total],
	methods: {
		/**
		 * Saca la foto del cobro de la venta, si todavía no hay una. Si ya hay, se conserva la primera:
		 * es la de antes de que cualquier QR tocara la venta (volver a generar o usar otro pago QR no
		 * tiene que pisarla con el método del QR).
		 *
		 * @returns {void}
		 */
		qr_sacar_foto_del_pago() {
			if (this.$store.state.vender.mercado_pago_qr_foto_del_pago) {
				return
			}

			let vender = this.$store.state.vender

			/*
				Copia profunda: el reparto y las líneas del modal de métodos de pago son objetos que se
				siguen editando en el store, y una referencia los traería ya cambiados.
			*/
			let copiar = valor => {
				return JSON.parse(JSON.stringify(typeof valor == 'undefined' ? null : valor))
			}

			this.$store.commit('vender/set_mercado_pago_qr_foto_del_pago', {
				current_acount_payment_method_id: vender.current_acount_payment_method_id,
				selected_payment_methods: copiar(vender.selected_payment_methods || []),
				modal_payment_methods: copiar(vender.modal_payment_methods || []),
				reparto_payment_methods: copiar(vender.current_acount_payment_methods ? vender.current_acount_payment_methods.payment_methods : []),
				cuota_id: vender.cuota_id,
				monto_credito: vender.monto_credito,
				cantidad_cuotas: vender.cantidad_cuotas,
				cuota_descuento: vender.cuota_descuento,
				cuota_recargo: vender.cuota_recargo,
				cuota_monto_descuento: vender.cuota_monto_descuento,
				cuota_monto_recargo: vender.cuota_monto_recargo,
				caja_id: vender.caja_id,
			})
		},

		/**
		 * Vuelve la venta al cobro de la foto y recalcula el total. Sin foto, no hace nada.
		 *
		 * 🔴 La caja se repone un tick DESPUÉS del método: al cambiar el método, Caja.vue aplica la caja
		 * por defecto en su watcher, que corre en ese tick, y pisaría la caja de la foto.
		 *
		 * @returns {Boolean} true si había foto y se restauró.
		 */
		qr_restaurar_foto_del_pago() {
			let foto = this.$store.state.vender.mercado_pago_qr_foto_del_pago
			if (!foto) {
				return false
			}

			this.$store.commit('vender/setCurrentAcountPaymentMethodId', foto.current_acount_payment_method_id)
			this.$store.commit('vender/setSelectedPaymentMethods', foto.selected_payment_methods || [])
			this.$store.commit('vender/current_acount_payment_methods/set_payment_methods', foto.reparto_payment_methods || [])
			this.$store.commit('vender/set_modal_payment_methods', foto.modal_payment_methods || [])

			this.$store.commit('vender/set_cuota_id', foto.cuota_id)
			this.$store.commit('vender/set_monto_credito', foto.monto_credito)
			this.$store.commit('vender/set_cantidad_cuotas', foto.cantidad_cuotas)
			this.$store.commit('vender/set_cuota_descuento', foto.cuota_descuento)
			this.$store.commit('vender/set_cuota_recargo', foto.cuota_recargo)
			this.$store.commit('vender/set_cuota_monto_descuento', foto.cuota_monto_descuento)
			this.$store.commit('vender/set_cuota_monto_recargo', foto.cuota_monto_recargo)

			this.$store.commit('vender/set_mercado_pago_qr_foto_del_pago', null)

			this.setTotal()

			this.$nextTick(() => {
				this.$store.commit('vender/set_caja_id', foto.caja_id)
			})

			return true
		},

		/**
		 * Deja la venta con un método de pago como método único: vacía el reparto en varios métodos y
		 * las cuotas igual que PaymentMethod.vue::set_payment_methods_null(), y recalcula el total (el
		 * método puede tener descuento o recargo). Antes saca la foto, si no la había.
		 *
		 * @param {Number} current_acount_payment_method_id Método a poner.
		 * @returns {Boolean} true si el método cambió (hay que aplicar su caja por defecto).
		 */
		qr_poner_metodo_unico(current_acount_payment_method_id) {
			this.qr_sacar_foto_del_pago()

			let cambio = Number(this.$store.state.vender.current_acount_payment_method_id) != Number(current_acount_payment_method_id)

			this.$store.commit('vender/setCurrentAcountPaymentMethodId', current_acount_payment_method_id)

			this.$store.commit('vender/setSelectedPaymentMethods', [])
			this.$store.commit('vender/current_acount_payment_methods/set_payment_methods', [])
			/* El reparto quedó sin efecto, así que sus montos de descuento/recargo también */
			this.$store.commit('vender/set_modal_payment_methods', [])

			/* Las cuotas son del método anterior (mismas mutaciones que limpiar_cuotas() de PaymentMethod.vue) */
			this.$store.commit('vender/set_cuota_id', 0)
			this.$store.commit('vender/set_monto_credito', 0)
			this.$store.commit('vender/set_cantidad_cuotas', 0)
			this.$store.commit('vender/set_cuota_descuento', null)
			this.$store.commit('vender/set_cuota_recargo', null)
			this.$store.commit('vender/set_cuota_monto_descuento', null)
			this.$store.commit('vender/set_cuota_monto_recargo', null)

			this.setTotal()

			return cambio
		},

		/**
		 * Vuelve a pedir los pagos QR sin venta y los deja en el store. Cualquier error (404 de una
		 * API vieja, red) deja la lista vacía sin avisar nada: el aviso simplemente no aparece.
		 *
		 * @returns {void}
		 */
		qr_refrescar_pagados_sin_venta() {
			let self = this
			this.qr_pedir_pagados_sin_venta()
			.then(res => {
				let cobros = res && res.data && Array.isArray(res.data.cobros) ? res.data.cobros : []
				self.$store.commit('vender/set_mercado_pago_qr_pagados_sin_venta', cobros)
			})
			.catch(err => {
				console.log('Pagos QR sin venta no disponibles', err)
				self.$store.commit('vender/set_mercado_pago_qr_pagados_sin_venta', [])
			})
		},
	},
}
