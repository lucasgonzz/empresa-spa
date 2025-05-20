<template>
	<div
	class="clientes">
		<hr>
		<h5
		class="m-b-20">
			Clientes
		</h5>

		<div 
		v-for="client in road_map.clientes"
		class="cliente s-2">
		
			<client-header
			:_client="client"></client-header>

			<hr>

			<!-- Listo directamente los articulos de todas las ventas -->
			<div 
			v-if="hasExtencion('road_map_detalle_por_articulos_y_no_por_venta')"
			class="ventas">
				<producto
				v-for="producto in productos(client)"
				:producto="producto"></producto>	
			</div>

			<!-- Listo solo las ventas -->
			<div 
			v-else
			class="ventas">
				
				<venta
				v-for="sale in client.sales"
				:sale="sale"></venta>	
			</div>

			<client-observations
			:_client="client"></client-observations>
		</div>
	</div>	
</template>
<script>
export default {
	components: {
		ClientHeader: () => import('@/components/rutas/components/list-road-maps/road-map-modal/clientes/ClientHeader'),
		Producto: () => import('@/components/rutas/components/list-road-maps/road-map-modal/clientes/Producto'),
		Venta: () => import('@/components/rutas/components/list-road-maps/road-map-modal/clientes/Venta'),
		ClientObservations: () => import('@/components/rutas/components/list-road-maps/road-map-modal/clientes/ClientObservations'),
	},
	methods: {
		productos(client) {
			let productos = []

			client.sales.forEach(sale => {

				sale.articles.forEach(article => {

					productos.push({
						id: article.id,
						name: article.name,
						price: article.pivot.price,
						amount: article.pivot.amount,
					})
				})

				sale.promocion_vinotecas.forEach(promo => {

					productos.push({
						id: promo.id,
						name: promo.name,
						price: promo.pivot.price,
						amount: promo.pivot.amount,
					})
				})
			})

			return productos
		},
	},
	props: {
		road_map: Object,
	},
}
</script>
<style lang="sass">
.clientes

	margin-left: 10px
	
	.cliente
		background: rgba(0,0,0,.08)
		padding: 15px
		border-radius: 10px
		margin-bottom: 50px 


		.ventas
			display: flex  
			flex-direction: row  
			justify-content: flex-start
			flex-wrap: wrap
</style>