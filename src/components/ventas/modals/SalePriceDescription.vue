<template>
	<!-- Modal que muestra el desglose del cálculo del precio final de la venta -->
	<price-description
	:price_descriptions="sale_price_description"></price-description>
</template>
<script>
export default {
	components: {
		// Componente común reutilizable que renderiza el modal de descripción de precios
		PriceDescription: () => import('@/components/common/PriceDescription'),
	},
	computed: {
		/**
		 * Array de strings con las líneas del cálculo del precio de la venta seleccionada.
		 * Se carga desde el store cuando el usuario hace click en el botón de descripción.
		 * @returns {Array}
		 */
		sale_price_description() {
			return this.$store.state.sale.sale_price_description
		},
	},
}
</script>
