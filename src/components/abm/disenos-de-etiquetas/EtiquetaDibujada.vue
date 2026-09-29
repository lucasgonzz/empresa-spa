<template>
	<!--
		Una etiqueta de gondola dibujada a escala, sin nada que se pueda tocar (mision
		disenos-etiquetas-gondola, 29/9/2026). Es la miniatura de las tarjetas del ABM: el mismo dibujo
		que el lienzo del editor (ContenidoDelCampo), con el zoom que entre en la tarjeta.

		Decorativa (aria-hidden): la tarjeta dice en texto el nombre y el tamaño. Muestra los mismos
		avisos tenues que el editor ("Lista borrada", "Escribí el texto") para que un precio de una
		lista que ya no existe no pase desapercibido.
	-->
	<div
	class="etiqueta-dibujada"
	:class="{ 'etiqueta-dibujada--con-marco': diseno.marco }"
	:style="{ width: ancho_px + 'px', height: alto_px + 'px' }"
	aria-hidden="true">
		<div
		v-for="elemento in diseno.elementos"
		:key="elemento.id"
		class="etiqueta-dibujada__campo"
		:style="{
			left: (elemento.x * zoom) + 'px',
			top: (elemento.y * zoom) + 'px',
			width: (elemento.w * zoom) + 'px',
			height: (elemento.h * zoom) + 'px',
		}">
			<contenido-del-campo
			:elemento="elemento"
			:zoom="zoom"
			:muestra="muestra"
			:listas="listas"
			editando></contenido-del-campo>
		</div>
	</div>
</template>
<script>
import ContenidoDelCampo from './ContenidoDelCampo'
import { ancho_de_etiqueta } from './geometria'

/**
 * Etiqueta dibujada (solo lectura).
 */
export default {
	name: 'EtiquetaDibujada',
	components: {
		ContenidoDelCampo,
	},
	props: {
		/* Diseño ya normalizado (diseno.js) */
		diseno: {
			type: Object,
			required: true,
		},
		/* Pixeles por mm */
		zoom: {
			type: Number,
			required: true,
		},
		/* Datos de muestra (muestra.js) */
		muestra: {
			type: Object,
			required: true,
		},
		/* Listas de precios del negocio */
		listas: {
			type: Array,
			default: function () {
				return []
			},
		},
	},
	computed: {
		/**
		 * Ancho en pantalla.
		 *
		 * @returns {number}
		 */
		ancho_px() {
			return ancho_de_etiqueta(this.diseno.columnas) * this.zoom
		},
		/**
		 * Alto en pantalla.
		 *
		 * @returns {number}
		 */
		alto_px() {
			return this.diseno.alto_mm * this.zoom
		},
	},
}
</script>
<style lang="sass">
// Papel blanco fijo en los dos modos (ver ContenidoDelCampo.vue)
.etiqueta-dibujada
	position: relative
	flex: 0 0 auto
	background: #fff
	box-shadow: 0 1px 3px var(--shadow-color)
	overflow: hidden

// El marco que imprime el PDF: una linea negra finita en los cuatro lados
.etiqueta-dibujada--con-marco
	outline: 1px solid #111
	outline-offset: -1px

.etiqueta-dibujada__campo
	position: absolute
</style>
