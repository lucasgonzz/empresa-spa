<template>
	<div
	id="whatsapp-messages-container"
	class="whatsapp-messages-container"
	@scroll="on_scroll"
	ref="container">
		<p
		v-if="loading"
		class="text-center text-muted m-t-20">
			Cargando mensajes...
		</p>
		<div
		v-else
		class="whatsapp-messages">
			<p
			v-if="loading_more"
			class="text-center text-muted whatsapp-messages__loading-more">
				Cargando mensajes anteriores...
			</p>
			<p
			v-if="!messages.length"
			class="text-center text-muted m-t-20">
				Todavía no hay mensajes en esta conversación
			</p>
			<message-bubble
			v-for="message in messages"
			:key="message.id"
			:message="message"></message-bubble>
		</div>
	</div>
</template>
<script>
import MessageBubble from '@/components/whatsapp/conversation/MessageBubble'
export default {
	components: {
		MessageBubble,
	},
	data() {
		return {
			// Alto del contenedor antes de anteponer una página vieja, para restaurar el scroll
			// exactamente donde estaba el usuario (si no, el scroll "saltaría" al tope).
			scroll_height_before_prepend: 0,
		}
	},
	computed: {
		chat_id() {
			return this.$store.state.whatsapp_chat.selected_chat_id
		},
		messages() {
			return this.$store.state.whatsapp_chat.messages
		},
		loading() {
			return this.$store.state.whatsapp_chat.loading_messages
		},
		loading_more() {
			return this.$store.state.whatsapp_chat.loading_more_messages
		},
		messages_page() {
			return this.$store.state.whatsapp_chat.messages_page
		},
		messages_last_page() {
			return this.$store.state.whatsapp_chat.messages_last_page
		},
		has_more_pages() {
			return this.messages_last_page && this.messages_page < this.messages_last_page
		},
	},
	watch: {
		chat_id() {
			// Al abrir un chat nuevo, arranca siempre desde abajo (mensaje más reciente).
			this.$nextTick(() => {
				this.scrollToBottom()
			})
		},
		'messages.length'(new_length, old_length) {
			// Si se agregó un mensaje nuevo al final (no una página vieja anteponiéndose) y el
			// usuario ya estaba abajo, se sigue el scroll con la conversación.
			if (new_length > old_length && !this.loading_more) {
				this.$nextTick(() => {
					this.scrollToBottom()
				})
			}
		},
		loading_more(is_loading_more) {
			if (is_loading_more) {
				this.scroll_height_before_prepend = this.$refs.container ? this.$refs.container.scrollHeight : 0
			} else {
				// Terminó de cargar la página vieja: restaura el scroll para que no "salte" al tope.
				this.$nextTick(() => {
					if (this.$refs.container) {
						this.$refs.container.scrollTop = this.$refs.container.scrollHeight - this.scroll_height_before_prepend
					}
				})
			}
		},
	},
	methods: {
		scrollToBottom() {
			if (this.$refs.container) {
				this.$refs.container.scrollTop = this.$refs.container.scrollHeight
			}
		},
		/**
		 * Scroll infinito hacia arriba: cuando el usuario se acerca al tope del contenedor,
		 * pide la página anterior de mensajes (si hay y no hay otra carga en curso).
		 */
		on_scroll(event) {
			if (event.target.scrollTop < 80 && this.has_more_pages && !this.loading_more && !this.loading) {
				this.$store.dispatch('whatsapp_chat/getMessages', {
					chat_id: this.chat_id,
					page: this.messages_page + 1,
				})
			}
		},
	},
}
</script>
<style lang="sass">
.whatsapp-messages-container
	flex: 1
	min-height: 0
	overflow-y: auto
	padding: 14px
.whatsapp-messages
	display: flex
	flex-direction: column
	&__loading-more
		font-size: .8rem
		margin-bottom: 8px
</style>
