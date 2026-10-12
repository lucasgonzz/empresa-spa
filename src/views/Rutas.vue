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
import moment from 'moment'
export default {
	components: {
		MenuFechas: () => import('@/common-vue/components/menu-fechas/Index'),
		SelectRepartidor: () => import('@/components/rutas/components/SelectRepartidor'),
		ListRoadMaps: () => import('@/components/rutas/components/list-road-maps/Index'),
		// ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	created() {
		// Al entrar arranca con HOY ya cargado (lo mismo que hace el botón "Hoy"): antes el listado
		// quedaba vacío ("No hay hojas de ruta") hasta tocar un día. La fecha se calcula acá y no
		// queda la que guardó el store al cargar la app, que puede ser de ayer.
		this.$store.commit('road_map/setFromDate', moment().format('YYYY-MM-DD'))
		this.$store.commit('road_map/setUntilDate', '')

		// Con "Ver solo sus hojas de ruta" (y sin "Ver todas") el repartidor queda fijo en el propio
		// usuario. La API aplica el mismo filtro por su cuenta: esto es para que el select y el
		// listado digan lo mismo.
		if (this.solo_sus_hojas) {
			this.$store.commit('road_map/set_route_prefix', this.user.id)
		}

		this.$store.dispatch('road_map/getModels')
	},
	computed: {
		show_previus_days() {
			return this.$store.state.road_map.from_dates
		},
		solo_sus_hojas() {
			return this.can('road_map.terminadas.only_your') && !this.can('road_map.terminadas.all')
		},
	},
}
</script>