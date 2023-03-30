<template>
	<div>
		<!-- <edit-article></edit-article> -->
		<import></import>

		<view-component 
		v-if="view == 'pedidos'"
		model_name="provider_order"
		show_filter_modal
		show_previus_days>
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		Import: () => import('@/components/provider/modals/orders/Import'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
}
</script>