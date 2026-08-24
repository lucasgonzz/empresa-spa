<template>
	<div class="menu-fechas">
		<buttons
		:model_name="model_name"></buttons>

		<fechas
		:model_name="model_name"></fechas>
	</div>
</template>
<script>
export default {
	components: {
		Buttons: () => import('@/common-vue/components/menu-fechas/buttons/Index'),
		Fechas: () => import('@/common-vue/components/menu-fechas/fechas/Index'),
	},
	props: {
		model_name: String,
	},
}
</script>
<style lang="sass">
// Los controles de esta barra toman la métrica del sistema desde la misión 33: los cuatro botones
// eran `size="lg"` con outline azul --de otro peso que el resto de la interfaz-- y los dos campos de
// fecha eran inputs sin ningún estilo.
//
// Todo se declara desde acá y no en los dos componentes hijos: este <style> no es scoped y los hijos
// no tienen ninguno propio, así que tocar un solo archivo alcanza para los dos. Los colores salen de
// tokens, que es lo que hace que la barra se lea en html.dark-mode.
.menu-fechas
	display: flex
	gap: var(--toolbar-btn-gap)

	@media screen and (max-width: 992px)
		flex-direction: column
		width: 100%
	@media screen and (min-width: 992px)
		flex-direction: row
		align-items: center
		justify-content: flex-start

	// --- Los cuatro botones de dia ---------------------------------------------------------------
	.buttons
		display: flex
		align-items: center
		gap: var(--toolbar-btn-gap)

		.btn
			height: var(--toolbar-control-h)
			display: inline-flex
			align-items: center
			justify-content: center
			padding: 0 12px
			font-size: 0.875rem
			line-height: 1
			border-radius: var(--toolbar-btn-radius)
			box-shadow: var(--toolbar-btn-shadow)
			// El margen entre botones lo da el gap; el m-r-10 de cada uno lo duplicaba.
			margin-right: 0
			background: var(--bg-card)
			border: 1px solid var(--color-border)
			color: var(--color-text-primary)

			&:hover,
			&:focus
				background: var(--bg-hover)
				border-color: var(--color-border)
				color: var(--color-text-primary)

			// El dia elegido se marca como marca el resto de la interfaz: relleno de acento, no un
			// outline mas oscuro.
			&.btn-primary
				background: var(--color-primary)
				border-color: var(--color-primary)
				color: #fff

				&:hover,
				&:focus
					background: var(--color-primary)
					border-color: var(--color-primary)
					color: #fff

	// --- Los dos campos de fecha y la lupa -------------------------------------------------------
	.j-start
		display: flex
		align-items: center
		gap: var(--toolbar-btn-gap)
		flex-wrap: wrap

	.input-group
		width: auto
		margin-left: 0 !important

		.input-group-text
			height: var(--toolbar-control-h)
			padding: 0 0.6rem
			font-size: 0.8125rem
			border: 1px solid var(--color-border)
			border-right: none
			border-top-left-radius: var(--toolbar-btn-radius)
			border-bottom-left-radius: var(--toolbar-btn-radius)
			background-color: var(--bg-hover)
			color: var(--color-text-secondary)

		.form-control
			height: var(--toolbar-control-h)
			width: auto
			padding: 0 0.6rem
			font-size: 0.8125rem
			border: 1px solid var(--color-border)
			border-left: none
			border-top-right-radius: var(--toolbar-btn-radius)
			border-bottom-right-radius: var(--toolbar-btn-radius)
			background-color: var(--bg-card)
			color: var(--color-text-primary)

	// El boton de lupa es el unico de acento de la barra: es la accion.
	> .j-start > .btn
		height: var(--toolbar-control-h)
		display: inline-flex
		align-items: center
		justify-content: center
		width: var(--toolbar-control-h)
		padding: 0
		margin-left: 0 !important
		border-radius: var(--toolbar-btn-radius)
		box-shadow: var(--toolbar-btn-shadow)
</style>
