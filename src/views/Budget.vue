<template> 
<view-component
@modelSaved="modelSaved"
show_filter_modal
change_from_dates_option
order_list_by="budget_status"
:show_previus_days="show_previus_days"
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
	computed: {
		show_previus_days() {
			return this.$store.state.budget.from_dates
		},
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