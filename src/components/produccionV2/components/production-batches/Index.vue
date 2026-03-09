<template>
	<view-component 
	v-if="view == 'lotes-de-produccion'"
	model_name="production_batch"

	@has_many_deleted="update_info"
	@has_many_saved="update_info"

	order_list_by="production_batch_status"
	show_filter_modal>
		

		<template #recipe_route_id>
			<recipe-route-select></recipe-route-select>
		</template>

		<template #amounts_by_status>
			<table-amounts-by-status></table-amounts-by-status>
		</template>

		<template #amounts_by_provider>
			<table-amounts-by-provider></table-amounts-by-provider>
		</template>


		


		<!-- Propiedades de Prodution Batch Movement -->

		<template #has-many-prop-from_order_production_status_id>
			<from-status></from-status>
		</template>

		<template #has-many-prop-to_order_production_status_id>
			<to-status></to-status>
		</template>


		<template #has-many-prop-provider_id>
			<select-provider></select-provider>
		</template>

		<template #has-many-prop-address_id>
			<addresses></addresses>
		</template>

		<template #has-many-prop-article_inputs>
			<table-amount-inputs></table-amount-inputs>
		</template>
	</view-component> 
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		RecipeRouteSelect: () => import('@/components/produccionV2/components/production-batches/RecipeRouteSelect'),
		FromStatus: () => import('@/components/produccionV2/components/production-batches/order-production-status-buttons/FromStatus'),
		ToStatus: () => import('@/components/produccionV2/components/production-batches/order-production-status-buttons/ToStatus'),
		Addresses: () => import('@/components/produccionV2/components/production-batches/Address'),
		TableAmountsByStatus: () => import('@/components/produccionV2/components/production-batches/tables/TableAmountsByStatus'),
		TableAmountsByProvider: () => import('@/components/produccionV2/components/production-batches/tables/TableAmountsByProvider'),
		TableAmountInputs: () => import('@/components/produccionV2/components/production-batches/tables/TableAmountInputs'),
		SelectProvider: () => import('@/components/produccionV2/components/production-batches/SelectProvider'),
	},
	created() {
		this.$store.dispatch('production_batch/getModels')
	},
	methods: {
		update_info(model) {
			// alert('update_info')

			this.$bvModal.hide('production_batch')
			this.$store.dispatch('production_batch/getModels')
			// setTimeout(() => {

			// 	setTimeout(() => {
			// 		this.setModel(model, 'production_batch')
			// 	}, 500)
			// }, 500)
		},
	}
}
</script>