<template>
	<div
	id="features"
	class="features animate__animated animate__wobble">
		<div class="titles">
			<h4>
				Conoce nuestros Modulos
			</h4>
			<h5>
				Accede a todas las funcionalidades con tu plan.
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
						'Notas de credito.',
					],
				},
				{
					img: 'factura1.png',
					title: 'Facturacion',
					items: [
						'Estamos vinculados a los servicios de AFIP, para que puedas elegir facturar cualquier venta que hagas.',
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
						'Actualizacion automatica de stock luego de realizar una venta a travez de la Tienda.',
						'Sincronización entre los clientes pedidos de los clientes y sus cuentas corrientes .',
					],
				},
				{
					img: 'comision1.png',
					title: 'Comisiones',
					items: [
						'ComercioCity liquida automaticamente las comisiones correspondientes a tus vendedores por cada venta.',
						'Nuestro equipo se encarga de configurar el sistema para automatizar las comisiones segun tu modelo ya existente.',
						'Las comisiones pueden efectuarce una vez realizada la venta, o una vez saldada.',
						'Los porcentajes de las comisiones pueden ser dependiendo los descuentos o el tipo de una venta.',
						'Las comisiones pueden ser para el vendedor al que corresponda el cliente, o para los que vos decidas.',
						'No importa lo "rebuscado" que sea tu manera de organizarte, nuestro sistema esta listo para ayudarte.'
					],
				},
				{
					img: 'imagen1.png',
					title: 'Imagenes automaticas',
					items: [
						'Asigna imágenes a tus artículos buscadas automáticamente desde internet, según su código o nombre.',
						'No vas a tener que tomarlas vos mismo ni descargarlas para luego subirlas a nuestro sistema.',
						'Integramos la potencia del buscador de Google para hacer todo el proceso desde nuestro sistema, y ahorrarte todo el proceso.'
					],
				},
				{
					img: 'presupuestos.png',
					title: 'Presupuestos',
					items: [
						'Crea presupuestos personalizados para cada cliente.',
						'Lleva el control de los que fueron o no confirmados.',
						'Los presupuestos estan vinculados a las cuentas corrientes de tus clientes.',
					],
				},
				{
					img: 'excel.png',
					title: 'Excel',
					items: [
						'Exporta todos tus datos a un excel con un simple click, en cualquier momento y las veces que quieras.',
						'Importa archivos excel editados para actualizar tus registros en un solo movimiento.',
					],
				},
			]
		}
	}
}
</script>
<style lang="sass">
.features 
	.cont-features
		display: flex 
		flex-direction: row 
		justify-content: space-around
		flex-wrap: wrap
</style>