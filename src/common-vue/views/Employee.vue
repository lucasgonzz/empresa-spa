<template>
<view-component
show_filter_modal
model_name="employee"></view-component>	
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index')
	}
}
</script>