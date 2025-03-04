<template>
	<div
	v-if="view == 'ventas'">
		
		<view-component 
		model_name="sale"
		papelera
		:show_btn_restaurar="false"
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