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
		@click.stop="ticketPdf(sale)">
			Ticket
		</b-dropdown-item>
		<b-dropdown-item
		@click.stop="nuevo_ticket(sale)">
			Ticket 2.0
		</b-dropdown-item>
		<!-- <b-dropdown-item
		v-if="owner.tamano_letra"
		@click.stop="ticketRaw(sale)">
			Ticket 3
		</b-dropdown-item> -->
		<b-dropdown-item
		@click.stop="salePdf(sale.id, 0, 0, 0)">
			Sin precios
		</b-dropdown-item>
		<b-dropdown-item
		@click.stop="salePdf(sale.id, 1, 0, 0)">
			Con precios
		</b-dropdown-item>
		<b-dropdown-item
		v-if="is_admin"
		@click.stop="salePdf(sale.id, 1, 1, 0)">
			Con costos
		</b-dropdown-item>
		<b-dropdown-item
		@click.stop="salePdf(sale.id, 1, 0, 1)">
			Precios Netos
		</b-dropdown-item>
	</b-dropdown>
</template>
<script>
import print_ticket from '@/mixins/sale/print_ticket/index'
export default {
	mixins: [print_ticket],
	props: {
		sale: Object,
	},
	computed: {
		commissions() {
			return this.$store.state.commission.models
		},
	},
	methods: {
		salePdf(sale_id, with_prices, with_costs, precios_netos) {
            let link = process.env.VUE_APP_API_URL+'/sale/pdf/'+sale_id+'/'+with_prices+'/'+with_costs+'/'+precios_netos
            window.open(link) 
		},
		nuevo_ticket(sale) {
			this.printTicket(sale)
            // let link = process.env.VUE_APP_API_URL+'/sale/ticket-pdf/'+sale_id
            // window.open(link)
		},
		ticketRaw(sale) {
            let link = process.env.VUE_APP_API_URL+'/sale/ticket-raw/'+sale.id
            window.open(link)
		},
		ticketPdf(sale) {
            let link = process.env.VUE_APP_API_URL+'/sale/ticket-pdf/'+sale.id
            window.open(link)
		},
		afipTicketPdf(sale_id) {
            let link = process.env.VUE_APP_API_URL+'/sale/afip-ticket-pdf/'+sale_id
            window.open(link)
		},
	}
}
</script>