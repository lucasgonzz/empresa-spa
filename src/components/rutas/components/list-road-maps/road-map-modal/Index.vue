<template>
<b-modal
title="Hoja de Ruta"
hide-footer
size="lg"
id="road_map">
	
	<p
	v-if="road_map.employee">
		<i class="icon-user"></i>
		{{ road_map.employee.name }}
	</p>

	<div
	v-if="road_map.notes">
		<hr>
		<h5>
			<strong>
				Notas:
			</strong>
		</h5>
		<h5
		class="p-l-15">
			{{ road_map.notes }}
		</h5>
	</div>	

	<clientes
	:road_map="road_map"></clientes>	

</b-modal>
</template>
<script>
export default {
	components: {
		Clientes: () => import('@/components/rutas/components/list-road-maps/road-map-modal/clientes/Index'),
	},
	computed: {
		road_map() {
			return this.$store.state.road_map.model 
		},
	},
}
</script>