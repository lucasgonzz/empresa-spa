<template>
	<div>
		<div
		v-if="view == 'pedidos-online'">

			<b-table
			v-if="pedidos_sin_confirmar.length"
			head-variant="dark"
			responsive
			:fields="fields"
			:items="items">

				<template #cell(proveedor)="data">
					<b-button
					@click="showCurrentAcounts(pedidos_sin_confirmar[data.index])"
					variant="success">
						{{ pedidos_sin_confirmar[data.index].buyer.name }}
					</b-button>
				</template>

			</b-table>

			<div 
			v-else
			class="text-with-icon">
				No hay pedidos sin confirmar
				<i class="icon-eye-slash"></i>
			</div>

		</div>
	</div>

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
					key: 'pedido',
				},
				{
					key: 'total',
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

			this.pedidos_sin_confirmar.forEach(order => {
				items.push({
					cliente: order.buyer.name,
					pedido: order.num,
					total: this.orderTotal(order),
					hace: this.since(order.created_at),
					fecha: this.date(order.created_at),
				})
			})

			return items
		},


		pedidos_sin_confirmar() {
			return this.$store.state.order.unconfirmed_models
		},
	},
	methods: {
		showCurrentAcounts(provider_order) {
			this.showProviderCurrentAcount(provider_order)
		}
	}
}
</script>