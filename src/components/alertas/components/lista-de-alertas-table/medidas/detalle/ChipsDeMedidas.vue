<template>
<ul
class="med-chips"
:data-testid="'medidas-chips-' + item_id"
:data-faltan="cantidad_que_faltan">

	<!--
		Un chip por medida, siempre los cuatro y siempre en el mismo orden (Peso, Alto, Ancho, Largo):
		quien revisa compara de un vistazo columna contra columna entre artículos. Los que faltan van
		en el color de aviso y dicen «falta», sin valor.
	-->
	<li
	v-for="campo in campos"
	:key="campo.clave"
	class="med-chip"
	:class="{ 'med-chip--falta': campo.falta }"
	:data-testid="'medidas-chip-' + item_id + '-' + campo.clave"
	:data-clave="campo.clave"
	:data-falta="campo.falta ? 1 : 0"
	:data-convertido="campo.convertido ? 1 : 0"
	:title="campo.cita ? 'Dice: «' + campo.cita + '»' : null">

		<span class="med-chip__etiqueta">{{ campo.etiqueta }}</span>

		<span
		v-if="campo.falta"
		class="med-chip__valor med-chip__valor--falta">
			falta
		</span>
		<span
		v-else
		class="med-chip__valor">
			{{ valor_en_texto(campo) }}
		</span>

		<!--
			La nota de conversión («70 mm → 7 cm»): la medida se guardó en cm/kg, que son las unidades
			del sistema, y acá se ve qué decía la página. Solo si la API tuvo que convertirla.
		-->
		<span
		v-if="nota_de(campo)"
		class="med-chip__nota"
		:data-testid="'medidas-conversion-' + item_id + '-' + campo.clave">
			{{ nota_de(campo) }}
		</span>

	</li>

</ul>
</template>
<script>
import { formatear_medida, nota_de_conversion } from '@/utils/medidas_de_catalogo'

/**
 * Los cuatro chips de medidas de un artículo (Peso, Alto, Ancho, Largo): el valor con su unidad, la
 * marca «falta» cuando no se encontró y la nota de conversión cuando la página decía otra unidad.
 *
 * Solo dibuja: los campos llegan ya normalizados (`normalizar_item(...).campos`, en utils/
 * medidas_de_catalogo.js), que es quien decide qué falta y qué se convirtió.
 */
export default {
	props: {
		/** Los cuatro campos del artículo, normalizados. */
		campos: {
			type: Array,
			required: true,
		},
		/** Id del item (para los data-testid). */
		item_id: {
			type: Number,
			default: null,
		},
	},
	computed: {
		/**
		 * Cuántos de los cuatro faltan (para el data-faltan del contenedor).
		 *
		 * @returns {Number}
		 */
		cantidad_que_faltan() {
			let cantidad = 0
			this.campos.forEach(function (campo) {
				if (campo.falta) {
					cantidad++
				}
			})
			return cantidad
		},
	},
	methods: {
		/**
		 * "0,82 kg" / "7 cm".
		 *
		 * @param {Object} campo
		 * @returns {String}
		 */
		valor_en_texto(campo) {
			return formatear_medida(campo.valor, campo.unidad)
		},
		/**
		 * "70 mm → 7 cm", o '' si el campo no se convirtió.
		 *
		 * @param {Object} campo
		 * @returns {String}
		 */
		nota_de(campo) {
			return nota_de_conversion(campo)
		},
	},
}
</script>
<style lang="sass">
// Sin scope: vive adentro del b-modal del detalle (cuelga de <body>). Prefijo med-chip; colores por
// token con el valor de :root como fallback (mismos tokens que las etiquetas de Imágenes).
.med-chips
	display: flex
	flex-wrap: wrap
	gap: 6px 8px
	margin: 2px 0 0
	padding: 0
	list-style: none

.med-chip
	display: inline-flex
	flex-direction: column
	align-items: flex-start
	gap: 1px
	min-width: 84px
	padding: 6px 10px
	border-radius: 10px
	background: var(--bg-section, #f8f9fa)
	box-shadow: inset 0 0 0 1px var(--color-border-secondary, #e9ecef)

.med-chip__etiqueta
	font-size: 0.7rem
	font-weight: 500
	letter-spacing: .02em
	text-transform: uppercase
	color: var(--color-text-secondary, #6c757d)

.med-chip__valor
	font-size: 0.9375rem
	font-weight: 600
	line-height: 1.25
	color: var(--color-text-primary, #212529)
	font-variant-numeric: tabular-nums
	white-space: nowrap

.med-chip__valor--falta
	font-size: 0.8125rem
	font-style: italic
	font-weight: 600

.med-chip__nota
	font-size: 0.72rem
	line-height: 1.3
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums
	white-space: nowrap

// Lo que falta, en el ámbar de «hay que mirarlo». Los tokens existen solo en html.dark-mode; en
// claro manda el literal del fallback.
.med-chip--falta
	background: var(--bg-warning-soft, rgba(255, 193, 7, .16))
	box-shadow: none

	.med-chip__etiqueta,
	.med-chip__valor
		color: var(--color-text-warning-strong, #856404)

// Teléfono: cuatro chips en dos columnas, parejos, en vez de una hilera que se parte a lo ancho.
@media (max-width: 575px)
	.med-chips
		display: grid
		grid-template-columns: repeat(2, minmax(0, 1fr))

	.med-chip
		min-width: 0

	.med-chip__valor,
	.med-chip__nota
		white-space: normal
</style>
