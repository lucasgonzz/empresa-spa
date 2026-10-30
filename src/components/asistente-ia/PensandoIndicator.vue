<template>
	<!-- El "pensando" de ia-spa (mensajes/MensajeAsistente.vue mientras la respuesta está
	pendiente): el avatar del agente en el lugar donde en un rato va a estar la respuesta, un punto
	que late y la línea de progreso con el brillo que la recorre, como ChatGPT. Misión
	agente-mejoras-uso-real, 29/10/2026.

	Tiene la MISMA forma que una respuesta del agente (avatar de 30px + cuerpo, ver
	mensaje/MensajeAgente.vue), y no es cosmético: ocupa el lugar donde en un segundo va a estar
	la respuesta, así que cuando llega el bloque se queda quieto y solo cambia el contenido (D41,
	D18: nunca queda un globo vacío a la vista). Si cambia la respuesta, este va con ella.

	Bajo prefers-reduced-motion se apagan el latido y el brillo y queda el texto fijo (D42). -->
	<div
	class="asistente-ia-pensando"
	role="status"
	aria-live="polite">
		<span
		class="asistente-ia-pensando__avatar"
		aria-hidden="true">
			<img
			v-if="logo_url"
			:src="logo_url"
			alt="">
			<i
			v-else
			class="bi bi-robot"></i>
		</span>
		<span class="asistente-ia-pensando__cuerpo">
			<span
			class="asistente-ia-pensando__pulso"
			aria-hidden="true"></span>
			<span class="asistente-ia-pensando__texto">{{ texto }}</span>
		</span>
	</div>
</template>

<script>
import { logo_del_negocio } from '@/components/asistente-ia/identidad'

export default {
	props: {
		/**
		 * La línea de progreso de la respuesta en curso («Buscando las ventas…»), la que el API
		 * escribe en `ai_messages.progreso` antes de cada herramienta. null o vacía = "Pensando…".
		 * La resuelve Conversation.vue (`progreso_en_curso`).
		 */
		progreso: {
			type: String,
			default: null,
		},
	},
	computed: {
		/**
		 * Mismo criterio que el botón flotante (D37): logo de la tienda online, si no la imagen
		 * de la cuenta, si no el robotito.
		 *
		 * @returns {String|null}
		 */
		logo_url() {
			return logo_del_negocio(this.user)
		},
		/**
		 * Lo que se lee: el progreso si vino, si no "Pensando…" (el texto de ia-spa).
		 *
		 * @returns {String}
		 */
		texto() {
			return this.progreso ? this.progreso : 'Pensando…'
		},
	},
}
</script>

<style lang="sass">
@import '@/components/asistente-ia/_tokens'

.asistente-ia-pensando
	display: flex
	align-items: flex-start
	gap: 14px
	padding: 4px 0 0 0

	// El mismo avatar de la respuesta (MensajeAgente.vue).
	&__avatar
		flex: 0 0 auto
		width: 30px
		height: 30px
		margin-top: 1px
		border-radius: 50%
		border: 1px solid var(--ia-borde)
		background: var(--ia-bg)
		color: var(--ia-primario)
		font-size: 15px
		display: inline-flex
		align-items: center
		justify-content: center
		overflow: hidden

		img
			width: 100%
			height: 100%
			object-fit: cover
			display: block

	&__cuerpo
		flex: 1 1 auto
		min-width: 0
		min-height: 30px
		display: flex
		align-items: center
		gap: 10px
		font-size: .98rem

	// El punto que late de ia-spa (`.msj-asistente__pulso`).
	&__pulso
		flex: 0 0 auto
		width: 12px
		height: 12px
		border-radius: 50%
		background: var(--ia-texto)
		animation: asistente-ia-pensando-pulso 1.3s ease-in-out infinite

	// El brillo que recorre el texto, como el de ChatGPT (`.texto-brillante` de ia-spa).
	&__texto
		min-width: 0
		overflow-wrap: anywhere
		background: linear-gradient(90deg, var(--ia-texto-3) 0%, var(--ia-texto-3) 40%, var(--ia-texto) 50%, var(--ia-texto-3) 60%, var(--ia-texto-3) 100%)
		background-size: 300% 100%
		-webkit-background-clip: text
		background-clip: text
		color: transparent
		animation: asistente-ia-pensando-brillo 2.2s linear infinite

@media screen and (max-width: 767px)
	.asistente-ia-pensando
		gap: 10px

	.asistente-ia-pensando__avatar
		width: 26px
		height: 26px

@keyframes asistente-ia-pensando-pulso
	0%, 100%
		transform: scale(.85)
		opacity: .55
	50%
		transform: scale(1)
		opacity: 1

@keyframes asistente-ia-pensando-brillo
	0%
		background-position: 100% 50%
	100%
		background-position: 0% 50%

@media (prefers-reduced-motion: reduce)
	.asistente-ia-pensando__pulso
		animation: none

	.asistente-ia-pensando__texto
		animation: none
		background: none
		color: var(--ia-texto-2)
</style>
