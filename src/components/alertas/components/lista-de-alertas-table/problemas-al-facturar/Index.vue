<template>
	<div>
		<div
		v-if="view == 'facturacion'">

    		<list-sales></list-sales>

		</div>
	</div>

</template>
<script>
export default {
	components: {
		ListSales: () => import('@/components/alertas/components/lista-de-alertas-table/problemas-al-facturar/ListSales'),
	},
	computed: {
		fields() {
			return [
				{
					key: 'venta',
				},
				{
					key: 'sucursal',
				},
				{
					key: 'empleado',
				},
				{
					key: 'total',
				},
				{
					key: 'acciones',
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

			this.problemas_al_facturar.forEach(sale => {
				items.push({
					venta: sale.num,
					sucursal: sale.address ? sale.address.stree : null,
					employee: sale.employee ? sale.employee.name : this.owner.name,
					total: this.price(sale.total),
					hace: this.since(sale.created_at),
					fecha: this.date(sale.created_at),
				})
			})

			return items
		},


		problemas_al_facturar() {
			return this.$store.state.afip_ticket.problemas_al_facturar
		},
	},
	methods: {
		showSale(sale) {
            this.show_model('sale', sale.id)
		}
	}
}
</script>