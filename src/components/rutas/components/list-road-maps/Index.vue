<template>
	<div
	class="m-t-15">
		<road-map-modal></road-map-modal>
    	
    	<sale-modal></sale-modal>

		<current-acounts></current-acounts>


		<loader
		v-if="loading"></loader>	

		<div 
		v-else>
			<div 
			v-if="road_maps.length"
			class="hojas-de-ruta">
				<road-map-card
				v-for="road_map in road_maps"
				:road_map="road_map"></road-map-card>
			</div>
			<p 
			v-else
			class="text-with-icon">
				<i class="icon-eye-slash"></i>
				No hay hojas de ruta
			</p>
		</div>
	</div>
</template>
<script>
export default {
	components: {
		RoadMapModal: () => import('@/components/rutas/components/list-road-maps/road-map-modal/Index'),
        SaleModal: () => import('@/components/common/SaleModal'),
		Loader: () => import('@/components/rutas/components/list-road-maps/Loader'),
		RoadMapCard: () => import('@/components/rutas/components/list-road-maps/road-map-card/Index'),
		
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
	},
	computed: {
		road_maps() {
			return this.$store.state.road_map.models 
		},
		loading() {
			return this.$store.state.road_map.loading
		},
	},
}
</script>
<style lang="sass">
.hojas-de-ruta
	display: flex  
	flex-direction: row
	justify-content: flex-start 
	flex-wrap: wrap
</style>