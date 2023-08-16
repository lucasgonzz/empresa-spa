<template>
	<div
	v-if="view == 'movimientos'">
		<current-amounts></current-amounts>

		<view-component 
		model_name="production_movement"
		show_filter_modal
		show_previus_days>
			<template #horizontal_nav_center>
				<b-button
				class="m-l-15"
				v-b-modal="'current-amounts'"
				variant="primary">
					<i class="icon-eye"></i>
					Cantidades actuales
				</b-button>
			</template>
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		CurrentAmounts: () => import('@/components/produccion/modals/production-movements/CurrentAmounts'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
}
</script>