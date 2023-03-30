<template> 
<view-component
@modelSaved="modelSaved"
show_filter_modal
show_previus_days
model_name="budget">
	<template v-slot:modal_buttons="props">
		<modal-buttons></modal-buttons>
	</template>
</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		ModalButtons: () => import('@/components/budget/components/ModalButtons'),
	},
	methods: {
		modelSaved(model) {
			if (model.client_id && model.budget_status_id && model.budget_status.name == 'Confirmado') {
				this.loadModel('client', model.client_id)
			}
		},
	},
}
</script>