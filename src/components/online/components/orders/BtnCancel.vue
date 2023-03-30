<template>
	<b-button
	v-if="model.order_status.name != 'Cancelado' && model.order_status.name != 'Entregado'"
	v-b-modal="'cancel-order'"
	block 
	variant="danger">
		Cancelar pedido
	</b-button>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		model() {
			return this.$store.state.order.model
		},
	},
}
</script>
