<template> 
<view-component
@modelSaved="modelSaved"
show_filter_modal
change_from_dates_option
order_list_by="budget_status"
:show_btn_save="show_btn_save"
:show_btn_create="false"
:show_previus_days="show_previus_days"
:check_permissions_previus_days="false"
model_name="budget">

	<template v-slot:actualizar_en_vender="props">
		<btn-actualizar-en-vender></btn-actualizar-en-vender>
	</template>

	<template v-slot:modal_buttons="props">
		<modal-buttons></modal-buttons>
	</template>
</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		BtnActualizarEnVender: () => import('@/components/budget/components/BtnActualizarEnVender'),
		ModalButtons: () => import('@/components/budget/components/ModalButtons'),
	},
	computed: {
		show_previus_days() {
			return this.$store.state.budget.from_dates
		},
		budget_model() {
			return this.$store.state.budget.model 
		},
		show_btn_save() {
			return this.budget_model && this.budget_model.budget_status_id == 1
		}
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