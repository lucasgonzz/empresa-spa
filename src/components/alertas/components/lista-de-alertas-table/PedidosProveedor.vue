<template>
	<div>
		<div
		v-if="view == 'pedidos-proveedor'">

			<current-acounts></current-acounts>
			
			<b-table
			v-if="pedidos_sin_llegar.length"
			head-variant="dark"
			responsive
			:fields="fields"
			:items="items">

				<template #cell(proveedor)="data">
					<b-button
					@click="showCurrentAcounts(pedidos_sin_llegar[data.index])"
					variant="success">
						{{ pedidos_sin_llegar[data.index].provider.name }}
					</b-button>
				</template>

			</b-table>

			<!-- Estado vacío del sistema (display/EmptyState), en vez del cartel azul viejo. -->
			<empty-state
			v-else
			icon_class="bi bi-truck"
			title="No hay pedidos sin llegar"
			hint="Ningún pedido a proveedor pasó los días de aviso que tenés configurados."></empty-state>

		</div>
	</div>

</template>
<script>
export default {
	components: {
		EmptyState: () => import('@/common-vue/components/display/EmptyState'),
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
	},
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
					saldo: this.price(provider_order.provider.saldo),
					hace: this.since(provider_order.created_at),
					fecha: this.date(provider_order.created_at),
				})
			})

			return items
		},


		pedidos_sin_llegar() {
			return this.$store.state.provider_order.days_to_advise_models
		},
	},
	methods: {
		showCurrentAcounts(provider_order) {
			this.showProviderCurrentAcount(provider_order)
		}
	}
}
</script>