<template>
	<view-component 
	v-if="view == 'recetas'"
	model_name="recipe"
	show_filter_modal>
	</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
}
</script>