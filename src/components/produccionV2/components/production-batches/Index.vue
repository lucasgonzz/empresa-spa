<template>
	<view-component 
	v-if="view == 'lotes-de-produccion'"
	@modelSaved="modelSaved"
	model_name="production_batch"
	order_list_by="production_batch_status"
	show_filter_modal>
		<!-- <template v-slot:modal_buttons="data">
			<modal-buttons></modal-buttons>
		</template> -->

		<template #has-many-prop-order_production_status_id>
			hola
		</template>
	</view-component> 
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		// ModalButtons: () => import('@/components/produccion/components/order-productions/ModalButtons'),
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