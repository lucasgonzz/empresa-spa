<template>
	<div class="support-ticket-list position-relative">
		<div
			v-if="loading"
			class="support-ticket-list-loading d-flex align-items-center justify-content-center"
			role="status"
			aria-live="polite"
			aria-busy="true">
			<span class="spinner-border text-primary" aria-hidden="true"></span>
			<span class="sr-only">Cargando tickets…</span>
		</div>
		<div
			v-for="ticket in tickets"
			:key="ticket.id"
			:class="['support-ticket-item', { active: ticket.id == selected_ticket_id }]"
			@click="$emit('select', ticket.id)">
			<div class="support-ticket-status" :class="ticket.status"></div>
			<div class="support-ticket-content">
				<div class="d-flex align-items-center justify-content-between">
					<div class="support-ticket-title">{{ ticket_title(ticket) }}</div>
					<!-- Badge de mensajes no leídos del operador -->
					<span
						v-if="ticket.unread_messages_count > 0"
						class="badge badge-danger rounded-pill support-unread-badge">
						{{ ticket.unread_messages_count }}
					</span>
				</div>
				<small class="text-muted">{{ ticket.status == 'open' ? 'Abierto' : 'Cerrado' }}</small>
				<!-- Preview del último mensaje con detección de tipo audio/imagen -->
				<small
					v-if="last_message_preview(ticket)"
					class="text-muted d-block text-truncate support-ticket-last-preview"
					:title="last_message_preview(ticket)">
					{{ last_message_preview(ticket) }}
				</small>
			</div>
		</div>
		<div v-if="!loading && !tickets.length" class="p-3 text-muted">
			No hay tickets todavía.
		</div>
	</div>
</template>

<script>
import moment from 'moment'

export default {
	props: {
		tickets: {
			type: Array,
			default: () => [],
		},
		selected_ticket_id: {
			type: [String, Number],
			default: null,
		},
		/**
		 * GET lista de tickets (Vuex loading del módulo support_ticket).
		 */
		loading: {
			type: Boolean,
			default: false,
		},
	},
	methods: {
		/**
		 * Construye título visible usando nombre o fallback por fecha.
		 *
		 * @param {Object} ticket
		 * @returns {string}
		 */
		ticket_title(ticket) {
			if (ticket.name) {
				return ticket.name
			}
			if (ticket.closed_at) {
				return 'Cerrado ' + this.formatDate(ticket.closed_at)
			}
			return 'Ticket #' + ticket.id
		},
		/**
		 * Formatea fecha para etiqueta compacta del listado.
		 *
		 * @param {string} date_string
		 * @returns {string}
		 */
		formatDate(date_string) {
			return moment(date_string).format('DD/MM/YYYY HH:mm')
		},
		/**
		 * Genera una línea de preview del último mensaje del ticket para mostrar en la lista.
		 * Diferencia tipo: texto, [Audio] o [Imagen].
		 * Los mensajes vienen embebidos en el ticket por scopeWithAll() en empresa-api.
		 *
		 * @param {Object} ticket Ticket con array `messages` cargado por la API.
		 * @returns {string} Texto compacto para mostrar debajo del título, o vacío si no hay mensajes.
		 */
		last_message_preview(ticket) {
			/* messages viene cargado por scopeWithAll(); puede ser null o array vacío. */
			const messages_list = ticket.messages
			if (!messages_list || !messages_list.length) {
				return ''
			}
			/* El último elemento del array ordenado por id es el más reciente. */
			const last_msg = messages_list[messages_list.length - 1]
			/* Etiqueta de quien envió el mensaje. */
			const who = last_msg.sender_type === 'user' ? 'Tú' : 'Soporte'
			/* Determinar snippet según tipo de mensaje. */
			let snippet = ''
			if (last_msg.body && String(last_msg.body).trim()) {
				snippet = String(last_msg.body).trim().replace(/\s+/g, ' ')
				if (snippet.length > 60) {
					snippet = snippet.slice(0, 57) + '…'
				}
			} else if (last_msg.kind === 'audio') {
				snippet = '[Audio]'
			} else if (last_msg.kind === 'image') {
				snippet = '[Imagen]'
			} else {
				snippet = '[Adjunto]'
			}
			return who + ': ' + snippet
		},
	},
}
</script>

<style scoped>
.support-ticket-list {
	height: 100%;
	min-height: 0;
	overflow-y: auto;
}

.support-ticket-list-loading {
	position: absolute;
	inset: 0;
	z-index: 2;
	background: rgba(255, 255, 255, 0.85);
}

.support-ticket-item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px;
	border-bottom: 1px solid #f1f1f1;
	cursor: pointer;
}

.support-ticket-item.active {
	background: #f5faff;
}

.support-ticket-status {
	width: 10px;
	height: 10px;
	border-radius: 999px;
}

.support-ticket-status.open {
	background: #dc3545;
}

.support-ticket-status.closed {
	background: #2bbf5b;
}

.support-ticket-content {
	flex: 1;
}

.support-ticket-title {
	font-weight: 600;
	font-size: 13px;
}

/* Preview del último mensaje debajo del título del ticket */
.support-ticket-last-preview {
	font-size: 11px;
	margin-top: 2px;
	opacity: 0.9;
}

/* Badge de mensajes no leídos alineado a la derecha del título */
.support-unread-badge {
	font-size: 10px;
	min-width: 1.1rem;
	padding: 0.15em 0.4em;
	flex-shrink: 0;
}
</style>

