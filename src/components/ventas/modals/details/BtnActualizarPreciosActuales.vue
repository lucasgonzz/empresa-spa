<template>
	<b-button
	size="sm"
	variant="outline-primary"
	v-b-modal="'update-prices'">
		<i class="bi bi-arrow-repeat"></i>
		Actualizar precios
	</b-button>
</template>
<script>
import se_puede_actualizar from '@/mixins/vender/previus_sale/se_puede_actualizar'
export default {
	mixins: [se_puede_actualizar],
	computed: {
		/**
		 * Venta cargada en el store del modal de detalle.
		 *
		 * @returns {Object}
		 */
		sale_details() {
			return this.$store.state.sale.model 
		},
	},
}
</script>
