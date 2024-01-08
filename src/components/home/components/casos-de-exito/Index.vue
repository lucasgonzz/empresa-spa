<template>
	<div class="casos-de-exito">
		<div class="titles">
			<h4>
				Casos de Exito
			</h4>
		</div>

		<vue-horizontal-list 
		:items="cards" :options="options">
			<template v-slot:default="{ item }">
				<card
				:client="item"></card>
			</template>
		</vue-horizontal-list>
	</div>
</template>
<script>
export default {
	components: {
		VueHorizontalList: () => import('vue-horizontal-list'),
		Card: () => import('@/components/home/components/casos-de-exito/Card'),
	},
	computed: {
		options() {
			return {
				responsive: [
					{ start: 0, size: 1 },
				],
				list: {
					// 1200 because @media (min-width: 1200px) and therefore I want to switch to windowed mode
					windowed: 0,

					// Because: #app {padding: 80px 24px;}
					padding: 100,
				},
				position: {
					start: 1,
				},
				autoplay: { play: true, repeat: true, speed: 10000 },
			}
		},
		cards() {
			return [
				{
					img: 'refrigeracion_colman.png',
					name: 'Refrigeracion Colman',
					empleados: 15,
					descriptions: [
						'Refrigeracion Colman es una empresa de venta mayorista de articulos de refrigeracion de Entre Rios.',
						'Cuenta con clientes a lo largo de todo del Pais.',
						'Hacen uso de casi todos los modulos del sistema.',
						'Tambien cuentan con el modulo de e-commerce, mediante el cual pueden ofrecer una experiencia de compra personalizada a sus cliente.',
						'En la actualidad, seguimos trabajando estrechamente, automatizando constantemente sus procesos de negocio.'
					],
				}, 
				{
					img: 'fenix.png',
					name: 'Fenix Mayorista',
					empleados: 6,
					descriptions: [
						'Fenix Mayorista es una empresa de venta mayorista de articulos de jugueteria y electronica de Santa Fe.',
						'Cuenta con clientes en las provincias de Santa Fe y Entre Rios.',
						'Tambien cuentan con el modulo de e-commerce, mediante el cual pueden ofrecer una experiencia de compra personalizada a sus clientes.',
						'Gracias al modulo de comisiones, pudieron automatizar la tarea de calcular las comisiones de cada venta para sus vendedores y socios, ahorrandoles apoximadamente 15 HORAS por mes.',
					],
				},
				{
					img: 'kas.png',
					name: 'Kas Aberturas',
					empleados: 6,
					descriptions: [
						'Kas Aberturas es una empresa de venta y fabricacion de aberturas y articulos relacionados de la provincia de Entre Rios.',
						'Cuenta con clientes mayormente de la provincia.',
						'Hacen uso de casi todos los modulos del sistema.',
						'Tambien cuentan con el modulo de e-commerce, mediante el cual pueden ofrecer una experiencia de compra personalizada a sus cliente.',
						'Utilizan el modulos de presupuestos para ofrecer trabajos de fabricacion personalizados.',
						'Tambien utilizan el modulo de produccion para controlar el progreso de sus trabajos, y controlar el stock de sus insumos.',
					],
				},
				{
					img: 'hipermax.png',
					name: 'Hiper Max',
					empleados: 7,
					descriptions: [
						'Hiper Max es una empresa de venta de articulos de Bazar - Regalería - Juguetería y Librería de la provincia de Entre Rios.',
						'Cuenta con dos sucursales.',
						'Hacen buen uso del modulo de facturacion para entregar tickets de compra a sus clientes.',
						'Cuentan con un Panel de Control para poder ver el rendimiento de sus sucursales.',
						'Sacan buen provecho a la tecnología en la Nube, ya que su departamento de administración trabaja de manera remota.'
					],
				},
			]
		} 
	}
}
</script>