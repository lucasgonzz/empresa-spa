<template>
	<div
	v-if="chat"
	class="whatsapp-composer">
		<div class="whatsapp-composer__toolbar">
			<b-button
			size="sm"
			variant="outline-secondary"
			:disabled="suggesting"
			@click="suggest">
				<i class="bi bi-magic"></i>
				{{ suggesting ? 'Sugiriendo...' : 'Sugerir respuesta' }}
			</b-button>
			<b-button
			size="sm"
			variant="outline-secondary"
			@click="$bvModal.show('whatsapp-templates')">
				<i class="bi bi-file-earmark-text"></i>
				Plantillas
			</b-button>
		</div>

		<div class="whatsapp-composer__input-row">
			<b-form-textarea
			v-model="text"
			id="whatsapp-composer-text"
			placeholder="Escribí un mensaje (Enter para enviar, Shift+Enter para salto de línea)"
			rows="2"
			max-rows="6"
			@keydown.enter="onKeydownEnter"></b-form-textarea>
			<btn-loader
			:loader="sending"
			:block="false"
			icon="send"
			@clicked="send"></btn-loader>
		</div>

		<templates-modal
		:chat="chat"></templates-modal>
	</div>
</template>
<script>
import TemplatesModal from '@/components/whatsapp/conversation/TemplatesModal'
export default {
	components: {
		TemplatesModal,
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			text: '',
			sending: false,
			suggesting: false,
		}
	},
	computed: {
		chat() {
			let selected_chat_id = this.$store.state.whatsapp_chat.selected_chat_id
			return this.$store.state.whatsapp_chat.chats.find(c => c.id == selected_chat_id) || null
		},
	},
	methods: {
		/**
		 * Enter solo (sin Shift) envía el mensaje; Shift+Enter deja pasar el salto de línea normal.
		 *
		 * @param {KeyboardEvent} event
		 */
		onKeydownEnter(event) {
			if (!event.shiftKey) {
				event.preventDefault()
				this.send()
			}
		},
		send() {
			let body = this.text.trim()
			if (!body || !this.chat) {
				return
			}
			this.sending = true
			this.$store.dispatch('whatsapp_chat/sendMessage', {
				chat_id: this.chat.id,
				body: body,
			})
			.then(() => {
				this.sending = false
				this.text = ''
			})
			.catch(err => {
				this.sending = false
				console.log(err)
				let data = err.response && err.response.data
				if (err.response && err.response.status == 422 && data && data.code == 'fuera_de_ventana') {
					this.$toast.error(
						'Pasaron más de 24 h desde el último mensaje del cliente. WhatsApp solo permite retomar la conversación con una plantilla.',
						{ duration: 8000 }
					)
					this.$bvModal.show('whatsapp-templates')
					return
				}
				this.$toast.error((data && data.message) || 'No se pudo enviar el mensaje')
			})
		},
		/**
		 * Pide una sugerencia de la IA y la carga en el input, editable antes de enviar
		 * (nunca se envía sola).
		 */
		suggest() {
			if (!this.chat) {
				return
			}
			this.suggesting = true
			this.$store.dispatch('whatsapp_chat/suggest', this.chat.id)
			.then(suggestion => {
				this.suggesting = false
				this.text = suggestion || ''
			})
			.catch(err => {
				this.suggesting = false
				console.log(err)
				this.$toast.error('No se pudo generar la sugerencia')
			})
		},
	},
}
</script>
<style lang="sass">
.whatsapp-composer
	padding: 8px 14px 14px 14px
	background: #ffffff
	border-top: 1px solid rgba(0, 0, 0, .08)
	&__toolbar
		display: flex
		flex-direction: row
		gap: 8px
		margin-bottom: 6px
	&__input-row
		display: flex
		flex-direction: row
		align-items: flex-end
		gap: 8px
		textarea
			flex: 1
</style>
