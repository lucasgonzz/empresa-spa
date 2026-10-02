<template>
	<!--
		Descuentos y recargos de la VENTA que se aplican a la devolución (solo modo venta, con una
		venta cargada). Vienen prendidos los que tenía la venta; cada uno es un toggle.
	-->
	<tarjeta
	v-if="mostrar"
	titulo="Descuentos y recargos"
	subtitulo="Los que tenía la venta vienen prendidos. Se aplican sobre el total de lo devuelto.">

		<div class="dev-ajustes">
			<lista-ajustes
			v-if="discounts.length"
			tipo_ajuste="discount"></lista-ajustes>

			<lista-ajustes
			v-if="surchages.length"
			tipo_ajuste="surchage"></lista-ajustes>
		</div>
	</tarjeta>
</template>
<script>
export default {
	components: {
		Tarjeta: () => import('@/components/devoluciones/components/Tarjeta'),
		ListaAjustes: () => import('@/components/devoluciones/components/discounts-surchages/ListaAjustes'),
	},
	computed: {
		/**
		 * @returns {Object|null} Venta cargada.
		 */
		sale() {
			return this.$store.state.devoluciones.sale
		},
		/**
		 * @returns {Array} Descuentos del store (incluye los de la venta, ver set_from_sale.js).
		 */
		discounts() {
			return this.$store.state.discount.models
		},
		/**
		 * @returns {Array} Recargos del store (incluye los de la venta, ver set_from_sale.js).
		 */
		surchages() {
			return this.$store.state.surchage.models
		},
		/**
		 * Solo en venta, con venta cargada y algo para mostrar.
		 *
		 * @returns {Boolean}
		 */
		mostrar() {
			return this.$store.state.devoluciones.tipo == 'venta'
				&& !!this.sale
				&& (this.discounts.length > 0 || this.surchages.length > 0)
		},
	},
}
</script>
<style lang="sass">
.devoluciones-modulo
	// Descuentos a la izquierda y recargos a la derecha; en teléfono, uno debajo del otro.
	.dev-ajustes
		display: grid
		grid-template-columns: minmax(0, 1fr)
		gap: 20px

		@media screen and (min-width: 768px)
			grid-template-columns: repeat(2, minmax(0, 1fr))
</style>
