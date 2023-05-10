<template>
	<div
	class="features animate__animated animate__wobble">
		<div class="titles">
			<h4>
				Conoce nuestros Modulos
			</h4>
			<h5>
				Accede a todas las funcionalidades solo con tu plan.
			</h5>
			<h5>
				Desde cualquier dispositivo, todo en la Nube.
			</h5>
		</div>
		<div class="cont-features">
			<feature
			v-for="(feature, i) in features"
			:key="i"
			:feature="feature">
			</feature>	
		</div>
	</div>
</template>
<script>
export default {
	components: {
		Feature: () => import('@/components/home/components/features/Feature'),
	},
	computed: {
		features() {
			return [
				{
					img: 'stock5.png',
					title: 'Inventario',
					items: [
						'Estadisticas de venta.',
						'Costos en dolares.',
						'Costos en dolares segun proveedor.',
						'Margenes de ganancia.',
						'Margenes de ganancia segun proveedor.',
					],
				},
				{
					img: 'venta.png',
					title: 'Vender',
					items: [
						'Crea Ventas con Articulos del inventario y servicios.',
						'Factura desde el sistema.',
						'Clientes y cuenta corriente.',
						'Precios segun lista de precios del Cliente.',
						'Notas de debito.',
					],
				},
				{
					img: 'stock2.png',
					title: 'Stock',
					items: [
						'Actualizado al comprar o vender productos.',
						'Dividi tu inventario por Proveedores, Categorias, Marca, etc.',	
					],
				},
				{
					img: 'provider.png',
					title: 'Proveedores',
					items: [
						'Da de alta Pedidos a tus proveedores.',
						'Cuenta corriente para cada proveedor.',
					],
				},
				{
					img: 'charts.png',
					title: 'Informes',
					items: [
						'Estadisticas de los productos, categorias y localidades con mas ventas.',
						'Rendimiento de ventas por cada articulo.',
					],
				},
				{
					img: 'tienda2.png',
					title: 'Tienda Online',
					items: [
						'Tene tu propia tienda personalizada bajo el dominio de tu empresa (mi-empresa.com.ar).',
						'Exibi los articulos que vos quieras, con los precios en tiempo real.',
						'Actualizacion automatica de stock luego de realizar una venta a travez de la Tienda.'
					],
				},
			]
		}
	}
}
</script>
<style lang="sass">
.features 
	.titles 
		margin-bottom: 50px
		h4 
			font-size: 55px 
			// font-weight: bold 
			margin: 60px 0
		h5 
			font-size: 25px
			// margin-bottom: 15px 
			color: rgba(0,0,0,.7)
	.cont-features
		display: flex 
		flex-direction: row 
		justify-content: space-around
		flex-wrap: wrap
</style>