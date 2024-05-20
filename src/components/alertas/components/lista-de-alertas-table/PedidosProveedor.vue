<template>
	<div>
		<b-table
		v-if="view == 'pedidos-proveedor'"
		class="m-t-20"
		head-variant="dark"
		:fields="fields"
		:items="items">

			<template #cell(cliente)="data">
				<b-button
				variant="success">
					{{ ventas_sin_cobrar[data.index].client.name }}
				</b-button>
			</template>

			<template #cell(venta)="data">
				<b-button
				variant="primary">
					Venta N° 23947
				</b-button>
			</template>

		</b-table>
	</div>

</template>
<script>
export default {
	computed: {
		fields() {
			return [
				{
					key: 'proveedor',
				},
				{
					key: 'pedido',
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

			this.pedidos_sin_llegar.forEach(provider_order => {
				items.push({
					proveedor: provider_order.provider.name,
					pedido: provider_order.num,
					saldo: provider_order.provider.saldo,
					hace: this.since(provider_order.created_at),
					fecha: this.date(provider_order.created_at),
				})
			})

			return items
		},


		pedidos_sin_llegar() {
			return this.$store.state.provider_order.days_to_advise_models
		},
	}
}
</script>