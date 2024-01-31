<template>
	<b-dropdown
	variant="danger"
	right
	v-if="sale">
		<template #button-content>
			<i class="icon-print"></i>
			Imprimir	
		</template>
		<b-dropdown-item
		v-if="sale.afip_ticket"
		@click.stop="afipTicketPdf(sale.id)">
			Factura
		</b-dropdown-item>
		<b-dropdown-item
		@click.stop="ticketPdf(sale.id)">
			Ticket
		</b-dropdown-item>
		<b-dropdown-item
		@click.stop="salePdf(sale.id, 0, 0)">
			Sin precios
		</b-dropdown-item>
		<b-dropdown-item
		@click.stop="salePdf(sale.id, 1, 0)">
			Con precios
		</b-dropdown-item>
		<b-dropdown-item
		@click.stop="salePdf(sale.id, 1, 1)">
			Con costos
		</b-dropdown-item>
	</b-dropdown>
</template>
<script>
export default {
	props: {
		sale: Object,
	},
	computed: {
		commissions() {
			return this.$store.state.commission.models
		},
	},
	methods: {
		salePdf(sale_id, with_prices, with_costs) {
            let link = process.env.VUE_APP_API_URL+'/sale/pdf/'+sale_id+'/'+with_prices+'/'+with_costs
            window.open(link) 
		},
		ticketPdf(sale_id) {
            let link = process.env.VUE_APP_API_URL+'/sale/ticket-pdf/'+sale_id
            window.open(link)
		},
		afipTicketPdf(sale_id) {
            let link = process.env.VUE_APP_API_URL+'/sale/afip-ticket-pdf/'+sale_id
            window.open(link)
		},
	}
}
</script>