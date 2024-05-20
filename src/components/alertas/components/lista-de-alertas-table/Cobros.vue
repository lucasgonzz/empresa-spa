<template>
	<div>

		<current-acounts></current-acounts>

		<b-table
		v-if="view == 'cobros'"
		class="m-t-20"
		head-variant="dark"
		:fields="fields"
		:items="items">

			<template #cell(cliente)="data">
				<b-button
				@click="showCurrentAcounts(ventas_sin_cobrar[data.index])"
				variant="success">
					{{ ventas_sin_cobrar[data.index].client.name }}
				</b-button>
			</template>

		</b-table>
	</div>

</template>
<script>
export default {
	components: {
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
	},
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
					key: 'saldo',
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
					cliente: sale.client.name,
					venta: 'N° '+sale.num,
					saldo: this.price(sale.client.saldo),
					hace: this.since(sale.created_at),
					fecha: this.date(sale.created_at),
				})
			})

			return items
		},


		ventas_sin_cobrar() {
			return this.$store.state.sale.ventas_sin_cobrar.models
		},
	},
	methods: {
		showCurrentAcounts(sale) {
			this.showClientCurrentAcount(sale)
		}
	}
}
</script>