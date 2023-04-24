<template>
	<view-component
	v-if="view == 'cupones'"
	show_filter_modal
	model_name="cupon"></view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
}
</script>