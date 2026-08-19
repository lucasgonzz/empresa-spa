<template>
	<!-- Manija para estirar el modal del asistente desde uno de sus bordes verticales -->
	<div
	class="asistente-ia-resizer"
	:class="clases"
	@mousedown="on_mousedown"
	title="Arrastrar para cambiar el ancho">
	</div>
</template>

<script>
/**
 * Manija de borde del panel del asistente de IA (pedido de Lucas, 19/8/2026: el modal
 * entero se estira desde los dos lados, igual que ya se estiraba la sidebar de adentro).
 *
 * Por qué no se reusa VenderResizer, que hace el mismo drag:
 *
 * 1. Aquél es un DIVISOR ENTRE DOS PANELES — una barra gris de 6px que se ve, y tiene
 *    que verse, porque separa dos zonas. Éste va encima del borde redondeado del modal:
 *    si se pintara igual, le dibujaría dos barras grises a los costados al modal.
 * 2. Emite el delta crudo del mouse, y acá el signo depende de qué borde se agarró.
 *    Con el crudo, cada llamador repite la cuenta de signo y tarde o temprano uno la
 *    escribe al revés.
 *
 * Este componente emite el delta YA ORIENTADO HACIA AFUERA: positivo = el usuario está
 * agrandando, sea cual sea el borde. El padre suma y listo.
 *
 * VenderResizer no se toca: lo usan Vender y la sidebar de este mismo panel.
 */
export default {
	name: 'PanelResizer',
	props: {
		/**
		 * Qué borde del modal es esta manija: 'izquierda' o 'derecha'. Define hacia dónde
		 * es "afuera" y, con eso, el signo del delta que se emite.
		 */
		lado: {
			type: String,
			required: true,
			validator(valor) {
				return valor == 'izquierda' || valor == 'derecha'
			},
		},
	},
	data() {
		return {
			/* true mientras el usuario tiene el botón apretado sobre la manija */
			arrastrando: false,

			/* Posición horizontal del cursor en el último movimiento procesado */
			x_anterior: 0,
		}
	},
	computed: {
		clases() {
			return {
				'asistente-ia-resizer--izquierda': this.lado == 'izquierda',
				'asistente-ia-resizer--derecha': this.lado == 'derecha',
				'asistente-ia-resizer--activo': this.arrastrando,
			}
		},
	},
	/*
	 * Si el componente se destruye en medio de un drag (el usuario cierra el panel con
	 * Escape sin soltar el botón), los listeners quedarían colgados de document para
	 * siempre, moviendo un ancho que ya no existe. Mismo motivo por el que Panel.vue
	 * limpia los suyos.
	 */
	beforeDestroy() {
		this.soltar_listeners()
	},
	methods: {
		/**
		 * Arranca el drag. Los listeners van en document y no en el elemento porque el
		 * cursor se escapa de una manija de 6px apenas se mueve rápido.
		 *
		 * @param {MouseEvent} event
		 */
		on_mousedown(event) {
			this.arrastrando = true
			this.x_anterior = event.clientX

			/* Sin esto el navegador selecciona el texto del panel mientras se arrastra */
			event.preventDefault()

			document.addEventListener('mousemove', this.on_mousemove)
			document.addEventListener('mouseup', this.on_mouseup)
		},

		/**
		 * Emite `resize` con el delta ya orientado hacia afuera: positivo cuando el
		 * usuario agranda el modal.
		 *
		 * En el borde DERECHO, afuera es hacia la derecha (delta del mouse tal cual).
		 * En el IZQUIERDO, afuera es hacia la izquierda, así que va negado.
		 *
		 * @param {MouseEvent} event
		 */
		on_mousemove(event) {
			if (!this.arrastrando) {
				return
			}

			let delta = event.clientX - this.x_anterior
			this.x_anterior = event.clientX

			if (this.lado == 'izquierda') {
				delta = -delta
			}

			this.$emit('resize', delta)
		},

		/**
		 * Cierra el drag y avisa al padre para que persista el ancho. La escritura va al
		 * soltar y no en cada movimiento: si no, un solo arrastre dispararía cientos de PUT.
		 */
		on_mouseup() {
			if (!this.arrastrando) {
				return
			}

			this.arrastrando = false
			this.soltar_listeners()

			this.$emit('resize-end')
		},

		soltar_listeners() {
			document.removeEventListener('mousemove', this.on_mousemove)
			document.removeEventListener('mouseup', this.on_mouseup)
		},
	},
}
</script>

<style scoped lang="sass">
// Franja invisible sobre el borde del modal. No pinta nada en reposo a propósito: es el
// borde del panel lo que el usuario ve, y dos barras grises a los costados romperían la
// silueta del modal. En hover aparece apenas, para que se descubra que se puede agarrar.
.asistente-ia-resizer
	position: absolute
	top: 0
	bottom: 0
	width: 6px
	z-index: 4
	cursor: col-resize
	background: transparent
	transition: background .15s ease

	// Zona de agarre más ancha que la franja visible, sin correr el borde del modal.
	&::before
		content: ''
		position: absolute
		top: 0
		bottom: 0
		left: -3px
		right: -3px

	&:hover, &.asistente-ia-resizer--activo
		background: var(--color-border-secondary, #adb5bd)

	&--izquierda
		left: 0

	&--derecha
		right: 0

@media (prefers-reduced-motion: reduce)
	.asistente-ia-resizer
		transition: none
</style>
