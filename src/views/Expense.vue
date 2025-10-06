<template> 
<view-component
@modelSaved="modelSaved"
:show_btn_delete="false"
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
	methods: {
		modelSaved(expense) {
			if (expense.caja_id) {
				this.loadModel('caja', expense.caja_id)
			}
		}
	},
	// computed: {
	// 	model() {
	// 		return this.$store.state.expense.model 
	// 	},
	// },
	// watch: {
	// 	model() {
	// 		alert('cambio')
	// 	}
	// }
}
</script>