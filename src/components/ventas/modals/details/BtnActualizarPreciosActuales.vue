<template>
	<b-button
	class="m-r-15"
	variant="outline-primary"
	v-b-modal="'update-prices'">
		Actualizar precios
	</b-button>
</template>
<script>
export default {
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