<template>
	<div class="support-chat-overlay">
		<div class="support-chat-panel">
			<div class="support-chat-sidebar">
				<ticket-list
					:tickets="tickets"
					:loading="tickets_loading"
					:selected_ticket_id="selected_ticket_id"
					@select="select_ticket" />
			</div>
			<div class="support-chat-main">
				<div class="support-chat-main-header">
					<strong>Soporte</strong>
					<button class="btn btn-sm btn-outline-secondary" @click="$emit('close')">Cerrar</button>
				</div>
				<conversation
					:messages="messages"
					:selected_ticket="selected_ticket"
					:loading="messages_loading"
					@retry-message="on_retry_message" />
				<message-input
					:can_send="can_send_message"
					:sending="sending"
					@send="send_message" />
			</div>
		</div>
	</div>
</template>

<script>
import TicketList from '@/common-vue/components/support-chat/TicketList'
import Conversation from '@/common-vue/components/support-chat/Conversation'
import MessageInput from '@/common-vue/components/support-chat/MessageInput'

export default {
	components: {
		TicketList,
		Conversation,
		MessageInput,
	},
	data() {
		return {
			// Ticket actualmente seleccionado en la columna izquierda.
			selected_ticket_id: null,
		}
	},
	computed: {
		/**
		 * Toma tickets desde store específico de soporte.
		 */
		tickets() {
			return this.$store.state.support_ticket.models
		},
		/**
		 * Lista de mensajes del ticket activo.
		 */
		messages() {
			return this.$store.state.support_message.models
		},
		/**
		 * Flag de envío en progreso para deshabilitar input.
		 */
		sending() {
			return this.$store.state.support_message.sending
		},
		/**
		 * Carga de la bandeja (getModels al abrir o refrescos).
		 */
		tickets_loading() {
			return this.$store.state.support_ticket.loading
		},
		/**
		 * Carga de mensajes del ticket abierto.
		 */
		messages_loading() {
			return this.$store.state.support_message.messages_loading
		},
		/**
		 * Modelo de ticket activo para mostrar título/estado.
		 */
		selected_ticket() {
			return this.tickets.find(ticket => ticket.id == this.selected_ticket_id)
		},
		/**
		 * Habilita envío sólo cuando ticket activo está abierto.
		 */
		can_send_message() {
			if (!this.selected_ticket) {
				return true
			}
			return this.selected_ticket.status == 'open'
		},
	},
	created() {
		// Carga ticketera inicial al abrir panel.
		this.$store.dispatch('support_ticket/getModels')
		.then(() => {
			// Selecciona primer ticket disponible para abrir historial.
			if (this.tickets.length) {
				this.select_ticket(this.tickets[0].id)
			}
		})
	},
	methods: {
		/**
		 * Cambia ticket activo y recarga mensajes correspondientes.
		 */
		select_ticket(ticket_id) {
			this.selected_ticket_id = ticket_id
			this.$store.dispatch('support_message/loadTicketMessages', ticket_id)
		},
		/**
		 * Envía mensaje y refresca lista de tickets para estados recientes.
		 */
		send_message(payload) {
			const self = this
			this.$store.dispatch('support_message/sendMessage', payload)
				.then(function () {
					// Tras enviar, la bandeja se actualiza vía Pusher + applyTicketFromMessage; si es el primer envío, abre el ticket creado.
					if (!self.selected_ticket_id && self.tickets.length) {
						self.select_ticket(self.tickets[0].id)
					}
				})
		},
		/**
		 * Reintenta envío completo o sólo la sincronización hacia admin-api.
		 * @param {Object} message Fila de conversación con error.
		 */
		on_retry_message(message) {
			if (message.remote_delivery_status === 'not_received' && message.id != null) {
				this.$store.dispatch('support_message/retryRemoteSync', message)
				return
			}
			this.$store.dispatch('support_message/retrySendMessage', message)
		},
	},
}
</script>

<style scoped>
.support-chat-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.35);
	z-index: 1053;
	display: flex;
	align-items: flex-end;
	justify-content: flex-end;
}

.support-chat-panel {
	width: min(1100px, 95vw);
	height: min(90vh, 720px);
	background: #fff;
	display: flex;
	border-radius: 12px;
	overflow: hidden;
	margin: 15px;
}

.support-chat-sidebar {
	width: 30%;
	border-right: 1px solid #e6e6e6;
}

.support-chat-main {
	width: 70%;
	display: flex;
	flex-direction: column;
}

.support-chat-main-header {
	height: 52px;
	border-bottom: 1px solid #e6e6e6;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 12px;
}
</style>

