<template>

<b-modal
hide-footer
size="lg"
title="Ventas sin cobrar"
id="ventas-sin-cobrar">
	<b-table
	v-if="ventas_sin_cobrar.length"
	head-variant="dark"
	responsive
	:fields="fields"
	:items="items">

		<template #cell(cliente)="data">
			<b-button
			@click="showCurrentAcounts(ventas_sin_cobrar[data.index])"
			variant="success">
				{{ client_name(ventas_sin_cobrar[data.index]) }}
			</b-button>
		</template>

	</b-table>

</b-modal>
</template>
<script>
export default {
	computed: {
		fields() {
			return [
				{
					key: 'cliente',
				},
				{
					key: 'venta',
				},
				{
					key: 'pagandose',
				},
				{
					key: 'hace',
				},
				{
					key: 'fecha',
				},
			]
		},
		items() {
			let items = []

			this.ventas_sin_cobrar.forEach(sale => {
				items.push({
					cliente: null,
					venta: 'N° '+sale.num+' ('+this.price(sale.current_acount.debe)+')',
					pagandose: this.price(sale.current_acount.pagandose)+' (faltan '+ this.lo_que_falta_pagarse(sale) +')',
					hace: this.since(sale.created_at),
					fecha: this.date(sale.created_at),
				})
			})

			return items
		},


		ventas_sin_cobrar() {
			return this.$store.state.sale.ventas_sin_cobrar.ventas_sin_cobrar
		},
	},
	methods: {
		client_name(sale) {
			if (sale.client) {
				return sale.client.name+' ( '+ this.price(sale.client.saldo) +' )'
				// return sale.client.name+' ( '+ this.price(sale.client.saldo) +' )'
			}
			return 'NO HAY'
		},
		lo_que_falta_pagarse(sale) {
			return this.price(Number(sale.current_acount.debe) - Number(sale.current_acount.pagandose))
		},
		showCurrentAcounts(sale) {
			this.showClientCurrentAcount(sale)
		}
	}
}
</script>