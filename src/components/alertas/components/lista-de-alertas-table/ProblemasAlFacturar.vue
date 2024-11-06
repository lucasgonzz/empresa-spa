<template>
	<div>
		<div
		v-if="view == 'facturacion'">

    		<sale-modal></sale-modal>

			<afip-ticket-show-errors></afip-ticket-show-errors>
			<afip-ticket-show-observations></afip-ticket-show-observations>
		
			<make-afip-tickets></make-afip-tickets>

			<b-table
			v-if="problemas_al_facturar.length"
			head-variant="dark"
			responsive
			:fields="fields"
			:items="items">

				<template #cell(venta)="data">
					<b-button
					@click="showSale(problemas_al_facturar[data.index])"
					variant="primary">
						N° {{ problemas_al_facturar[data.index].num }}
					</b-button>
				</template>

				<template #cell(acciones)="data">

					<afip-buttons
					:sale="problemas_al_facturar[data.index]"></afip-buttons>
				</template>

			</b-table>

			<div 
			v-else
			class="text-with-icon">
				No hay problemas al facturar
				<i class="icon-eye-slash"></i>
			</div>

		</div>
	</div>

</template>
<script>
export default {
	components: {
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
        SaleModal: () => import('@/components/common/SaleModal'),
		AfipButtons: () => import('@/components/ventas/components/table-buttons/AfipButtons'),
		AfipTicketShowErrors: () => import('@/components/ventas/modals/afip-ticket/ShowErrors'),
		AfipTicketShowObservations: () => import('@/components/ventas/modals/afip-ticket/ShowObservations'),
		MakeAfipTickets: () => import('@/components/ventas/modals/afip-ticket/MakeAfipTickets'),
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