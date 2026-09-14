import moment from 'moment'

/**
 * Mixin compartido por la solapa "Tienda online" del ABM de Integraciones y por sus
 * tarjetas (Mercado Pago, Zipnova).
 *
 * Centraliza la lógica que se repetiría en cada tarjeta: el cálculo del estado visual
 * (Desconectado / Conectado / Conexión por vencer), las llamadas a los endpoints OAuth
 * genéricos `/api/integraciones/{provider}/connect` y `/api/integraciones/{provider}/disconnect`
 * agregados en los prompts 598 (Mercado Pago) y 599 (Zippin), y las llamadas propias de
 * Zipnova (misión zipnova-envios, 14/9/2026), que no es OAuth: el comercio pega un API Token
 * y un API Secret generados en su cuenta de Zipnova.
 *
 * Las tarjetas concretas (MercadoPagoCard.vue, ZipnovaCard.vue) deciden cuándo mostrar el
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
		 * @param {String} provider_path Slug del proveedor bajo /api/integraciones/ (ej: 'mercadopago', 'zipnova').
		 * @param {Object} config Config extra de axios (ej: `{skip_global_error_event: true}` cuando la tarjeta muestra su propio error).
		 * @returns {Promise} Promesa de axios.
		 */
		requestIntegrationDisconnect(provider_path, config = {}) {
			return this.$api.post('integraciones/' + provider_path + '/disconnect', null, config)
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

		// --------------------------------- Zipnova ---------------------------------
		//
		// Zipnova no se conecta por OAuth: el comercio genera un API Token y un API Secret en su
		// cuenta (Configuración → Integraciones → Gestionar credenciales y webhooks) y los pega
		// en la tarjeta. El backend los valida contra Zipnova, los guarda cifrados en el conector
		// de plataforma y desde ahí nunca vuelven a la SPA. Todos estos endpoints responden
		// `{integracion}` con la misma forma que un item de `GET /api/integraciones`, más la
		// clave `config` cuando está conectado (cuenta, depósitos, paquete por defecto, etc.).
		// El disconnect es el genérico: `requestIntegrationDisconnect('zipnova')`.
		//
		// Todas van con `skip_global_error_event`: la tarjeta muestra cada error con su propio
		// alert o toast (el `message` del 422/502), y sin la bandera el interceptor de main.js
		// dispararía además el toast genérico y el dueño vería dos avisos del mismo hecho
		// (medido el 14/9/2026 al verificar la tarjeta).

		/**
		 * Conecta la cuenta de Zipnova del comercio con el token y el secret que generó allá.
		 *
		 * Un 422 trae `{message}` legible (credenciales rechazadas o cuenta sin datos); un 502,
		 * que Zipnova no respondió.
		 *
		 * @param {String} api_token API Token generado en Zipnova.
		 * @param {String} api_secret API Secret generado en Zipnova.
		 * @returns {Promise} Promesa de axios; `res.data.integracion` trae el item ya conectado.
		 */
		requestZipnovaConectar(api_token, api_secret) {
			return this.$api.post('integraciones/zipnova/conectar', {
				api_token: api_token,
				api_secret: api_secret,
			}, {
				skip_global_error_event: true,
			})
		},

		/**
		 * Guarda la configuración del comercio para Zipnova (todas las claves opcionales).
		 *
		 * @param {Object} payload `{origin_id?, bulto_default?: {peso, alto, ancho, profundidad}, declarar_valor?, envio_gratis_desde?}`.
		 * @returns {Promise} Promesa de axios; `res.data.integracion` trae el item actualizado.
		 */
		requestZipnovaConfig(payload) {
			return this.$api.put('integraciones/zipnova/config', payload, {
				skip_global_error_event: true,
			})
		},

		/**
		 * Vuelve a pedirle a Zipnova los depósitos (orígenes) habilitados para envíos, por si el
		 * comercio cargó uno nuevo después de conectar.
		 *
		 * @returns {Promise} Promesa de axios; `res.data.integracion.config.origins` trae la lista.
		 */
		requestZipnovaOrigenes() {
			return this.$api.post('integraciones/zipnova/origenes', null, {
				skip_global_error_event: true,
			})
		},

		/**
		 * Cotiza un envío de prueba con el paquete por defecto, para que el dueño vea lo mismo
		 * que va a ver su cliente en la tienda.
		 *
		 * Un 422 con `codigo: 'ubicacion'` y `needs_location: true` pide localidad y provincia
		 * porque Zipnova no reconoció el código postal solo.
		 *
		 * @param {String} zipcode Código postal de destino.
		 * @param {String|null} city Localidad (opcional).
		 * @param {String|null} state Provincia (opcional).
		 * @returns {Promise} Promesa de axios; `res.data.cotizacion.opciones` trae las opciones.
		 */
		requestZipnovaCotizarPrueba(zipcode, city = null, state = null) {
			return this.$api.post('integraciones/zipnova/cotizar-prueba', {
				zipcode: zipcode,
				city: city,
				state: state,
			}, {
				skip_global_error_event: true,
			})
		},
	},
}
