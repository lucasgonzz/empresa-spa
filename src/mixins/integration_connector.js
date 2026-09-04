import moment from 'moment'

/**
 * Mixin compartido por la solapa "Tienda online" del ABM de Integraciones y por sus
 * tarjetas (Mercado Pago, Zippin).
 *
 * Centraliza la lógica que se repetiría en cada tarjeta: el cálculo del estado visual
 * (Desconectado / Conectado / Conexión por vencer) y las llamadas a los endpoints OAuth
 * genéricos `/api/integraciones/{provider}/connect` y `/api/integraciones/{provider}/disconnect`
 * agregados en los prompts 598 (Mercado Pago) y 599 (Zippin).
 *
 * Las tarjetas concretas (MercadoPagoCard.vue, ZippinCard.vue) deciden cuándo mostrar el
 * indicador global de carga y qué mensajes de éxito/error mostrar; este mixin solo expone
 * las promesas de red y el cálculo de estado.
 */
export default {
	methods: {
		/**
		 * Calcula el estado visual de una integración a partir de si está conectada
		 * y la fecha de expiración de su token.
		 *
		 * @param {Boolean|Number} connected Valor de `connected` del item de GET /api/integraciones.
		 * @param {String|null} expires_at Valor de `expires_at` de ese mismo item (fecha del backend).
		 * @returns {{text: String, variant: String}} Texto a mostrar y variante de color (Bootstrap).
		 */
		integrationStatusInfo(connected, expires_at) {
			if (!connected) {
				return {
					text: 'Desconectado',
					variant: 'secondary',
				}
			}

			// Conectado: se chequea si la conexión vence dentro de los próximos 15 días
			if (expires_at) {
				let dias_para_vencer = moment(expires_at).diff(moment(), 'days')
				if (dias_para_vencer <= 15) {
					return {
						text: 'Conexión por vencer (' + moment(expires_at).format('DD/MM/YYYY') + ')',
						variant: 'warning',
					}
				}
			}

			return {
				text: 'Conectado',
				variant: 'success',
			}
		},

		/**
		 * Pide al backend la URL de autorización OAuth de una integración.
		 *
		 * @param {String} provider_path Slug del proveedor bajo /api/integraciones/ (ej: 'mercadopago', 'zippin').
		 * @returns {Promise} Promesa de axios; `res.data.url` trae la URL de autorización a abrir.
		 */
		requestIntegrationConnectUrl(provider_path) {
			return this.$api.get('integraciones/' + provider_path + '/connect')
		},

		/**
		 * Pide al backend desconectar una integración ya conectada.
		 *
		 * @param {String} provider_path Slug del proveedor bajo /api/integraciones/ (ej: 'mercadopago', 'zippin').
		 * @returns {Promise} Promesa de axios.
		 */
		requestIntegrationDisconnect(provider_path) {
			return this.$api.post('integraciones/' + provider_path + '/disconnect')
		},

		/**
		 * Pide el listado de integraciones del comercio, que es lo que pinta las tarjetas.
		 *
		 * 🔴 Reemplaza al viejo `refreshOnlineConfigurationModel()`: el estado de conexión
		 * dejó de vivir en el online_configuration (mp_connected, zippin_connected, ...) y
		 * pasó a los conectores de plataforma. La respuesta trae, por integración, el slug,
		 * el nombre, el grupo (`sistema` | `tienda_online`), si está conectada, cuándo vence
		 * y el id de la cuenta en la plataforma. Nunca trae tokens.
		 *
		 * @returns {Promise} Promesa de axios; `res.data.integraciones` trae el listado.
		 */
		requestIntegraciones() {
			return this.$api.get('integraciones')
		},
	},
}
