<template>
	<div
	class="features">
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
					title: 'Inventario',
					items: [
						'Stock',
						'Estadisticas de venta',
						'Costos en dolares',
						'Costos en dolares segun proveedor',
						'Margenes de ganancia',
						'Margenes de ganancia segun proveedor',
					],
				},
				{
					title: 'Vender',
					items: [
						'Articulos del inventario y servicios',
						'Clientes y cuenta corriente',
						'Precios segun lista de precios del Cliente',
						'Notas de debito',
					],
				},
				{
					title: 'Ventas',
					items: [
						'Listado'
					],
				},
				{
					title: 'Proveedores',
					items: [
						'Articulos del inventario y servicios',
						'Clientes y cuenta corriente',
						'Precios segun lista de precios del Cliente',
						'Notas de debito',
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