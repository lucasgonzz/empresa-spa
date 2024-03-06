<template>
	<div
	v-if="view == 'movimientos'">
		<current-amounts></current-amounts>

		<view-component 
		model_name="production_movement"
		show_filter_modal
		order_list_by="order_production_status"
		change_from_dates_option
		:show_previus_days="$store.state.production_movement.from_dates"
		show_previus_days>
			<template #horizontal_nav_center>
				<b-button
				class="m-l-15 m-t-15"
				v-b-modal="'current-amounts'"
				variant="primary">
					<i class="icon-eye"></i>
					Cantidades actuales
				</b-button>
			</template>

			<template #order_production_status_id="props">
				<select-order-production-status></select-order-production-status>
			</template>
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		CurrentAmounts: () => import('@/components/produccion/modals/production-movements/CurrentAmounts'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		SelectOrderProductionStatus: () => import('@/components/produccion/components/production-movements/SelectOrderProductionStatus'),
	},
}
</script>