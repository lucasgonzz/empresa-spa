<template>
	<!--
		Renglones de la vista previa de un ticket de comandera (misión diseno-ticket-comandera,
		9/10/2026; plan §7.3): lo que dibuja la comandera, en la letra monoespaciada del rollo. Cada
		renglón es una lista de trozos (vista_de_ticket.js) y cada trozo se dibuja con su estilo:

		- negrita: en negrita;
		- alto doble: la misma letra estirada al doble de alto (mismo ancho, como `GS ! 0x01`);
		- grande: el doble de alto Y de ancho (como `GS ! 0x11`): cada letra ocupa dos columnas.

		Los espacios de relleno (la alineación, la separación entre cajas) son trozos de tamaño
		normal: así el renglón mide exactamente lo que en el papel. Es solo ilustración: quien lo usa
		pone el aria-hidden o el aria-label que corresponda.
	-->
	<span
	class="dpdf-ticket"
	:style="estilo">
		<span
		v-for="(renglon, indice) in renglones"
		:key="indice"
		class="dpdf-ticket__renglon"
		:class="clases_del_renglon(renglon)"><span
		v-for="(pedazo, posicion) in renglon"
		:key="posicion"
		class="dpdf-ticket__trozo"
		:class="clases_del_trozo(pedazo)">{{ pedazo.texto }}</span></span>
	</span>
</template>
<script>
import { ALTO, GRANDE } from './vista_de_ticket'

/**
 * Renglones de la vista previa del ticket (misión diseno-ticket-comandera, 9/10/2026).
 * Presentacional: la letra (tamaño y alto de renglón) la toma del diseñador por `inject`, la misma
 * que eligió la hoja para el rollo; afuera del diseñador, la de la página.
 */
export default {
	name: 'RenglonesDeTicket',
	inject: {
		disenador: {
			default: null,
		},
	},
	props: {
		/* Los renglones: listas de trozos {texto, negrita, tamano} (vista_de_ticket.js) */
		renglones: {
			type: Array,
			default: function () {
				return []
			},
		},
	},
	computed: {
		/**
		 * La letra del rollo (tamaño, alto de renglón y la variable con el alto, que usan el alto doble
		 * y el grande).
		 *
		 * @returns {Object|null}
		 */
		estilo() {
			return this.disenador ? this.disenador.estilo_de_letra_del_rollo : null
		},
	},
	methods: {
		/**
		 * Un renglón con algún trozo alto doble o grande ocupa dos renglones de alto.
		 *
		 * @param {Array} renglon
		 * @returns {Object}
		 */
		clases_del_renglon(renglon) {
			let doble = (renglon || []).some(function (pedazo) {
				return pedazo.tamano === ALTO || pedazo.tamano === GRANDE
			})
			return {
				'dpdf-ticket__renglon--doble': doble,
			}
		},
		/**
		 * Las clases de un trozo: su tamaño y la negrita.
		 *
		 * @param {Object} pedazo
		 * @returns {Object}
		 */
		clases_del_trozo(pedazo) {
			return {
				'dpdf-ticket__trozo--negrita': pedazo.negrita === true,
				'dpdf-ticket__trozo--alto': pedazo.tamano === ALTO,
				'dpdf-ticket__trozo--grande': pedazo.tamano === GRANDE,
			}
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped`: los renglones viajan adentro del clon que Sortable cuelga de <body> mientras se
// arrastra una caja o un campo. La letra es la de la comandera; el tamaño y el alto del renglón
// llegan en el style (con un respaldo, por si se dibujan fuera del rollo). Colores solo por token.
@import '@/common-vue/components/pdf/disenador-pdf/_ticket'

.dpdf-ticket
	display: block
	min-width: 0
	color: var(--color-text-primary)
	font-family: $dpdf-letra-de-comandera
	font-weight: 400
	font-style: normal
	text-align: left

.dpdf-ticket__renglon
	display: block
	height: var(--dpdf-renglon, 1.3em)
	white-space: pre
	overflow: visible

// Alto doble o grande: el renglón ocupa dos de alto
.dpdf-ticket__renglon--doble
	height: calc(var(--dpdf-renglon, 1.3em) * 2)

.dpdf-ticket__trozo
	vertical-align: top

.dpdf-ticket__trozo--negrita
	font-weight: 700

// Alto doble: la letra estirada hacia abajo (el mismo ancho)
.dpdf-ticket__trozo--alto
	display: inline-block
	transform: scaleY(2)
	transform-origin: 0 0

// Grande: el doble de alto y de ancho (cada letra ocupa dos columnas)
.dpdf-ticket__trozo--grande
	font-size: 2em
	line-height: calc(var(--dpdf-renglon, 1.3em) * 2)
</style>
