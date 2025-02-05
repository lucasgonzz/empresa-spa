<template>
	<div
	v-if="view == 'articulos'">
		
		<view-component 
		model_name="article"
		papelera
		show_filter_modal
		:show_previus_days="false">
			
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
}
</script>