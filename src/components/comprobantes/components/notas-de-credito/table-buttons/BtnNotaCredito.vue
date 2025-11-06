<template>
	<div>
		<b-button
		variant="primary"
		@click.stop="print" 
		v-if="nota_credito.afip_ticket">
			<i class="icon-print"></i>
			Factura N° {{ nota_credito.afip_ticket.cbte_numero }}
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		nota_credito: Object,
	},
	methods: {
		print() {
			let link = process.env.VUE_APP_API_URL+'/current-acount/pdf/'+this.nota_credito.id
			window.open(link)
		},
	}
}
</script>