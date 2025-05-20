<template>
	<div>

		<modal-select-sales></modal-select-sales>

		<view-component 
		v-if="view == 'hojas-de-ruta'"
		model_name="road_map"
		show_btn_pdf
		:show_previus_days="show_previus_days"
		show_filter_modal>
			<template #sales>
				<sales></sales>	
			</template>

			<template #road_map_client_positions>
				<client-positions></client-positions>
			</template>
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		ModalSelectSales: () => import('@/components/por-entregar/components/road-maps/sales/ModalSelectSales'),
		Sales: () => import('@/components/por-entregar/components/road-maps/sales/Index'),
		ClientPositions: () => import('@/components/por-entregar/components/road-maps/client-positions/Index'),
	},
	computed: { 
		show_previus_days() {
			return this.$store.state.road_map.from_dates
		},
	},
}
</script>