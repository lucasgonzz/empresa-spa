<template>
	<view-component
	v-if="view == 'clientes'"
	show_filter_modal
	model_name="buyer"></view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
}
</script>