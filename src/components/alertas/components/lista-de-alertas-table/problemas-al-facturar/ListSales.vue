<template>
	<div>
		
		<sale-modal></sale-modal>

		<afip-ticket-show-errors></afip-ticket-show-errors>
		<afip-ticket-show-observations></afip-ticket-show-observations>
	
		<!-- <make-afip-tickets></make-afip-tickets> -->

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

		<!-- Estado vacío del sistema (display/EmptyState), en vez del cartel azul viejo. -->
		<empty-state
		v-else
		icon_class="bi bi-receipt"
		title="No hay problemas al facturar"
		hint="Todos los comprobantes se emitieron sin errores en ARCA."></empty-state>

	</div>

</template>
<script>
export default {
	components: {
		EmptyState: () => import('@/common-vue/components/display/EmptyState'),
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
        SaleModal: () => import('@/components/common/SaleModal'),
		AfipButtons: () => import('@/components/ventas/components/table-buttons/AfipButtons'),
		AfipTicketShowErrors: () => import('@/components/ventas/modals/afip-ticket/ShowErrors'),
		AfipTicketShowObservations: () => import('@/components/ventas/modals/afip-ticket/ShowObservations'),
		// MakeAfipTickets: () => import('@/components/ventas/modals/afip-ticket/MakeAfipTickets'),
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
					key: 'punto_de_venta',
				},
				{
					key: 'tipo_comprobante',
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
					punto_de_venta: this.get_afip_information(sale),
					tipo_comprobante: this.get_afip_tipo_comprobante(sale),
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
		},
		get_afip_information(sale) {
			let model = this.$store.state.afip_information.models.find(m => sale.afip_information_id == m.id)

			if (typeof model != 'undefined') {
				return model.razon_social
			}
			return ''
		},
		get_afip_tipo_comprobante(sale) {
			let model = this.$store.state.afip_tipo_comprobante.models.find(m => sale.afip_tipo_comprobante_id == m.id)

			if (typeof model != 'undefined') {
				return model.name
			}
			return ''
		},
	}
}
</script>