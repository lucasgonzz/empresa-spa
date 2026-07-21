<template>
	<div
	v-if="chat"
	class="whatsapp-header">
		<div class="whatsapp-header__identity">
			<strong class="whatsapp-header__name">
				{{ chat_name }}
			</strong>
			<span class="whatsapp-header__phone">
				{{ chat.phone }}
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
			@click="$bvModal.show('whatsapp-link-client')">
				<i class="bi bi-person"></i>
				{{ chat.client ? chat.client.name : 'Vincular cliente' }}
			</b-button>

			<b-dropdown
			size="sm"
			variant="outline-secondary"
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
	computed: {
		chat() {
			let selected_chat_id = this.$store.state.whatsapp_chat.selected_chat_id
			return this.$store.state.whatsapp_chat.chats.find(c => c.id == selected_chat_id) || null
		},
		messages() {
			return this.$store.state.whatsapp_chat.messages
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
.whatsapp-header
	height: 60px
	display: flex
	flex-direction: row
	justify-content: space-between
	align-items: center
	padding: 0 14px
	background: #ffffff
	border-bottom: 1px solid rgba(0, 0, 0, .08)
	&__identity
		display: flex
		flex-direction: column
		min-width: 0
	&__name
		font-size: .95rem
	&__phone
		font-size: .75rem
		color: rgba(0, 0, 0, .5)
	&__actions
		display: flex
		flex-direction: row
		align-items: center
		gap: 8px
		flex-shrink: 0
	&__ai-toggle
		margin-right: 4px
		margin-bottom: 0
</style>
