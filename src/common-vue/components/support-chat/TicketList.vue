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
				<div class="support-ticket-title">{{ ticket_title(ticket) }}</div>
				<small class="text-muted">{{ ticket.status == 'open' ? 'Abierto' : 'Cerrado' }}</small>
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
		 */
		formatDate(date_string) {
			return moment(date_string).format('DD/MM/YYYY HH:mm')
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
</style>

