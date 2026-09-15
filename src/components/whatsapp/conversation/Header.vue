<template>
	<div
	v-if="chat"
	class="whatsapp-header">
		<!-- Fila 1: quién es y las acciones sobre el chat. Es la que ya existía. -->
		<div class="whatsapp-header__fila">
			<div class="whatsapp-header__identity">
				<!-- 🔴 v-if y no un string vacío a secas: sin nombre de cliente ni display_name,
				`chat_name` devuelve '' (ver el computed) y ACÁ no se dibuja nada, en vez de caer
				al teléfono como antes — que quedaba repetido con `__phone`, dos líneas abajo,
				mostrando el mismo dato dos veces. -->
				<strong
				v-if="chat_name"
				class="whatsapp-header__name"
				:class="{'whatsapp-header__name--clickable': Boolean(chat.client)}"
				:title="chat.client ? 'Ver ficha del cliente' : null"
				@click="chat.client && abrir_ficha_cliente()">
					{{ chat_name }}
				</strong>
				<span class="whatsapp-header__sub">
					<span class="whatsapp-header__phone">
						{{ chat.phone }}
					</span>
					<!-- El chat está corriendo sobre un entrante simulado: nada de lo que salga de
					acá llega al cliente hasta que escriba de verdad. -->
					<b-badge
					v-if="en_simulacion"
					variant="warning"
					class="whatsapp-header__sim"
					title="El último mensaje entrante lo simulaste vos. Los envíos hacia WhatsApp están frenados hasta que el cliente escriba de verdad.">
						<i class="bi bi-cone-striped"></i>
						Simulación
					</b-badge>
				</span>
			</div>

			<div class="whatsapp-header__actions">
				<!-- Botón para vincular: solo mientras el chat NO tiene cliente. Una vez
				vinculado desaparece — el nombre ya se ve como título del chat (de arriba) y ES
				el nombre del cliente, así que un segundo botón repitiéndolo era la misma
				duplicación que el punto del teléfono/nombre. Cambiar o quitar el vínculo ya
				vinculado se hace desde el menú de los tres puntos, acá abajo. -->
				<b-button
				v-if="!chat.client"
				size="sm"
				variant="outline-secondary"
				class="whatsapp-header__btn"
				@click="$bvModal.show('whatsapp-link-client')">
					<i class="bi bi-person"></i>
					<span class="whatsapp-header__btn-texto">
						Vincular cliente
					</span>
				</b-button>

				<!-- Cuenta corriente del cliente vinculado: solo ícono, una por moneda (pesos
				siempre, dólares si el negocio tiene la extensión `ventas_en_dolares` —lo decide
				`BtnCurrentAcounts::show()`, no se repite el chequeo acá). `client_completo` es el
				cliente con `credit_accounts` cargado (`chat.client` no la trae: `WhatsappChat`
				solo hace `with(['client', 'user'])`), así que mientras no llegó no se dibuja
				nada en vez de un botón que todavía no sabe qué cuentas tiene. -->
				<btn-current-acounts
				v-if="chat.client && client_completo"
				:model="client_completo"
				model_name="client"
				icon_only
				modal_id="whatsapp-current-acounts"></btn-current-acounts>

				<b-dropdown
				size="sm"
				variant="outline-secondary"
				toggle-class="whatsapp-header__btn"
				right
				no-caret>
					<template #button-content>
						<i class="bi bi-three-dots-vertical"></i>
					</template>
					<b-dropdown-item @click="openSummary">
						<i class="bi bi-file-text"></i>
						Resumen
					</b-dropdown-item>
					<b-dropdown-item @click="copyConversation">
						<i class="bi bi-clipboard"></i>
						Copiar conversación
					</b-dropdown-item>
					<!-- Cambiar o quitar el vínculo de un chat YA vinculado. El botón de arriba
					cubre "vincular por primera vez"; este es el que reemplaza a lo que antes
					vivía en un botón siempre visible. Abre el mismo modal de siempre
					(`LinkClientModal`, que ya tiene "Quitar vínculo actual" cuando hay cliente). -->
					<b-dropdown-item v-if="chat.client" @click="$bvModal.show('whatsapp-link-client')">
						<i class="bi bi-link-45deg"></i>
						Cambiar vínculo con el cliente
					</b-dropdown-item>
				</b-dropdown>

				<!-- Cierra el sidebar. Es un <button> pelado y no un b-button porque tiene que
				leerse como la × de un panel, no como una acción más de la fila de la derecha. -->
				<button
				class="whatsapp-header__cerrar"
				type="button"
				title="Cerrar la conversación"
				@click="cerrar_sidebar">
					<i class="bi bi-x-lg"></i>
				</button>
			</div>
		</div>

		<!-- Fila 2: el interruptor de IA y las herramientas del chat — sugerir, plantillas y
		simular. Sugerir/Plantillas vivían en el toolbar del composer, arriba del input; se
		mudaron acá porque son herramientas del chat, no partes del mensaje que se está
		escribiendo, y ahí abajo competían por lugar con el clip, el micrófono y el enviar. El
		toggle de IA y "Simular mensaje del cliente" se sumaron el 15/9/2026: el primero vivía
		solo en la fila 1 (apretado contra "Vincular cliente" y los tres puntos), el segundo en
		el toolbar del composer — es el mismo criterio, todo lo que es una herramienta sobre el
		chat entero (no sobre un mensaje puntual) vive acá. `flex-wrap: wrap` ya estaba puesto
		para Sugerir/Plantillas: con cuatro controles en vez de dos, salta antes, y es lo que
		Lucas pidió. -->
		<div class="whatsapp-header__fila whatsapp-header__fila--ayudas">
			<!-- Toggle de respuesta automática por IA para este chat -->
			<b-form-checkbox
			switch
			:checked="chat.ai_enabled"
			@change="toggleAi"
			data-tour="whatsapp.toggle_ia"
			class="whatsapp-header__ai-toggle">
				IA
			</b-form-checkbox>

			<b-button
			size="sm"
			variant="outline-secondary"
			class="whatsapp-header__btn"
			:disabled="suggesting"
			data-tour="whatsapp.boton_sugerir_respuesta"
			title="La IA lee la conversación y escribe un borrador en el input. Nunca se envía solo."
			@click="suggest">
				<i class="bi bi-magic"></i>
				{{ suggesting ? 'Sugiriendo...' : 'Sugerir respuesta' }}
			</b-button>
			<b-button
			size="sm"
			variant="outline-secondary"
			class="whatsapp-header__btn"
			title="Plantillas aprobadas por Meta: es el único camino para retomar una conversación fuera de la ventana de 24 h."
			@click="$bvModal.show('whatsapp-templates')">
				<i class="bi bi-file-earmark-text"></i>
				Plantillas
			</b-button>
			<!-- Simular un mensaje entrante del cliente. Se saca de acá y no de un v-if propio
			porque es EXACTAMENTE el mismo gateo que ya usaba en Composer.vue: solo el dueño, y
			solo si `chat_simulation_enabled` está prendido en la config del agente (apagado de
			fábrica). -->
			<b-button
			v-if="is_owner && config && config.chat_simulation_enabled"
			size="sm"
			variant="outline-secondary"
			class="whatsapp-header__btn"
			title="Inyecta un mensaje como si lo hubiera escrito el cliente. No le llega nada a nadie."
			@click="$bvModal.show('whatsapp-simulate-in-chat')">
				<i class="bi bi-cone-striped"></i>
				Simular mensaje del cliente
			</b-button>
		</div>

		<link-client-modal
		:chat="chat"></link-client-modal>

		<summary-modal
		:chat="chat"></summary-modal>

		<simulate-in-chat-modal
		:chat="chat"></simulate-in-chat-modal>

		<!-- Cuenta corriente del cliente vinculado. `modal_id` propio: sin él, si el sidebar
		está abierto ENCIMA de una pantalla que ya monta `current-acounts/Index.vue` (Clientes,
		Vender, Ventas...), quedan dos `<b-modal>` con el mismo id y `$bvModal.show()` les
		dispara el evento a las dos juntas. -->
		<current-acounts
		v-if="chat.client"
		modal_id="whatsapp-current-acounts"></current-acounts>

		<!-- El modal del cliente vinculado: el ABM genérico de siempre (`model_name="client"`),
		montado suelto y con `modal_id` propio por el mismo motivo de arriba — ya hay precedente
		de montarlo así, sin el `view-component` que lo envuelve en las pantallas de listado, en
		`current-acounts/Index.vue` (para budget/order_production/provider_order). Lo alimenta
		`abrir_ficha_cliente()`, que comitea `client_completo` (el mismo que usan los botones de
		cuenta corriente de arriba) antes de mostrarlo. -->
		<model-index
		v-if="chat.client"
		model_name="client"
		modal_id="whatsapp-client-modal"></model-index>
	</div>
</template>
<script>
import moment from 'moment'
import LinkClientModal from '@/components/whatsapp/conversation/LinkClientModal'
import SummaryModal from '@/components/whatsapp/conversation/SummaryModal'
import SimulateInChatModal from '@/components/whatsapp/conversation/SimulateInChatModal'
import BtnCurrentAcounts from '@/components/common/BtnCurrentAcounts'
export default {
	components: {
		LinkClientModal,
		SummaryModal,
		SimulateInChatModal,
		BtnCurrentAcounts,
		// Lazy: son modales que no todo chat necesita (solo uno vinculado a un cliente), y
		// `current-acounts/Index.vue` en particular arrastra su propia batería de sub-modales
		// (pagos, notas de crédito/débito, etc.) — no tiene sentido bajarla en el chunk del
		// header si nunca se abre un chat vinculado.
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		ModelIndex: () => import('@/common-vue/components/model/Index'),
	},
	data() {
		return {
			// true mientras viaja el pedido de sugerencia (deshabilita el botón).
			suggesting: false,
			// Cliente vinculado, completo (con credit_accounts y el resto de withAll()). null
			// hasta que `cargar_cliente_completo()` lo resuelve, o si el chat no está
			// vinculado. Ver el watch de `linked_client_id`.
			client_completo: null,
		}
	},
	computed: {
		// El getter del store hace exactamente esto y ya existía; este computed estaba copiado
		// byte por byte también en conversation/Index.vue y en Composer.vue.
		chat() {
			return this.$store.getters['whatsapp_chat/selected_chat']
		},
		/**
		 * Id de la conversación abierta, leído del state y NO de `chat.id`: cuando se salta a un
		 * chat que todavía no está en la bandeja (link directo, o uno recién creado) el getter
		 * devuelve null por un instante. Es el mismo computed que miran `Composer.vue` y
		 * `Messages.vue`.
		 *
		 * @returns {number|null}
		 */
		chat_id() {
			return this.$store.state.whatsapp_chat.selected_chat_id
		},
		messages() {
			return this.$store.state.whatsapp_chat.messages
		},
		/**
		 * El chat abierto está en modo simulación (getter de `store/whatsapp_chat.js`).
		 */
		en_simulacion() {
			return this.$store.getters['whatsapp_chat/chat_en_simulacion']
		},
		chat_name() {
			if (!this.chat) {
				return ''
			}
			if (this.chat.client && this.chat.client.name) {
				return this.chat.client.name
			}
			// 🔴 Ya NO cae al teléfono. `__phone`, dos líneas más abajo en el template, ya lo
			// muestra: devolverlo acá también era mostrar el mismo dato dos veces. Sin nombre
			// de cliente ni display_name, el template esconde el <strong> entero por completo
			// (`v-if="chat_name"`), en vez de dejarlo vacío.
			return this.chat.display_name || ''
		},
		/**
		 * Id del cliente vinculado a la conversación abierta, o null. Computed aparte —y no un
		 * watch directo sobre la ruta 'chat.client'— porque un valor primitivo dispara el
		 * watcher de forma confiable, sin depender de cómo Vue 2 resuelva un path anidado
		 * sobre un computed que a su vez lee del store.
		 *
		 * @returns {number|null}
		 */
		linked_client_id() {
			return (this.chat && this.chat.client) ? this.chat.client.id : null
		},
		/**
		 * Config del agente (mismo patrón que usa `whatsapp/config/AgentConfig.vue` y
		 * `chats-list/Index.vue`): de acá se lee `chat_simulation_enabled` para gatear
		 * "Simular mensaje del cliente", que hasta el 15/9/2026 vivía en el toolbar del
		 * composer con este mismo gateo.
		 *
		 * @returns {Object|null}
		 */
		config() {
			return this.$store.state.whatsapp_bot_config.models[0] || null
		},
	},
	watch: {
		/**
		 * 🔴 El indicador de "pidiendo sugerencia" se limpia al saltar de conversación.
		 *
		 * Este componente NO se recrea al cambiar de chat (no hay `:key` en
		 * `conversation/Index.vue`), así que sin esto el flag se arrastraba: pedir una sugerencia
		 * para el cliente A y saltar al B dejaba el botón de B diciendo "Sugiriendo..." sin que
		 * nadie hubiera pedido nada para B, y —peor— el corte por `this.suggesting` de
		 * `suggest()` se comía el click de B hasta que volviera la respuesta de A.
		 *
		 * Limpiar el flag no habilita que la respuesta de A caiga en B: de eso se encargan las
		 * dos guardas de `suggest()` y de `tomar_borrador()`, que comparan contra el chat que
		 * está abierto en el momento de la respuesta.
		 */
		chat_id() {
			this.suggesting = false
		},
		/**
		 * `immediate: true` para cubrir tanto el primer chat que se abre (el componente recién
		 * se crea con uno ya vinculado) como cualquier cambio posterior: saltar a otro chat,
		 * vincular/desvincular el que ya está abierto, o volver a uno que ya tenía cliente.
		 */
		linked_client_id: {
			immediate: true,
			handler() {
				this.cargar_cliente_completo()
			},
		},
	},
	methods: {
		/**
		 * El sidebar no recibe props ni emite eventos: se cierra commiteando el store, que es
		 * de donde saca su visibilidad.
		 */
		cerrar_sidebar() {
			this.$store.commit('whatsapp_chat/setSidebarAbierto', false)
		},
		toggleAi() {
			this.$store.dispatch('whatsapp_chat/toggleAi', this.chat.id)
			.catch(err => {
				console.log(err)
				this.$toast.error('No se pudo cambiar la respuesta automática')
			})
		},
		openSummary() {
			this.$bvModal.show('whatsapp-summary')
		},
		/**
		 * Pide una sugerencia de la IA y la deja en el input del composer, editable antes de
		 * enviar (nunca se envía sola).
		 *
		 * 🔴 El texto NO se escribe directo en el composer, porque el borrador es un `data()` de
		 * ESE componente y desde acá no se puede tocar. Viaja por el mecanismo de borrador que ya
		 * existe en el store (`setBorrador`), el mismo que usa el botón de una oferta para abrir
		 * el chat con el mensaje escrito: `Composer.vue` tiene un `watch: borrador` que lo levanta
		 * y lo consume de una sola vez. No hace falta ningún canal nuevo entre los dos
		 * componentes, y el que se usa está documentado y probado.
		 *
		 * La guarda de "esta sugerencia es de ESTE chat" queda por partida doble: el corte de acá
		 * abajo y el `borrador.chat_id != chat_id` de `tomar_borrador()`. Sin ella, la respuesta
		 * que la IA escribió leyendo la conversación del cliente A —con los datos de A adentro—
		 * aparecía escrita en el input con el cliente B abierto, a un Enter de mandarse.
		 */
		suggest() {
			let self = this
			if (!this.chat || this.suggesting) {
				return
			}
			let chat_pedido = this.chat.id
			this.suggesting = true
			this.$store.dispatch('whatsapp_chat/suggest', chat_pedido)
			.then(function (suggestion) {
				self.suggesting = false
				if (chat_pedido != self.chat_id) {
					return
				}
				self.$store.commit('whatsapp_chat/setBorrador', {
					chat_id: chat_pedido,
					texto: suggestion || '',
				})
			})
			.catch(function (err) {
				self.suggesting = false
				console.log(err)
				// 🔴 Antes de la misión del 15/9/2026 el back solo podía rechazar con "chat no
				// encontrado" o "sin configuración de WhatsApp": cualquier otro problema volvía
				// como 200 con suggestion vacía, y por eso este catch nunca corría para el caso
				// que Lucas reportó. Ahora el back sí distingue el motivo (sin conexión con la
				// IA, sin historial, la API caída, una excepción, una respuesta que era solo la
				// foto) y lo manda en `message`: se muestra ESE texto en vez del genérico
				// siempre que venga.
				let data = err.response && err.response.data
				self.$toast.error((data && data.message) || 'No se pudo generar la sugerencia')
			})
		},
		/**
		 * Trae el cliente completo (con `credit_accounts` y el resto de `Client::scopeWithAll()`)
		 * cuando el chat abierto está vinculado a uno. `chat.client` no alcanza para los botones
		 * de cuenta corriente ni para el modal de ficha: `WhatsappChat` solo eager-carga
		 * `with(['client', 'user'])`, sin esas relaciones. Se pide una vez por chat+cliente (lo
		 * dispara el watch de `linked_client_id`), no en cada render.
		 *
		 * @returns {void}
		 */
		cargar_cliente_completo() {
			let client_id = this.linked_client_id
			// 🔴 Se limpia SIEMPRE antes de pedir el nuevo, no solo cuando no hay cliente.
			// `chat.client` (y con él `chat_name` y el nombre clickeable) cambia en el mismo
			// tick del click en la bandeja, pero este fetch tarda lo que tarde la red. Sin
			// limpiar acá, en esa ventana el botón de cuenta corriente y el modal de ficha
			// seguían mostrando los datos del cliente ANTERIOR con el nombre del nuevo cliente
			// ya escrito arriba — plata y datos de otro cliente a la vista. La guarda de abajo
			// (`linked_client_id != client_id`) evita que una respuesta vieja PISE a la nueva,
			// pero no alcanza para evitar que la vieja se siga mostrando mientras la nueva viaja.
			this.client_completo = null
			if (!client_id) {
				return
			}
			let self = this
			this.$store.dispatch('client/getModel', client_id)
			.then(function (model) {
				// Guarda contra saltos de chat mientras el pedido viaja: si para cuando vuelve
				// ya se abrió otro cliente (o ninguno), este resultado es viejo y no se aplica.
				if (self.linked_client_id != client_id) {
					return
				}
				self.client_completo = model
			})
			.catch(function (err) {
				console.log(err)
			})
		},
		/**
		 * Abre el modal del cliente vinculado (el ABM genérico de siempre) con lo que ya se
		 * tiene en `client_completo`. Mismo patrón que usa `display.js`/`Tr.vue` para abrir el
		 * modal de edición desde una fila de tabla: comitear el modelo, mostrar el modal.
		 *
		 * @returns {void}
		 */
		abrir_ficha_cliente() {
			if (!this.client_completo) {
				return
			}
			this.$store.commit('client/setModel', { model: this.client_completo, properties: [] })
			this.$bvModal.show('whatsapp-client-modal')
		},
		/**
		 * Arma un texto plano `[fecha hora] Quién: mensaje` con toda la conversación cargada
		 * y lo copia al portapapeles.
		 */
		copyConversation() {
			let lines = []
			this.messages.forEach(message => {
				let when = moment(message.created_at).format('DD/MM/YYYY HH:mm')
				let who = 'Cliente'
				if (message.direction == 'out') {
					if (message.source == 'ia') {
						who = 'IA'
					} else if (message.source == 'plantilla') {
						who = message.template_meta_name || 'Plantilla'
					} else if (message.source == 'sistema') {
						who = 'Sistema'
					} else if (message.source == 'recordatorio_cobro') {
						// Igual que en MessageBubble: sin esta rama el recordatorio caía al
						// fallback 'Empresa' y la conversación copiada no dejaba ver que ese
						// mensaje lo disparó el módulo de alertas y no una persona.
						who = 'Recordatorio de cobro'
					} else if (message.sent_by_user && message.sent_by_user.name) {
						who = message.sent_by_user.name
					} else {
						who = 'Empresa'
					}
				}
				lines.push('[' + when + '] ' + who + ': ' + message.body)
			})
			let text = lines.join('\n')
			this.copyToClipboard(text)
		},
		/**
		 * Copia texto al portapapeles usando la API moderna, con fallback a `execCommand`
		 * para navegadores/contextos sin `navigator.clipboard` disponible.
		 *
		 * @param {string} text
		 */
		copyToClipboard(text) {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(text)
				.then(() => {
					this.$toast.success('Conversación copiada')
				})
				.catch(() => {
					this.$toast.error('No se pudo copiar')
				})
				return
			}
			let textarea = document.createElement('textarea')
			textarea.value = text
			textarea.style.position = 'fixed'
			textarea.style.opacity = '0'
			document.body.appendChild(textarea)
			textarea.focus()
			textarea.select()
			try {
				document.execCommand('copy')
				this.$toast.success('Conversación copiada')
			} catch (e) {
				this.$toast.error('No se pudo copiar')
			}
			document.body.removeChild(textarea)
		},
	},
}
</script>
<style lang="sass">
// 🔴 El alto fijo de 60px se sacó: el header pasó a tener DOS filas (identidad + acciones, y las
// dos ayudas para redactar), así que su alto lo tiene que dar el contenido. Con la altura fija, la
// segunda fila quedaba recortada por la mitad.
.whatsapp-header
	display: flex
	flex-direction: column
	padding: 8px 12px
	background: var(--wa-panel)
	border-bottom: 1px solid var(--wa-borde)
	color: var(--wa-texto)
	&__fila
		display: flex
		flex-direction: row
		justify-content: space-between
		align-items: center
		min-height: 44px
		gap: 8px
	// La fila de las ayudas se alinea a la izquierda (los dos botones juntos, compactos) y se
	// despega de la de arriba con una línea tenue: son dos grupos distintos y sin el separador se
	// leían como una sola pila de botones.
	&__fila--ayudas
		justify-content: flex-start
		flex-wrap: wrap
		gap: 6px
		min-height: 0
		margin-top: 6px
		padding-top: 6px
		border-top: 1px solid var(--wa-borde)
	&__identity
		display: flex
		flex-direction: column
		min-width: 0
	&__name
		font-size: .95rem
	// Solo cuando hay cliente vinculado (`abrir_ficha_cliente()` se llama únicamente en ese
	// caso — ver el template): el título del chat, que en ese momento ES el nombre del
	// cliente, se vuelve la forma de abrir su ficha.
	&__name--clickable
		cursor: pointer
		&:hover
			text-decoration: underline
	&__sub
		display: flex
		flex-direction: row
		align-items: center
		gap: 6px
		min-width: 0
	&__phone
		font-size: .75rem
		opacity: var(--wa-texto-muy-tenue-op)
	&__sim
		flex-shrink: 0
		white-space: nowrap
		display: inline-flex
		align-items: center
		gap: 4px
	&__actions
		display: flex
		flex-direction: row
		align-items: center
		gap: 8px
		flex-shrink: 0
	&__ai-toggle
		margin-right: 4px
		margin-bottom: 0
	// Geometría compartida de los botones del header. Copia la de .btn-modulo
	// (_controles_modulo.sass) pero con el alto más chico: acá conviven dos filas dentro de un
	// panel de 320px de ancho mínimo, y los 36px del token de barra las estiran demasiado.
	//
	// El `.btn` del selector no es adorno: bootstrap-vue siempre agrega esa clase, y con dos
	// clases el selector queda en (0,2,0), que le gana a `.btn-sm` (0,1,0).
	&__btn.btn
		height: 32px
		display: inline-flex
		align-items: center
		justify-content: center
		gap: 5px
		padding: 0 10px
		font-size: .8125rem
		line-height: 1
		border-radius: var(--toolbar-btn-radius)
		white-space: nowrap
		// El nombre de un cliente largo no puede estirar el botón hasta empujar la × fuera del
		// panel. El botón acota el ancho; el recorte con puntos lo hace el <span> de adentro (ver
		// el comentario del template: sobre un contenedor flex, `text-overflow` no dibuja puntos).
		max-width: 190px
		overflow: hidden
	&__btn-texto
		display: block
		min-width: 0
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
	&__cerrar
		flex-shrink: 0
		width: 32px
		height: 32px
		border: none
		border-radius: 8px
		background: transparent
		color: var(--wa-texto)
		opacity: var(--wa-texto-tenue-op)
		display: flex
		align-items: center
		justify-content: center
		&:hover
			background: var(--wa-hover)
			opacity: 1
</style>
