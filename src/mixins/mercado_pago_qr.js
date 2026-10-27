/**
 * Mixin compartido del cobro con el QR de Mercado Pago en el mostrador (misión
 * cobro-qr-mercado-pago, 26/10/2026).
 *
 * Lo usan tres lugares que hablan con los mismos endpoints de empresa-api:
 * - el botón "Cobrar con QR" de la barra de acciones de Vender (components/vender/components/CobrarConQr.vue),
 * - el modal "Esperando el pago" (components/vender/modals/CobroQrMercadoPago.vue),
 * - la tarjeta "Cobro con QR en el mostrador" de ABM → Integraciones → Tienda online
 *   (components/abm/integraciones/mercado-pago-qr/).
 *
 * Acá solo viven las promesas de red, el texto de cada estado y la lectura del mensaje de error:
 * cada componente decide qué indicador de carga mostrar y qué aviso dar.
 *
 * 🔴 Todos los pedidos van con `skip_global_error_event` y `skip_global_validation_toast`: cada
 * componente muestra el `message` que devuelve la API (o el texto que mandó Mercado Pago) con su
 * propio toast o alerta. Sin las banderas, el interceptor de main.js dispararía además el aviso
 * genérico y el cajero vería dos carteles del mismo hecho. Y hay un motivo más fuerte: un SPA nuevo
 * contra una API vieja recibe 404 en `GET mercado-pago/qr`, y eso NO tiene que mostrar ningún error
 * (el botón y la tarjeta simplemente no aparecen).
 *
 * Contrato (plan de la misión, fijo): `QrCaja = {id, name, caja_id, caja_name, address_id,
 * address_name, qr_image_url, qr_template_url, qr_code, activo}` y `Cobro = {id, total, estado,
 * mp_order_id, error_message, paid_at, sale_id, sale_num, qr: {id, name, qr_image_url}, created_at,
 * current_acount_payment_method_id}`.
 */

/*
	Configuración de axios para todos los pedidos del QR: el error lo muestra el componente que llama
	(ver el comentario de arriba).
*/
const CONFIG_SIN_AVISO_GLOBAL = {
	skip_global_error_event: true,
	skip_global_validation_toast: true,
}

export default {
	methods: {
		/**
		 * Pide la configuración del cobro con QR del comercio: si Mercado Pago está conectado, con
		 * qué método de pago se registran los cobros y la lista de QRs creados.
		 *
		 * @returns {Promise} Promesa de axios; `res.data` trae `{conectado, current_acount_payment_method_id, qrs}`.
		 */
		qr_pedir_configuracion() {
			return this.$api.get('mercado-pago/qr', CONFIG_SIN_AVISO_GLOBAL)
		},

		/**
		 * Guarda el método de pago con el que se registran las ventas cobradas por QR.
		 *
		 * @param {Number} current_acount_payment_method_id Id del método de pago elegido.
		 * @returns {Promise} Promesa de axios; `res.data.current_acount_payment_method_id` trae el guardado.
		 */
		qr_guardar_metodo_de_pago(current_acount_payment_method_id) {
			return this.$api.put('mercado-pago/qr/config', {
				current_acount_payment_method_id: current_acount_payment_method_id,
			}, CONFIG_SIN_AVISO_GLOBAL)
		},

		/**
		 * Crea un QR nuevo (una "caja" en Mercado Pago) para imprimir y dejar en el mostrador.
		 *
		 * @param {Object} payload `{name, caja_id?, address_id?, street_name, street_number, city_name, state_name, latitude?, longitude?, reference?}`.
		 * @returns {Promise} Promesa de axios; `res.data.qr` trae el QR creado.
		 */
		qr_crear_qr(payload) {
			return this.$api.post('mercado-pago/qr/cajas', payload, CONFIG_SIN_AVISO_GLOBAL)
		},

		/**
		 * Elimina un QR (también lo da de baja en Mercado Pago).
		 *
		 * @param {Number} qr_id Id del QR.
		 * @returns {Promise} Promesa de axios.
		 */
		qr_eliminar_qr(qr_id) {
			return this.$api.delete('mercado-pago/qr/cajas/' + qr_id, CONFIG_SIN_AVISO_GLOBAL)
		},

		/**
		 * Carga el total de la venta en el QR del mostrador: desde acá el cliente ya puede escanearlo
		 * y pagar.
		 *
		 * @param {Object} payload `{total, caja_id?, address_id?, description?}`.
		 * @returns {Promise} Promesa de axios; `res.data.cobro` trae el cobro creado.
		 */
		qr_crear_cobro(payload) {
			return this.$api.post('mercado-pago/qr/cobros', payload, CONFIG_SIN_AVISO_GLOBAL)
		},

		/**
		 * Consulta cómo va un cobro. Si está pendiente, la API le pregunta a Mercado Pago antes de
		 * responder.
		 *
		 * `skip_navigation_cancel` porque la consulta no tiene que morir si algo en la pantalla dispara
		 * la cancelación por navegación: el que corta la consulta es el modal, con su propio intervalo.
		 *
		 * @param {Number} cobro_id Id del cobro.
		 * @returns {Promise} Promesa de axios; `res.data.cobro` trae el cobro actualizado.
		 */
		qr_consultar_cobro(cobro_id) {
			return this.$api.get('mercado-pago/qr/cobros/' + cobro_id, {
				skip_global_error_event: true,
				skip_global_validation_toast: true,
				skip_navigation_cancel: true,
			})
		},

		/**
		 * Cancela un cobro pendiente. Si el cliente está pagando en ese momento, la API responde 409
		 * con `pagando: true` y el cobro sigue vivo.
		 *
		 * @param {Number} cobro_id Id del cobro.
		 * @returns {Promise} Promesa de axios; `res.data.cobro` trae el cobro cancelado.
		 */
		qr_cancelar_cobro(cobro_id) {
			return this.$api.post('mercado-pago/qr/cobros/' + cobro_id + '/cancelar', null, CONFIG_SIN_AVISO_GLOBAL)
		},

		/**
		 * Últimos cobros por QR del comercio, para la tarjeta de configuración.
		 *
		 * @param {Number} limit Cuántos traer.
		 * @returns {Promise} Promesa de axios; `res.data.cobros` trae la lista.
		 */
		qr_pedir_ultimos_cobros(limit = 20) {
			return this.$api.get('mercado-pago/qr/cobros?limit=' + limit, CONFIG_SIN_AVISO_GLOBAL)
		},

		/**
		 * Cobros por QR que el cliente pagó y no quedaron en ninguna venta (últimos 7 días). Vender los
		 * ofrece con "Usar en esta venta".
		 *
		 * @returns {Promise} Promesa de axios; `res.data.cobros` trae la lista.
		 */
		qr_pedir_pagados_sin_venta() {
			return this.$api.get('mercado-pago/qr/cobros?pagados_sin_venta=1', CONFIG_SIN_AVISO_GLOBAL)
		},

		/**
		 * Texto en español de comerciante para el estado de un cobro.
		 *
		 * @param {String} estado `pendiente|pagado|vencido|cancelado|error`.
		 * @returns {String}
		 */
		qr_texto_estado(estado) {
			let textos = {
				pendiente: 'Esperando el pago',
				pagado: 'Pagado',
				vencido: 'Venció sin pagarse',
				cancelado: 'Cancelado',
				error: 'Con error',
			}
			return textos[estado] || estado || ''
		},

		/**
		 * Variante de color (Bootstrap) para el badge del estado de un cobro.
		 *
		 * @param {String} estado `pendiente|pagado|vencido|cancelado|error`.
		 * @returns {String}
		 */
		qr_variante_estado(estado) {
			let variantes = {
				pendiente: 'warning',
				pagado: 'success',
				vencido: 'secondary',
				cancelado: 'secondary',
				error: 'danger',
			}
			return variantes[estado] || 'secondary'
		},

		/**
		 * Saca el mensaje legible de un error de los endpoints del QR: el `message` de la API (que en
		 * un rechazo de Mercado Pago trae el texto que mandó Mercado Pago), o el primer error de
		 * validación de Laravel, o el texto por defecto.
		 *
		 * @param {Object} err Error de axios.
		 * @param {String} fallback Texto a mostrar si la respuesta no trae ninguno.
		 * @returns {String}
		 */
		qr_mensaje_de_error(err, fallback) {
			let data = err && err.response && err.response.data ? err.response.data : null
			if (!data || typeof data != 'object') {
				return fallback
			}
			if (data.errors && typeof data.errors == 'object') {
				let mensajes = []
				Object.keys(data.errors).forEach(clave => {
					let lista = data.errors[clave]
					if (Array.isArray(lista) && lista.length) {
						mensajes.push(lista[0])
					}
				})
				if (mensajes.length) {
					return mensajes.join(' ')
				}
			}
			if (data.message) {
				return data.message
			}
			return fallback
		},
	},
}
