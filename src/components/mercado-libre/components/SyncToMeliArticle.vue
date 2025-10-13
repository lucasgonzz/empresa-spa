<template>
	<view-component
	v-if="view == 'sinc-articulo-salientes'"
	change_from_dates_option
	:show_btn_delete="false"
	:show_btn_create="false"
	model_name="sync_to_meli_article">
	</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
}
</script>