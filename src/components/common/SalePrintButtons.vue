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
		v-for="afip_ticket in sale.afip_tickets"
		v-if="afip_ticket.cae"
		@click.stop="afipTicketPdf(afip_ticket.id)">
			Factura N°{{ afip_ticket.cbte_numero }}
		</b-dropdown-item>
		<b-dropdown-item
		@click.stop="ticketPdf(sale)">
			Ticket
		</b-dropdown-item>

		<b-dropdown-item>
			<i 
			@click="set_ancho_impresora"
			class="icon-configuration m-r-10"></i>

			<span
			@click.stop="nuevo_ticket(sale)">
				Ticket 2.0
			</span>
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
		set_ancho_impresora() {

			let ancho = this.$cookies.get('ancho_impresora')

			let _prompt = 'Ingrese el ancho en milimetros de su impresora'

			if (ancho != 'null')  {
				_prompt += '. Valor actual: '+ancho+'mm'
			}

			
			let valor = prompt(_prompt)

			if (valor)  {

				this.$cookies.set('ancho_impresora', valor, -1)
				alert('Ancho de '+this.$cookies.get('ancho_impresora')+'mm configurado correctamente')
			}


		},
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
		afipTicketPdf(afip_ticket_id) {
            let link = process.env.VUE_APP_API_URL+'/sale/afip-ticket-pdf/'+afip_ticket_id
            window.open(link)
		},
	}
}
</script>