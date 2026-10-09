<template>
	<!--
		Miniatura de un Diseño de PDF (misión diseno-ticket-comandera, 9/10/2026; plan §7.1): el diseño
		como se va a imprimir, en chico, para la tarjeta del formulario del ABM (TarjetaDelPdf.vue). De
		arriba abajo, en el orden del PDF:

		- el encabezado del negocio, esquemático (el logo y unos renglones; solo en una hoja: en el
		ticket el logo y los datos del negocio son campos de las cajas, D6);
		- la zona de arriba de la tabla: las cajas en su grilla de 12, con un renglón gris por campo, y
		los bloques fijos de ARCA;
		- la tabla de artículos, con sus columnas en proporción (grilla de 24 medias columnas);
		- el pie, con sus cajas y el bloque de importes, QR y CAE de ARCA.

		Con `page_layout` NULL dibuja el `diseno_derivado` del catálogo (lo que imprime el de siempre).
		Es decorativa (aria-hidden): la tarjeta dice en texto lo mismo. Colores solo por token.

		🔌 Para el modo ticket: con `rollo` se dibuja una tira de comandera (angosta, sin alto fijo y
		sin encabezado aparte) en vez de una hoja; es la clase miniatura-pdf--rollo y el computed
		`estilo_del_papel`, el lugar donde ajustar cómo se ve el rollo.
	-->
	<div
	class="miniatura-pdf"
	:class="clases"
	:style="estilo_del_papel"
	aria-hidden="true">
		<div
		class="miniatura-pdf__util"
		:style="estilo_del_margen">

			<div
			v-if="!rollo"
			class="miniatura-pdf__encabezado">
				<span class="miniatura-pdf__logo"></span>
				<span class="miniatura-pdf__datos">
					<span class="miniatura-pdf__raya miniatura-pdf__raya--negrita miniatura-pdf__raya--grande"></span>
					<span class="miniatura-pdf__raya"></span>
					<span class="miniatura-pdf__raya miniatura-pdf__raya--corta"></span>
				</span>
				<span class="miniatura-pdf__comprobante">
					<span class="miniatura-pdf__raya miniatura-pdf__raya--negrita"></span>
					<span class="miniatura-pdf__raya"></span>
				</span>
			</div>

			<div
			v-if="armado.superior.length"
			class="miniatura-pdf__zona">
				<bloque-de-miniatura
				v-for="bloque in armado.superior"
				:key="bloque.clave"
				:bloque="bloque"></bloque-de-miniatura>
			</div>

			<!-- La tabla: encabezado gris con las columnas en proporción y tres renglones -->
			<div
			class="miniatura-pdf__tabla"
			:class="{ 'miniatura-pdf__tabla--vacia': !armado.columnas.length }">
				<template v-if="armado.columnas.length">
					<div class="miniatura-pdf__tabla-fila miniatura-pdf__tabla-fila--encabezado">
						<span
						v-for="columna in armado.columnas"
						:key="'encabezado-' + columna.id"
						class="miniatura-pdf__tabla-celda"
						:style="estilo_de_columna(columna)"></span>
					</div>
					<div
					v-for="renglon in RENGLONES_DE_LA_TABLA"
					:key="'renglon-' + renglon"
					class="miniatura-pdf__tabla-fila">
						<span
						v-for="columna in armado.columnas"
						:key="'renglon-' + renglon + '-' + columna.id"
						class="miniatura-pdf__tabla-celda"
						:style="estilo_de_columna(columna)">
							<span
							class="miniatura-pdf__raya miniatura-pdf__raya--tabla"
							:style="{ width: largo_en_la_tabla(columna, renglon) + '%' }"></span>
						</span>
					</div>
				</template>
			</div>

			<div
			v-if="armado.pie.length"
			class="miniatura-pdf__zona miniatura-pdf__zona--pie">
				<bloque-de-miniatura
				v-for="bloque in armado.pie"
				:key="bloque.clave"
				:bloque="bloque"></bloque-de-miniatura>
			</div>
		</div>
	</div>
</template>
<script>
import BloqueDeMiniatura from './BloqueDeMiniatura'
import { armar_miniatura, largo_de_raya } from './armado_de_la_miniatura'
import { ancho_util, HOJA_DE_SIEMPRE } from '../disenador-pdf/estado_del_disenador'
import { total_de_la_grilla } from '../disenador-pdf/tabla_del_disenador'

/* Renglones de muestra de la tabla (para el v-for) */
const RENGLONES_DE_LA_TABLA = [1, 2, 3]

/*
	Ancho del rollo respecto del ancho de la miniatura: una comandera a escala de una A4 sería una
	tira de 40px, ilegible; se la dibuja más ancha (es decorativa) pero claramente angosta.
*/
const ANCHO_DEL_ROLLO = '62%'

/**
 * Miniatura de un Diseño de PDF (misión diseno-ticket-comandera, 9/10/2026). Presentacional: recibe
 * el diseño, las columnas, el catálogo y la hoja, y los arma con armado_de_la_miniatura.js.
 */
export default {
	name: 'MiniaturaPdf',
	components: {
		BloqueDeMiniatura,
	},
	props: {
		/* El page_layout del perfil (objeto, string JSON o null: se dibuja el derivado del catálogo) */
		page_layout: {
			default: null,
		},
		/* Las pdf_column_options del perfil, con su pivot */
		pdf_column_options: {
			type: Array,
			default: function () {
				return []
			},
		},
		/* Respuesta de page-layout-catalog, o null si no llegó (se dibuja lo que se pueda) */
		catalogo: {
			type: Object,
			default: null,
		},
		/* La hoja: {ancho, alto, margen} en mm */
		hoja: {
			type: Object,
			default: function () {
				return {
					ancho: HOJA_DE_SIEMPRE.ancho,
					alto: HOJA_DE_SIEMPRE.alto,
					margen: HOJA_DE_SIEMPRE.margen,
				}
			},
		},
		/* true para dibujar un rollo de comandera en vez de una hoja */
		rollo: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			RENGLONES_DE_LA_TABLA: RENGLONES_DE_LA_TABLA,
		}
	},
	computed: {
		/**
		 * Todo lo que se dibuja (ver armar_miniatura).
		 *
		 * @returns {{superior: Array, pie: Array, columnas: Array, con_diseno: boolean}}
		 */
		armado() {
			let util = this.rollo ? Number(this.hoja.ancho) : ancho_util(this.hoja)
			return armar_miniatura({
				page_layout: this.page_layout,
				pdf_column_options: this.pdf_column_options,
				catalogo: this.catalogo,
				util_mm: util,
				total: this.total,
				rollo: this.rollo,
			})
		},
		/**
		 * Medias columnas de la grilla de la tabla.
		 *
		 * @returns {number}
		 */
		total() {
			return total_de_la_grilla(this.catalogo)
		},
		/**
		 * El papel: una hoja con su proporción (ancho / alto) o un rollo angosto sin alto fijo.
		 *
		 * @returns {Object}
		 */
		estilo_del_papel() {
			if (this.rollo) {
				return {
					width: ANCHO_DEL_ROLLO,
				}
			}
			let ancho = Number(this.hoja.ancho) || HOJA_DE_SIEMPRE.ancho
			let alto = Number(this.hoja.alto) || HOJA_DE_SIEMPRE.alto
			return {
				aspectRatio: ancho + ' / ' + alto,
			}
		},
		/**
		 * El margen como relleno proporcional (el % del padding se toma del ancho), como la hoja del
		 * diseñador. En el rollo, un relleno fijo chico.
		 *
		 * @returns {Object}
		 */
		estilo_del_margen() {
			if (this.rollo) {
				return {}
			}
			let ancho = Number(this.hoja.ancho) || HOJA_DE_SIEMPRE.ancho
			let margen = Number(this.hoja.margen)
			let porcentaje = ancho > 0 && margen >= 0 ? (margen / ancho) * 100 : 0
			/* Un mínimo de 3%: con margen 0 los renglones quedarían pegados al borde de la tarjeta */
			return {
				padding: Math.max(3, porcentaje).toFixed(2) + '%',
			}
		},
		/**
		 * Clases del papel.
		 *
		 * @returns {Object}
		 */
		clases() {
			return {
				'miniatura-pdf--rollo': this.rollo,
				'miniatura-pdf--hoja': !this.rollo,
			}
		},
	},
	methods: {
		/**
		 * Ancho de una columna de la tabla: sus medias columnas sobre la grilla.
		 *
		 * @param {Object} columna
		 * @returns {Object}
		 */
		estilo_de_columna(columna) {
			let porcentaje = (columna.cols / this.total) * 100
			return {
				flex: '0 0 ' + porcentaje.toFixed(3) + '%',
				maxWidth: porcentaje.toFixed(3) + '%',
			}
		},
		/**
		 * Largo de la raya de una celda de la tabla (estable por columna y renglón).
		 *
		 * @param {Object} columna
		 * @param {number} renglon
		 * @returns {number}
		 */
		largo_en_la_tabla(columna, renglon) {
			return largo_de_raya(String(columna.value_resolver || columna.id), renglon)
		},
	},
}
</script>
<style lang="sass">
// Colores solo por token (funciona igual en modo oscuro): el papel es --bg-card sobre el fondo de la
// tarjeta, las rayas son --color-text-secondary con poca opacidad y lo "lleno" es --bg-section. Sin
// `scoped` para que los bloques (BloqueDeMiniatura.vue) tomen estas mismas clases.
.miniatura-pdf
	position: relative
	width: 100%
	min-width: 0
	margin: 0 auto
	overflow: hidden
	border: 1px solid var(--color-border)
	border-radius: 3px
	background: var(--bg-card)
	box-shadow: 0 1px 3px var(--shadow-color)

.miniatura-pdf__util
	display: flex
	flex-direction: column
	gap: 4px
	min-width: 0

// Las rayas: el "texto" de la miniatura
.miniatura-pdf__raya
	display: block
	height: 2px
	border-radius: 2px
	background: var(--color-text-secondary)
	opacity: .32

.miniatura-pdf__raya--negrita
	opacity: .62

.miniatura-pdf__raya--grande
	height: 3px

.miniatura-pdf__raya--corta
	width: 55%

.miniatura-pdf__raya--fija
	opacity: .45

// ── Encabezado esquemático ─────────────────────────────────────────────────────────────────────
.miniatura-pdf__encabezado
	display: flex
	align-items: flex-start
	gap: 5px
	padding-bottom: 4px
	border-bottom: 1px solid var(--color-border-secondary)

.miniatura-pdf__logo
	flex: 0 0 16%
	aspect-ratio: 1 / 1
	border-radius: 2px
	background: var(--color-primary)
	opacity: .3

.miniatura-pdf__datos,
.miniatura-pdf__comprobante
	display: flex
	flex-direction: column
	gap: 3px
	min-width: 0
	padding-top: 2px

.miniatura-pdf__datos
	flex: 1 1 auto

	.miniatura-pdf__raya
		width: 80%

.miniatura-pdf__comprobante
	flex: 0 0 30%
	align-items: flex-end

	.miniatura-pdf__raya
		width: 90%

// ── Zonas: la grilla de 12 de las cajas, en chico ─────────────────────────────────────────────
.miniatura-pdf__zona
	display: flex
	flex-wrap: wrap
	align-items: stretch
	margin: 0 -1px

	> .miniatura-pdf__celda
		display: flex
		flex: 0 0 100%
		max-width: 100%
		min-width: 0
		padding: 0 1px
		margin-bottom: 2px

		@for $columnas from 1 through 12
			&[data-cols="#{$columnas}"]
				flex-basis: calc(100% * #{$columnas} / 12)
				max-width: calc(100% * #{$columnas} / 12)

// El salto de fila: no se ve, pero ocupa la fila entera con alto cero (lo que sigue va abajo)
.miniatura-pdf__zona > .miniatura-pdf__celda--salto
	height: 0
	margin-bottom: 0

.miniatura-pdf__caja,
.miniatura-pdf__fijo
	display: flex
	flex-direction: column
	gap: 2px
	flex: 1 1 auto
	min-width: 0
	padding: 2px 3px
	border-radius: 2px

// Los tres estilos de caja, como en el PDF
.miniatura-pdf__caja--borde
	border: 1px solid var(--color-border)

.miniatura-pdf__caja--gris
	border: 1px solid var(--color-border-secondary)
	background: var(--bg-section)

.miniatura-pdf__caja--ninguno
	border: 1px solid transparent

.miniatura-pdf__titulo
	display: block
	width: 45%
	height: 2px
	margin-bottom: 1px
	border-radius: 2px
	background: var(--color-text-secondary)
	opacity: .6

.miniatura-pdf__renglon
	display: flex
	min-width: 0

.miniatura-pdf__renglon--center
	justify-content: center

.miniatura-pdf__renglon--right
	justify-content: flex-end

// Un campo imagen (el logo de un ticket): un cuadradito al centro
.miniatura-pdf__imagen
	display: block
	width: 30%
	aspect-ratio: 1 / 1
	border-radius: 2px
	background: var(--color-primary)
	opacity: .3

.miniatura-pdf__vacia
	display: block
	height: 4px
	border: 1px dashed var(--color-border)
	border-radius: 2px

// Bloques fijos de ARCA: recuadro un poco más marcado
.miniatura-pdf__fijo
	border: 1px solid var(--color-border-tertiary, var(--color-border))
	background: var(--bg-card)

.miniatura-pdf__fijo-renglones
	display: flex
	flex-direction: column
	gap: 2px
	flex: 1 1 auto
	min-width: 0

// El del pie: el QR a la izquierda, los renglones del CAE y, si va, el cuadro de importes a la derecha
.miniatura-pdf__fijo--pie
	flex-direction: row
	align-items: center
	gap: 4px

.miniatura-pdf__qr
	flex: 0 0 14%
	aspect-ratio: 1 / 1
	border-radius: 1px
	background: repeating-linear-gradient(45deg, var(--color-text-secondary) 0 2px, transparent 2px 4px)
	opacity: .45

.miniatura-pdf__importes
	display: flex
	flex-direction: column
	align-items: flex-end
	gap: 2px
	flex: 0 0 34%
	padding: 2px
	border-radius: 2px
	background: var(--bg-section)

	.miniatura-pdf__raya
		width: 80%

// ── La tabla ───────────────────────────────────────────────────────────────────────────────────
.miniatura-pdf__tabla
	border: 1px solid var(--color-border)
	border-radius: 2px

.miniatura-pdf__tabla--vacia
	height: 14px
	border-style: dashed

.miniatura-pdf__tabla-fila
	display: flex
	min-width: 0
	border-top: 1px solid var(--color-border-secondary)

	&:first-child
		border-top: 0

.miniatura-pdf__tabla-fila--encabezado
	height: 6px
	background: var(--bg-section)

.miniatura-pdf__tabla-celda
	display: flex
	align-items: center
	min-width: 0
	padding: 2px
	border-left: 1px solid var(--color-border-secondary)

	&:first-child
		border-left: 0

.miniatura-pdf__raya--tabla
	height: 2px

// ── El rollo de comandera (modo ticket) ────────────────────────────────────────────────────────
// Una tira angosta sin alto fijo: el ticket es tan largo como su contenido. El borde de abajo
// punteado es el corte del papel.
.miniatura-pdf--rollo
	border-radius: 2px 2px 0 0
	border-bottom: 2px dashed var(--color-border)

	.miniatura-pdf__util
		padding: 6px 5px 8px
</style>
