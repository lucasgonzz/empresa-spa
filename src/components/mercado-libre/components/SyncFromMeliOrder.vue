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
}
</script>