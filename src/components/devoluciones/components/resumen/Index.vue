<template>
	<!--
		Panel de resumen: el total como número grande, las opciones de la nota de crédito y
		Guardar / Cancelar. En escritorio queda fijo a la derecha (sticky, ver Index.vue del módulo);
		en tablet y teléfono va al final, a lo ancho.
	-->
	<section class="dev-tarjeta dev-resumen">

		<total></total>

		<template v-if="items.length">
			<div class="dev-separador"></div>

			<opciones></opciones>
		</template>

		<div class="dev-separador"></div>

		<btn-guardar></btn-guardar>

		<b-button
		v-if="hay_algo_cargado"
		class="dev-resumen__cancelar"
		variant="link"
		block
		data-testid="devolucion-btn-cancelar"
		@click="limpiar_devolucion">
			Cancelar
		</b-button>
	</section>
</template>
<script>
import limpiar from '@/mixins/devoluciones/limpiar'
export default {
	mixins: [limpiar],
	components: {
		Total: () => import('@/components/devoluciones/components/resumen/Total'),
		Opciones: () => import('@/components/devoluciones/components/resumen/opciones/Index'),
		BtnGuardar: () => import('@/components/devoluciones/components/resumen/BtnGuardar'),
	},
	computed: {
		/**
		 * @returns {Array} Renglones de la devolución.
		 */
		items() {
			return this.$store.state.devoluciones.items
		},
		/**
		 * Cancelar aparece apenas hay algo que descartar (antes solo con renglones: un cliente o
		 * una compra elegidos sin renglones no tenían forma de soltarse).
		 *
		 * @returns {Boolean}
		 */
		hay_algo_cargado() {
			let state = this.$store.state.devoluciones
			return !!(
				state.items.length
				|| state.sale
				|| state.client
				|| state.provider_order
				|| state.provider
			)
		},
	},
}
</script>
<style lang="sass">
.devoluciones-modulo
	.dev-separador
		height: 1px
		margin: 18px 0
		background-color: var(--color-border-secondary)

	.dev-resumen__cancelar.btn
		margin-top: 6px
		font-size: 0.9375rem
		color: var(--color-text-secondary)
		box-shadow: none
		&:hover,
		&:focus
			color: var(--color-text-primary)
			text-decoration: none
			box-shadow: none
</style>
