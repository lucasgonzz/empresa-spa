import chequeos from '@/mixins/vender/guardar_venta/chequeos/index'
import limpiar_vender from '@/mixins/vender/limpiar_vender'
import default_payment_method from '@/mixins/vender/default_payment_method'
import omitir_en_cuenta_corriente from '@/mixins/vender/omitir_en_cuenta_corriente'
import default_articles from '@/mixins/vender/default_articles'
import facturar from '@/mixins/vender/guardar_venta/facturar'
import sonido_error from '@/mixins/sonido_error' 
import vender_set_total from '@/mixins/vender_set_total' 
import axios from 'axios'

import sync_sales from '@/offline/sync_sales' 
import { env } from '@/runtime_config'
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
			console.log('actualizar_cliente')
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

			/*
				El snapshot se toma antes de limpiar porque el punto de venta se resetea ya mismo, no
				cuando vuelve AFIP, y la factura de la venta que se acaba de guardar todavía necesita
				esos datos.
			*/
			let datos_afip = {
				afip_information_id: this.$store.state.vender.afip_information_id,
				afip_tipo_comprobante_id: this.$store.state.vender.afip_tipo_comprobante_id,
				incoterms: this.$store.state.vender.incoterms,
				forma_de_pago: this.$store.state.vender.forma_de_pago,
				permiso_existente: this.$store.state.vender.permiso_existente,
			}

			this.limpiar_vender()

			// El punto de venta y el tipo de comprobante vuelven a cero siempre, se haya facturado o no.
			this.limpiar_afip()

			this.setDefaultPaymentMethod(true)

			this.set_omitir_en_cuenta_corriente()

			this.set_default_articles()

			this.redirect_a_remito()

			this.setTotal()

			if (online) {
				this.actualizar_cliente()
				this.facturar_venta(datos_afip)
			}

			this.$store.commit('vender/clear_sale_log')

		},

		guardar_venta_online() {
			const pending = [...this.$store.state.vender.pending_attachments]

			this.$store.dispatch('vender/vender', {
				discounts: this.get_models_by_id('discount', this.discounts_id),
				surchages: this.get_models_by_id('surchage', this.surchages_id),
			})
			.then(res => {
				console.log('SE GUARDO VENTA')
				console.log(res)
				const sale = this.$store.state.vender.sale
				if (sale && sale.id && pending.length) {
					this.upload_pending_attachments(sale.id, pending)
				}
				this.resetear_vender()
			})
			.catch(err => {
				console.log(err)

				/*
					422 del límite de crédito (misión 160). Es la autoridad -la guarda de
					chequeos/limite_credito.js puede no haber tenido los datos-, así que abre el mismo
					modal con los números que calculó el backend y se corta acá: sin este return
					saldrían además los dos toasts genéricos de error encima del modal.
				*/
				if (err
					&& err.response
					&& err.response.status == 422
					&& err.response.data
					&& err.response.data.error_limite_credito) {

					this.$store.commit('vender/set_limite_credito_excedido', err.response.data.limite_credito)
					this.sonido_error()
					this.$bvModal.show('limite-credito-excedido')
					return
				}

				this.sonido_error()

				/*
					🔴 UN solo aviso por error, y elegido con `err.response` protegido.

					Aca habia un `console.log(err.response.data.message)` FUERA de toda guarda: sin
					`response` --servidor caido, red cortada, timeout-- tiraba TypeError adentro del
					catch y el vendedor se quedaba con el generico "Error al guardar venta" y nada
					mas. Se noto recien ahora porque el POST de la venta apaga el aviso global del
					interceptor (skip_global_error_event en store/vender/vender.js), que ademas del
					mensaje del back callaba el toast de red: este catch es el unico que avisa.

					- Con mensaje del back (422 de la lista de precios, 409, etc.): solo ese. Antes
					  salian dos toasts, el generico arriba del que decia algo.
					- Error de axios sin `response`: no hubo respuesta del servidor. No se afirma que
					  la venta "no se guardo" a secas: si la conexion se corto DESPUES de que el POST
					  llego, la venta existe, y un vendedor que reintenta pasados los 5 segundos del
					  deduplicado del back la duplica. Por eso manda a mirar Ventas antes de reintentar.
					- Con respuesta pero sin mensaje: el generico.
					- Un error que NO es de axios (un TypeError en el .then de arriba, DESPUES de que
					  el POST ya guardo y el store ya commiteo la venta) tampoco tiene `response`, y
					  antes caia en la rama de red: "lo mas probable es que NO se haya guardado" era
					  mentira y llevaba derecho al duplicado. Se distingue por isAxiosError: para ese
					  caso el aviso manda a mirar Ventas sin afirmar nada.
				*/
				let mensaje_del_back = err && err.response && err.response.data && err.response.data.message
					? err.response.data.message
					: null

				let es_error_de_red = Boolean(err && err.isAxiosError && !err.response)

				if (mensaje_del_back) {

					this.$toast.error(mensaje_del_back, {
						duration: 10000
					})

				} else if (!err || !err.isAxiosError) {

					this.$toast.error('Ocurrió un error inesperado al guardar. Fijate en Ventas si la venta quedó guardada antes de volver a intentar; si el problema sigue, recargá la página.', {
						duration: 15000
					})

				} else if (es_error_de_red) {

					let es_timeout = Boolean(
						err
						&& (
							err.code === 'ECONNABORTED'
							|| (err.message && String(err.message).indexOf('timeout') !== -1)
						)
					)

					this.$toast.error(
						es_timeout
							? 'El servidor tardó demasiado en responder. La venta puede haber quedado guardada: fijate en Ventas antes de volver a intentar.'
							: 'No pudimos conectarnos con el servidor. Lo más probable es que la venta NO se haya guardado: revisá la conexión, fijate en Ventas y volvé a intentar.',
						{
							duration: 15000
						}
					)

				} else {

					this.$toast.error('Error al guardar venta', {
						duration: 10000
					})
				}
			})
		},

		async upload_pending_attachments(sale_id, pending_attachments) {
			const total = pending_attachments.length
			let uploaded = 0
			let errors = 0

			this.$toast.info(`Guardando ${total} archivo${total !== 1 ? 's' : ''} adjunto${total !== 1 ? 's' : ''}...`, { duration: 4000 })

			for (const att of pending_attachments) {
				const form = new FormData()
				form.append('sale_id', sale_id)
				form.append('article_id', att.article_id)
				form.append('file', att.file)
				form.append('observation', att.observation || '')
				try {
					await axios.post(
						env('VUE_APP_API_URL') + '/api/sale-article-attachment',
						form,
						{ headers: { 'Content-Type': 'multipart/form-data' } }
					)
					uploaded++
					if (total > 1) {
						this.$toast.info(`Adjuntos: ${uploaded}/${total} subidos`, { duration: 2000 })
					}
				} catch {
					errors++
				}
			}

			if (errors === 0) {
				this.$toast.success(`${total} archivo${total !== 1 ? 's' : ''} adjunto${total !== 1 ? 's' : ''} guardado${total !== 1 ? 's' : ''}`)
			} else {
				this.$toast.warning(`Se guardaron ${uploaded} de ${total} archivos adjuntos. ${errors} no se pud${errors !== 1 ? 'ieron' : 'o'} subir.`)
			}
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
				// Prompt 266 (Fase 2, Capa 3): mismo valor que cantidad_cuotas, bajo el nombre que
				// espera SaleHelper::resolver_descuento_recargo_metodo_pago() (prompt 263) para poder
				// resolver server-side el descuento/recargo cuando el frontend no lo manda calculado.
				cuotas: this.$store.state.vender.cantidad_cuotas,
				cuota_descuento: this.$store.state.vender.cuota_descuento,
				cuota_recargo: this.$store.state.vender.cuota_recargo,
				monto_credito_real: this.$store.state.vender.monto_credito_real,
				caja_id: this.$store.state.vender.caja_id,
				afip_tipo_comprobante_id: this.$store.state.vender.afip_tipo_comprobante_id,
				/*
					Estos tres no son para POST /sale -- de los tres, el backend solo consume
					`incoterms`. Se guardan igual en IndexedDB porque cuando vuelva la conexion hay
					que emitir la factura de esta venta con EXACTAMENTE los mismos datos que habria
					usado el camino online, y `forma_de_pago` y `permiso_existente` viajan unicamente
					en el POST a afip-ticket: no se persisten en la tabla `sales`, asi que si no
					quedan aca no hay de donde recuperarlos despues. Solo los mira el comprobante
					tipo 8 (exportacion), pero se guardan siempre para que el camino offline y el
					online guarden lo mismo y nadie tenga que acordarse de esta excepcion.
				*/
				incoterms: this.$store.state.vender.incoterms,
				forma_de_pago: this.$store.state.vender.forma_de_pago,
				permiso_existente: this.$store.state.vender.permiso_existente,
				/*
					🔴 La moneda y la cotizacion tienen que viajar SI O SI desde que la venta offline
					se factura sola al volver la conexion.

					Sin estas dos, SaleController::store() cae a `moneda_id = 1` y la venta se
					persiste en pesos. Antes eso era feo pero inofensivo, porque esa venta no se
					facturaba nunca. Ahora termina en un comprobante ante ARCA con el importe
					equivocado, y eso solo se deshace con nota de credito.
				*/
				moneda_id: this.$store.state.vender.moneda_id,
				valor_dolar: this.$store.state.vender.valor_dolar,
				descuento: this.$store.state.vender.descuento,
				/*
					🔴 El total forzado tiene que viajar tambien por el camino offline, y por el
					mismo motivo que la moneda y la cotizacion de aca arriba: esta venta se
					guarda --y eventualmente se factura-- sola cuando vuelve la conexion, con lo
					que haya quedado en IndexedDB y nada mas.

					Si no queda aca, la venta se persiste con `total` forzado pero sin el campo
					que explica de donde sale ese numero: el comprobante pierde el renglon del
					ajuste y el prorrateo de AFIP no tiene por que escalar.
				*/
				forzar_total_monto: this.$store.state.vender.forzar_total_monto,
				fecha_entrega: this.$store.state.vender.fecha_entrega,
				/*
					Fecha elegida para la venta ('YYYY-MM-DD'). Tiene que viajar tambien por el camino
					offline: esta venta se guarda --y eventualmente se factura-- sola cuando vuelve la
					conexion, con lo que haya quedado en IndexedDB y nada mas. Sin esto, una venta
					fechada al mes pasado en un dia sin internet se subiria con la fecha del dia en que
					volvio la conexion.

					🔴 Va con el nombre `created_at_elegido` y NO `created_at` a proposito: la tabla
					`sales` de IndexedDB ya tiene un `created_at` propio --y hasta indexado-- que
					significa otra cosa (cuando se CAPTURO la venta estando sin internet, ver
					offline/sync_sales.js). Si esta fecha viajara como `created_at`, save_sale_offline()
					la pisaria con el momento de la captura y sync_pending_sales() la borraria antes del
					POST. sync_pending_sales() se encarga de mapearla a `created_at` en el cuerpo del
					POST, que es el nombre que espera SaleController::store().
				*/
				created_at_elegido: this.$store.state.vender.created_at,
				observations_ocultas: this.$store.state.vender.observations_ocultas,
				dias_alerta_venta_no_cobrada_personalizado: this.$store.state.vender.dias_alerta_venta_no_cobrada_personalizado,

				/*
					🔴 Estas nueve claves tienen que ser LAS MISMAS que manda el POST online
					(store/vender/vender.js, action vender). La venta offline se guarda con lo que
					quedo en IndexedDB y nada mas, y SaleController::store las lee igual venga de
					donde venga. Faltaban, y el back las defaulteaba: discount_stock e iva_aplicado
					volvian a 1 aunque el vendedor los hubiera apagado; aplicar_recargos_directo_a_
					items quedaba null y getTotalSale volvia a sumar los recargos al recalcular;
					puntos_canjeados no viajaba y PuntosCanjeHelper::aplicar salia sin descontarlos,
					con el total YA neteado por el front --el cliente cobraba el descuento y
					conservaba los puntos--; sale_status_id, price_description, send_mail y el log
					se perdian. Si se agrega una clave al POST online, va tambien aca.

					La fecha elegida para la venta se sumo el 22/9/2026 y esta mas arriba, al lado de
					fecha_entrega, para no separarla de la otra fecha. Viaja como
					`created_at_elegido` y sync_pending_sales() la renombra a `created_at` en el POST:
					el motivo esta explicado alla arriba.
				*/
				aplicar_recargos_directo_a_items: this.$store.state.vender.aplicar_recargos_directo_a_items,
				puntos_canjeados: this.$store.state.vender.puntos_canjeados,
				descuento_puntos: this.$store.state.vender.descuento_puntos,
				sale_status_id: this.$store.state.vender.sale_status_id,
				discount_stock: this.$store.state.vender.discount_stock,
				iva_aplicado: this.$store.state.vender.iva_aplicado,
				price_description: JSON.stringify(this.$store.state.vender.total_description),
				send_mail: this.$store.state.vender.send_mail,
				log: this.$store.state.vender.sale_log,
			}

			await this.save_sale_offline(sale_data)

			this.resetear_vender(false)

		}
		
	}
}