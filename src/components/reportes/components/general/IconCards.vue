<template>
	<div 
	v-if="can('reportes.cards')"
	class="icon-cards">
		<template
		v-if="!loading">
			<div
			class="card-group"
			v-for="group in card_groups">
				<h6>
					{{ group.group_name }}
				</h6>

				<div class="cards-wrapper">
					<div
					v-for="card in group.cards" 
					v-if="show(card)"
					:id="card.id ? card.id : ''"
					class="icon-card">
						<img :src="img_url(card)">
						<p class="text">
							{{ card.text }}
						</p>
						<p class="value">
							{{ card.value }}
						</p>
						<p 
						v-if="card.extra"
						class="extra">
							{{ card.extra }}
						</p>
						<p class="description">
							{{ card.description }}
						</p>
					</div>
				</div>
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
		card_groups() {
			let card_groups = [
				{
					group_name: 'Ventas',
					// group_name: 'Ingresos',
					cards: [
						{
							text: 'Ingresos brutos',
							img: 'ventas',
							value: this.price(this.model.total_vendido, false),
							description: 'Total vendido, haya sido o no pagado',
						},
						{
							text: 'Ingresos brutos USD',
							if_has_extencion: 'ventas_en_dolares',
							img: 'ventas',
							value: this.price(this.model.total_vendido_usd, false),
							description: 'Total vendido, haya sido o no pagado',
						},
						{
							text: 'Pagado en mostrador',
							img: 'pagado_mostrador2',
							value: this.price(this.model.total_pagado_mostrador, false),
							description: 'Total vendido y pagado en el momento, sin pasar a c/c',
							extra: this.porcentaje_mostrador,
						},
						{
							text: 'Pagado en mostrador USD',
							if_has_extencion: 'ventas_en_dolares',
							img: 'pagado_mostrador2',
							value: this.price(this.model.total_pagado_mostrador_usd, false),
							description: 'Total vendido y pagado en el momento, sin pasar a c/c',
							extra: this.porcentaje_mostrador,
						},
						{
							text: 'A cuentas corrientes',
							img: 'a_cuentas_corrientes',
							value: this.price(this.model.total_vendido_a_cuenta_corriente, false),
							description: 'Total vendido a tus clientes, pero que no se pago',
							extra: this.porcentaje_a_cuenta_corriente,
						},
						{
							text: 'A cuentas corrientes USD',
							if_has_extencion: 'ventas_en_dolares',
							img: 'a_cuentas_corrientes',
							value: this.price(this.model.total_vendido_a_cuenta_corriente_usd, false),
							description: 'Total vendido a tus clientes, pero que no se pago',
							extra: this.porcentaje_a_cuenta_corriente,
						},
						{
							text: 'Pagos de clientes (ctas ctes)',
							img: 'pagado_mostrador',
							value: this.price(this.model.total_pagado_a_cuenta_corriente, false),
							description: 'Total pagado en C/C por tus clientes, de ventas que hayan realizado en el pasado'
						},
						{
							text: 'Pagos de clientes (ctas ctes) USD',
							if_has_extencion: 'ventas_en_dolares',
							img: 'pagado_mostrador',
							value: this.price(this.model.total_pagado_a_cuenta_corriente_usd, false),
							description: 'Total pagado en C/C por tus clientes, de ventas que hayan realizado en el pasado'
						},
						{
							text: 'Cantidad de ventas',
							img: 'cantidad_ventas',
							value: this.model.cantidad_ventas,
						},
					]
				},
			]

			if (
				this.hasExtencion('cambiar_price_type_en_vender')
				&& !this.hasExtencion('lista_de_precios_por_categoria')
				&& this.model.ingresos_brutos_price_types
			) {
				let group = {
					group_name: 'Listas de precio',
					cards: []
				}

				this.model.ingresos_brutos_price_types.forEach(price_type => {
					group.cards.push({
						text: price_type.name,
						img: 'ventas',
						value: this.price(price_type.pivot.total_vendido),
						description: 'Suma de todas las ventas hechas con la lista de precios '+price_type.name
					})
				})

				card_groups = card_groups.concat(group)
			}

			let resto_de_grupos = [
				{
					group_name: 'Dinero',
					// group_name: 'Tesoreria',
					cards: [
						{
							text: 'Caja',
							img: 'ingresos_brutos',
							value: this.price(this.model.total_ingresos, false),
							description: 'Suma de: lo que se vendio en mostrador + lo que pagaron en C/C tus clientes (lo que deberia haber en la caja)',
						},
						{
							text: 'Caja USD',
							if_has_extencion: 'ventas_en_dolares',
							img: 'ingresos_brutos',
							value: this.price(this.model.total_ingresos_usd, false),
							description: 'Suma de: lo que se vendio en mostrador + lo que pagaron en C/C tus clientes (lo que deberia haber en la caja)',
						},
						{
							text: 'Utilidad',
							img: 'ingresos_netos',
							value: this.price(this.model.ingresos_netos, false),
							description: 'Ingresos Brutos - Costo de la mercaderia',
						},
						{
							text: 'Utilidad USD',
							if_has_extencion: 'ventas_en_dolares',
							img: 'ingresos_netos',
							value: this.price(this.model.ingresos_netos_usd, false),
							description: 'Ingresos Brutos - Costo de la mercaderia',
						},
						{
							text: 'Ingresos Netos',
							img: 'rentabilidad',
							value: this.price(this.model.rentabilidad, false),
							description: 'UTILIDAD menos los GASTOS',
						},
					],
				},
				// {
				// 	group_name: 'Analisis',
				// 	cards: [
				// 		{
				// 			text: 'Utilidad',
				// 			img: 'ingresos_netos',
				// 			value: this.price(this.model.ingresos_netos),
				// 			description: 'Ingresos Brutos - Costo de la mercaderia',
				// 		},
				// 		{
				// 			text: 'Ingresos Netos',
				// 			img: 'rentabilidad',
				// 			value: this.price(this.model.rentabilidad),
				// 			description: 'UTILIDAD menos los GASTOS',
				// 		},
				// 	],
				// },
				{
					group_name: 'Gastos',
					cards: [
						{
							text: 'Gastos',
							img: 'gastos',
							value: this.price(this.model.total_gastos, false),
							description: 'Suma de los GASTOS',
						},
						{
							text: 'Devoluciones',
							img: 'devoluciones', 
							value: this.price(this.model.total_devolucion, false),
							description: 'Sumatoria de las devoluciones de tus clientes (notas de credito)',
						},
					],
				},
				{
					group_name: 'Egresos',
					cards: [
						{
							text: 'Total Comprado',
							img: 'comprado', 
							value: this.price(this.model.total_comprado, false),
							description: 'Sumatoria de los totales de los pedidos a proveedores',
						},
						{
							text: 'Total Comprado USD',
							img: 'comprado', 
							value: this.price(this.model.total_comprado_usd, false),
							description: 'Sumatoria de los totales de los pedidos a proveedores',
							if_has_extencion: 'ventas_en_dolares',
						},
						{
							text: 'Total Pagado',
							img: 'pagado', 
							value: this.price(this.model.total_pagado_a_proveedores, false),
							description: 'Sumatoria de los pagos hechos a proveedores',
						},
						{
							text: 'Total Pagado USD',
							img: 'pagado', 
							value: this.price(this.model.total_pagado_a_proveedores_usd, false),
							description: 'Sumatoria de los pagos hechos a proveedores',
							if_has_extencion: 'ventas_en_dolares',
						},
					],
				},


				{
					group_name: 'Facturacion',
					cards: [
						{
							text: 'Iva Debito',
							img: 'iva_vendido',
							id: 'iva_debito', 
							value: this.price(this.model.total_facturado, false),
							description: 'Sumatoria de los importes de IVA de todos los articulos vendidos en ventas Facturadas',
						},

						/*
							Aca tengo que sumar el total de las facturas, o la suma del iva de cada articulo
						*/
						{
							text: 'Iva Credito',
							id: 'iva_credito', 
							img: 'iva_comprado', 
							value: this.price(this.model.total_iva_comprado, false),
							description: 'Sumatoria de los totales de IVA de las facturas de los pedidos a proveedores',
						},

						{
							text: 'Iva a Pagar',
							id: 'iva_diferencia', 
							img: 'iva_diferencia', 
							value: this.price(this.model.total_facturado - this.model.total_iva_comprado, false),
							description: 'Diferencia entre IVA Debito menos el IVA Credito',
						},
					],
				},



				{
					group_name: 'Deudas',
					cards: [
						{
							text: 'Deudas de Clientes',
							img: 'deuda-clientes',
							value: this.price(this.model.deuda_clientes, false),
							description: 'Sumatoria de los saldos ACTUALES de tus clientes',
						},
						{
							text: 'Deudas de Clientes USD',
							img: 'deuda-clientes',
							value: this.price(this.model.deuda_clientes_usd, false),
							description: 'Sumatoria de los saldos ACTUALES de tus clientes',
							if_has_extencion: 'ventas_en_dolares',
						},
						{
							text: 'Deudas con Proveedores',
							img: 'deuda-clientes',
							value: this.price(this.model.deuda_proveedores, false),
							description: 'Sumatoria de los saldos ACTUALES de tus proveedores',
						},
						{
							text: 'Deudas con Proveedores USD',
							img: 'deuda-clientes',
							value: this.price(this.model.deuda_proveedores_usd, false),
							description: 'Sumatoria de los saldos ACTUALES de tus proveedores',
							if_has_extencion: 'ventas_en_dolares',
						},
					],
				},
			]

			card_groups = card_groups.concat(resto_de_grupos)

			return card_groups
		},
		porcentaje_mostrador() {
			if (this.model.total_vendido == 0) {
				return null
			}

			let porcentaje = Number(this.model.total_pagado_mostrador) * 100 / Number(this.model.total_vendido)

			return '('+ Math.round(porcentaje) +'%)'
		},
		porcentaje_a_cuenta_corriente() {
			if (this.model.total_vendido == 0) {
				return null
			}

			let porcentaje = Number(this.model.total_vendido_a_cuenta_corriente) * 100 / Number(this.model.total_vendido)
			
			return '('+ Math.round(porcentaje) +'%)'
		},
		clients() {
			return this.$store.state.client.models 
		},
		providers() {
			return this.$store.state.provider.models 
		},
		rango_temporal() {
			return this.$store.state.reportes.rango_temporal
		},
		// deuda_clientes() {
		// 	if (this.rango_temporal == 'rango-de-fechas') {
		// 		return this.model.deuda_clientes
		// 	} 
			
		// 	let deuda = 0
		// 	this.clients.forEach(client => {
		// 		if (client.saldo && client.saldo > 0) {
		// 			deuda += Number(client.saldo)
		// 		}
		// 	})
		// 	return deuda
		// },
		// deuda_proveedores() {
		// 	if (this.rango_temporal == 'rango-de-fechas') {
		// 		return this.model.deuda_proveedores
		// 	} 
			
		// 	let deuda = 0
		// 	this.providers.forEach(provider => {
		// 		if (provider.saldo && provider.saldo > 0) {
		// 			deuda += Number(provider.saldo)
		// 		}
		// 	})
		// 	return deuda
		// },
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
		show(card) {
			if (card.if_has_extencion) {
				return this.hasExtencion(card.if_has_extencion)
			}
			return true
		}
	},
}
</script>
<style lang="sass">
.icon-cards
	display: flex 
	flex-direction: column 
	// flex-wrap: wrap

	.card-group
		display: flex 
		flex-direction: column

		h6 
			font-size: 25px
			text-align: left
			font-weight: bold 
			margin: 30px 0 20px

		.cards-wrapper
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
		min-height: 200px
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