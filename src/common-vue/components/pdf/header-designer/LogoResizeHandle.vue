<template>
	<div
	class="header-designer-logo-handle"
	title="Arrastrá para redimensionar el logo"
	@mousedown="start_drag">
		<i class="icon-arrow-down"></i>
	</div>
</template>

<script>
/**
 * Manija de redimensionado del logo del diseñador de header (prompt 441).
 *
 * Se ubica en la esquina del recuadro del logo dentro de HeaderPreview.vue. Al
 * arrastrar horizontalmente, emite `update:size_mm` con el nuevo tamaño acotado
 * entre `min_mm` y `max_mm`; el redimensionado es siempre simétrico (mismo valor
 * para ancho y alto) porque el logo se muestra como un cuadrado en el header real.
 */
export default {
	name: 'HeaderDesignerLogoResizeHandle',
	props: {
		/**
		 * Tamaño actual del logo en milímetros (viene de pdf_column_profile.logo_size_mm).
		 */
		size_mm: {
			type: Number,
			required: true,
		},
		/**
		 * Tope mínimo permitido en mm.
		 */
		min_mm: {
			type: Number,
			required: true,
		},
		/**
		 * Tope máximo permitido en mm.
		 */
		max_mm: {
			type: Number,
			required: true,
		},
		/**
		 * Factor de escala px -> mm de la previsualización, para convertir el
		 * desplazamiento del mouse (px) a milímetros reales.
		 */
		px_per_mm: {
			type: Number,
			required: true,
		},
	},
	data() {
		return {
			/**
			 * true mientras el usuario mantiene presionado el mouse sobre la manija.
			 */
			dragging: false,
			/**
			 * Posición X del mouse (px) al iniciar el arrastre, para calcular el delta.
			 */
			start_x: 0,
			/**
			 * Tamaño en mm que tenía el logo al iniciar el arrastre.
			 */
			start_size_mm: 0,
		}
	},
	methods: {
		/**
		 * Inicia el redimensionado: guarda la posición inicial del mouse y el tamaño
		 * de partida, y engancha los listeners globales de mousemove/mouseup (se
		 * remueven en stop_drag para no dejar listeners colgados).
		 *
		 * @param {MouseEvent} event Evento de mousedown sobre la manija.
		 * @return {void}
		 */
		start_drag(event) {
			event.preventDefault()
			this.dragging = true
			this.start_x = event.clientX
			this.start_size_mm = this.size_mm
			window.addEventListener('mousemove', this.on_drag)
			window.addEventListener('mouseup', this.stop_drag)
		},
		/**
		 * Calcula el nuevo tamaño en mm según el desplazamiento horizontal del mouse
		 * desde que empezó el arrastre, y lo emite acotado entre min_mm y max_mm.
		 * El resize es simétrico: el mismo delta se aplica como ancho y alto (el
		 * logo se renderiza como cuadrado tanto acá como en el PDF real).
		 *
		 * @param {MouseEvent} event Evento de mousemove.
		 * @return {void}
		 */
		on_drag(event) {
			if (!this.dragging) {
				return
			}
			/* Desplazamiento horizontal del mouse desde el inicio del arrastre, en px */
			const delta_px = event.clientX - this.start_x
			/* Mismo desplazamiento convertido a milímetros según la escala de la preview */
			const delta_mm = delta_px / this.px_per_mm
			let new_size_mm = Math.round(this.start_size_mm + delta_mm)
			if (new_size_mm < this.min_mm) {
				new_size_mm = this.min_mm
			}
			if (new_size_mm > this.max_mm) {
				new_size_mm = this.max_mm
			}
			this.$emit('update:size_mm', new_size_mm)
		},
		/**
		 * Finaliza el redimensionado y limpia los listeners globales de mousemove/mouseup.
		 *
		 * @return {void}
		 */
		stop_drag() {
			this.dragging = false
			window.removeEventListener('mousemove', this.on_drag)
			window.removeEventListener('mouseup', this.stop_drag)
		},
	},
	beforeDestroy() {
		/* Limpieza defensiva por si el componente se destruye durante un arrastre activo */
		window.removeEventListener('mousemove', this.on_drag)
		window.removeEventListener('mouseup', this.stop_drag)
	},
}
</script>

<style lang="sass" scoped>
.header-designer-logo-handle
	position: absolute
	right: -7px
	bottom: -7px
	width: 16px
	height: 16px
	background: #007bff
	border: 2px solid #fff
	border-radius: 50%
	cursor: nwse-resize
	display: flex
	align-items: center
	justify-content: center
	color: #fff
	font-size: 8px
	box-shadow: 0 0 2px rgba(0, 0, 0, .4)
	z-index: 2
</style>
