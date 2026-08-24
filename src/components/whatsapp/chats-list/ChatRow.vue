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
				<!-- El último entrante de este chat fue simulado: los envíos hacia WhatsApp
				están frenados. Sale de `whatsapp_chats.last_inbound_simulated`, que llega con
				el listado; el broadcast en vivo NO manda esa columna, así que si el cliente
				escribe de verdad la marca se apaga recién al recargar la bandeja o al abrir el
				chat (adentro de la conversación el dato se saca del último mensaje y siempre
				está al día). -->
				<span
				v-if="chat.last_inbound_simulated == 1"
				class="whatsapp-chat-row__sim"
				title="Chat en simulación: el último mensaje entrante lo simulaste vos y los envíos están frenados.">
					<i class="bi bi-cone-striped"></i>
					SIM
				</span>
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
	border-bottom: 1px solid var(--wa-borde)
	color: var(--wa-texto)
	transition: background .12s ease
	&:hover
		background: var(--wa-hover)
	// La fila abierta se marca con el verde de la marca en velo, no con un gris: es la unica
	// pista de en que conversacion esta parado el operador cuando el sidebar tapa media pantalla.
	&--active
		background: rgba(37, 211, 102, .12)
	&__main
		display: flex
		flex-direction: row
		justify-content: space-between
		align-items: center
		gap: 8px
	&__name
		font-weight: 600
		font-size: .95rem
		display: flex
		align-items: center
		// `min-width: 0` + recorte: un nombre largo empujaba la hora fuera de la fila.
		min-width: 0
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
	&__ai-off-dot
		display: inline-block
		width: 7px
		height: 7px
		border-radius: 50%
		background: var(--color-text-secondary)
		margin-right: 6px
		flex-shrink: 0
	&__time
		font-size: .75rem
		opacity: var(--wa-texto-muy-tenue-op)
		flex-shrink: 0
	&__sub
		display: flex
		flex-direction: row
		justify-content: space-between
		align-items: center
		margin-top: 2px
		gap: 8px
	// 🔴 El teléfono se destiñe con `color` y NO con `opacity`, aunque el resto del módulo use
	// opacidad para el texto secundario: la marca SIM cuelga ADENTRO de este span (ver el
	// template), y `opacity` crea un contexto de composición que se aplica al subárbol entero. Un
	// `opacity: 1` en el hijo no lo deshace —el hijo se compone dentro del padre ya translúcido—,
	// así que la marca quedaba desteñida también, y en modo oscuro casi invisible.
	&__phone
		font-size: .8rem
		color: var(--color-text-secondary)
	&__sim
		display: inline-flex
		align-items: center
		gap: 3px
		font-size: .62rem
		font-weight: 700
		letter-spacing: .03em
		color: var(--wa-sim-texto)
		background: var(--wa-sim-bg)
		border-radius: 4px
		padding: 0 4px
		margin-left: 5px
</style>
