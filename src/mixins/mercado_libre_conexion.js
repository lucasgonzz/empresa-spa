import IntegrationConnector from '@/mixins/integration_connector'

/**
 * Conexión de la cuenta de Mercado Libre del comercio (misión mercado-libre-integracion,
 * 27/10/2026).
 *
 * Lo usan la solapa "Cuenta" del módulo de Mercado Libre y el aviso de "conectá tu cuenta" que
 * muestran las otras solapas cuando no hay conexión. Centraliza tres cosas para que esas dos
 * pantallas no las repitan:
 *
 * - `cargar_cuenta_mercado_libre()`: `GET mercado-libre/cuenta` y guarda la respuesta en el store
 *   `meli` (`state.meli.cuenta`), que es de donde leen todas las solapas.
 * - `conectar_mercado_libre()`: `GET integraciones/mercadolibre/connect` → `{url}` y abre la
 *   pantalla de permiso de Mercado Libre en una pestaña NUEVA. Al terminar, la API muestra
 *   "Conexión exitosa, podés cerrar esta ventana", así que el comercio vuelve a esta pestaña: por
 *   eso se escucha el foco de la ventana y, al volver, se consulta la cuenta otra vez.
 * - `desconectar_mercado_libre()`: `POST integraciones/mercadolibre/disconnect`.
 *
 * Usa los pedidos genéricos de `integration_connector` (los mismos de Mercado Pago). Todos los
 * pedidos van con `skip_global_error_event` y `skip_global_validation_toast`: cada error se
 * muestra con su propio aviso (el `message` de la API cuando lo trae) y sin las banderas el
 * interceptor de main.js mostraría además el aviso genérico.
 */
export default {
	mixins: [IntegrationConnector],
	data() {
		return {
			// true desde que el comercio tocó "Conectar" hasta que vuelve a esta pestaña
			esperando_vuelta_de_mercado_libre: false,
		}
	},
	computed: {
		// Respuesta de GET mercado-libre/cuenta (null si todavía no se consultó)
		cuenta_mercado_libre() {
			return this.$store.state.meli.cuenta
		},
		// true si la cuenta de Mercado Libre del comercio está conectada
		mercado_libre_conectado() {
			return !!(this.cuenta_mercado_libre && this.cuenta_mercado_libre.conectado)
		},
	},
	mounted() {
		window.addEventListener('focus', this.al_volver_a_la_pestana)
	},
	beforeDestroy() {
		window.removeEventListener('focus', this.al_volver_a_la_pestana)
	},
	methods: {
		/**
		 * Consulta el estado de la cuenta de Mercado Libre y lo deja en el store.
		 *
		 * @param {Boolean} con_indicador Si prende el indicador global de carga (false para las
		 *                                consultas de fondo, como la de la vista al abrir).
		 * @returns {Promise}
		 */
		cargar_cuenta_mercado_libre(con_indicador = true) {
			if (con_indicador) {
				this.$store.commit('auth/setMessage', 'Consultando tu cuenta de Mercado Libre')
				this.$store.commit('auth/setLoading', true)
			}

			return this.$api.get('mercado-libre/cuenta', {
				skip_global_error_event: true,
				skip_global_validation_toast: true,
			})
			.then(res => {
				if (con_indicador) {
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('auth/setMessage', '')
				}
				this.$store.commit('meli/set_cuenta', res.data.cuenta || { conectado: false })
			})
			.catch(err => {
				console.log(err)
				// La consulta de fondo falla callada: sin respuesta no se muestra el aviso de conexión
				if (con_indicador) {
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('auth/setMessage', '')
					this.$toast.error(this.mensaje_de_error_mercado_libre(err, 'No se pudo consultar tu cuenta de Mercado Libre'))
				}
			})
		},

		/**
		 * Pide la URL de permiso de Mercado Libre y la abre en una pestaña nueva.
		 *
		 * La pestaña se abre ANTES del pedido, en el mismo click: si se abriera recién en el
		 * `.then()`, el navegador la trataría como una ventana emergente no pedida y la bloquearía.
		 * Si el navegador igual no deja abrirla, se usa esta misma pestaña.
		 *
		 * @returns {void}
		 */
		conectar_mercado_libre() {
			let ventana = window.open('', '_blank')
			if (ventana) {
				// La pestaña nueva no tiene por qué poder tocar esta (equivale a rel="noopener")
				ventana.opener = null
			}

			this.$store.commit('auth/setMessage', 'Conectando con Mercado Libre')
			this.$store.commit('auth/setLoading', true)

			this.$api.get('integraciones/mercadolibre/connect', {
				skip_global_error_event: true,
				skip_global_validation_toast: true,
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				if (!res.data || !res.data.url) {
					this.cerrar_ventana(ventana)
					this.$toast.error('No se pudo iniciar la conexión con Mercado Libre')
					return
				}

				this.esperando_vuelta_de_mercado_libre = true

				if (ventana) {
					ventana.location.href = res.data.url
					this.$toast.info('Se abrió Mercado Libre en otra pestaña. Aceptá el permiso y volvé acá.', {
						duration: 8000,
					})
				} else {
					window.location.href = res.data.url
				}
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.cerrar_ventana(ventana)
				console.log(err)
				this.$toast.error(this.mensaje_de_error_mercado_libre(err, 'No se pudo iniciar la conexión con Mercado Libre'))
			})
		},

		/**
		 * Desconecta la cuenta de Mercado Libre (previa confirmación) y vuelve a consultar la cuenta.
		 *
		 * @returns {void}
		 */
		desconectar_mercado_libre() {
			if (!confirm('¿Seguro que querés desconectar tu cuenta de Mercado Libre? El sistema deja de actualizar tus publicaciones y de traer los pedidos hasta que la vuelvas a conectar. Tus publicaciones en Mercado Libre no se borran.')) {
				return
			}

			this.$store.commit('auth/setMessage', 'Desconectando Mercado Libre')
			this.$store.commit('auth/setLoading', true)

			this.requestIntegrationDisconnect('mercadolibre', {
				skip_global_error_event: true,
				skip_global_validation_toast: true,
			})
			.then(() => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.$toast.success('Mercado Libre desconectado')
				this.cargar_cuenta_mercado_libre()
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				this.$toast.error(this.mensaje_de_error_mercado_libre(err, 'No se pudo desconectar Mercado Libre'))
			})
		},

		/**
		 * Al volver a esta pestaña después de tocar "Conectar", consulta la cuenta otra vez para
		 * mostrar la conexión nueva sin que el comercio tenga que recargar.
		 *
		 * @returns {void}
		 */
		al_volver_a_la_pestana() {
			if (!this.esperando_vuelta_de_mercado_libre) {
				return
			}
			this.esperando_vuelta_de_mercado_libre = false
			this.cargar_cuenta_mercado_libre()
		},

		/**
		 * Cierra la pestaña en blanco que se abrió para Mercado Libre cuando el pedido falló.
		 *
		 * @param {Window|null} ventana
		 * @returns {void}
		 */
		cerrar_ventana(ventana) {
			if (ventana && !ventana.closed) {
				ventana.close()
			}
		},

		/**
		 * Texto legible de un error de la API: el `message` que manda el backend (por ejemplo, el
		 * 422 de "Mercado Libre no está configurado en este sistema") o uno genérico.
		 *
		 * @param {Object} err Error de axios.
		 * @param {String} generico Texto a usar si la API no mandó ninguno.
		 * @returns {String}
		 */
		mensaje_de_error_mercado_libre(err, generico) {
			if (err && err.response && err.response.data && err.response.data.message) {
				return err.response.data.message
			}
			return generico
		},
	},
}
