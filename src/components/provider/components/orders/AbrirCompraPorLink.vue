<script>
import moment from 'moment'

/*
 * Abre una compra (y, si corresponde, la revisión de su escaneo) desde un link
 * (misión asistente-aviso-escaneo-factura, 16/10/2026).
 *
 * El link es el que el asistente le manda al dueño por WhatsApp cuando termina de
 * leerse la factura que le pasó:
 *
 *     /proveedores/compras?compra={provider_order_id}&escaneo={uuid}
 *
 * Lo arma empresa-api (`ruta` de GET admin-sync/asistente/avisos-pendientes) y el admin
 * le antepone la URL del SPA del cliente. `escaneo` es opcional: sin él, el link abre
 * solo la compra.
 *
 * Qué hace, en orden:
 *
 *  1. Trae la compra por id (GET provider-order/{id}) y, al mismo tiempo, los escaneos
 *     pendientes de revisar del comercio (GET provider-order-scan/pendientes, el mismo
 *     pedido que enciende el botón rojo de la fila).
 *     🔴 La compra se pide por id y no se busca en el listado porque, entrando por URL,
 *     el listado de Compras no lo carga nadie (el store es `from_dates` y el que pide los
 *     modelos es el clic en el menú), y además la compra casi nunca es de hoy.
 *  2. Pone Compras en el DÍA de esa compra (modo "Por fecha", sin rango) y pide ese día
 *     (GET provider-order/from-date/{dia}): así, detrás del modal, queda la fila con su
 *     botón «Revisar escaneo» a la vista, que es lo que pidió Lucas.
 *  3. Si el escaneo está para revisar (listo y sin gestionar, y es de esta compra):
 *     deja la compra en el store del escaneo y la orden de apertura — la consume
 *     ScanInvoiceReview, que pide el detalle (GET provider-order-scan/{uuid}) y abre el
 *     modal. Es el mismo camino que «Revisar ahora» de ProviderOrderScanReadyModal.
 *     Si no (dio error, ya se revisó o se descartó, todavía se está leyendo, el uuid no
 *     existe o es de otra compra): pide el escaneo para saber POR QUÉ, abre la compra
 *     con el modal de siempre y un toast que lo dice.
 *  4. Saca `compra` y `escaneo` de la URL con `replace` (no `push`: abrir un link no es
 *     una página nueva en el historial), para que un F5 o volver a la pestaña no
 *     reabra todo.
 *
 * 🔴 SIN SESIÓN. No hay nada que hacer acá: el guard de router/index.js rebota a
 * `/login?redirect=<fullPath>` (fullPath incluye la query), y al autenticarse App.vue
 * corre checkPermissionForCurrentRoute(), que desde /login consume ese `redirect` con
 * common-vue/mixins/permissions.js::redirectToIntendedRoute() y hace `replace` a la ruta
 * completa, query incluida. Cuando este componente se crea, la query ya está.
 *
 * 🔴 PERMISOS. El re-chequeo de la ruta usa el permiso `provider.index`. El link es para
 * el dueño, que tiene todo. Un empleado sin ese permiso rebota a su pantalla por defecto
 * y este componente se destruye antes de abrir nada (ver `destruido`). No se cambia acá.
 *
 * 🔴 EL AVISO DE "TERMINÓ EL ESCANEO". Al arrancar la SPA, start_methods.js pide el
 * escaneo abierto del usuario (en-curso) y, si terminó y no se marcó visto, muestra el
 * modal `provider-order-scan-ready-notification`. Entrando por el link es justamente ESE
 * escaneo, y el modal saldría encima (o debajo) de la revisión que este componente ya
 * abrió: dos modales para lo mismo. Por eso se marca visto al abrirlo por link (igual
 * que «Revisar ahora») y, si el aviso se llega a mostrar igual — la respuesta de
 * en-curso puede llegar antes que el visto —, se lo cierra apenas se muestra.
 *
 * 🔴 DOS MODALES. Nunca se abren la compra y la revisión juntas: la revisión va sola,
 * con el listado del día detrás. El modal de la compra (setModel de
 * common-vue/mixins/display.js) prende un overlay y abre a los 30 ms; abrirlo a la par
 * de la revisión dejaba dos b-modal peleando el foco.
 *
 * Componente sin interfaz (render null): vive al lado de los modales del escaneo en
 * components/provider/components/orders/Index.vue, que está montado siempre que se ve
 * Proveedores (views/Provider.vue monta Proveedores y Compras juntos), así que se crea
 * apenas se entra por el link y se entera por el watch si el link llega con la pantalla
 * ya abierta.
 */

/* Id del modal de aviso "terminó el escaneo" (ProviderOrderScanReadyModal.vue). */
const MODAL_AVISO_DE_ESCANEO = 'provider-order-scan-ready-notification'

/* Cuánto queda a la vista el toast que explica por qué no se abrió la revisión. */
const DURACION_TOAST_MS = 9000

/*
 * Dónde sale ese toast: ARRIBA y no en la esquina de abajo de siempre. El link se abre casi
 * siempre desde el celular, y en Compras a 375 px la página desborda unos 34 px de ancho: el
 * viewport de layout queda más alto que lo visible y un toast de abajo sale cortado (medido el
 * 16/10/2026: se leía solo «No se pudo leer la factura: La foto está»). Arriba se lee entero.
 */
const POSICION_TOAST = 'top'

export default {
	name: 'AbrirCompraPorLink',
	render() {
		return null
	},
	data() {
		return {
			/*
			 * "compra|uuid" del link que se está procesando. Evita procesar dos veces el
			 * mismo link: el watch de la ruta salta con cualquier navegación (incluido el
			 * `replace` que limpia la query), y el created() puede coincidir con él.
			 */
			procesando: null,
			/*
			 * Uuids de los escaneos abiertos por link en esta pantalla. Si el aviso de
			 * "terminó" es de uno de estos, se lo cierra (ver el comentario del componente).
			 */
			uuids_abiertos_por_link: [],
			/*
			 * True cuando se salió de la pantalla (o la rebotó el chequeo de permisos)
			 * mientras volvían los pedidos: ya no se abre nada.
			 */
			destruido: false,
		}
	},
	computed: {
		/*
		 * El aviso de escaneo terminado que dejó start_methods.js o el broadcast.
		 * { uuid, provider_order_id, estado, ... } o null.
		 */
		aviso_de_escaneo() {
			return this.$store.state.global_notification.provider_order_scan
		},
	},
	watch: {
		/*
		 * Cubre el link que llega con Compras ya abierta (otra pestaña que navega a la
		 * misma SPA, o el botón Atrás que vuelve a una URL con la query).
		 */
		'$route.query'() {
			this.leer_link()
		},
	},
	created() {
		this.$root.$on('bv::modal::shown', this.al_mostrarse_un_modal)
		this.leer_link()
	},
	beforeDestroy() {
		this.destruido = true
		this.$root.$off('bv::modal::shown', this.al_mostrarse_un_modal)
	},
	methods: {
		/*
		 * Lee `?compra=<id>&escaneo=<uuid>` y, si hay un id válido y se está en la pestaña
		 * Compras, arranca la apertura.
		 *
		 * @return {void}
		 */
		leer_link() {
			if (this.$route.name != 'provider' || this.$route.params.view != 'compras') {
				return
			}

			let compra_id = Number(this.$route.query.compra)

			if (!compra_id || compra_id < 1 || Math.floor(compra_id) !== compra_id) {
				return
			}

			let uuid = typeof this.$route.query.escaneo == 'string' ? this.$route.query.escaneo.trim() : ''

			let clave = compra_id + '|' + uuid

			if (this.procesando === clave) {
				return
			}

			this.procesando = clave

			if (uuid) {
				this.uuids_abiertos_por_link.push(uuid)
				/* Por si el aviso ya estaba a la vista antes de que esto arrancara. */
				this.cerrar_aviso_si_es_del_link()
			}

			this.abrir_desde_link(compra_id, uuid)
		},
		/*
		 * Los pasos 1 a 4 del comentario del componente.
		 *
		 * Cada pedido atrapa su propio error: que falle uno no deja el overlay prendido
		 * ni la query colgada. La promesa entera siempre termina en `terminar()`.
		 *
		 * @param {Number} compra_id
		 * @param {String} uuid  '' si el link no trae escaneo.
		 * @return {void}
		 */
		abrir_desde_link(compra_id, uuid) {
			let self = this

			this.$store.commit('auth/setMessage', 'Abriendo la compra')
			this.$store.commit('auth/setLoading', true)

			let pedir_compra = this.$api.get(this.routeString('provider_order') + '/' + compra_id, {
				skip_global_error_event: true,
			})
			.then(res => {
				return res.data && res.data.model ? res.data.model : null
			})
			.catch(err => {
				console.log(err)
				return null
			})

			/*
			 * Sin escaneo en el link igual se refrescan los pendientes: son los que
			 * encienden el botón rojo de la fila que va a quedar a la vista.
			 */
			let pedir_pendientes = this.$store.dispatch('provider_order_scan/get_pendientes')

			Promise.all([pedir_compra, pedir_pendientes])
			.then(resultados => {
				let compra = resultados[0]
				let pendientes = resultados[1] || []

				if (self.destruido) {
					return null
				}

				if (!compra || !self.es_del_comercio(compra)) {
					self.apagar_carga()
					self.$toast.error('No encontramos la compra del link. Puede que se haya eliminado.', {
						duration: DURACION_TOAST_MS,
						position: POSICION_TOAST,
					})
					return null
				}

				return self.mostrar_dia_de_la_compra(compra)
				.then(() => {
					if (self.destruido) {
						return null
					}

					if (!uuid) {
						self.apagar_carga()
						self.abrir_compra(compra, null)
						return null
					}

					let pendiente = pendientes.find(item => {
						return item.uuid === uuid
					})

					if (pendiente && pendiente.provider_order_id == compra.id) {
						self.apagar_carga()
						self.abrir_revision(compra, uuid)
						return null
					}

					return self.motivo_para_no_revisar(uuid, compra)
					.then(motivo => {
						if (self.destruido) {
							return
						}

						self.apagar_carga()

						/*
						 * Listo y sin gestionar pero no vino en `pendientes` (el pedido de
						 * pendientes falló, o terminó de leerse entre un pedido y otro): se
						 * abre la revisión igual, que es lo que el link promete.
						 */
						if (motivo.tipo === 'revisar') {
							self.abrir_revision(compra, uuid)
							return
						}

						self.abrir_compra(compra, motivo.texto)
					})
				})
			})
			.catch(err => {
				console.log(err)
			})
			.then(() => {
				self.apagar_carga()
				self.terminar()
			})
		},
		/*
		 * Tenencia del lado de la pantalla: GET provider-order/{id} (fullModel) busca por
		 * id sin filtrar por comercio. Si la compra que volvió es de otro dueño, se trata
		 * como inexistente. Si falta alguno de los dos datos no se puede comparar y se
		 * sigue (la API es la que decide qué devuelve).
		 *
		 * @param {Object} compra
		 * @return {Boolean}
		 */
		es_del_comercio(compra) {
			if (!compra.user_id || !this.owner_id) {
				return true
			}

			return compra.user_id == this.owner_id
		},
		/*
		 * Pone Compras en el día de la compra y pide ese día. Mismos commits y mismo
		 * dispatch que ControlFecha.vue::setFromDates(true) + changeFromDate(dia), para que
		 * el store no note la diferencia con un clic del usuario en la tira de días.
		 *
		 * 🔴 Si estaba en "Histórico" se pasa a "Por fecha": en Histórico la tabla muestra
		 * el listado paginado y la compra de ese día podría no estar en la página.
		 *
		 * Si la compra es de hace más de una semana, la tira de días no muestra ese día
		 * (es la semana corriente), pero la tabla sí: es lo mismo que pasa al elegir una
		 * fecha con el calendario.
		 *
		 * @param {Object} compra
		 * @return {Promise} Resuelve siempre, aunque falle el pedido.
		 */
		mostrar_dia_de_la_compra(compra) {
			let estado = this.$store.state.provider_order

			if (!estado.from_dates) {
				this.$store.commit('provider_order/setFromDates', true)
				this.$store.commit('provider_order/setFilterPage', 1)
				this.$store.commit('provider_order/setTotalFilterPages', null)
				this.$store.commit('provider_order/setTotalFilterResults', 0)
			}

			this.$store.commit('provider_order/setFromDate', this.dia_de_la_compra(compra))
			this.$store.commit('provider_order/setUntilDate', '')

			/*
			 * getModels ya limpia `filtered`, `is_filtered`, la búsqueda general y el
			 * listado por defecto (ver __base_store.js): no hace falta repetirlo acá.
			 */
			return this.$store.dispatch('provider_order/getModels')
			.catch(err => {
				console.log(err)
			})
		},
		/*
		 * 'YYYY-MM-DD' del día de la compra, en la zona del navegador.
		 *
		 * Mismo criterio que `created_at_de_la_compra` de orders/Index.vue: el ISO de la API
		 * viene en UTC y se parsea ENTERO con moment(), nunca cortando por la T (entre las
		 * 21:00 y la medianoche el día UTC ya es el siguiente y la compra no aparecería).
		 *
		 * @param {Object} compra
		 * @return {String}
		 */
		dia_de_la_compra(compra) {
			if (compra.created_at) {
				let dia = moment(compra.created_at)

				if (dia.isValid()) {
					return dia.format('YYYY-MM-DD')
				}
			}

			return moment().format('YYYY-MM-DD')
		},
		/*
		 * Pide el escaneo para saber por qué no se puede revisar y arma el texto del toast.
		 *
		 * Se pide directo con $api y NO con la acción `abrir_revision` del store: esa
		 * acción deja el resultado en `detalle`, que es el estado del modal de revisión, y
		 * acá no se va a revisar nada.
		 *
		 * @param {String} uuid
		 * @param {Object} compra
		 * @return {Promise} Resuelve { tipo, texto }; nunca rechaza.
		 */
		motivo_para_no_revisar(uuid, compra) {
			let self = this

			return this.$api.get('provider-order-scan/' + uuid, {
				skip_global_error_event: true,
			})
			.then(res => {
				let escaneo = res.data || {}

				if (escaneo.provider_order_id != compra.id) {
					return {
						tipo: 'otra_compra',
						texto: 'Ese escaneo es de otra compra. Te abrimos la compra del link.',
					}
				}

				if (escaneo.estado === 'error') {
					/*
					 * Se marca visto: el dueño ya se enteró por WhatsApp de que falló, y si
					 * no, la próxima carga de la SPA le vuelve a mostrar el aviso.
					 */
					self.$store.dispatch('provider_order_scan/marcar_visto', uuid)

					let detalle = escaneo.error ? ': ' + escaneo.error : '.'

					return {
						tipo: 'error',
						texto: 'No se pudo leer la factura' + detalle + ' Podés volver a escanearla desde la compra.',
					}
				}

				if (escaneo.estado === 'pendiente' || escaneo.estado === 'procesando') {
					return {
						tipo: 'en_curso',
						texto: 'La factura todavía se está leyendo. Cuando termine, en la fila de la compra aparece el botón «Revisar escaneo».',
					}
				}

				if (escaneo.resultado_gestion === 'confirmado') {
					return {
						tipo: 'confirmado',
						texto: 'Ese escaneo ya se revisó y se cargó en la compra.',
					}
				}

				if (escaneo.resultado_gestion === 'descartado') {
					return {
						tipo: 'descartado',
						texto: 'Ese escaneo se descartó. Si hace falta, podés volver a escanear la factura desde la compra.',
					}
				}

				if (escaneo.pendiente_de_revisar) {
					return {
						tipo: 'revisar',
						texto: '',
					}
				}

				return {
					tipo: 'gestionado',
					texto: 'Ese escaneo ya no está para revisar. Te abrimos la compra.',
				}
			})
			.catch(err => {
				console.log(err)

				if (err && err.response && err.response.status === 404) {
					return {
						tipo: 'no_existe',
						texto: 'No encontramos ese escaneo. Te abrimos la compra.',
					}
				}

				return {
					tipo: 'sin_confirmar',
					texto: 'No pudimos ver el estado del escaneo. Te abrimos la compra: si está para revisar, vas a ver el botón «Revisar escaneo» en su fila.',
				}
			})
		},
		/*
		 * Abre la revisión del escaneo. Mismo camino que «Revisar ahora» de
		 * ProviderOrderScanReadyModal.vue: se deja la orden en el store y la consume
		 * ScanInvoiceReview (en su created() si recién se monta, o por su watch).
		 *
		 * 🔴 `set_compra` va ANTES de `set_abrir_en`: ScanInvoiceReview::resolver_compra()
		 * busca la compra solo en `provider_order.models`, y si no la encuentra deja la
		 * compra en null (y sin ella no conoce el modo de facturación). Con la compra ya en
		 * el store por id, resolver_compra() la reconoce y no la pisa.
		 *
		 * @param {Object} compra
		 * @param {String} uuid
		 * @return {void}
		 */
		abrir_revision(compra, uuid) {
			this.$store.commit('provider_order_scan/set_compra', compra)
			this.$store.dispatch('provider_order_scan/marcar_visto', uuid)
			this.$store.commit('provider_order_scan/set_abrir_en', {
				uuid: uuid,
				provider_order_id: compra.id,
			})
		},
		/*
		 * Abre la compra con el modal de siempre y, si hay un motivo, el toast que lo dice.
		 *
		 * @param {Object} compra
		 * @param {String|null} motivo
		 * @return {void}
		 */
		abrir_compra(compra, motivo) {
			if (motivo) {
				this.$toast.info(motivo, {
					duration: DURACION_TOAST_MS,
					position: POSICION_TOAST,
				})
			}

			this.setModel(compra, 'provider_order')
		},
		/*
		 * Apaga el overlay de "Abriendo la compra". Idempotente.
		 *
		 * 🔴 Va ANTES de setModel(): esa función prende su propio overlay ("Cargando
		 * formulario") y lo apaga ella; si el nuestro se apagara después, le cortaría el
		 * suyo a mitad de camino (o al revés, el suyo dejaría el nuestro sin apagar).
		 *
		 * @return {void}
		 */
		apagar_carga() {
			if (this.$store.state.auth.message !== 'Abriendo la compra') {
				return
			}

			this.$store.commit('auth/setLoading', false)
			this.$store.commit('auth/setMessage', '')
		},
		/*
		 * Saca `compra` y `escaneo` de la URL y suelta el link procesado.
		 *
		 * @return {void}
		 */
		terminar() {
			this.procesando = null

			if (this.destruido) {
				return
			}

			let query = this.$route.query

			if (typeof query.compra === 'undefined' && typeof query.escaneo === 'undefined') {
				return
			}

			let query_limpia = {}

			Object.keys(query).forEach(clave => {
				if (clave !== 'compra' && clave !== 'escaneo') {
					query_limpia[clave] = query[clave]
				}
			})

			this.$router.replace({ query: query_limpia })
			.catch(() => {
				// NavigationDuplicated u otra navegación en el medio: la URL ya no importa.
			})
		},
		/*
		 * Escucha de `bv::modal::shown`: si el que se mostró es el aviso de "terminó el
		 * escaneo" y es de un escaneo abierto por link, se lo cierra.
		 *
		 * Se escucha el `shown` y no el commit del store porque b-modal ignora un hide()
		 * mientras todavía se está abriendo: el commit llega un tick antes de que el modal
		 * quede visible.
		 *
		 * @param {Object} bv_event
		 * @param {String} modal_id
		 * @return {void}
		 */
		al_mostrarse_un_modal(bv_event, modal_id) {
			if (modal_id !== MODAL_AVISO_DE_ESCANEO) {
				return
			}

			this.cerrar_aviso_si_es_del_link()
		},
		/*
		 * Cierra el aviso de "terminó el escaneo" si es de un escaneo abierto por link.
		 * Cerrarlo lo marca visto (on_hidden de ProviderOrderScanReadyModal.vue), que es
		 * lo correcto: el dueño ya se enteró por WhatsApp. hide() de un modal que no está
		 * a la vista no hace nada.
		 *
		 * @return {void}
		 */
		cerrar_aviso_si_es_del_link() {
			let aviso = this.aviso_de_escaneo

			if (!aviso || !aviso.uuid) {
				return
			}

			if (this.uuids_abiertos_por_link.indexOf(aviso.uuid) === -1) {
				return
			}

			this.$bvModal.hide(MODAL_AVISO_DE_ESCANEO)
		},
	},
}
</script>
