<template>
	<b-row
	v-if="!is_filtered"
	class="m-t-15">

		<b-col
		class="m-b-25 m-b-xl-0"
		md="6"
		xl="3">
			
			<inventario-stockeado></inventario-stockeado>
		</b-col>

		<b-col
		class="m-b-25 m-b-xl-0"
		md="6"
		xl="3">
			
			<valor-del-inventario></valor-del-inventario>
		</b-col>

		<b-col
		class="m-b-25 m-b-xl-0"
		md="6"
		xl="3">
			
			<costos-articulos></costos-articulos>
		</b-col>

		<b-col
		class="m-b-25 m-b-xl-0"
		md="6"
		xl="3">
			
			<estado-del-stock></estado-del-stock>
		</b-col>
		
	</b-row>
</template>
<script>
export default {
	components: {
		InventarioStockeado: () => import('@/components/listado/components/inventory-performance/InventarioStockeado'),
		ValorDelInventario: () => import('@/components/listado/components/inventory-performance/ValorDelInventario'),
		CostosArticulos: () => import('@/components/listado/components/inventory-performance/CostosArticulos'),
		EstadoDelStock: () => import('@/components/listado/components/inventory-performance/EstadoDelStock'),
	},
	created() {
		this.$store.dispatch('inventory_performance/getModels')
	},
	computed: {
		is_filtered() {
			return this.$store.state.article.is_filtered
		},
	},
}
</script>
<style lang="sass">
.inventario-card
	background: #FFF
	border-radius: 7px
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06) 

	.header	
		border-bottom: 1px solid rgba(0, 0, 0, 0.1)
		background: rgba(0, 0, 0, 0.03)
		display: flex  
		flex-direction: row  
		justify-content: flex-start
		align-items: center
		padding: 6px 15px
		font-size: 18px
		font-weight: bold 


	.body  
		padding: 6px 15px

		.info  
			display: flex   
			flex-direction: row  
			justify-content: space-between
			align-items: center

			p  
				margin: 0

			.nombre 
				font-size: 15px


			.valor  
				font-size: 25px


			.aclaracion
				margin-top: 10px 
				padding-top: 10px 
				border-top: 1px solid rgba(0, 0, 0, 0.1)
				font-weight: bold 
				color: rgba(0,0,0,.8)
				font-size: 15px
				text-align: left

</style>