<template>
	<div
	class="whatsapp-chat-row"
	:class="{'whatsapp-chat-row--active': is_active}"
	@click="$emit('select', chat)">
		<div class="whatsapp-chat-row__main">
			<span class="whatsapp-chat-row__name">
				<!-- Puntito indicando que la IA está apagada para este chat -->
				<i
				v-if="!chat.ai_enabled"
				title="Respuesta automática (IA) apagada"
				class="whatsapp-chat-row__ai-off-dot"></i>
				{{ chat_name }}
			</span>
			<span
			v-if="chat.last_message_at"
			class="whatsapp-chat-row__time">
				{{ format_time(chat.last_message_at) }}
			</span>
		</div>
		<div class="whatsapp-chat-row__sub">
			<span class="whatsapp-chat-row__phone">
				{{ chat.phone }}
			</span>
			<b-badge
			v-if="chat.unread_count > 0"
			variant="success"
			pill>
				{{ chat.unread_count }}
			</b-badge>
		</div>
	</div>
</template>
<script>
import moment from 'moment'
export default {
	props: {
		chat: {
			type: Object,
			required: true,
		},
		is_active: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		/**
		 * Nombre a mostrar: cliente vinculado > display_name (nombre que reporta WhatsApp) > teléfono.
		 */
		chat_name() {
			if (this.chat.client && this.chat.client.name) {
				return this.chat.client.name
			}
			if (this.chat.display_name) {
				return this.chat.display_name
			}
			return this.chat.phone
		},
	},
	methods: {
		/**
		 * Hora si es de hoy, o fecha corta si es de otro día (mismo criterio visual que WhatsApp).
		 *
		 * @param {string} datetime
		 * @returns {string}
		 */
		format_time(datetime) {
			let m = moment(datetime)
			if (m.isSame(moment(), 'day')) {
				return m.format('HH:mm')
			}
			return m.format('DD/MM/YY')
		},
	},
}
</script>
<style lang="sass">
.whatsapp-chat-row
	padding: 10px 14px
	cursor: pointer
	border-bottom: 1px solid rgba(0, 0, 0, .05)
	&:hover
		background: rgba(0, 0, 0, .03)
	&--active
		background: rgba(37, 211, 102, .1)
	&__main
		display: flex
		flex-direction: row
		justify-content: space-between
		align-items: center
	&__name
		font-weight: 600
		font-size: .95rem
		display: flex
		align-items: center
	&__ai-off-dot
		display: inline-block
		width: 7px
		height: 7px
		border-radius: 50%
		background: #adb5bd
		margin-right: 6px
	&__time
		font-size: .75rem
		color: rgba(0, 0, 0, .5)
		flex-shrink: 0
	&__sub
		display: flex
		flex-direction: row
		justify-content: space-between
		align-items: center
		margin-top: 2px
	&__phone
		font-size: .8rem
		color: rgba(0, 0, 0, .5)
</style>
