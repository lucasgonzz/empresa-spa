<template>
	<div
	class="asistente-ia-globo"
	:class="clases_del_globo">
		<!-- Texto plano SIEMPRE: pre-wrap y la interpolación normal de Vue, que ya
		escapa. Ni markdown, ni v-html, ni sanitizador (D43). -->
		<p class="asistente-ia-globo__texto">
			{{ message.contenido }}
		</p>

		<!-- Pie solo para mensajes del usuario: el estado del envío (D41). -->
		<div
		v-if="es_del_usuario"
		class="asistente-ia-globo__pie">
			<i
			v-if="message.estado_local == 'enviando'"
			class="bi bi-clock"
			title="Enviando..."></i>
			<i
			v-else-if="message.estado_local == 'enviado'"
			class="bi bi-check2"
			title="Enviado"></i>
			<i
			v-else-if="message.estado_local == 'error'"
			class="bi bi-exclamation-circle"
			title="No se pudo enviar"></i>
		</div>

		<!-- El reintento reenvía el mismo texto (D41). -->
		<div
		v-if="es_del_usuario && message.estado_local == 'error'"
		class="asistente-ia-globo__reintento">
			<span>No se pudo enviar.</span>
			<b-button
			size="sm"
			variant="outline-danger"
			@click="$emit('retry', message)">
				Reintentar
			</b-button>
		</div>
	</div>
</template>

<script>
export default {
	props: {
		message: {
			type: Object,
			required: true,
		},
	},
	computed: {
		es_del_usuario() {
			return this.message.rol == 'user'
		},
		clases_del_globo() {
			return {
				'asistente-ia-globo--usuario': this.es_del_usuario,
				'asistente-ia-globo--asistente': !this.es_del_usuario,
				'asistente-ia-globo--enviando': this.es_del_usuario && this.message.estado_local == 'enviando',
				'asistente-ia-globo--error-envio': this.es_del_usuario && this.message.estado_local == 'error',
				'asistente-ia-globo--error-respuesta': !this.es_del_usuario && this.message.estado == 'error',
			}
		},
	},
}
</script>

<style lang="sass">
// Los dos roles van en viñeta, y se distinguen por la FORMA y no por dos rellenos
// peleándose (pedido de Lucas, 19/8/2026: antes el asistente era texto suelto sobre el
// fondo del panel y se leía desprolijo):
//
//   usuario   -> globo RELLENO (--bg-section), pegado a la derecha, angosto
//   asistente -> tarjeta CONTORNEADA (--bg-card + borde), pegada a la izquierda, ancha
//
// El asistente lleva el mismo color que el panel y es el BORDE el que dibuja la viñeta.
// Es a propósito: un segundo relleno gris al lado del del usuario emparejaba los dos
// roles y costaba más seguir quién dijo qué. Anda en los dos temas porque los tres
// tokens (--bg-card, --bg-section, --color-border) tienen contraparte oscura.
//
// Entrada sutil de abajo hacia arriba para que el mensaje "suba" a la conversación (D41).
.asistente-ia-globo
	margin-bottom: 14px
	animation: asistente-ia-globo-entrada .18s ease-out
	transition: opacity .15s ease

	&--usuario
		align-self: flex-end
		max-width: 78%
		background: var(--bg-section, #f8f9fa)
		border: 1px solid var(--color-border-secondary, #e9ecef)
		border-radius: 14px
		padding: 9px 14px

	&--asistente
		align-self: flex-start
		max-width: 96%
		background: var(--bg-card, #fff)
		border: 1px solid var(--color-border, #dee2e6)
		border-radius: 14px
		padding: 9px 14px
		// Sombra de un píxel y nada más: la viñeta tiene que despegarse del panel sin
		// convertirse en una tarjeta flotante. Una sombra más grande, repetida en cada
		// mensaje, ensucia toda la conversación.
		box-shadow: 0 1px 2px var(--shadow-color, rgba(99, 99, 99, .2))

	// Mientras el POST no confirmó, el globo respira en baja opacidad (D41).
	&--enviando
		opacity: .55

	&--error-envio
		border-color: var(--btn-peligro-borde, #b4443f)

	// Un error del lado de la IA llega como contenido amigable (D18): se lee
	// como un mensaje más, apenas teñido para distinguirlo. Ahora que hay viñeta,
	// el borde acompaña al texto: si no, el teñido quedaba adentro de una tarjeta
	// de contorno neutro y no se leía como un estado distinto.
	&--error-respuesta
		color: var(--caja-cerrar-texto, #9c3a36)
		border-color: var(--btn-peligro-borde, #b4443f)

	&__texto
		margin: 0
		white-space: pre-wrap
		word-break: break-word
		text-align: left
		line-height: 1.55

	&__pie
		display: flex
		justify-content: flex-end
		margin-top: 2px
		font-size: .75rem
		color: var(--color-text-secondary, #6c757d)

	&__reintento
		display: flex
		align-items: center
		gap: 8px
		margin-top: 6px
		font-size: .8rem
		color: var(--btn-peligro-texto, #9c3a36)

@keyframes asistente-ia-globo-entrada
	from
		opacity: 0
		transform: translateY(6px)
	to
		transform: translateY(0)

@media (prefers-reduced-motion: reduce)
	.asistente-ia-globo
		animation: none
		transition: none
</style>
