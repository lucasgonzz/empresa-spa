<template>
	<label
	class="ios-toggle"
	:class="{ 'ios-toggle--disabled': disabled }"
	@click.stop>
		<input
		type="checkbox"
		:checked="value"
		:disabled="disabled"
		@change="on_change">
		<span class="ios-toggle__track">
			<span class="ios-toggle__thumb"></span>
		</span>
	</label>
</template>

<script>
/**
 * Perilla estilo iPhone, de infraestructura (common-vue): v-model estándar sobre un booleano.
 *
 * Tiene la misma apariencia que `VenderToggle` (módulo Vender), pero una API deliberadamente
 * mínima: nada de `mode: 'array'`, `option_value`, `true_value`/`false_value` — esa complejidad
 * es propia de Vender y no corresponde acá. Se creó aparte, en `common-vue`, porque el menú
 * lateral es infraestructura compartida y no puede depender de un componente de un módulo.
 */
export default {
	name: 'IosToggle',
	props: {
		/**
		 * Estado actual del toggle (v-model estándar).
		 */
		value: {
			type: Boolean,
			default: false,
		},
		/**
		 * Deshabilita el control (p. ej. mientras hay una llamada al backend en vuelo).
		 */
		disabled: {
			type: Boolean,
			default: false,
		},
	},
	methods: {
		/**
		 * Emite el nuevo valor booleano al padre (v-model).
		 *
		 * El `@click.stop` del `<label>` raíz es intencional: evita que el click en la perilla
		 * también dispare un `@click` de un contenedor ancestro (como el `.item` del menú, que
		 * tiene su propio manejador para el resto de la fila) además de este `@input` — sin el
		 * stop, un click directo sobre la perilla terminaría llamando dos veces al mismo handler.
		 *
		 * @param {Event} event Evento change del checkbox nativo.
		 * @returns {void}
		 */
		on_change(event) {
			if (this.disabled) {
				return
			}
			this.$emit('input', event.target.checked)
		},
	},
}
</script>

<style lang="sass">
.ios-toggle
	position: relative
	display: inline-block
	width: 42px
	height: 24px
	cursor: pointer
	flex-shrink: 0
	margin-bottom: 0

	// Input nativo oculto pero accesible por teclado (no display:none, que lo saca del tab order).
	input
		opacity: 0
		width: 0
		height: 0
		position: absolute

	// Track apagado: rgba blanco tenue, para que se lea sobre el fondo oscuro del menú lateral
	// (el #ced4da de VenderToggle está pensado para fondos claros y ahí desaparecería).
	.ios-toggle__track
		position: absolute
		inset: 0
		background: rgba(255, 255, 255, 0.22)
		border-radius: 9999px
		transition: background 0.2s ease

	.ios-toggle__thumb
		position: absolute
		height: 18px
		width: 18px
		left: 3px
		bottom: 3px
		background: #fff
		border-radius: 50%
		transition: transform 0.2s ease
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.22)

	input:checked ~ .ios-toggle__track
		background: #22c55e

	input:checked ~ .ios-toggle__track .ios-toggle__thumb
		transform: translateX(18px)

	&.ios-toggle--disabled
		opacity: 0.45
		cursor: not-allowed
		pointer-events: none
</style>
