<template>
	<div>
		<div 
		v-if="hasExtencion('consolidar_ventas_en_factura')"
		class="j-end m-b-10">
			<b-button
			:variant="mostrar_consolidadas ? 'secondary' : 'outline-secondary'"
			size="sm"
			:aria-pressed="mostrar_consolidadas"
			@click="toggleVerConsolidadas">
				<i class="icon-layers"></i>
				{{ mostrar_consolidadas ? 'Ocultar consolidadas' : 'Ver consolidadas' }}
			</b-button>
		</div>
	</div>
</template>
<script>
export default {
	computed: {

		/** Controla si las ventas contenedoras están visibles en el listado. */
		mostrar_consolidadas() {
			return this.$store.state.sale.mostrar_consolidadas
		},
	},
	methods: {

		/**
		 * Muestra u oculta las filas de venta contenedora (facturación consolidada) en el listado.
		 */
		toggleVerConsolidadas() {
			this.$store.commit('sale/toggleMostrarConsolidadas')
		},
	}
}
</script>