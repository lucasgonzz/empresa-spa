<template>
	<view-component
	v-if="view == 'sinc-pedido-entrantes'"
	change_from_dates_option
	model_name="sync_from_meli_order">
	</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	created() {
		// Entrando directo a la solapa (F5, un link) solo el click en la solapa pedía la lista: se
		// pide acá si esta es la solapa abierta y todavía no hay (ver Orders.vue).
		if (this.view == 'sinc-pedido-entrantes' && !this.$store.state.sync_from_meli_order.models.length) {
			this.$store.dispatch('sync_from_meli_order/getModels')
		}
	},
}
</script>