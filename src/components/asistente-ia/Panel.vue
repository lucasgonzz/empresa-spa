<template>
	<div class="asistente-ia-overlay">
		<div class="asistente-ia-panel">
			<!-- Sidebar: lista de conversaciones. En escritorio es una columna
			redimensionable; bajo 768px se esconde y aparece como cajón (D38). -->
			<div
			class="asistente-ia-panel__sidebar"
			:class="{ 'asistente-ia-panel__sidebar--abierta': sidebar_movil_abierta }"
			:style="sidebar_inline_style">
				<conversation-list
				@select="on_conversation_selected"></conversation-list>
			</div>

			<!-- Fondito que cierra el cajón móvil al tocar afuera de la lista. -->
			<div
			v-if="es_movil && sidebar_movil_abierta"
			class="asistente-ia-panel__telon"
			@click="sidebar_movil_abierta = false"></div>

			<!-- Divisor redimensionable reusado de Vender (D39); no existe en móvil. -->
			<vender-resizer
			v-if="!es_movil"
			@resize="on_sidebar_resize"
			@resize-end="on_sidebar_resize_end"></vender-resizer>

			<div class="asistente-ia-panel__main">
				<div class="asistente-ia-panel__header">
					<b-button
					v-if="es_movil"
					size="sm"
					variant="outline-secondary"
					@click="sidebar_movil_abierta = !sidebar_movil_abierta">
						<i class="bi bi-layout-sidebar"></i>
						Conversaciones
					</b-button>
					<span class="asistente-ia-panel__titulo">
						{{ titulo_cabecera }}
					</span>
					<button
					class="asistente-ia-panel__cerrar"
					type="button"
					title="Cerrar el asistente"
					@click="cerrar">
						<i class="bi bi-x-lg"></i>
					</button>
				</div>

				<div class="asistente-ia-panel__cuerpo">
					<conversation></conversation>
					<composer></composer>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import ConversationList from '@/components/asistente-ia/ConversationList'
import Conversation from '@/components/asistente-ia/Conversation'
import Composer from '@/components/asistente-ia/Composer'
import VenderResizer from '@/components/vender/components/VenderResizer'

// Límites del ancho de la sidebar en px (D38).
const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 420
const SIDEBAR_DEFAULT = 260

export default {
	components: {
		ConversationList,
		Conversation,
		Composer,
		VenderResizer,
	},
	data() {
		return {
			// Ancho actual de la sidebar en px (solo escritorio).
			sidebar_width_px: SIDEBAR_DEFAULT,
			// true cuando el cajón de conversaciones está abierto (solo móvil).
			sidebar_movil_abierta: false,
			// Ancho del viewport, para decidir el modo cajón bajo 768px.
			viewport_width: typeof window !== 'undefined' ? window.innerWidth : 1200,
		}
	},
	computed: {
		conversations() {
			return this.$store.state.ai_chat.conversations
		},
		selected_conversation_id() {
			return this.$store.state.ai_chat.selected_conversation_id
		},
		selected_conversation() {
			return this.$store.getters['ai_chat/selected_conversation']
		},
		titulo_cabecera() {
			if (this.selected_conversation && this.selected_conversation.titulo) {
				return this.selected_conversation.titulo
			}
			return 'Nueva conversación'
		},
		es_movil() {
			return this.viewport_width < 768
		},
		/**
		 * En escritorio la sidebar lleva el ancho elegido; en móvil el ancho lo fija
		 * el CSS del cajón.
		 */
		sidebar_inline_style() {
			if (this.es_movil) {
				return null
			}
			return {
				width: this.sidebar_width_px + 'px',
			}
		},
	},
	created() {
		let self = this

		this.hidratar_ancho_sidebar()

		// Al abrir el panel: la bandeja siempre se refresca, y se cae a la última
		// conversación con actividad salvo que ya hubiera una elegida (D44) — por
		// ejemplo la que dejó seteada abrir_chat_ia() desde la notificación (D22).
		this.$store.dispatch('ai_chat/getConversations')
			.then(() => {
				if (self.selected_conversation_id) {
					self.$store.dispatch('ai_chat/getMessages', {
						conversation_id: self.selected_conversation_id,
						page: 1,
					})
				} else if (self.conversations.length) {
					// El watch de selected_conversation_id dispara la carga de mensajes.
					self.$store.commit('ai_chat/setSelectedConversationId', self.conversations[0].id)
				} else {
					self.$store.commit('ai_chat/setMessages', [])
				}
			})
	},
	mounted() {
		const self = this
		window.addEventListener('resize', self.on_window_resize)
		document.addEventListener('keydown', self.on_document_keydown)
	},
	beforeDestroy() {
		const self = this
		window.removeEventListener('resize', self.on_window_resize)
		document.removeEventListener('keydown', self.on_document_keydown)
	},
	watch: {
		/**
		 * Cada cambio de conversación abierta carga su primera página. Con null
		 * (conversación nueva sin crear) no hay nada que pedir.
		 */
		selected_conversation_id(id) {
			// La selección que hace createConversation al enviar el primer mensaje
			// NO recarga: la conversación recién nace vacía en el backend y el GET
			// pisaría el globo optimista que ya está en pantalla.
			if (this.$store.state.ai_chat.seleccion_sin_recarga) {
				this.$store.commit('ai_chat/setSeleccionSinRecarga', false)
				return
			}
			if (id) {
				this.$store.dispatch('ai_chat/getMessages', {
					conversation_id: id,
					page: 1,
				})
			}
		},
	},
	methods: {
		/**
		 * Ancho inicial de la sidebar: el elegido en esta sesión (store), o el
		 * persistido por persona que viajó en GET api/user, o el default (D38).
		 */
		hidratar_ancho_sidebar() {
			let width = this.$store.state.ai_chat.sidebar_width
			if (!width && this.user && this.user.chat_ia_sidebar_width) {
				width = parseInt(this.user.chat_ia_sidebar_width, 10)
			}
			if (!width || isNaN(width)) {
				width = SIDEBAR_DEFAULT
			}
			this.sidebar_width_px = this.clamp_sidebar_width(width)
		},
		clamp_sidebar_width(width) {
			return Math.min(Math.max(SIDEBAR_MIN, width), SIDEBAR_MAX)
		},
		/**
		 * Suma el delta que emite el resizer, acotado a los límites (D39).
		 */
		on_sidebar_resize(delta) {
			this.sidebar_width_px = this.clamp_sidebar_width(this.sidebar_width_px + delta)
		},
		/**
		 * Al soltar el divisor se persiste: en el store para reaperturas del panel
		 * en esta sesión, y en la base por persona vía savePreferences (D39).
		 */
		on_sidebar_resize_end() {
			this.$store.commit('ai_chat/setSidebarWidth', this.sidebar_width_px)
			this.$store.dispatch('ai_chat/savePreferences', {
				chat_ia_sidebar_width: this.sidebar_width_px,
			})
		},
		on_window_resize() {
			this.viewport_width = window.innerWidth
		},
		/**
		 * Escape cierra el panel, igual que el botón de la cabecera.
		 */
		on_document_keydown(event) {
			if (event.key === 'Escape') {
				this.cerrar()
			}
		},
		/**
		 * Al elegir una conversación (o crear una nueva) desde la lista, en móvil
		 * el cajón se guarda solo.
		 */
		on_conversation_selected() {
			this.sidebar_movil_abierta = false
		},
		cerrar() {
			this.$store.commit('ai_chat/setPanelAbierto', false)
		},
	},
}
</script>

<style lang="sass">
.asistente-ia-overlay
	position: fixed
	inset: 0
	background: rgba(0, 0, 0, .35)
	z-index: 1055
	display: flex
	align-items: center
	justify-content: center

// Panel formato tablet (D38), centrado, con una entrada sutil.
.asistente-ia-panel
	width: min(820px, 96vw)
	height: min(88vh, 900px)
	background: var(--bg-card, #fff)
	color: var(--color-text-primary, #212529)
	border-radius: 14px
	box-shadow: 0 18px 60px rgba(0, 0, 0, .28)
	display: flex
	overflow: hidden
	position: relative
	animation: asistente-ia-panel-entrada .18s ease-out

	&__sidebar
		flex-shrink: 0
		min-width: 0
		border-right: 1px solid var(--color-border, #dee2e6)
		background: var(--bg-section, #f8f9fa)
		display: flex
		flex-direction: column

	&__telon
		position: absolute
		inset: 0
		background: rgba(0, 0, 0, .25)
		z-index: 2

	&__main
		flex: 1
		min-width: 0
		display: flex
		flex-direction: column

	&__header
		height: 52px
		flex-shrink: 0
		border-bottom: 1px solid var(--color-border, #dee2e6)
		display: flex
		align-items: center
		gap: 10px
		padding: 0 10px 0 16px

	// Título de la conversación en UNA línea con ellipsis, como Claude.
	&__titulo
		flex: 1
		min-width: 0
		font-weight: 600
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	&__cerrar
		flex-shrink: 0
		width: 34px
		height: 34px
		border: none
		border-radius: 8px
		background: transparent
		color: var(--color-text-secondary, #6c757d)
		display: flex
		align-items: center
		justify-content: center
		transition: background .15s ease

		&:hover
			background: var(--bg-hover, #f1f3f5)
			color: var(--color-text-primary, #212529)

	&__cuerpo
		flex: 1
		min-height: 0
		display: flex
		flex-direction: column

// Bajo 768px la sidebar es un cajón absoluto adentro del panel (D38): se abre
// con el botón "Conversaciones" de la cabecera y el resizer no existe.
@media screen and (max-width: 767px)
	.asistente-ia-panel__sidebar
		position: absolute
		top: 0
		bottom: 0
		left: 0
		width: min(300px, 85%)
		z-index: 3
		transform: translateX(-100%)
		transition: transform .2s ease
		box-shadow: 6px 0 24px rgba(0, 0, 0, .12)

		&--abierta
			transform: translateX(0)

@keyframes asistente-ia-panel-entrada
	from
		opacity: 0
		transform: translateY(8px) scale(.98)
	to
		opacity: 1
		transform: translateY(0) scale(1)

@media (prefers-reduced-motion: reduce)
	.asistente-ia-panel
		animation: none

	.asistente-ia-panel__sidebar
		transition: none
</style>
