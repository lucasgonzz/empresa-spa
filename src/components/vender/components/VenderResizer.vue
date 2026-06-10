<template>
	<!-- Divisor vertical redimensionable entre el panel izquierdo y el panel derecho de Vender -->
	<div
	class="vender-resizer"
	:class="{ 'vender-resizer--active': is_dragging }"
	@mousedown="onMousedown"
	title="Arrastrar para redimensionar">
	</div>
</template>

<script>
export default {
	name: 'VenderResizer',
	data() {
		return {
			/* Indica si el usuario está arrastrando el divisor en este momento */
			is_dragging: false,

			/* Posición horizontal del cursor al inicio del drag */
			start_x: 0,
		}
	},
	methods: {
		/**
		 * Inicia el drag al hacer mousedown sobre el divisor.
		 * Registra los listeners de movimiento y soltar en document para capturar
		 * el movimiento aunque el cursor salga del divisor.
		 *
		 * @param {MouseEvent} event
		 */
		onMousedown(event) {
			this.is_dragging = true
			this.start_x = event.clientX

			/* Evitar selección de texto mientras se arrastra */
			event.preventDefault()

			document.addEventListener('mousemove', this.onMousemove)
			document.addEventListener('mouseup', this.onMouseup)
		},

		/**
		 * Calcula el desplazamiento horizontal y emite el evento `resize` con el delta.
		 * El componente padre ajusta el ancho del panel izquierdo en base a este delta.
		 *
		 * @param {MouseEvent} event
		 */
		onMousemove(event) {
			if (!this.is_dragging) return

			/* Delta en píxeles desde la última posición registrada */
			const delta = event.clientX - this.start_x
			this.start_x = event.clientX

			this.$emit('resize', delta)
		},

		/**
		 * Finaliza el drag al soltar el mouse.
		 * Emite `resize-end` para que el padre persista el nuevo ancho.
		 */
		onMouseup() {
			if (!this.is_dragging) return

			this.is_dragging = false

			document.removeEventListener('mousemove', this.onMousemove)
			document.removeEventListener('mouseup', this.onMouseup)

			this.$emit('resize-end')
		},
	},
}
</script>

<style scoped lang="sass">
/* Divisor vertical entre paneles */
.vender-resizer
	width: 6px
	flex-shrink: 0
	cursor: col-resize
	background: var(--color-border-tertiary, #dee2e6)
	transition: background 0.15s ease
	position: relative

	/* Amplía el área de click sin cambiar el ancho visual */
	&::before
		content: ''
		position: absolute
		top: 0
		bottom: 0
		left: -4px
		right: -4px

	&:hover, &.vender-resizer--active
		background: var(--color-border-secondary, #adb5bd)
</style>
