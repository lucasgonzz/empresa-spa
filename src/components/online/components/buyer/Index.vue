<template>
	<view-component
	v-if="view == 'clientes'"
	model_name="buyer"></view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
}
</script>