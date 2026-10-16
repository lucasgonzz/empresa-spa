<template>
	<!-- Franja de seguimiento (misión senal-pedidos-y-consultas-del-agente, 16/10/2026): el chat abierto
	tiene un pedido o una consulta que el agente dejó para que una persona atienda. Va entre la cabecera y
	los mensajes, y SOLO existe mientras el chat tiene la marca: cuando una persona le escribe al cliente
	desde acá, el backend la apaga y el broadcast hace desaparecer la franja. -->
	<div
	v-if="chat && chat.follow_up"
	class="whatsapp-seguimiento"
	:class="'whatsapp-seguimiento--' + chat.follow_up"
	data-tour="whatsapp.seguimiento">
		<i
		class="bi whatsapp-seguimiento__icono"
		:class="icono"></i>
		<div class="whatsapp-seguimiento__texto">
			<strong class="whatsapp-seguimiento__titulo">
				{{ titulo }}
			</strong>
			<!-- El detalle lo escribió el modelo a partir de lo que dijo el cliente: se muestra siempre
			como texto (interpolación), nunca como HTML. -->
			<span
			v-if="chat.follow_up_note"
			class="whatsapp-seguimiento__nota">
				{{ chat.follow_up_note }}
			</span>
			<span
			v-if="desde"
			class="whatsapp-seguimiento__desde">
				{{ desde }}
			</span>
		</div>
		<b-button
		size="sm"
		variant="outline-secondary"
		class="whatsapp-seguimiento__btn"
		:disabled="resolviendo"
		title="Dalo por atendido sin escribirle al cliente. Si le escribís desde acá, se apaga solo."
		@click="resolver">
			<i class="bi bi-check2-circle"></i>
			Ya lo atendí
		</b-button>
	</div>
</template>
<script>
import moment from 'moment'
export default {
	data() {
		return {
			// true mientras el PUT está en vuelo: evita el doble clic.
			resolviendo: false,
		}
	},
	computed: {
		/**
		 * Chat abierto en la conversación (el mismo getter que usan Header.vue y Composer.vue).
		 */
		chat() {
			return this.$store.getters['whatsapp_chat/selected_chat']
		},
		/**
		 * Título según lo que dejó el agente.
		 *
		 * @returns {string}
		 */
		titulo() {
			if (this.chat.follow_up == 'pedido') {
				return 'Pedido para confirmar'
			}
			return 'Consulta pendiente'
		},
		/**
		 * Ícono del título (los mismos que usan la tarjeta del tablero y el chip de la fila).
		 *
		 * @returns {string}
		 */
		icono() {
			if (this.chat.follow_up == 'pedido') {
				return 'bi-bag-check-fill'
			}
			return 'bi-question-circle-fill'
		},
		/**
		 * Desde cuándo espera: la hora si es de hoy, o día y hora si es de otro día. Formato absoluto y no
		 * "hace 2 horas" para no depender de que el idioma de moment esté puesto.
		 *
		 * @returns {string} Cadena vacía si la fecha no vino o no es válida.
		 */
		desde() {
			if (!this.chat.follow_up_at) {
				return ''
			}
			let momento = moment(this.chat.follow_up_at)
			if (!momento.isValid()) {
				return ''
			}
			if (momento.isSame(moment(), 'day')) {
				return 'Desde las ' + momento.format('HH:mm')
			}
			return 'Desde el ' + momento.format('DD/MM HH:mm')
		},
	},
	methods: {
		/**
		 * "Ya lo atendí": apaga la marca del chat. El store mezcla el chat que devuelve la API, así la franja,
		 * la tarjeta del tablero y el chip de la fila se apagan sin esperar el broadcast.
		 *
		 * @returns {Promise}
		 */
		resolver() {
			if (this.resolviendo) {
				return
			}
			this.resolviendo = true
			return this.$store.dispatch('whatsapp_chat/resolveFollowUp', this.chat.id)
			.then(() => {
				this.resolviendo = false
			})
			.catch(() => {
				this.resolviendo = false
				this.$toast.error('No se pudo marcar como atendido')
			})
		},
	},
}
</script>
<style lang="sass">
.whatsapp-seguimiento
	display: flex
	align-items: center
	gap: 10px
	padding: 8px 14px
	background: var(--wa-seguimiento-bg)
	border-bottom: 1px solid var(--wa-borde)
	border-left: 4px solid var(--wa-seguimiento-borde)
	color: var(--wa-texto)
	flex-shrink: 0
	&__icono
		font-size: 1.15rem
		flex-shrink: 0
		color: var(--wa-seguimiento-borde)
	// `min-width: 0` deja que el texto se achique en vez de empujar el botón fuera de la franja.
	&__texto
		text-align: left
		display: flex
		flex-direction: column
		min-width: 0
		flex: 1 1 auto
	&__titulo
		font-size: .85rem
		line-height: 1.2
		color: var(--wa-seguimiento-texto)
	&__nota
		font-size: .8rem
		line-height: 1.25
		overflow-wrap: anywhere
	&__desde
		font-size: .7rem
		color: var(--color-text-secondary)
	&__btn
		flex-shrink: 0
		white-space: nowrap

// Teléfono (<768px): la franja es angosta; se achican los márgenes y el detalle se parte en líneas.
@media screen and (max-width: 767px)
	.whatsapp-seguimiento
		padding: 6px 10px
		gap: 8px
</style>
