<template>
	<div
	v-if="sale.afip_ticket"
	class="p-l-5">
			<b-button
			variant="primary"
			size="sm"
			class="m-l-5"
			@click.stop="afip_ticket"
			v-if="sale.afip_ticket.cae">
				Fac N° {{ sale.afip_ticket.cbte_numero }}
			</b-button>
			<span
			class="text-danger m-l-5"
			v-else>
				Factura N°{{ sale.afip_ticket.cbte_numero }} (sin CAE)
			</span>

			<b-button
			v-for="nota_credito_afip_ticket in sale.nota_credito_afip_tickets"
			variant="danger"
			class="m-l-5"
			size="sm"
			@click.stop="print_nota_credito_afip_ticket(nota_credito_afip_ticket)">
				N/C N° {{ nota_credito_afip_ticket.cbte_numero }}
			</b-button>

		<!-- Observaciones -->
		<b-button
		size="sm"
		@click.stop="showObservations"
		variant="warning"
		class="m-l-10"
		v-if="sale.afip_observations.length">
			<i class="icon-eye"></i>
			{{ sale.afip_observations.length }}
		</b-button>


		<!-- Errores -->
		<b-button
		size="sm"
		@click.stop="showErrors"
		variant="danger"
		class="m-l-10"
		v-if="sale.afip_errors.length">
			<i class="icon-eye"></i>
			{{ sale.afip_errors.length }}
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		sale: Object,
	},
	methods: {
		showObservations() {
			this.setModel(this.sale, 'sale', [], false, false)
			this.$bvModal.show('afip-ticket-observations')
			console.log('MOSTRANDO')
		},
		showErrors() {
			this.setModel(this.sale, 'sale', [], false, false)
			this.$bvModal.show('afip-ticket-errors')
		},
		print_nota_credito_afip_ticket(nota_credito_afip_ticket) {
			let link = process.env.VUE_APP_API_URL+'/current-acount/pdf/'+nota_credito_afip_ticket.nota_credito_id+'/0'
			window.open(link)
		},
		afip_ticket() {
			let link = process.env.VUE_APP_API_URL+'/sale/ticket-pdf/'+this.sale.id
			window.open(link)

		}
	}
}
</script>