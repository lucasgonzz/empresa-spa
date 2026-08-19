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

			<!-- Estado vacío del sistema (display/EmptyState), en vez del cartel azul viejo. -->
			<empty-state
			v-else
			icon_class="bi bi-bag-check"
			title="No hay pedidos sin confirmar"
			hint="Todos los pedidos que entraron por la tienda ya están confirmados."></empty-state>

		</div>
	</div>

</template>
<script>
export default {
	components: {
		EmptyState: () => import('@/common-vue/components/display/EmptyState'),
	},
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