<template>
	<b-button
	v-if="se_puede_actualizar_venta(sale_details)"
	class="m-r-15"
	variant="outline-primary"
	v-b-modal="'update-prices'">
		Actualizar precios
	</b-button>
</template>
<script>
import se_puede_actualizar from '@/mixins/vender/previus_sale/se_puede_actualizar'
export default {
	mixins: [se_puede_actualizar],
	computed: {
		sale_details() {
			return this.$store.state.sale.model 
		},
	},
	data() {
		return {
			loading: false,
		}
	},
	methods: {
		actualizar() {
		}
	}
}
</script>