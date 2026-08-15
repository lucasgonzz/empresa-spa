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
// Estética tipo Claude: el usuario escribe en burbuja, el asistente contesta
// como texto directo sobre el fondo, sin globo. Entrada sutil de abajo hacia
// arriba para que el mensaje "suba" a la conversación (D41).
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
		padding: 0 2px

	// Mientras el POST no confirmó, el globo respira en baja opacidad (D41).
	&--enviando
		opacity: .55

	&--error-envio
		border-color: var(--btn-peligro-borde, #b4443f)

	// Un error del lado de la IA llega como contenido amigable (D18): se lee
	// como un mensaje más, apenas teñido para distinguirlo.
	&--error-respuesta
		color: var(--caja-cerrar-texto, #9c3a36)

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
