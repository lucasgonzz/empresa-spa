<template>
	<div
	class="p-t-15">

		<h4
		class="text-left m-t-20 m-b-20">
			Hojas de Ruta
		</h4>

		<menu-fechas
		model_name="road_map"></menu-fechas>

		<select-repartidor></select-repartidor>

		<list-road-maps></list-road-maps>
	</div>
</template>
<script>
export default {
	components: {
		MenuFechas: () => import('@/common-vue/components/menu-fechas/Index'),
		SelectRepartidor: () => import('@/components/rutas/components/SelectRepartidor'),
		ListRoadMaps: () => import('@/components/rutas/components/list-road-maps/Index'),
		// ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	computed: {
		show_previus_days() {
			return this.$store.state.road_map.from_dates
		},
	},
}
</script>