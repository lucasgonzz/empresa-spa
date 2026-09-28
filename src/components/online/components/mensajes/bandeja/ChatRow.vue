<template>
	<div
	class="tienda-mensajes-fila"
	:class="{
		'tienda-mensajes-fila--activa': is_active,
		'tienda-mensajes-fila--no-leida': sin_leer > 0,
	}"
	data-testid="tienda-mensajes-fila"
	role="button"
	tabindex="0"
	@click="$emit('select', chat)"
	@keydown.enter="$emit('select', chat)">
		<div class="tienda-mensajes-fila__principal">
			<!-- El nombre en un <span> propio: el contenedor es flex y ahí `text-overflow: ellipsis`
			no dibuja los puntos, corta a filo. -->
			<span class="tienda-mensajes-fila__nombre">
				<span class="tienda-mensajes-fila__nombre-texto">
					{{ nombre }}
				</span>
			</span>
			<span
			v-if="chat.last_message_at"
			class="tienda-mensajes-fila__hora">
				{{ hora }}
			</span>
		</div>
		<div class="tienda-mensajes-fila__secundaria">
			<span class="tienda-mensajes-fila__preview">
				<!-- Check del último mensaje si lo mandó el comercio: uno = enviado, dos = el
				comprador ya lo leyó. Es lo mismo que muestra la burbuja adentro de la conversación. -->
				<i
				v-if="ultimo_saliente"
				class="bi tienda-mensajes-fila__check"
				:class="ultimo_leido ? 'bi-check2-all tienda-mensajes-fila__check--leido' : 'bi-check2'"></i>
				<span class="tienda-mensajes-fila__preview-texto">
					{{ preview }}
				</span>
			</span>
			<span
			v-if="sin_leer > 0"
			class="tienda-mensajes-fila__badge"
			:title="sin_leer == 1 ? '1 mensaje sin leer' : sin_leer + ' mensajes sin leer'">
				{{ sin_leer }}
			</span>
		</div>
	</div>
</template>
<script>
import { es_verdadero, hora_o_fecha, nombre_del_comprador, rotulo_del_mensaje } from '@/components/online/components/mensajes/helpers'

/**
 * Fila de la bandeja de Mensajes de la tienda. Calcada de `whatsapp/chats-list/ChatRow.vue`:
 * nombre + hora (o fecha), preview del último mensaje y el badge verde de no leídos; la fila
 * abierta se marca con el velo verde. No emite nada más que `select`: quien la usa decide qué
 * hacer (abrir la conversación en el sidebar).
 */
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
		nombre() {
			return nombre_del_comprador(this.chat.buyer, this.chat.buyer_id)
		},
		hora() {
			return hora_o_fecha(this.chat.last_message_at)
		},
		sin_leer() {
			let numero = parseInt(this.chat.unread_count, 10)
			return isNaN(numero) ? 0 : numero
		},
		ultimo() {
			return this.chat.last_message || null
		},
		ultimo_saliente() {
			return !!this.ultimo && !es_verdadero(this.ultimo.from_buyer)
		},
		ultimo_leido() {
			return !!this.ultimo && es_verdadero(this.ultimo.read)
		},
		/**
		 * Texto del último mensaje. Si fue uno automático (pedido confirmado, pago acreditado...)
		 * va con su rótulo adelante: la preview de esos mensajes es un párrafo largo que empieza
		 * igual en todos, y el rótulo es lo que dice de qué se trata.
		 */
		preview() {
			if (!this.ultimo) {
				return ''
			}
			let texto = this.ultimo.text || ''
			let rotulo = rotulo_del_mensaje(this.ultimo)
			if (rotulo) {
				return rotulo + ': ' + texto
			}
			return texto
		},
	},
}
</script>
<style lang="sass">
@import '@/components/online/components/mensajes/_tokens'

.tienda-mensajes-fila
	padding: 10px 14px
	cursor: pointer
	border-bottom: 1px solid var(--wa-borde)
	color: var(--wa-texto)
	transition: background .12s ease
	&:hover
		background: var(--wa-hover)
	&:focus
		outline: none
	&:focus-visible
		box-shadow: inset 0 0 0 2px var(--wa-verde)
	// La fila abierta se marca con el velo del verde de la marca, igual que en la bandeja de
	// WhatsApp: con el sidebar tapando media pantalla es la única pista de en qué conversación está
	// parado el operador. La clase repetida le gana al :hover de arriba (empatan en dos clases).
	// El primer `background` es el respaldo para el navegador sin color-mix.
	&--activa,
	&--activa:hover
		background: var(--wa-hover)
		background: color-mix(in srgb, var(--wa-verde) 14%, transparent)
	&__principal
		display: flex
		flex-direction: row
		justify-content: space-between
		align-items: center
		gap: 8px
	&__nombre
		font-weight: 600
		font-size: .95rem
		display: flex
		align-items: center
		// `min-width: 0` deja que el item flex se achique debajo de su contenido: sin esto un
		// nombre largo empujaba la hora fuera de la fila en la franja de tablet.
		min-width: 0
		overflow: hidden
	&__nombre-texto
		min-width: 0
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
	&__hora
		font-size: .75rem
		opacity: var(--wa-texto-muy-tenue-op)
		flex-shrink: 0
	&__secundaria
		display: flex
		flex-direction: row
		justify-content: space-between
		align-items: center
		margin-top: 2px
		gap: 8px
	// 🔴 El preview se destiñe con `color` y NO con `opacity`: el check de "leído" cuelga ADENTRO
	// de este span y trae su propio color, y la opacidad del padre se lo lavaría.
	&__preview
		display: flex
		align-items: center
		gap: 3px
		min-width: 0
		font-size: .82rem
		color: var(--color-text-secondary)
	&__preview-texto
		min-width: 0
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
	&__check
		flex-shrink: 0
		font-size: .95rem
		&--leido
			color: var(--tm-check-leido)
	// Badge verde de no leídos, con el verde de la marca y su texto oscuro (el blanco sobre ese
	// verde no llega a 2:1).
	&__badge
		flex-shrink: 0
		min-width: 20px
		height: 20px
		padding: 0 6px
		border-radius: 999px
		background: var(--wa-verde)
		color: var(--wa-verde-texto)
		font-size: .72rem
		font-weight: 700
		display: inline-flex
		align-items: center
		justify-content: center
	// Conversación con algo sin leer: la hora en el verde de la marca y la preview en el color
	// principal, como en WhatsApp. Se lee de un vistazo sin necesitar el número.
	&--no-leida &__hora
		color: var(--tm-acento-texto)
		opacity: 1
		font-weight: 600
	&--no-leida &__preview
		color: var(--wa-texto)
		font-weight: 600
</style>
