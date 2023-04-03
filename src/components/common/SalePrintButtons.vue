<template>
	<b-button-group
	v-if="sale">
		<b-button
		@click="salePdf(sale.id, 0)"
		variant="outline-danger">
			Sin precios
		</b-button>
		<b-button
		@click="salePdf(sale.id, 1)"
		variant="danger">
			Con precios
		</b-button>
		<b-button
		v-if="sale.afip_ticket"
		@click="afipTicketPdf(sale.id)"
		variant="outline-danger">
			Factura
		</b-button>
		<b-button
		@click="ticketPdf(sale.id)"
		variant="danger">
			Ticket
		</b-button>
	</b-button-group>
</template>
<script>
export default {
	props: {
		sale: Object,
	},
	methods: {
		salePdf(sale_id, with_prices) {
			if (this.user_configuration.limit_items_in_sale_per_page) {
				this.$bvModal.show('print-sales')
			} else {
	            let link = process.env.VUE_APP_API_URL+'/sale/pdf/'+sale_id+'/'+with_prices
	            window.open(link)
			}
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