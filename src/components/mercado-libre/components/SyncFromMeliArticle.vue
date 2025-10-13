<template>
	<view-component
	v-if="view == 'sinc-articulo-entrantes'"
	change_from_dates_option
	model_name="sync_from_meli_article">
	</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
}
</script>