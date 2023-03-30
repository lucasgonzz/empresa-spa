<template>
	<b-button-group
	v-if="sale">
		<b-button
		@click="salePdf(sale.id, false)"
		variant="outline-danger">
			Sin precios
		</b-button>
		<b-button
		@click="salePdf(sale.id, true)"
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
import vender from '@/mixins/vender'
import previus_sales from '@/mixins/previus_sales'
import print_sale from '@/mixins/print_sale'
export default {
	mixins: [print_sale],
	props: {
		sale: Object,
	},
}
</script>