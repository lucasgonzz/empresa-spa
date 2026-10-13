export default {
	methods: {
		/**
		 * Abre el panel del chat del asistente IA, opcionalmente parado en una
		 * conversación puntual (ej: la que creó una sugerencia de stock, D22/D23).
		 *
		 * Vive acá porque este mixin entra por common-vue/mixins/app.js a Vue.mixin():
		 * queda disponible en TODA la app (incluido el modal de la notificación global)
		 * sin tocar common-vue. Si no se pasa id, se respeta la conversación que ya
		 * estuviera seleccionada: al abrir, el panel cae solo a la última con actividad.
		 *
		 * @param {number|null} conversation_id
		 */
		abrir_chat_ia(conversation_id = null) {
			if (conversation_id) {
				this.$store.commit('ai_chat/setSelectedConversationId', conversation_id)
			}
			this.$store.commit('ai_chat/setPanelAbierto', true)
		},
		/**
		 * Abre el sidebar de WhatsApp parado en una conversación, desde cualquier parte del
		 * sistema (la bandeja del módulo, Clientes, Pedidos online, Compradores).
		 *
		 * Vive acá por el mismo motivo que `abrir_chat_ia()`: este mixin entra por
		 * `common-vue/mixins/app.js` a `Vue.mixin()`, así que el método queda disponible en
		 * TODA la app sin importar nada y sin tocar `common-vue`. Es lo que permite que el
		 * botón de Compradores —que no tiene componente propio, se declara en `models/buyer.js`
		 * y se despacha desde `mixins/model_functions.js`— pueda abrir el sidebar igual que
		 * cualquier componente con template.
		 *
		 * `display_name` viaja hasta la base: lo reenvía `whatsapp_chat/abrirChat`, lo valida
		 * `WhatsappChatController::store()` y se guarda en `whatsapp_chats.display_name`. Es lo
		 * que hace que abrir un chat nuevo desde un pedido o desde Compradores muestre el nombre
		 * del comprador y no un número pelado — desde Clientes el nombre ya salía del cliente
		 * vinculado. Solo se usa al **crear**: si el chat ya existía, no le pisa el nombre.
		 *
		 * `borrador` es lo contrario: NO viaja a la base. Es el texto que el que abre la
		 * conversación quiere dejar ya escrito en el composer (hoy, el mensaje de una oferta),
		 * y muere en el front — `whatsapp_chat/abrirChat` lo guarda en `state.borrador` y el
		 * composer lo consume de una sola vez. 🔴 Acá el payload se pasa ENTERO al dispatch, así
		 * que una clave nueva llega sola; el que sí lo rearma campo por campo es `abrirChat`
		 * antes del POST, y ahí es donde hay que acordarse de agregarla (su docblock lo avisa,
		 * y `display_name` ya se perdió una vez justo por eso).
		 *
		 * @param {Object} payload { chat_id } o { phone, client_id, display_name }
		 * @param {string} [payload.borrador] Texto a dejar cargado en el composer.
		 * @returns {Promise}
		 */
		abrir_chat_whatsapp(payload) {
			let self = this
			let datos = payload || {}
			if (!datos.chat_id && !datos.phone) {
				this.$toast.error('No se pudo abrir la conversación de WhatsApp: falta el teléfono')
				return Promise.resolve(null)
			}
			return this.$store.dispatch('whatsapp_chat/abrirChat', datos)
				.catch(function (err) {
					console.log(err)
					self.$toast.error('No se pudo abrir la conversación de WhatsApp')
				})
		},
		/**
		 * Abre el sidebar de Mensajes de Tienda Online parado en la conversación con un comprador,
		 * desde cualquier parte del sistema: la bandeja del submódulo, el botón "Mensaje" de
		 * Clientes de Tienda Online, la tabla de Alertas y el aviso de mensaje nuevo.
		 *
		 * Vive acá por el mismo motivo que `abrir_chat_whatsapp()`: este mixin entra a
		 * `Vue.mixin()` por `common-vue/mixins/app.js`, así que el método existe en TODA la app,
		 * incluido el botón de la tabla de Clientes, que no tiene componente propio (se declara en
		 * `models/buyer.js` y lo despacha `mixins/model_functions.js`).
		 *
		 * 🔴 Corta si no está la extensión `online` o el permiso `buyer.index`: el anfitrión del
		 * sidebar no se monta sin esas dos cosas, y abrir el panel en el store sin nadie que lo
		 * dibuje dejaría una conversación "abierta" invisible, que se marcaría leída sola con cada
		 * mensaje que entre.
		 *
		 * @param {Object|Number} buyer_o_id El comprador (con `id`, y lo que tenga de nombre,
		 *                                    email y teléfono para el header) o solo su id.
		 * @returns {Promise}
		 */
		abrir_chat_tienda(buyer_o_id) {
			let self = this
			let buyer = buyer_o_id && typeof buyer_o_id == 'object' ? buyer_o_id : null
			let buyer_id = parseInt(buyer ? buyer.id : buyer_o_id, 10)
			if (isNaN(buyer_id) || buyer_id <= 0) {
				this.$toast.error('No se pudo abrir la conversación: falta el comprador')
				return Promise.resolve(null)
			}
			if (!this.hasExtencion('online') || !this.can('buyer.index')) {
				this.$toast.error('No tenés acceso a los mensajes de la tienda')
				return Promise.resolve(null)
			}
			return this.$store.dispatch('tienda_mensajes/abrirChat', {
				buyer_id: buyer_id,
				buyer: buyer,
			})
				.catch(function (err) {
					console.log(err)
					self.$toast.error('No se pudo abrir la conversación')
				})
		},
		/**
		 * Hijos de "Tienda Online" (D31). Son funciones y no entradas con name
		 * 'online' + params porque toRoute() corta cuando el name de la ruta ya es
		 * el actual, y estos hijos se usan justamente estando adentro de /online.
		 */
		ir_a_online_clientes() {
			if (this.$route.name == 'online' && this.$route.params.view == 'clientes') {
				return
			}
			this.$router.push({name: 'online', params: {view: 'clientes'}})
		},
		ir_a_online_mensajes() {
			if (this.$route.name == 'online' && this.$route.params.view == 'mensajes') {
				return
			}
			this.$router.push({name: 'online', params: {view: 'mensajes'}})
		},
		ir_a_online_cupones() {
			if (this.$route.name == 'online' && this.$route.params.view == 'cupones') {
				return
			}
			this.$router.push({name: 'online', params: {view: 'cupones'}})
		},
		/**
		 * Promociones: la vista del motor de ofertas por cliente, montada abajo de
		 * Tienda Online. Hasta el 14/9/2026 era el MISMO componente que IA -> Ofertas;
		 * con el módulo IA viejo fuera del menú (misión "modulo-ia-mostrador"), esta es
		 * su única entrada. Acá nunca hay :id, así que siempre cae al listado.
		 */
		ir_a_online_promociones() {
			if (this.$route.name == 'online' && this.$route.params.view == 'promociones') {
				return
			}
			this.$router.push({name: 'online', params: {view: 'promociones'}})
		},
		/**
		 * Abre el Centro de recursos (misión centro-de-recursos-clientes, 13/10/2026): la página con
		 * los videos del sistema, entrando con el usuario logueado. Lo llama el ítem "Centro de
		 * recursos" del menú (router/routes.js) y lo puede tocar cualquier usuario, dueño o empleado.
		 *
		 * La API emite un pase de un solo uso (POST centro-recursos/pase) y devuelve la URL de la
		 * página con ese pase. No pasa por el router: es otra página, en otra pestaña.
		 *
		 * 🔴 La pestaña se abre YA, vacía y sincrónica en el clic, y recibe la URL cuando vuelve el
		 * pedido. Si se abriera recién en el .then(), el bloqueador de ventanas emergentes la frenaría:
		 * para el navegador ya no sería un gesto del usuario. Es el mismo camino que el botón de
		 * WhatsApp de los comprobantes (common-vue/sale-print-buttons/WhatsappBtn.vue). Sin opener,
		 * para que la página que se cargue ahí no pueda tocar esta pestaña del sistema.
		 *
		 * Si la página todavía no responde (`disponible: false`) o el pedido falla, la pestaña se
		 * cierra y se avisa: nunca se deja al usuario frente a una pestaña en blanco ni a un dominio
		 * muerto. El pedido va con `skip_global_error_event` para que el interceptor global no tire
		 * su propio cartel encima de este.
		 */
		abrir_centro_de_recursos() {
			let self = this
			let ventana = window.open('', '_blank')
			if (ventana) {
				ventana.opener = null
			}
			this.$api.post('centro-recursos/pase', {}, {
				skip_global_error_event: true,
			})
			.then(function (res) {
				let datos = res && res.data ? res.data : {}
				if (!datos.disponible || !datos.url) {
					self.cerrar_pestana_del_centro_de_recursos(ventana)
					self.$toast.info('El centro de recursos va a estar disponible en breve')
					return
				}
				if (ventana && !ventana.closed) {
					ventana.location.href = datos.url
					return
				}
				/*
					El navegador no dejó abrir la pestaña en el clic (o el usuario ya la cerró): se
					prueba una vez más con la URL. Si también la frena, se avisa en vez de navegar
					esta pestaña y sacar al usuario del sistema.

					Sin 'noopener' en las opciones a propósito: con esa opción window.open() devuelve
					null AUNQUE la pestaña se abra, y no habría forma de saber si hay que avisar. El
					opener se corta a mano, como arriba.
				*/
				let nueva = window.open(datos.url, '_blank')
				if (!nueva) {
					self.$toast.error('El navegador bloqueó la pestaña nueva. Permití las ventanas emergentes para este sitio y probá de nuevo.')
					return
				}
				try {
					nueva.opener = null
				} catch (e) {
					console.log(e)
				}
			})
			.catch(function (err) {
				console.log(err)
				self.cerrar_pestana_del_centro_de_recursos(ventana)
				self.$toast.error('No se pudo abrir el centro de recursos. Probá de nuevo en un momento.')
			})
		},
		/**
		 * Cierra la pestaña vacía que abrió abrir_centro_de_recursos(), si sigue abierta.
		 *
		 * @param {Window|null} ventana
		 */
		cerrar_pestana_del_centro_de_recursos(ventana) {
			if (ventana && !ventana.closed) {
				ventana.close()
			}
		},
		toProduccion() {
			if (this.user) {
				if (this.hasExtencion('production.order_production')) {
					this.$router.push({name: 'produccion', params: {view: 'ordenes'}})
				} else if (this.hasExtencion('production.production_movement')) {
					this.$router.push({name: 'produccion', params: {view: 'movimientos'}})
				}
			}
		},
		toSales() {
			if (this.user) {
				let from_dates = this.$store.state.sale.from_dates
				
				// Si entra, es porque se llamo el historico desde Deposito
				if (!from_dates) {

					this.$store.commit('sale/setFromDates', true)
				}

				// El modulo va ANTES del pedido: `sale/_getModels` pide el listado paginado del día
				// solo con modulo 'ventas'. Sin esta línea, este primer pedido salía con el modulo que
				// hubiera quedado en el store (`deposito`, por ejemplo) y bajaba el listado entero,
				// para que created() de Ventas.vue lo pidiera de vuelta paginado un instante después.
				this.$store.commit('sale/set_modulo', 'ventas')
				this.$store.dispatch('sale/getModels')

				let sucursal = this.get_address_param()

				let empelado = this.get_employee_param()
				
				this.$router.push({name: 'sale', params: {view: sucursal, sub_view: empelado}})

			}
		},
		get_address_param() {
			let sucursal = 'todas' 

			if (!this.can('sale.index.addresses.all')
				&& this.can('sale.index.addresses.only_your')) {

				if (this.user.address_id) {
					let user_address = this.$store.state.address.models.find(address => address.id == this.user.address_id)
					
					if (typeof user_address != 'undefined') {

						sucursal = this.routeString(user_address.street)
					}
				}
			}

			return sucursal
		},
		get_employee_param() {
			let empleado = 'todos' 
 
			if (!this.can('sale.index.employees.all')
				&& this.can('sale.index.employees.only_your')) {

				empleado = this.routeString(this.user.name)
			}

			return empleado
		},
	}
}