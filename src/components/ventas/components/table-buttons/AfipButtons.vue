<template>
	<div
	v-if="model.afip_ticket"
	class="p-l-5">
			<b-button
			variant="primary"
			class="m-l-5"
			@click.stop="afip_ticket"
			v-if="model.afip_ticket.cae">
				Factura N° {{ model.afip_ticket.cbte_numero }}
			</b-button>
			<span
			class="text-danger m-l-5"
			v-else>
				Factura (error){{ model.afip_ticket.cbte_numero }}
			</span>

			<b-button
			variant="danger"
			class="m-l-5"
			@click.stop="nota_credito_afip_ticket"
			v-if="model.nota_credito_afip_ticket">
				N/C N° {{ model.nota_credito_afip_ticket.cbte_numero }}
			</b-button>
		<b-button
		size="sm"
		@click.stop="showErrors"
		variant="warning"
		class="m-l-10"
		v-if="model.afip_errors.length">
			<i class="icon-eye"></i>
			{{ model.afip_errors.length }}
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		model: Object,
	},
	methods: {
		showErrors() {
			this.setModel(this.model, 'sale', [], false, false)
			this.$bvModal.show('afip-ticket-errors')
		},
		nota_credito_afip_ticket() {
			let link = process.env.VUE_APP_API_URL+'/current-acount/pdf/'+this.model.nota_credito_afip_ticket.nota_credito_id+'/0'
			window.open(link)
		},
		afip_ticket() {
			let link = process.env.VUE_APP_API_URL+'/sale/ticket-pdf/'+this.model.id
			window.open(link)

		}
	}
}
</script>