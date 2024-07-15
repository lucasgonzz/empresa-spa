<template> 
<view-component
show_filter_modal
show_previus_days
model_name="expense">
</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
}
</script>