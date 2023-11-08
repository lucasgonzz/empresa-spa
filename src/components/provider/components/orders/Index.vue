<template>
	<div>
		<!-- <edit-article></edit-article> -->
		<import></import>

		<view-component 
		v-if="view == 'pedidos'"
		model_name="provider_order"
		order_list_by="provider_order_status"
		change_from_dates_option
		:show_previus_days="show_previus_days"
		save_check_function="checkProviderOrderArticlesAddresses"
		show_filter_modal>
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		Import: () => import('@/components/provider/modals/orders/Import'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	computed: {
		show_previus_days() {
			return this.$store.state.provider_order.from_dates
		},
	},
}
</script>