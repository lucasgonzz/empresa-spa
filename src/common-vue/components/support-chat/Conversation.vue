<template>
	<div class="support-conversation">
		<div v-if="selected_ticket" class="support-conversation-title">
			{{ selected_ticket.name || ('Ticket #' + selected_ticket.id) }}
		</div>
		<div class="support-conversation-body" ref="conversation_body">
			<div
				v-for="message in messages"
				:key="message.id"
				:class="['support-message', message.sender_type == 'user' ? 'mine' : 'their']">
				<div class="support-message-bubble">
					<div v-if="message.body">{{ message.body }}</div>
					<a
						v-if="message.attachments && message.attachments.length"
						target="_blank"
						:href="attachment_url(message.attachments[0])">
						Adjunto
					</a>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	props: {
		messages: {
			type: Array,
			default: () => [],
		},
		selected_ticket: {
			type: Object,
			default: null,
		},
	},
	watch: {
		/**
		 * Mantiene scroll al final al recibir mensajes nuevos.
		 */
		messages() {
			this.$nextTick(() => {
				this.scroll_bottom()
			})
		},
	},
	methods: {
		/**
		 * Construye URL de adjunto usando path almacenado.
		 */
		attachment_url(attachment) {
			return process.env.VUE_APP_API_URL + '/storage/' + attachment.path
		},
		/**
		 * Lleva scroll al final del contenedor de conversación.
		 */
		scroll_bottom() {
			let container = this.$refs.conversation_body
			if (container) {
				container.scrollTop = container.scrollHeight
			}
		},
	},
}
</script>

<style scoped>
.support-conversation {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.support-conversation-title {
	padding: 10px 12px;
	border-bottom: 1px solid #f1f1f1;
	font-weight: 600;
}

.support-conversation-body {
	flex: 1;
	overflow-y: auto;
	padding: 12px;
	background: #f7f9fb;
}

.support-message {
	display: flex;
	margin-bottom: 8px;
}

.support-message.mine {
	justify-content: flex-end;
}

.support-message.their {
	justify-content: flex-start;
}

.support-message-bubble {
	max-width: 75%;
	padding: 8px 10px;
	border-radius: 10px;
	background: #fff;
	border: 1px solid #ececec;
}

.support-message.mine .support-message-bubble {
	background: #dcf8c6;
}
</style>

