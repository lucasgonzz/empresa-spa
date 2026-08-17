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
		 * Entrada del módulo padre "IA" de la nav (D29). Antes mandaba siempre a
		 * Sugerencias de stock, que era su único submódulo; con "sugerencias de
		 * compra" (15/8/2026) ya no alcanza con eso, así que decide por extensión:
		 * stock si la tiene (prioridad histórica), si no compras, si no ofertas
		 * (15/8/2026), y si no tiene ninguna no navega a ningún lado (el padre
		 * tampoco debería estar visible
		 * en ese caso, ver if_has_alguna_extencion de router/routes.js). El guard
		 * evita el NavigationDuplicated de apretar el padre estando ya en el
		 * listado del destino (desde un detalle sí navega).
		 */
		ir_a_modulo_ia() {
			let destino = null
			if (this.hasExtencion('sugerencias_inteligentes')) {
				destino = 'sugerencias_stock'
			} else if (this.hasExtencion('sugerencias_compras')) {
				destino = 'sugerencias_compra'
			} else if (this.hasExtencion('motor_de_ofertas')) {
				destino = 'ofertas'
			}
			if (!destino) {
				return
			}
			if (this.$route.name != destino || this.$route.params.id) {
				this.$router.push({name: destino})
			}
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
		ir_a_online_cupones() {
			if (this.$route.name == 'online' && this.$route.params.view == 'cupones') {
				return
			}
			this.$router.push({name: 'online', params: {view: 'cupones'}})
		},
		/**
		 * Promociones: la vista del motor de ofertas por cliente, montada también
		 * abajo de Tienda Online. Es el MISMO componente que IA -> Ofertas; la
		 * única diferencia es que acá nunca hay :id, así que siempre cae al listado.
		 */
		ir_a_online_promociones() {
			if (this.$route.name == 'online' && this.$route.params.view == 'promociones') {
				return
			}
			this.$router.push({name: 'online', params: {view: 'promociones'}})
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