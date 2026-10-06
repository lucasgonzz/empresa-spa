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
				return sale.client.name+' ( '+ this.saldo_del_cliente(sale) +' )'
			}
			return 'NO HAY'
		},
		/**
		 * Saldo del cliente en la moneda de la venta, con su rotulo ("USD ..." en dolares).
		 *
		 * 🔴 Lee `saldo_pesos` / `saldo_dolares` y no `saldo`: esa columna es de antes de las cuentas por
		 * moneda y ningun movimiento la mantiene al dia (`CurrentAcountHelper::set_model_saldo()` solo
		 * sincroniza las dos nuevas), asi que mostraba un valor congelado, o un guion en un cliente nuevo
		 * que ya debia plata. Son las mismas que muestra la lista de Clientes.
		 *
		 * La moneda es la de la cuenta que abre el boton de al lado (`showClientCurrentAcount` la elige por
		 * `sale.moneda_id`): 0 y null cuentan como pesos, y los dolares solo con la extension
		 * `ventas_en_dolares`. Asi la cifra del boton es la de la cuenta que se abre al tocarlo.
		 *
		 * @param {Object} sale Venta de la fila, con su `client`.
		 * @returns {String} Saldo con el rotulo de su moneda, o '-' si el cliente no tiene dato en esa moneda.
		 */
		saldo_del_cliente(sale) {
			// La venta es en dolares solo si lo dice su moneda Y el negocio trabaja con cuentas en dolares.
			let en_dolares = (Number(sale.moneda_id) || 1) == 2 && this.hasExtencion('ventas_en_dolares')
			// Saldo del cliente en esa moneda; es NULL hasta que su cuenta tiene el primer movimiento.
			let saldo = en_dolares ? sale.client.saldo_dolares : sale.client.saldo_pesos
			// Sin dato: un guion, y no "USD -", que dejaria el rotulo de la moneda solo. El cero SI se muestra.
			if (saldo === null || typeof saldo == 'undefined') {
				return '-'
			}
			return this.current_acount_simbolo_moneda({moneda_id: en_dolares ? 2 : 1}, saldo)
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