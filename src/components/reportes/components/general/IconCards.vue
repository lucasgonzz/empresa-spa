<template>
	<div 
	v-if="can('reportes.cards')"
	class="icon-cards">
		<template
		v-if="!loading">
			<div
			v-for="card in cards" 
			class="icon-card">
				<img :src="img_url(card)">
				<p class="text">
					{{ card.text }}
				</p>
				<p class="value">
					{{ card.value }}
				</p>
				<p class="description">
					{{ card.description }}
				</p>
			</div>
		</template>

		<div
		class="all-center-md"
		v-else>
		    <b-spinner 
		    variant="primary"></b-spinner>
		</div>
	</div>
</template>
<script>
export default {
	computed: {
		cards() {
			let cards = [
				{
					text: 'Ventas',
					img: 'ventas',
					value: this.price(this.model.total_vendido),
					description: 'Total vendido, haya sido o no pagado',
				},
				{
					text: 'Pagado en mostrador',
					img: 'pagado_mostrador2',
					value: this.price(this.model.total_pagado_mostrador),
					description: 'Total vendido y pagado en el momento, sin pasar a c/c',
				},
				{
					text: 'A cuentas corrientes',
					img: 'a_cuentas_corrientes',
					value: this.price(this.model.total_vendido_a_cuenta_corriente),
					description: 'Total vendido a tus clientes, pero que no se pago'
				},
				{
					text: 'Pagos de clientes (ctas ctes)',
					img: 'pagado_mostrador',
					value: this.price(this.model.total_pagado_a_cuenta_corriente),
					description: 'Total pagado en C/C por tus clientes, de ventas que hayan realizado en el pasado'
				},
				{
					text: 'Ingresos NETOS',
					img: 'ingresos-netos',
					value: this.price(this.model.total_ingresos),
					description: 'Suma de: lo que se vendio en mostrador + lo que pagaron en C/C tus clientes (lo que deberia haber en la caja)',
				},
				{
					text: 'Gastos',
					img: 'gastos',
					value: this.price(this.model.total_gastos),
					description: 'Suma de los GASTOS',
				},
				{
					text: 'Rentabilidad',
					img: 'rentabilidad',
					value: this.price(this.model.total_ingresos - this.model.total_gastos),
					description: 'Diferencia entre los INGRESOS NETOS menos los GASTOS',
				},
				{
					text: 'Deudas de Clientes',
					img: 'deuda-clientes',
					value: this.price(this.deuda_clientes),
					description: 'Sumatoria de los saldos de tus clientes',
				},
				{
					text: 'Devoluciones',
					img: 'devoluciones', 
					value: this.price(this.model.total_devolucion),
					description: 'Sumatoria de las devoluciones de tus clientes (notas de credito)',
				},
				// {
				// 	text: 'Articulos vendidos',
				// 	img: 'productos',
				// 	value: this.articulos_vendidos,
				// 	description: 'Cantidad',
				// },
				{
					text: 'Cantidad de ventas',
					img: 'cantidad_ventas',
					value: this.model.cantidad_ventas,
				},
			]
			return cards
		},
		clients() {
			return this.$store.state.client.models 
		},
		deuda_clientes() {
			let deuda = 0
			this.clients.forEach(client => {
				if (client.saldo && client.saldo > 0) {
					console.log('sumando '+client.saldo+' de '+client.name)
					deuda += Number(client.saldo)
					console.log('deuda:')
					console.log(deuda)
				}
			})
			return deuda
		},
		model() {
			return this.$store.state.reportes.model
		},
		total_vendido() {
			return this.$store.state.reportes.total_vendido
		},
		pagado_en_mostrador() {
			return this.$store.state.reportes.pagado_en_mostrador
		},
		a_cuentas_corrientes() {
			return this.$store.state.reportes.a_cuentas_corrientes
		},
		ingresos_pagos_de_cuentas_corrientes() {
			return this.$store.state.reportes.ingresos_pagos_de_cuentas_corrientes
		},
		gastos() {
			return this.$store.state.reportes.gastos
		},
		rentabilidad() {
			return this.$store.state.reportes.rentabilidad
		},
		articulos_vendidos() {
			return this.$store.state.reportes.articulos_vendidos
		},
		cantidad_ventas() {
			return this.$store.state.reportes.cantidad_ventas
		},

		loading() {
			return this.$store.state.reportes.loading
		},
	},
	methods: {
		img_url(card) {
			return require('@/assets/iconos-reportes/'+card.img+'.png') 
		},
	},
}
</script>
<style lang="sass">
.icon-cards
	display: flex 
	flex-direction: row 
	flex-wrap: wrap

	.icon-card
		@media screen and (max-width: 700px) 
			width: 45%
			margin: 2.5%
			
		@media screen and (min-width: 700px) 
			width: 250px
			margin: 10px
		
		height: 200px
		background: #FFF
		border: 2px solid rgba(0, 0, 0, .3)
		border-radius: 8px
		display: flex 
		flex-direction: column
		align-items: center 
		justify-content: space-around
		transition: all .2s
		overflow: hidden
		position: relative // Añadido para contener el contenido absoluto


		&:hover 
			transform: scale(1.1)
			box-shadow: rgb(38, 57, 77) 0px 20px 30px -10px
			height: auto

			& > .description
				display: block

		img 
			width: 80px

		p 
			margin: 0

		.text 
			font-size: 16px
			font-weight: bold
		
		.value 
			font-size: 25px
			// font-weight: bold

		.description
			font-size: 13px
			color: rgba(0, 0, 0, .9)
			display: none
			padding: 10px
			text-align: left
			position: absolute // Absoluto para superponerse
			top: 0 // Ubicación de la descripción dentro de la tarjeta
			box-sizing: border-box // Incluye el padding en el ancho total
			background: rgba(255, 255, 255, 0.9) // Fondo semitransparente
			font-weight: bold



</style>