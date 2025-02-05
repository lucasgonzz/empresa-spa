<template>
	<b-modal
	title="Combos"
	hide-footer
	size="lg"
	id="combos">
		<div>
			<view-component 
			model_name="combo">
			</view-component>
		</div>
	</b-modal>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
}
</script>