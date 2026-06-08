<template>
	<div 
	v-if="can('reportes.cards')"
	class="icon-cards m-t-30">
		<template
		v-if="!loading">
			<template
			v-for="group in card_groups">
			<div
			v-if="visible_cards(group.cards).length > 0"
			class="icon-cards__group"
			:key="group.group_name">
				<h6 class="icon-cards__group-title">
					{{ group.group_name }}
				</h6>

				<div class="icon-cards__grid">
					<div
					v-for="card in visible_cards(group.cards)"
					:key="card.id || card.text"
					:id="card.id ? card.id : ''"
					class="icon-card"
					:class="card_accent_class(card)">
						<div class="icon-card__header">
							<div
							class="icon-card__icon-wrap"
							:class="card_accent_class(card)">
								<i
								:class="icon_class(card)"
								aria-hidden="true"></i>
							</div>

							<div class="icon-card__body">
								<p class="text">
									{{ card.text }}
								</p>
								<p
								v-if="card.value !== undefined && card.value !== null && card.value !== ''"
								class="value">
									{{ card.value }}
								</p>
								<p 
								v-if="card.extra"
								class="extra">
									{{ card.extra }}
								</p>
							</div>
						</div>

						<p
						v-if="card.description"
						class="description">
							{{ card.description }}
						</p>

						<div
						v-if="card.buttons && card.buttons.length"
						class="icon-card__actions">
							<b-button
							size="sm"
							variant="outline-primary"
							v-for="button in card.buttons"
							:key="button.text"
							@click="call_method(button)">
								{{ button.text }}
							</b-button>
						</div>
					</div>
				</div>
			</div>
			</template>
		</template>

		<div
		class="all-center-md icon-cards__loading"
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
							text: 'Total vendido Bruto',
							img: 'ventas',
							value: this.price(this.model.total_vendido, false, false),
							description: 'Total vendido, haya sido o no pagado (sin computar devoluciones)',
						},
						{
							text: 'Total vendido Bruto USD',
							if_has_extencion: 'ventas_en_dolares',
							img: 'ventas',
							value: this.price(this.model.total_vendido_usd, false, false),
							description: 'Total vendido, haya sido o no pagado (sin computar devoluciones)',
						},
						{
							text: 'Total vendido Neto',
							if_mayor_0: 'total_devolucion',
							img: 'ventas',
							value: this.price(this.model.total_vendido - this.model.total_devolucion, false, false),
							description: 'Total vendido bruto, MENOS las devoluciones ('+this.price(this.model.total_devolucion, false, false)-+')',
						},
						{
							text: 'Total vendido Neto USD',
							if_has_extencion: 'ventas_en_dolares',
							if_mayor_0: 'total_devolucion_usd',
							img: 'ventas',
							value: this.price(this.model.total_vendido_usd - this.model.total_devolucion_usd, false, false),
							description: 'Total vendido bruto USD MENOS las devoluciones ('+ this.price(this.model.total_devolucion_usd, false, false) +')',
						},
						{
							text: 'Pagado en mostrador',
							img: 'pagado_mostrador2',
							value: this.price(this.model.total_pagado_mostrador, false, false),
							description: 'Total vendido y pagado en el momento, sin pasar a c/c',
							extra: this.porcentaje_mostrador,
						},
						{
							text: 'Pagado en mostrador USD',
							if_has_extencion: 'ventas_en_dolares',
							img: 'pagado_mostrador2',
							value: this.price(this.model.total_pagado_mostrador_usd, false, false),
							description: 'Total vendido y pagado en el momento, sin pasar a c/c',
							extra: this.porcentaje_mostrador_usd,
						},
						{
							text: 'A cuentas corrientes',
							img: 'a_cuentas_corrientes',
							value: this.price(this.model.total_vendido_a_cuenta_corriente, false, false),
							description: 'Total vendido a tus clientes, pero que no se pago',
							extra: this.porcentaje_a_cuenta_corriente,
						},
						{
							text: 'A cuentas corrientes USD',
							if_has_extencion: 'ventas_en_dolares',
							img: 'a_cuentas_corrientes',
							value: this.price(this.model.total_vendido_a_cuenta_corriente_usd, false, false),
							description: 'Total vendido a tus clientes, pero que no se pago',
							extra: this.porcentaje_a_cuenta_corriente_usd,
						},
						{
							text: 'Pagos de clientes (ctas ctes)',
							img: 'pagado_mostrador',
							value: this.price(this.model.total_pagado_a_cuenta_corriente, false, false),
							description: 'Total pagado en C/C por tus clientes, de ventas que hayan realizado en el pasado'
						},
						{
							text: 'Pagos de clientes (ctas ctes) USD',
							if_has_extencion: 'ventas_en_dolares',
							img: 'pagado_mostrador',
							value: this.price(this.model.total_pagado_a_cuenta_corriente_usd, false, false),
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
						value: this.price(price_type.pivot.total_vendido, false, false),
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
							value: this.price(this.model.total_ingresos, false, false),
							description: 'Suma de: lo que se vendio en mostrador + lo que pagaron en C/C tus clientes (lo que deberia haber en la caja)',
						},
						{
							text: 'Caja USD',
							if_has_extencion: 'ventas_en_dolares',
							img: 'ingresos_brutos',
							value: this.price(this.model.total_ingresos_usd, false, false),
							description: 'Suma de: lo que se vendio en mostrador + lo que pagaron en C/C tus clientes (lo que deberia haber en la caja)',
						},
						{
							text: 'Costos',
							img: 'ventas',
							value: this.price(this.model.total_vendido_costos, false, false),
							description: 'Costo de la mercaderia vendida (sin computar devoluciones)',
						},
						{
							text: 'Costos USD',
							if_has_extencion: 'ventas_en_dolares',
							img: 'ventas',
							value: this.price(this.model.total_vendido_costos_usd, false, false),
							description: 'Costo de la mercaderia vendida (sin computar devoluciones)',
						},
						{
							text: 'Utilidad Bruta',
							img: 'ingresos_netos',
							value: this.price(this.model.ingresos_brutos, false, false),
							description: 'Total vendido Bruto - Costo de la mercaderia (sin computar desvoluciones)',
						},
						{
							text: 'Utilidad USD Bruta',
							if_has_extencion: 'ventas_en_dolares',
							img: 'ingresos_netos',
							value: this.price(this.model.ingresos_brutos_usd, false, false),
							description: 'Total vendido Bruto USD - Costo de la mercaderia (sin computar desvoluciones)',
						},
						{
							text: 'Utilidad Neta',
							img: 'ingresos_netos',
							value: this.price(this.model.ingresos_netos, false, false),
							description: 'Total vendido Neto - Costo de la mercaderia (computando devoluciones)',
						},
						{
							text: 'Utilidad USD Neta',
							if_has_extencion: 'ventas_en_dolares',
							img: 'ingresos_netos',
							value: this.price(this.model.ingresos_netos_usd, false, false),
							description: 'Total vendido Neto USD - Costo de la mercaderia (computando devoluciones)',
						},
						{
							text: 'Ingresos Netos',
							img: 'rentabilidad',
							value: this.price(this.model.rentabilidad, false, false),
							description: 'UTILIDAD menos los GASTOS',
						},
						{
							text: 'Ingresos Netos USD',
							if_has_extencion: 'ventas_en_dolares',
							img: 'rentabilidad',
							value: this.price(this.model.rentabilidad_usd, false, false),
							description: 'UTILIDAD USD menos los GASTOS USD',
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
							value: this.price(this.model.total_gastos, false, false),
							description: 'Suma de los GASTOS',
						},
						{
							text: 'Gastos USD',
							if_has_extencion: 'ventas_en_dolares',
							img: 'gastos',
							value: this.price(this.model.total_gastos_usd, false, false),
							description: 'Suma de los GASTOS en USD',
						},
						{
							text: 'Devoluciones',
							img: 'devoluciones', 
							value: this.price(this.model.total_devolucion, false, false),
							description: 'Sumatoria de las devoluciones de tus clientes (notas de credito)',
						},
						{
							text: 'Devoluciones USD',
							if_has_extencion: 'ventas_en_dolares',
							img: 'devoluciones', 
							value: this.price(this.model.total_devolucion_usd, false, false),
							description: 'Sumatoria de las devoluciones de tus clientes (notas de credito) en USD',
						},
					],
				},
				{
					group_name: 'Egresos',
					cards: [
						{
							text: 'Total Comprado',
							img: 'comprado', 
							value: this.price(this.model.total_comprado, false, false),
							description: 'Sumatoria de los totales de los pedidos a proveedores',
						},
						{
							text: 'Total Comprado USD',
							img: 'comprado', 
							value: this.price(this.model.total_comprado_usd, false, false),
							description: 'Sumatoria de los totales de los pedidos a proveedores',
							if_has_extencion: 'ventas_en_dolares',
						},
						{
							text: 'Total Pagado',
							img: 'pagado', 
							value: this.price(this.model.total_pagado_a_proveedores, false, false),
							description: 'Sumatoria de los pagos hechos a proveedores',
						},
						{
							text: 'Total Pagado USD',
							img: 'pagado', 
							value: this.price(this.model.total_pagado_a_proveedores_usd, false, false),
							description: 'Sumatoria de los pagos hechos a proveedores',
							if_has_extencion: 'ventas_en_dolares',
						},
					],
				},



				{
					group_name: 'Deudas',
					cards: [
						{
							text: 'Deudas de Clientes',
							img: 'deuda-clientes',
							value: this.price(this.model.deuda_clientes, false, false),
							description: 'Sumatoria de los saldos ACTUALES de tus clientes',
						},
						{
							text: 'Deudas de Clientes USD',
							img: 'deuda-clientes',
							value: this.price(this.model.deuda_clientes_usd, false, false),
							description: 'Sumatoria de los saldos ACTUALES de tus clientes',
							if_has_extencion: 'ventas_en_dolares',
						},
						{
							text: 'Deudas con Proveedores',
							img: 'deuda-clientes',
							value: this.price(this.model.deuda_proveedores, false, false),
							description: 'Sumatoria de los saldos ACTUALES de tus proveedores',
						},
						{
							text: 'Deudas con Proveedores USD',
							img: 'deuda-clientes',
							value: this.price(this.model.deuda_proveedores_usd, false, false),
							description: 'Sumatoria de los saldos ACTUALES de tus proveedores',
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
							value: this.price(this.model.total_facturado, false, false),
							description: 'Sumatoria de los importes de IVA de todos los articulos vendidos en ventas Facturadas',
							buttons: [
								{
									text: 'Libro Iva',
									function: 'iva_ventas_pdf'
								},
							]
						},

						/*
							Aca tengo que sumar el total de las facturas, o la suma del iva de cada articulo
						*/
						{
							text: 'Iva Credito',
							id: 'iva_credito', 
							img: 'iva_comprado', 
							value: this.price(this.model.total_iva_comprado, false, false),
							description: 'Sumatoria de los totales de IVA de las facturas de los pedidos a proveedores en base a la fecha de emision',
							buttons: [
								{
									text: 'Libro Iva',
									function: 'iva_compras_pdf'
								},
							]
						},

						{
							text: 'Iva a Pagar',
							id: 'iva_diferencia', 
							img: 'iva_diferencia', 
							value: this.price(this.model.total_facturado - this.model.total_iva_comprado, false, false),
							description: 'Diferencia entre IVA Debito menos el IVA Credito',
						},

						{
							text: 'Afip .TXT',
							id: 'afip_txt', 
							img: 'afip_txt', 
							buttons: [
								{
									text: '.txt',
									function: 'export_afip_txt'
								},
								{
									text: '.txt alicuotas',
									function: 'export_afip_alicuotas_txt'
								},
							]
						},
					],
				},
			]

			card_groups = card_groups.concat(resto_de_grupos)


			if (this.can('reportes.info_facturacion')) {

				// Info facturacion
				let group_facturacion = {
					group_name: 'Detalles de Facturacion',
					cards: [],
				}

				if (this.model.company_performance_info_facturacion) {
					
					this.model.company_performance_info_facturacion.forEach(info_facturacion => {

						
						group_facturacion.cards.push({
							text: info_facturacion.afip_information.razon_social+' | '+info_facturacion.afip_tipo_comprobante.name,
							img: 'iva_comprado',
							value: this.price(info_facturacion.total_facturado, false, false),
							// description: 'Sumatoria de los saldos ACTUALES de tus proveedores',
							// if_has_extencion: 'ventas_en_dolares',
						})
					})
				}

				card_groups = card_groups.concat(group_facturacion)
			}

			return card_groups
		},
		porcentaje_mostrador() {
			if (this.model.total_vendido == 0) {
				return null
			}

			let porcentaje = Number(this.model.total_pagado_mostrador) * 100 / Number(this.model.total_vendido)

			return '('+ Math.round(porcentaje) +'%)'
		},
		porcentaje_mostrador_usd() {
			if (this.model.total_vendido_usd == 0) {
				return null
			}

			let porcentaje = Number(this.model.total_pagado_mostrador_usd) * 100 / Number(this.model.total_vendido_usd)

			return '('+ Math.round(porcentaje) +'%)'
		},
		porcentaje_a_cuenta_corriente() {
			if (this.model.total_vendido == 0) {
				return null
			}

			let porcentaje = Number(this.model.total_vendido_a_cuenta_corriente) * 100 / Number(this.model.total_vendido)
			
			return '('+ Math.round(porcentaje) +'%)'
		},
		porcentaje_a_cuenta_corriente_usd() {
			if (this.model.total_vendido_usd == 0) {
				return null
			}

			let porcentaje = Number(this.model.total_vendido_a_cuenta_corriente_usd) * 100 / Number(this.model.total_vendido_usd)
			
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
		/**
		 * Devuelve la clase Bootstrap Icons según el tipo de tarjeta.
		 * Prioriza casos especiales por texto; si no, usa el mapa por `card.img`.
		 *
		 * @param {Object} card - Definición de la tarjeta del reporte
		 * @returns {String} Clases CSS del icono (ej. "bi bi-cart-check")
		 */
		icon_class(card) {
			// Casos puntuales según el título visible de la tarjeta
			if (card.text === 'Afip .TXT') {
				return 'bi bi-filetype-txt'
			}
			if (card.text && card.text.indexOf('Proveedores') !== -1) {
				return 'bi bi-building'
			}
			if (card.text && card.text.indexOf('Clientes') !== -1) {
				return 'bi bi-people'
			}

			// Mapa de imágenes legacy → iconos Bootstrap representativos
			const icon_map = {
				ventas: 'bi-graph-up-arrow',
				pagado_mostrador2: 'bi-shop-window',
				a_cuentas_corrientes: 'bi-journal-text',
				pagado_mostrador: 'bi-wallet2',
				cantidad_ventas: 'bi-receipt-cutoff',
				ingresos_brutos: 'bi-safe',
				ingresos_netos: 'bi-piggy-bank',
				rentabilidad: 'bi-trophy',
				gastos: 'bi-cash-stack',
				devoluciones: 'bi-arrow-return-left',
				comprado: 'bi-cart-plus',
				pagado: 'bi-credit-card-2-front',
				'deuda-clientes': 'bi-exclamation-circle',
				iva_vendido: 'bi-file-earmark-arrow-up',
				iva_comprado: 'bi-file-earmark-arrow-down',
				iva_diferencia: 'bi-calculator',
			}

			const icon_name = icon_map[card.img] || 'bi-bar-chart-line'
			return 'bi ' + icon_name
		},
		/**
		 * Clase de acento visual (color del icono y borde lateral) según categoría.
		 *
		 * @param {Object} card - Definición de la tarjeta del reporte
		 * @returns {String} Sufijo de clase CSS (ej. "accent-ventas")
		 */
		card_accent_class(card) {
			const accent_map = {
				ventas: 'accent-ventas',
				pagado_mostrador2: 'accent-ventas',
				a_cuentas_corrientes: 'accent-ventas',
				pagado_mostrador: 'accent-ventas',
				cantidad_ventas: 'accent-ventas',
				ingresos_brutos: 'accent-dinero',
				ingresos_netos: 'accent-dinero',
				rentabilidad: 'accent-dinero',
				gastos: 'accent-gastos',
				devoluciones: 'accent-gastos',
				comprado: 'accent-egresos',
				pagado: 'accent-egresos',
				'deuda-clientes': 'accent-deudas',
				iva_vendido: 'accent-facturacion',
				iva_comprado: 'accent-facturacion',
				iva_diferencia: 'accent-facturacion',
			}

			return accent_map[card.img] || 'accent-default'
		},
		/**
		 * Filtra las tarjetas visibles según extensiones y condiciones del modelo.
		 *
		 * @param {Array} cards - Listado de tarjetas del grupo
		 * @returns {Array} Tarjetas que deben mostrarse
		 */
		visible_cards(cards) {
			let visible = []

			cards.forEach(card => {
				if (this.show(card)) {
					visible.push(card)
				}
			})

			return visible
		},
		show(card) {
			let show = true
			
			if (card.if_mayor_0) {
				show = this.model[card.if_mayor_0] > 0
			}

			if (show && card.if_has_extencion) {
				show = this.hasExtencion(card.if_has_extencion)
			}

			return show
		},
		call_method(btn) {
			this[btn.function]()
		},
		export_afip_txt() {
			let mes_inicio = this.$store.state.reportes.mes_inicio
			let mes_fin = this.$store.state.reportes.mes_fin
			let link = process.env.VUE_APP_API_URL+'/afip-txt/'+mes_inicio+'/'+mes_fin
			window.open(link)
		},
		export_afip_alicuotas_txt() {
			let mes_inicio = this.$store.state.reportes.mes_inicio
			let mes_fin = this.$store.state.reportes.mes_fin
			let link = process.env.VUE_APP_API_URL+'/afip-txt-alicuotas/'+mes_inicio+'/'+mes_fin
			window.open(link)
		},
		iva_compras_pdf() {
			let mes_inicio = this.$store.state.reportes.mes_inicio
			let mes_fin = this.$store.state.reportes.mes_fin
			let link = process.env.VUE_APP_API_URL+'/afip-iva-compras/'+mes_inicio+'/'+mes_fin
			window.open(link)
		},
		iva_ventas_pdf() {
			let mes_inicio = this.$store.state.reportes.mes_inicio
			let mes_fin = this.$store.state.reportes.mes_fin
			let link = process.env.VUE_APP_API_URL+'/afip-iva-ventas/'+mes_inicio+'/'+mes_fin
			window.open(link)
		},
	},
}
</script>
<style lang="sass">
// Paleta de acentos por categoría de KPI (tablero de control)
$accent-ventas: #2563eb
$accent-dinero: #059669
$accent-gastos: #dc2626
$accent-egresos: #7c3aed
$accent-deudas: #d97706
$accent-facturacion: #0891b2
$accent-default: #64748b

.icon-cards
	display: block
	padding: 8px 4px 24px

	&__loading
		min-height: 200px
		padding: 48px 0

	// Evita conflicto con Bootstrap .card-group (flex que estira el contenedor)
	&__group
		display: block
		height: auto
		min-height: 0
		margin: 0 0 50px

		&:last-child
			margin-bottom: 0

	&__group-title
		font-size: 1rem
		text-align: left
		font-weight: 700
		margin: 0 0 10px
		padding-bottom: 8px
		border-bottom: 2px solid #e2e8f0
		color: #475569
		text-transform: uppercase
		letter-spacing: 0.06em

	&__grid
		display: grid
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))
		grid-auto-rows: max-content
		row-gap: 20px
		column-gap: 16px
		align-items: start
		height: auto
		min-height: 0

	.icon-card
		background: #fff
		border: 1px solid #e2e8f0
		border-radius: 12px
		display: flex
		flex-direction: column
		align-self: start
		padding: 12px 14px
		min-height: 0
		height: auto
		transition: transform 0.5s ease, box-shadow 0.5s ease, border-color 0.5s ease
		overflow: hidden
		position: relative
		box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)

		// Borde lateral de acento según categoría
		&::before
			content: ''
			position: absolute
			left: 0
			top: 0
			bottom: 0
			width: 4px
			border-radius: 12px 0 0 12px
			background: $accent-default

		&.accent-ventas::before
			background: $accent-ventas
		&.accent-dinero::before
			background: $accent-dinero
		&.accent-gastos::before
			background: $accent-gastos
		&.accent-egresos::before
			background: $accent-egresos
		&.accent-deudas::before
			background: $accent-deudas
		&.accent-facturacion::before
			background: $accent-facturacion

		&:hover
			transform: translateY(-3px)
			box-shadow: 0 12px 24px rgba(15, 23, 42, 0.1)
			border-color: #cbd5e1
			z-index: 2
			overflow: visible

			.description
				display: block
				margin-top: 10px
				padding-top: 10px
				border-top: 1px dashed #e2e8f0

		&__header
			display: flex
			align-items: flex-start
			gap: 14px
			flex-shrink: 0

		&__icon-wrap
			flex-shrink: 0
			width: 48px
			height: 48px
			border-radius: 10px
			display: flex
			align-items: center
			justify-content: center
			background: rgba($accent-default, 0.12)
			color: $accent-default

			i
				font-size: 1.35rem
				line-height: 1

			&.accent-ventas
				background: rgba($accent-ventas, 0.12)
				color: $accent-ventas
			&.accent-dinero
				background: rgba($accent-dinero, 0.12)
				color: $accent-dinero
			&.accent-gastos
				background: rgba($accent-gastos, 0.12)
				color: $accent-gastos
			&.accent-egresos
				background: rgba($accent-egresos, 0.12)
				color: $accent-egresos
			&.accent-deudas
				background: rgba($accent-deudas, 0.12)
				color: $accent-deudas
			&.accent-facturacion
				background: rgba($accent-facturacion, 0.12)
				color: $accent-facturacion

		&__body
			flex: 0 1 auto
			min-width: 0

		&__actions
			display: flex
			flex-wrap: wrap
			gap: 8px
			margin-top: 12px
			padding-top: 12px
			border-top: 1px solid #f1f5f9

		p
			margin: 0

		.text
			font-size: 0.8rem
			font-weight: 600
			color: #64748b
			line-height: 1.3
			margin-bottom: 6px

		.value
			font-size: 1.5rem
			font-weight: 700
			color: #0f172a
			line-height: 1.2
			word-break: break-word

		.extra
			font-size: 0.75rem
			color: #94a3b8
			margin-top: 4px

		.description
			display: none
			font-size: 0.75rem
			color: #475569
			line-height: 1.45
			margin: 0
			padding: 0

	@media screen and (max-width: 700px)
		&__grid
			grid-template-columns: repeat(auto-fill, minmax(100%, 1fr))
			row-gap: 20px
			column-gap: 16px

		.icon-card
			padding: 14px

			.value
				font-size: 1.25rem

</style>