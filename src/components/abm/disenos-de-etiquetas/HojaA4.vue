<template>
	<!--
		La hoja A4 en chiquito con la grilla de etiquetas (mision disenos-etiquetas-gondola, 29/9/2026):
		para entender de un vistazo de que tamaño es cada etiqueta y cuantas salen por hoja. La primera
		etiqueta va resaltada (es la que se esta editando). Respeta el margen de 5 mm.

		Decorativa: el texto "Entran 3 × 7 = 21 por hoja" que la acompaña dice lo mismo.
	-->
	<svg
	class="hoja-a4"
	:width="ancho_px"
	:height="alto_px"
	:viewBox="'0 0 ' + ANCHO_HOJA_MM + ' ' + ALTO_HOJA_MM"
	aria-hidden="true">
		<rect
		class="hoja-a4__papel"
		x="0"
		y="0"
		:width="ANCHO_HOJA_MM"
		:height="ALTO_HOJA_MM"></rect>
		<rect
		v-for="celda in celdas"
		:key="celda.clave"
		class="hoja-a4__etiqueta"
		:class="{ 'hoja-a4__etiqueta--primera': celda.primera }"
		:x="celda.x"
		:y="celda.y"
		:width="celda.w"
		:height="celda.h"></rect>
	</svg>
</template>
<script>
import { ANCHO_HOJA_MM, ALTO_HOJA_MM, MARGEN_MM, ancho_de_etiqueta, filas_por_hoja } from './geometria'

/**
 * Miniatura de la hoja A4 con sus etiquetas.
 */
export default {
	name: 'HojaA4',
	props: {
		/* Etiquetas por fila (1..4) */
		columnas: {
			type: Number,
			required: true,
		},
		/* Alto de cada etiqueta, mm */
		alto_mm: {
			type: Number,
			required: true,
		},
		/* Ancho de la miniatura en pantalla (px); el alto sale de la proporcion de la hoja */
		ancho_px: {
			type: Number,
			default: 48,
		},
	},
	data() {
		return {
			ANCHO_HOJA_MM: ANCHO_HOJA_MM,
			ALTO_HOJA_MM: ALTO_HOJA_MM,
		}
	},
	computed: {
		/**
		 * Alto en pantalla.
		 *
		 * @returns {number}
		 */
		alto_px() {
			return Math.round(this.ancho_px * ALTO_HOJA_MM / ANCHO_HOJA_MM)
		},
		/**
		 * Una celda por etiqueta que entra en la hoja.
		 *
		 * @returns {Array}
		 */
		celdas() {
			let ancho = ancho_de_etiqueta(this.columnas)
			let filas = filas_por_hoja(this.alto_mm)
			let celdas = []

			for (let fila = 0; fila < filas; fila++) {
				for (let columna = 0; columna < this.columnas; columna++) {
					celdas.push({
						clave: fila + '-' + columna,
						x: MARGEN_MM + columna * ancho,
						y: MARGEN_MM + fila * this.alto_mm,
						w: ancho,
						h: this.alto_mm,
						primera: fila === 0 && columna === 0,
					})
				}
			}

			return celdas
		},
	},
}
</script>
<style lang="sass">
.hoja-a4
	display: block
	flex: 0 0 auto

.hoja-a4__papel
	fill: #fff
	stroke: var(--color-border)
	stroke-width: 3

.hoja-a4__etiqueta
	fill: transparent
	stroke: var(--color-text-secondary)
	stroke-width: 1.5

.hoja-a4__etiqueta--primera
	fill: var(--color-primary)
	fill-opacity: .35
	stroke: var(--color-primary)
</style>
