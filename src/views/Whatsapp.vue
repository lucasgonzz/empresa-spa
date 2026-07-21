<template>
	<b-row
	class="whatsapp-module">
		<b-col
		class="whatsapp-module__chats"
		lg="4"
		xl="3">
			<chats-list></chats-list>
		</b-col>
		<b-col
		class="whatsapp-module__conversation"
		lg="8"
		xl="9">
			<conversation></conversation>
		</b-col>
	</b-row>
</template>
<script>
import ChatsList from '@/components/whatsapp/chats-list/Index'
import Conversation from '@/components/whatsapp/conversation/Index'
export default {
	components: {
		ChatsList,
		Conversation,
	},
	created() {
		/*
			Carga inicial de la bandeja de chats y del catálogo de plantillas (lo usa el
			composer para el modal de plantillas). Se cargan acá, una sola vez al entrar
			al módulo, en vez de en cada sub-componente.
		*/
		this.$store.dispatch('whatsapp_chat/getChats')
		this.$store.dispatch('whatsapp_template/getModels')

		// Si se llega con un chat_id en la URL (ej: link directo desde otra parte del sistema).
		if (this.$route.params.chat_id) {
			this.$store.commit('whatsapp_chat/setSelectedChatId', parseInt(this.$route.params.chat_id, 10))
		}

		this.listenWhatsappChannel()
	},
	beforeDestroy() {
		this.leaveWhatsappChannel()
	},
	methods: {
		/**
		 * Se suscribe al canal privado `whatsapp.{owner_id}` (evento `WhatsappChatUpdated`) para
		 * reflejar en vivo: nuevos mensajes entrantes, respuestas de IA/manuales de otro empleado,
		 * y cambios de estado de entrega (checks). Actualiza la bandeja siempre, y si el chat
		 * afectado es el que está abierto, agrega/actualiza la burbuja sin recargar.
		 */
		listenWhatsappChannel() {
			if (!this.Echo || !this.owner_id) {
				return
			}
			this.Echo.private('whatsapp.' + this.owner_id)
			.listen('.WhatsappChatUpdated', (payload) => {
				if (!payload || !payload.chat) {
					return
				}

				// Actualiza (sin pisar props que este payload liviano no trae) la fila de la bandeja.
				this.$store.commit('whatsapp_chat/patchChatFromBroadcast', payload.chat)

				let selected_chat_id = this.$store.state.whatsapp_chat.selected_chat_id
				let is_open_chat = selected_chat_id && selected_chat_id == payload.chat_id

				if (payload.message) {
					if (is_open_chat) {
						// Si el mensaje ya está en la conversación (ej: lo mandó este mismo operador
						// y ya se agregó en el .then() del envío), se actualiza en vez de duplicar.
						let already_loaded = this.$store.state.whatsapp_chat.messages.some(m => m.id == payload.message.id)
						if (already_loaded) {
							this.$store.commit('whatsapp_chat/patchMessage', payload.message)
						} else {
							this.$store.commit('whatsapp_chat/appendMessage', payload.message)
							// Sonido corto solo para mensajes entrantes del cliente.
							if (payload.message.direction == 'in') {
								this.playIncomingSound()
							}
						}
						this.$store.dispatch('whatsapp_chat/markRead', payload.chat_id)
					} else if (payload.message.direction == 'in') {
						this.playIncomingSound()
					}
				}
			})
		},
		leaveWhatsappChannel() {
			if (this.Echo && this.owner_id) {
				this.Echo.leave('whatsapp.' + this.owner_id)
			}
		},
		/**
		 * Sonido corto (opcional) para avisar de un mensaje entrante nuevo. Se sintetiza con
		 * Web Audio API (un "beep" corto) en vez de cargar un archivo de audio propio, para no
		 * depender de un asset nuevo. Si el navegador no soporta AudioContext o bloquea el
		 * autoplay, falla en silencio: no es una funcionalidad crítica del módulo.
		 */
		playIncomingSound() {
			try {
				let AudioContextClass = window.AudioContext || window.webkitAudioContext
				if (!AudioContextClass) {
					return
				}
				let audio_context = new AudioContextClass()
				let oscillator = audio_context.createOscillator()
				let gain = audio_context.createGain()
				oscillator.type = 'sine'
				oscillator.frequency.value = 880
				gain.gain.setValueAtTime(0.15, audio_context.currentTime)
				gain.gain.exponentialRampToValueAtTime(0.0001, audio_context.currentTime + 0.25)
				oscillator.connect(gain)
				gain.connect(audio_context.destination)
				oscillator.start()
				oscillator.stop(audio_context.currentTime + 0.25)
			} catch (e) {
				// Sin sonido disponible: no es bloqueante para el módulo.
			}
		},
	},
}
</script>
<style lang="sass">
.whatsapp-module
	height: calc(100vh - 50px)
	margin-bottom: 0 !important
	&__chats
		height: 100%
		border-right: 1px solid rgba(0, 0, 0, .1)
		padding: 0
		@media screen and (max-width: 992px)
			height: auto
			border-right: none
			border-bottom: 1px solid rgba(0, 0, 0, .1)
	&__conversation
		height: 100%
		padding: 0
		background: #f7f9fb
</style>
