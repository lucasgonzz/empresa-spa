<template>
	<div class="support-conversation">
		<div v-if="selected_ticket" class="support-conversation-title">
			{{ selected_ticket.name || ('Ticket #' + selected_ticket.id) }}
		</div>
		<div class="support-conversation-body" ref="conversation_body">
			<div
				v-if="loading"
				class="support-conversation-loading d-flex align-items-center justify-content-center"
				role="status"
				aria-live="polite"
				aria-busy="true">
				<span class="spinner-border text-primary" aria-hidden="true"></span>
				<span class="sr-only">Cargando mensajes…</span>
			</div>
			<template v-else>
			<div
				v-for="(message, message_index) in messages"
				:key="message_key(message, message_index)"
				:class="['support-message', message.sender_type == 'user' ? 'mine' : 'their']">
				<div class="support-message-col">
					<div
						:class="[
							'support-message-bubble',
							has_delivery_error(message) ? 'support-message-bubble--error' : '',
						]"
						:title="message_sent_at_tooltip(message)">
						<div v-if="message.body">{{ message.body }}</div>
						<a
							v-if="message.attachments && message.attachments.length"
							target="_blank"
							:href="attachment_url(message.attachments[0])">
							Adjunto
						</a>
					</div>
					<div
						v-if="is_mine(message) && has_delivery_error(message)"
						class="support-message-error-row">
						<span class="support-message-error-text">{{ delivery_error_label(message) }}</span>
						<button
							type="button"
							class="btn btn-sm btn-outline-danger support-message-retry-btn"
							@click="$emit('retry-message', message)">
							Reintentar
						</button>
					</div>
					<div
						v-else-if="is_mine(message) && is_last_mine_message(message)"
						class="support-message-meta">
						<span
							v-if="message._client_pending"
							class="support-meta-sending"
							aria-label="Enviando">Enviando…</span>
						<template v-else>
							<!-- Leído por el operador: doble check azul; hora en tooltip. -->
							<span
								v-if="message.read_at"
								class="support-meta-read-dbl"
								:title="'Visto a las ' + format_read_time(message.read_at)">
								<span class="support-tick-read">✓</span>
								<span class="support-tick-read support-tick-read-overlap">✓</span>
							</span>
							<!-- Entregado a central pero aún no leído, o guardado local: checks grises. -->
							<span
								v-else
								class="support-meta-delivery"
								:title="delivery_remote_title(message)">
								<span
									v-if="message.synced_to_admin_at"
									class="support-tick-double">✓✓</span>
								<span
									v-else
									class="support-tick-single">✓</span>
							</span>
						</template>
					</div>
				</div>
			</div>
			<div
				v-if="show_new_ticket_bar"
				class="support-conversation-new-ticket-panel">
				<p class="support-conversation-new-ticket-text">{{ new_ticket_hint }}</p>
				<button
					type="button"
					class="btn btn-primary btn-sm support-conversation-new-ticket-btn"
					@click="$emit('start-new-ticket')">
					Iniciar nuevo ticket
				</button>
			</div>
			<div
				ref="scroll_end_anchor"
				class="support-conversation-scroll-end"
				aria-hidden="true" />
			</template>
		</div>
	</div>
</template>

<script>
/**
 * Emite `retry-message` cuando el usuario reintenta un envío fallido.
 * Emite `start-new-ticket` cuando el usuario abre un hilo nuevo desde la barra contextual.
 *
 * La barra de ticket cerrado / iniciar nuevo ticket se renderiza debajo de los mensajes del hilo.
 */
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
		/**
		 * Indicador de carga de la conversación (GET /api/support-ticket/:id).
		 */
		loading: {
			type: Boolean,
			default: false,
		},
		/**
		 * Muestra panel para iniciar ticket abierto cuando el seleccionado está cerrado
		 * o no hay conversación activa elegible.
		 */
		show_new_ticket_bar: {
			type: Boolean,
			default: false,
		},
		/**
		 * Texto explicativo para el panel de nuevo ticket (lo arma el padre según contexto).
		 */
		new_ticket_hint: {
			type: String,
			default: '',
		},
	},
	/**
	 * Posiciona al pie al abrir el panel con historial ya en store.
	 */
	mounted() {
		this.schedule_scroll_to_bottom()
	},
	watch: {
		/**
		 * deep: el store hace push/splice sobre el mismo array; hace falta profundidad.
		 */
		messages: {
			deep: true,
			handler() {
				this.schedule_scroll_to_bottom()
			},
		},
		/**
		 * Tras finalizar carga, vuelve a anclar el scroll al final.
		 */
		loading: {
			handler(value) {
				if (!value) {
					this.schedule_scroll_to_bottom()
				}
			},
		},
	},
	methods: {
		/**
		 * Clave única por fila en la lista: incluye índice para no chocar si el API
		 * o el store dejan dos mensajes con el mismo id (Vue exige keys distintas).
		 *
		 * @param {Object} message Fila de mensaje.
		 * @param {number} message_index Posición en `messages` (0-based).
		 * @returns {string}
		 */
		message_key(message, message_index) {
			const suffix = '-i' + String(message_index)
			if (message.id != null) {
				return 'm-' + message.id + suffix
			}
			if (message._client_pending) {
				return 'p-' + message._client_pending + suffix
			}
			return 'x-' + suffix
		},
		/**
		 * Burbuja propia: usuario o fila de pre-envío.
		 */
		is_mine(message) {
			return message.sender_type == 'user'
		},
		/**
		 * Hora "visto" y checks: solo en el último mensaje que enviaste tú (orden en el hilo).
		 */
		is_last_mine_message(message) {
			const list = this.messages
			if (!list || !list.length) {
				return false
			}
			let last = null
			for (let i = list.length - 1; i >= 0; i--) {
				if (list[i].sender_type == 'user') {
					last = list[i]
					break
				}
			}
			if (!last) {
				return false
			}
			if (message.id != null && last.id != null) {
				return String(message.id) === String(last.id)
			}
			if (message._client_pending && last._client_pending) {
				return message._client_pending === last._client_pending
			}
			return last === message
		},
		/**
		 * Tooltip: un check = local; doble = confirmado por el API de soporte remoto.
		 */
		delivery_remote_title(message) {
			if (message.synced_to_admin_at) {
				return 'Recibido por el sistema de soporte central'
			}
			return 'Guardado en tu cuenta (pendiente de entrega al sistema central)'
		},
		/**
		 * Indica anomalía de entrega: fallo de red al API propio o sync a admin.
		 * @param {Object} message
		 * @returns {boolean}
		 */
		has_delivery_error(message) {
			if (message._delivery_error === 'not_sent') {
				return true
			}
			if (message.remote_delivery_status === 'not_received') {
				return true
			}
			return false
		},
		/**
		 * Texto según escenario (no enviado / no recibido en central).
		 * @param {Object} message
		 * @returns {string}
		 */
		delivery_error_label(message) {
			if (message._delivery_error === 'not_sent') {
				return 'No enviado'
			}
			if (message.remote_delivery_status === 'not_received') {
				return 'No recibido en soporte central'
			}
			return 'Error de entrega'
		},
		/**
		 * Hora:minuto local a partir de read_at ISO.
		 */
		format_read_time(value) {
			if (!value) {
				return ''
			}
			const d = new Date(value)
			if (isNaN(d.getTime())) {
				return ''
			}
			const h = d.getHours()
			const m = d.getMinutes()
			return h + ':' + (m < 10 ? '0' : '') + m
		},
		/**
		 * Fecha y hora local para tooltip (mensaje enviado).
		 *
		 * @param {string} value ISO u otro formato aceptado por Date.
		 * @returns {string}
		 */
		format_sent_datetime(value) {
			if (!value) {
				return ''
			}
			const d = new Date(value)
			if (isNaN(d.getTime())) {
				return ''
			}
			const pad = function (n) {
				return (n < 10 ? '0' : '') + n
			}
			return (
				pad(d.getDate()) +
				'/' +
				pad(d.getMonth() + 1) +
				'/' +
				d.getFullYear() +
				' ' +
				pad(d.getHours()) +
				':' +
				pad(d.getMinutes())
			)
		},
		/**
		 * Texto del atributo title al hacer hover sobre la burbuja.
		 *
		 * @param {Object} message Modelo de mensaje en el hilo.
		 * @returns {string}
		 */
		message_sent_at_tooltip(message) {
			if (message._client_pending && !message.created_at) {
				return 'Enviando…'
			}
			const raw = message.created_at || message.delivered_at
			const formatted = this.format_sent_datetime(raw)
			if (!formatted) {
				return ''
			}
			return 'Enviado el ' + formatted
		},
		/**
		 * Construye URL de adjunto usando path almacenado.
		 */
		attachment_url(attachment) {
			return process.env.VUE_APP_API_URL + '/storage/' + attachment.path
		},
		/**
		 * Alinea al bottom tras el tick y tras el siguiente repintado (layout de adjuntos / fuentes).
		 */
		schedule_scroll_to_bottom() {
			const self = this
			this.$nextTick(function () {
				self.scroll_bottom()
				requestAnimationFrame(function () {
					requestAnimationFrame(function () {
						self.scroll_bottom()
					})
				})
			})
		},
		/**
		 * scrollTop máximo y refuerzo vía ancla al final de la columna.
		 */
		scroll_bottom() {
			const container = this.$refs.conversation_body
			if (container) {
				container.scrollTop = container.scrollHeight
			}
			const anchor = this.$refs.scroll_end_anchor
			if (anchor && typeof anchor.scrollIntoView === 'function') {
				anchor.scrollIntoView({ block: 'end', inline: 'nearest' })
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
	position: relative;
}

.support-conversation-loading {
	position: absolute;
	inset: 0;
	z-index: 2;
	min-height: 8rem;
	background: rgba(247, 249, 251, 0.92);
}

.support-conversation-new-ticket-panel {
	flex-shrink: 0;
	margin-top: 16px;
	margin-bottom: 8px;
	padding: 12px;
	background: #e8f4fc;
	border: 1px solid #b8daff;
	border-radius: 8px;
}

.support-conversation-new-ticket-text {
	margin: 0 0 10px;
	font-size: 13px;
	line-height: 1.4;
	color: #1a4a6e;
}

.support-conversation-new-ticket-btn {
	font-weight: 600;
}

.support-conversation-scroll-end {
	height: 0;
	width: 0;
	overflow: hidden;
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

.support-message-col {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	max-width: 80%;
}

.support-message.their .support-message-col {
	align-items: flex-start;
}

.support-message-bubble {
	max-width: 100%;
	padding: 8px 10px;
	border-radius: 10px;
	background: #fff;
	border: 1px solid #ececec;
	cursor: help;
}

.support-message.mine .support-message-bubble {
	background: #dcf8c6;
}

.support-message-meta {
	font-size: 11px;
	color: #6b7280;
	margin-top: 2px;
	padding-right: 2px;
	line-height: 1.2;
}

.support-message.their .support-message-meta {
	padding-left: 2px;
}

.support-meta-sending {
	display: inline-block;
	animation: support-sending-pulse 1s ease-in-out infinite;
}

@keyframes support-sending-pulse {
	0%,
	100% {
		opacity: 0.45;
	}
	50% {
		opacity: 1;
	}
}

.support-meta-delivery {
	color: #9ca3af;
	font-weight: 600;
	white-space: nowrap;
}

.support-tick-single {
	color: #9ca3af;
}

.support-tick-double {
	color: #6b7280;
	letter-spacing: -2px;
}

.support-meta-read-dbl {
	display: inline-block;
	white-space: nowrap;
	line-height: 1;
}

.support-tick-read {
	color: #34b7f1;
	font-weight: 600;
	font-size: 0.95em;
}

.support-tick-read-overlap {
	margin-left: -0.32em;
}

.support-message-bubble--error {
	background: #fde8e8 !important;
	border-color: #e53e3e !important;
}

.support-message-error-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 4px;
	font-size: 12px;
}

.support-message-error-text {
	color: #c53030;
	font-weight: 600;
}

.support-message-retry-btn {
	padding: 0 8px;
	font-size: 11px;
	line-height: 1.4;
}
</style>
