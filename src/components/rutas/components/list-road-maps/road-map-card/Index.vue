<template>
	<div 
	@click="show_road_map"
	:class="terminada ? 'terminada' : 'sin-terminar'"
	class="road-map-card s-1 card">

		<p
		class="num">
			N° {{ road_map.num }}
		</p>

		<p>
			<i class="icon-user"></i>
			{{ road_map.employee.name }}
		</p>

		<p>
			{{ road_map.sales.length }} ventas
		</p>

		<p>
			{{ total_productos(road_map.sales) }} productos
		</p>

		<p>
			Fecha entrega: {{ date(road_map.fecha_entrega) }}
		</p>
	</div>
</template>
<script>
import road_map from '@/mixins/road_map'
export default {
	mixins: [road_map],
	props: {
		road_map: Object,
	},
	computed: {
		terminada() {
			let terminada = 1
			this.road_map.sales.forEach(sale => {
				if (!sale.terminada) {
					terminada = 0
				}
			})
			return terminada
		},
	},
	methods: {
		show_road_map() {
			this.setModel(this.road_map, 'road_map')
		}
	}
}
</script>
<style lang="sass">
.road-map-card
	@media screen and (max-width: 768px)
		width: 94%
		margin: 10px 4%
	@media screen and (min-width: 768px)
		width: 46%
		margin: 10px 2%


	border-radius: 10px
	display: flex  
	flex-direction: columns  
	justify-content: flex-start
	padding: 15px


	.num  
		font-size: 30px

.terminada
	border: 4px solid green !important

.sin-terminar
	border: 4px solid red !important

</style>