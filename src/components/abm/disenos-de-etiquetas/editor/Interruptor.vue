<template>
	<!--
		Interruptor tipo iOS del editor de etiquetas (mision disenos-etiquetas-gondola, 29/9/2026).
		Mismo dibujo que el "En uso" de los Diseños de Vender (pista --toggle-track-off apagada, azul
		primario prendida). El checkbox nativo queda accesible por teclado (espacio lo cambia).
		Se usa con v-model.
	-->
	<label
	class="interruptor-etiqueta"
	:for="id">
		<input
		:id="id"
		type="checkbox"
		:checked="value"
		@change="$emit('input', $event.target.checked)">
		<span class="interruptor-etiqueta__pista">
			<span class="interruptor-etiqueta__perilla"></span>
		</span>
		<span class="interruptor-etiqueta__texto">
			<slot></slot>
		</span>
	</label>
</template>
<script>
/**
 * Interruptor si/no.
 */
export default {
	name: 'InterruptorDeEtiqueta',
	props: {
		/* Valor (v-model) */
		value: {
			type: Boolean,
			default: false,
		},
		/* id del input (para el label) */
		id: {
			type: String,
			required: true,
		},
	},
}
</script>
<style lang="sass">
.interruptor-etiqueta
	display: inline-flex
	align-items: center
	gap: 10px
	margin: 0
	cursor: pointer
	user-select: none

	input
		position: absolute
		width: 0
		height: 0
		opacity: 0

	.interruptor-etiqueta__pista
		position: relative
		flex: 0 0 40px
		width: 40px
		height: 24px
		border-radius: 999px
		background: var(--toggle-track-off)
		border: 1px solid var(--color-border)
		transition: background .2s ease, border-color .2s ease

	.interruptor-etiqueta__perilla
		position: absolute
		top: 2px
		left: 2px
		width: 18px
		height: 18px
		border-radius: 50%
		background: var(--bg-card)
		box-shadow: 0 1px 4px var(--shadow-color)
		transition: transform .2s ease

	.interruptor-etiqueta__texto
		color: var(--color-text-primary)
		font-size: 0.85rem
		font-weight: 600

	input:checked ~ .interruptor-etiqueta__pista
		background: var(--color-primary)
		border-color: var(--color-primary)

		.interruptor-etiqueta__perilla
			transform: translateX(16px)

	input:focus-visible ~ .interruptor-etiqueta__pista
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

html.dark-mode .interruptor-etiqueta .interruptor-etiqueta__perilla
	background: var(--color-text-primary)
</style>
