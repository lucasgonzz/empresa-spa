<template>
	<div
	v-if="chat"
	class="whatsapp-header">
		<!-- Fila 1: quién es y las acciones sobre el chat. Es la que ya existía. -->
		<div class="whatsapp-header__fila">
			<div class="whatsapp-header__identity">
				<strong class="whatsapp-header__name">
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
				<!-- Toggle de respuesta automática por IA para este chat -->
				<b-form-checkbox
				switch
				:checked="chat.ai_enabled"
				@change="toggleAi"
				class="whatsapp-header__ai-toggle">
					IA
				</b-form-checkbox>

				<!-- Cliente vinculado (clickeable para cambiar/quitar) o botón para vincular -->
				<b-button
				size="sm"
				variant="outline-secondary"
				class="whatsapp-header__btn"
				@click="$bvModal.show('whatsapp-link-client')">
					<i class="bi bi-person"></i>
					{{ chat.client ? chat.client.name : 'Vincular cliente' }}
				</b-button>

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

		<!-- Fila 2: las dos ayudas para redactar. Vivían en el toolbar del composer, arriba del
		input; se mudaron acá porque son herramientas del chat, no partes del mensaje que se está
		escribiendo, y ahí abajo competían por lugar con el clip, el micrófono y el enviar. -->
		<div class="whatsapp-header__fila whatsapp-header__fila--ayudas">
			<b-button
			size="sm"
			variant="outline-secondary"
			class="whatsapp-header__btn"
			:disabled="suggesting"
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
		</div>

		<link-client-modal
		:chat="chat"></link-client-modal>

		<summary-modal
		:chat="chat"></summary-modal>
	</div>
</template>
<script>
import moment from 'moment'
import LinkClientModal from '@/components/whatsapp/conversation/LinkClientModal'
import SummaryModal from '@/components/whatsapp/conversation/SummaryModal'
export default {
	components: {
		LinkClientModal,
		SummaryModal,
	},
	data() {
		return {
			// true mientras viaja el pedido de sugerencia (deshabilita el botón).
			suggesting: false,
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
			return this.chat.display_name || this.chat.phone
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
				self.$toast.error('No se pudo generar la sugerencia')
			})
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
		// panel: se recorta con puntos suspensivos.
		max-width: 190px
		overflow: hidden
		text-overflow: ellipsis
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
