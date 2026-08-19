<template>
	<div class="asistente-ia-pensando">
		<!-- El mismo avatar del botón flotante, a 28px, con un halo que late (D42). -->
		<span class="asistente-ia-pensando__avatar">
			<img
			v-if="logo_url"
			:src="logo_url"
			alt="">
			<i
			v-else
			class="bi bi-robot"></i>
			<span class="asistente-ia-pensando__distintivo">
				<i class="bi bi-stars"></i>
			</span>
		</span>
		<!-- Tres puntitos con latido escalonado; bajo prefers-reduced-motion se
		apagan las animaciones y queda el texto fijo (D42). -->
		<span class="asistente-ia-pensando__puntos">
			<span class="asistente-ia-pensando__punto"></span>
			<span class="asistente-ia-pensando__punto"></span>
			<span class="asistente-ia-pensando__punto"></span>
		</span>
		<span class="asistente-ia-pensando__texto">Pensando…</span>
	</div>
</template>

<script>
export default {
	computed: {
		/**
		 * Mismo criterio que el botón flotante (D37): logo de la tienda online,
		 * si no la imagen de la cuenta, si no el robotito.
		 */
		logo_url() {
			if (!this.user) {
				return null
			}
			if (this.user.online_configuration && this.user.online_configuration.logo_url) {
				return this.user.online_configuration.logo_url
			}
			return this.user.image_url || null
		},
	},
}
</script>

<style lang="sass">
.asistente-ia-pensando
	display: flex
	align-items: center
	gap: 10px
	padding: 2px 2px 14px 2px

	&__avatar
		position: relative
		width: 28px
		height: 28px
		border-radius: 999px
		background: var(--color-primary, #007bff)
		color: #fff
		font-size: 14px
		display: flex
		align-items: center
		justify-content: center
		flex-shrink: 0
		// Halo de color de marca que late (D42). El rgba es el azul de marca en
		// claro al 25%; sobre el tema oscuro se lee igual de bien como glow.
		animation: asistente-ia-latido 2.4s ease-in-out infinite

		img
			width: 100%
			height: 100%
			border-radius: 999px
			object-fit: cover
			display: block

	&__distintivo
		position: absolute
		right: -4px
		bottom: -4px
		width: 14px
		height: 14px
		border-radius: 999px
		background: var(--color-primary, #007bff)
		border: 1.5px solid var(--bg-card, #fff)
		color: #fff
		font-size: 7px
		line-height: 1
		display: flex
		align-items: center
		justify-content: center

	&__puntos
		display: flex
		align-items: center
		gap: 5px

	&__punto
		width: 5px
		height: 5px
		border-radius: 999px
		background: var(--color-text-secondary, #6c757d)
		opacity: .25
		animation: asistente-ia-punto 1.2s infinite

		&:nth-child(2)
			animation-delay: .2s

		&:nth-child(3)
			animation-delay: .4s

	// El texto fijo existe solo para quien pidió menos movimiento.
	&__texto
		display: none
		font-size: .85rem
		color: var(--color-text-secondary, #6c757d)

@keyframes asistente-ia-latido
	0%, 100%
		box-shadow: 0 0 0 0 rgba(0, 123, 255, .25)
	50%
		box-shadow: 0 0 0 8px rgba(0, 123, 255, 0)

@keyframes asistente-ia-punto
	0%, 100%
		opacity: .25
	50%
		opacity: 1

@media (prefers-reduced-motion: reduce)
	.asistente-ia-pensando__avatar
		animation: none

	.asistente-ia-pensando__puntos
		display: none

	.asistente-ia-pensando__texto
		display: inline
</style>
