<template>
	<view-component
	v-if="view == 'pedidos'"
	change_from_dates_option
	show_btn_pdf 
	:show_btn_delete="false"
	:show_btn_create="false"
	model_name="me_li_order">
	</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
}
</script>