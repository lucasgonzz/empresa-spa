<template> 
<div>
	<current-acounts></current-acounts>
	
	<view-component
	@modelSaved="modelSaved"
	show_filter_modal
	change_from_dates_option
	order_list_by="budget_status"
	:show_btn_save="show_btn_save"
	:show_btn_create="false"
	:show_previus_days="show_previus_days"
	:show_modal="false"
	:check_permissions_previus_days="false"
	model_name="budget">

		<template #table-prop-client_id="props">
			<client-btn
			from_budget
			:sale="props.model"></client-btn>
		</template>

	</view-component>
</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		ClientBtn: () => import('@/components/ventas/components/ClientBtn'),
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
	created() {
		this.$store.dispatch('budget/getModels')
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