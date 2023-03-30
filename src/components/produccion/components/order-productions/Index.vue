<template>
	<view-component 
	v-if="view == 'ordenes'"
	@modelSaved="modelSaved"
	model_name="order_production"
	order_list_by="order_production_status"
	show_filter_modal>
		<template v-slot:modal_buttons="data">
			<modal-buttons></modal-buttons>
		</template>
	</view-component> 
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		ModalButtons: () => import('@/components/produccion/components/order-productions/ModalButtons'),
	},
	methods: {
		modelSaved(model) {
			if (model.client_id && model.finished) {
				this.loadModel('client', model.client_id)
			}
		},
	},
}
</script>