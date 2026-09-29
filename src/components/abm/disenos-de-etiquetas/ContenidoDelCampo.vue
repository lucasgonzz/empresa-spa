<template>
	<!--
		Lo que imprime un campo de la etiqueta, dibujado a escala adentro de su recuadro (mision
		disenos-etiquetas-gondola, 29/9/2026). Lo usan el lienzo del editor y la miniatura de las
		tarjetas, asi los dos se ven igual que el PDF:

		- Letra Arial, con el tamaño en pt pasado a mm (1 pt = 0,3528 mm) y los mm a pixeles con el zoom.
		- Sin saltos de linea: un solo renglon, centrado a lo alto, cortado con "…" al ancho.
		- Con saltos de linea: renglones de tamaño x 1,15, solo los que entran enteros en el alto, y el
		  ultimo con "…" si sobraba texto (como el PDF).
		- 1 mm de aire a los costados del texto, como las celdas de FPDF.
		- La foto entera y sin deformar; el codigo de barras estirado al recuadro, como la imagen C128.

		Es solo dibujo: no escucha el mouse (el lienzo pone el arrastre encima).
	-->
	<div
	class="contenido-del-campo"
	:class="clases"
	:style="estilo_de_la_caja">

		<!-- Codigo de barras (dibujo): barras de muestra estiradas al recuadro -->
		<svg
		v-if="elemento.tipo === 'codigo_barras_imagen'"
		class="contenido-del-campo__barras"
		:viewBox="'0 0 ' + barras.total + ' 10'"
		preserveAspectRatio="none"
		aria-hidden="true">
			<rect
			v-for="(barra, indice) in barras.rects"
			:key="indice"
			:x="barra.x"
			y="0"
			:width="barra.w"
			height="10"></rect>
		</svg>

		<!-- Foto: la del articulo de muestra, o un recuadro con el dibujito si no tiene -->
		<template v-else-if="elemento.tipo === 'imagen'">
			<img
			v-if="muestra.imagen_url && !imagen_rota"
			class="contenido-del-campo__foto"
			:src="muestra.imagen_url"
			alt=""
			draggable="false"
			@error="imagen_rota = true">
			<span
			v-else
			class="contenido-del-campo__sin-foto">
				<i class="bi bi-image"></i>
			</span>
		</template>

		<!-- Texto con saltos de linea: solo los renglones que entran enteros -->
		<div
		v-else-if="elemento.saltos_de_linea"
		class="contenido-del-campo__renglones"
		:style="estilo_de_los_renglones">{{ texto_visible }}</div>

		<!-- Texto en un renglon, centrado a lo alto -->
		<span
		v-else
		class="contenido-del-campo__renglon"
		:style="{ textAlign: alineacion_css }">{{ texto_visible }}</span>
	</div>
</template>
<script>
import { es_texto } from './catalogo'
import { texto_del_campo } from './muestra'
import { pt_a_mm, alto_de_renglon_mm, MARGEN_DE_CELDA_MM } from './geometria'

/* Patron de inicio y de fin de las barras de muestra (anchos en modulos, barra/espacio alternados) */
const INICIO_DE_BARRAS = [2, 1, 1, 2, 3, 2]
const FIN_DE_BARRAS = [2, 3, 3, 1, 1, 1, 2]

/**
 * Contenido de un campo de la etiqueta.
 */
export default {
	name: 'ContenidoDelCampo',
	props: {
		/* El campo del diseño {tipo, w, h, tamano, negrita, saltos_de_linea, alineacion, ...} */
		elemento: {
			type: Object,
			required: true,
		},
		/* Pixeles por mm */
		zoom: {
			type: Number,
			required: true,
		},
		/* Datos del articulo de muestra (muestra.js) */
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
		/*
			true en el editor: un texto libre vacio o un precio de una lista borrada muestran un aviso
			tenue en vez de quedar invisibles (en el PDF no salen)
		*/
		editando: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			/* true si la foto de muestra no cargo */
			imagen_rota: false,
		}
	},
	computed: {
		/**
		 * El texto que imprime el campo (null si no es texto o no imprime nada).
		 *
		 * @returns {string|null}
		 */
		texto() {
			if (!es_texto(this.elemento.tipo)) {
				return null
			}
			return texto_del_campo(this.elemento, this.muestra, this.listas)
		},
		/**
		 * Lo que se ve: el texto, o en el editor un aviso si no imprime nada.
		 *
		 * @returns {string}
		 */
		texto_visible() {
			if (this.texto) {
				return this.texto
			}
			if (!this.editando) {
				return ''
			}
			if (this.elemento.tipo === 'precio_lista') {
				return 'Lista borrada'
			}
			if (this.elemento.tipo === 'texto_fijo') {
				return 'Escribí el texto'
			}
			return ''
		},
		/**
		 * Clases del recuadro.
		 *
		 * @returns {Object}
		 */
		clases() {
			return {
				'contenido-del-campo--vacio': this.editando && es_texto(this.elemento.tipo) && !this.texto,
			}
		},
		/**
		 * Alineacion del contrato ('L' | 'C' | 'R') en CSS.
		 *
		 * @returns {string}
		 */
		alineacion_css() {
			if (this.elemento.alineacion === 'C') {
				return 'center'
			}
			if (this.elemento.alineacion === 'R') {
				return 'right'
			}
			return 'left'
		},
		/**
		 * Letra y aire de la caja, a escala.
		 *
		 * @returns {Object}
		 */
		estilo_de_la_caja() {
			if (!es_texto(this.elemento.tipo)) {
				return {}
			}
			let aire = MARGEN_DE_CELDA_MM * this.zoom
			return {
				fontSize: (pt_a_mm(this.elemento.tamano) * this.zoom) + 'px',
				fontWeight: this.elemento.negrita ? 700 : 400,
				paddingLeft: aire + 'px',
				paddingRight: aire + 'px',
			}
		},
		/**
		 * Renglones con saltos: alto de cada uno y cuantos entran enteros en el recuadro.
		 *
		 * @returns {Object}
		 */
		estilo_de_los_renglones() {
			let renglon_mm = alto_de_renglon_mm(this.elemento.tamano)
			let entran = Math.max(1, Math.floor((this.elemento.h + 0.001) / renglon_mm))
			let renglon_px = renglon_mm * this.zoom
			return {
				lineHeight: renglon_px + 'px',
				maxHeight: (renglon_px * entran) + 'px',
				textAlign: this.alineacion_css,
				/* El ultimo renglon visible termina en "…" si el texto seguia (el PDF hace lo mismo) */
				WebkitLineClamp: entran,
				/* Va en linea y no en el sass: autoprefixer borra -webkit-box-orient por "viejo" */
				WebkitBoxOrient: 'vertical',
			}
		},
		/**
		 * Las barras de muestra del codigo de barras: se arman con los digitos del codigo, asi cada
		 * articulo tiene "sus" barras. No es un C128 escaneable, es solo para ver el lugar y el tamaño.
		 *
		 * @returns {{total: number, rects: Array}}
		 */
		barras() {
			let codigo = String(this.muestra.codigo_barras || '0000000000000')
			let anchos = INICIO_DE_BARRAS.slice()

			for (let i = 0; i < codigo.length; i++) {
				let valor = codigo.charCodeAt(i)
				anchos.push(1 + (valor % 3), 1 + ((valor >> 2) % 2), 1 + ((valor >> 1) % 3), 1 + (valor % 2))
			}
			FIN_DE_BARRAS.forEach(function (ancho) {
				anchos.push(ancho)
			})

			let rects = []
			let x = 0
			anchos.forEach(function (ancho, indice) {
				/* Pares: barra negra; impares: espacio */
				if (indice % 2 === 0) {
					rects.push({ x: x, w: ancho })
				}
				x += ancho
			})

			return { total: x, rects: rects }
		},
	},
	watch: {
		/* Si cambia la foto de muestra, se vuelve a intentar */
		'muestra.imagen_url'() {
			this.imagen_rota = false
		},
	},
}
</script>
<style lang="sass">
// El papel de la etiqueta es blanco y la tinta negra en los dos modos (claro y oscuro) a proposito:
// es una vista previa de lo que sale de la impresora, no un pedazo de la interfaz. Por eso estos
// colores son fijos y no tokens.
.contenido-del-campo
	position: absolute
	top: 0
	right: 0
	bottom: 0
	left: 0
	display: flex
	align-items: center
	overflow: hidden
	color: #111
	font-family: Arial, Helvetica, sans-serif
	line-height: 1.15
	pointer-events: none
	user-select: none

.contenido-del-campo__renglon
	flex: 1 1 auto
	min-width: 0
	overflow: hidden
	white-space: nowrap
	text-overflow: ellipsis

.contenido-del-campo__renglones
	align-self: flex-start
	flex: 1 1 auto
	min-width: 0
	display: -webkit-box
	overflow: hidden
	white-space: normal
	overflow-wrap: break-word
	word-break: break-word

.contenido-del-campo__barras
	display: block
	width: 100%
	height: 100%
	fill: #111

.contenido-del-campo__foto
	display: block
	width: 100%
	height: 100%
	object-fit: contain

.contenido-del-campo__sin-foto
	display: flex
	align-items: center
	justify-content: center
	width: 100%
	height: 100%
	background: #eef0f3
	color: #9aa1ab
	font-size: 1.1em

// Un texto libre vacio o un precio de una lista borrada: en el PDF no sale nada; en el editor, un
// aviso tenue para que no quede un recuadro invisible
.contenido-del-campo--vacio
	color: #9aa1ab
	font-style: italic
</style>
