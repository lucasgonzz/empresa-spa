<template>
	<div
	v-if="sale.afip_tickets.length"
	class="p-l-5">

		<b-button-group
		class="m-l-5"
		v-for="afip_ticket in sale.afip_tickets">
			
			<b-button
			variant="primary"
			size="sm"
			class="m-l-5"
			@click.stop="afip_ticket"
			v-if="afip_ticket.cae">
				Fac N° {{ afip_ticket.cbte_numero }}
			</b-button>

			<b-button
			size="sm"
			variant="outline-danger"
			v-else>
				<span
				v-if="afip_ticket.cbte_numero">
					{{ afip_ticket.cbte_numero }}
				</span>
				(sin CAE)
			</b-button>

			<b-button
			@click="consultar(afip_ticket)"
			size="sm"
			variant="danger"
			v-if="!afip_ticket.cae && afip_ticket.cbte_numero">
				Consultar
			</b-button>

			<!-- <b-button
			v-for="nota_credito_afip_ticket in sale.nota_credito_afip_tickets"
			variant="danger"
			class="m-l-5"
			size="sm"
			@click.stop="print_nota_credito_afip_ticket(nota_credito_afip_ticket)">
				N/C N° {{ nota_credito_afip_ticket.cbte_numero }}
			</b-button> -->

			<!-- Observaciones -->
			<b-button
			size="sm"
			@click.stop="showObservations(afip_ticket)"
			variant="warning"
			v-if="afip_ticket.afip_observations.length">
				<i class="icon-eye"></i>
				{{ afip_ticket.afip_observations.length }}
			</b-button>


			<!-- Errores -->
			<b-button
			size="sm"
			@click.stop="showErrors(afip_ticket)"
			variant="danger"
			v-if="afip_ticket.afip_errors.length">
				<i class="icon-eye"></i>
				{{ afip_ticket.afip_errors.length }}
			</b-button>
		</b-button-group>
	</div>
</template>
<script>
export default {
	props: {
		sale: Object,
	},
	methods: {
		showObservations(afip_ticket) {
			this.$store.commit('afip_ticket/set_model', afip_ticket)
			this.$bvModal.show('afip-ticket-observations')
			console.log('MOSTRANDO')
		},
		showErrors(afip_ticket) {
			this.$store.commit('afip_ticket/set_model', afip_ticket)
			this.$bvModal.show('afip-ticket-errors')
		},
		print_nota_credito_afip_ticket(nota_credito_afip_ticket) {
			let link = process.env.VUE_APP_API_URL+'/current-acount/pdf/'+nota_credito_afip_ticket.nota_credito_id
			window.open(link)
		},
		afip_ticket() {
			let link = process.env.VUE_APP_API_URL+'/sale/ticket-pdf/'+this.sale.id
			window.open(link)

		},
		consultar(afip_ticket) {
			this.$store.commit('auth/setMessage', 'Consultando comprobante')
			this.$store.commit('auth/setLoading', true)

			let link = process.env.VUE_APP_API_URL+'/afip-ticket/consultar-comprobante/'+afip_ticket.id
			this.$api.get(link)
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('sale/add', res.data.sale)
				this.$toast.success('Comprobante consultado')
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
			})
		}
	}
}
</script>