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
					<button class="btn btn-sm btn-warning" @click="$emit('close')">Esconder</button>
				</div>
				<conversation
					:messages="messages"
					:selected_ticket="selected_ticket"
					:loading="messages_loading"
					:show_new_ticket_bar="show_new_ticket_bar"
					:new_ticket_hint="new_ticket_hint_text"
					@retry-message="on_retry_message"
					@start-new-ticket="on_start_new_ticket" />
				<message-input
					ref="support_message_input"
					:can_send="can_send_message"
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
		/**
		 * Muestra la barra de “nuevo ticket” si el hilo actual no permite escribir o no hay uno elegido.
		 */
		show_new_ticket_bar() {
			if (this.messages_loading || this.tickets_loading) {
				return false
			}
			if (this.selected_ticket && this.selected_ticket.status !== 'open') {
				return true
			}
			if (!this.selected_ticket_id && this.tickets.length > 0) {
				return true
			}
			return false
		},
		/**
		 * Mensaje contextual para la barra de nuevo ticket (ticket cerrado vs sin selección).
		 */
		new_ticket_hint_text() {
			if (this.selected_ticket && this.selected_ticket.status !== 'open') {
				return 'Este ticket está cerrado. Para una nueva consulta podés abrir un ticket nuevo con soporte.'
			}
			return 'Elegí un ticket en la lista o iniciá uno nuevo para escribir al equipo de soporte.'
		},
	},
	created() {
		const self = this
		// Carga ticketera inicial al abrir panel.
		this.$store.dispatch('support_ticket/getModels')
			.then(() => {
				// Prioriza un ticket abierto para poder escribir sin pasar por cerrados.
				let id_to_select = null
				let i = 0
				for (i = 0; i < self.tickets.length; i = i + 1) {
					if (self.tickets[i].status === 'open') {
						id_to_select = self.tickets[i].id
						break
					}
				}
				if (id_to_select === null && self.tickets.length) {
					id_to_select = self.tickets[0].id
				}
				if (id_to_select !== null) {
					self.select_ticket(id_to_select)
				}
				// Tras definir ticket activo, reintenta foco (el input puede habilitarse o quedar disabled).
				self.$nextTick(function () {
					self.focus_support_message_input()
				})
			})
	},
	mounted() {
		const self = this
		// Tras pintar el overlay, enfoca el input de mensaje (mejor UX al abrir soporte).
		this.$nextTick(function () {
			self.focus_support_message_input()
		})
	},
	methods: {
		/**
		 * Delega el foco en el campo de texto del componente hijo MessageInput.
		 */
		focus_support_message_input() {
			const input_component = this.$refs.support_message_input
			if (input_component && typeof input_component.focus_text_input === 'function') {
				input_component.focus_text_input()
			}
		},
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
		/**
		 * POST ticket abierto (o reutiliza el existente), selecciona ese hilo y enfoca el input.
		 */
		on_start_new_ticket() {
			const self = this
			this.$store.commit('auth/setLoading', true)
			this.$store.commit('auth/setMessage', 'Preparando nuevo ticket de soporte')
			this.$store.dispatch('support_ticket/createOpenTicket')
				.then(function (model) {
					self.$store.commit('auth/setLoading', false)
					self.$store.commit('auth/setMessage', '')
					if (model && model.id != null) {
						self.select_ticket(model.id)
					}
					self.$nextTick(function () {
						self.focus_support_message_input()
					})
				})
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

