<template>
	<div>


		<btn-factura
		v-if="nota_credito.afip_ticket"
		class="m-l-5"
		:print_url="print_url"
		:afip_ticket="nota_credito.afip_ticket"></btn-factura>

		<!-- <b-button
		variant="primary"
		@click.stop="print" 
		v-if="nota_credito.afip_ticket">
			<i class="icon-print"></i>
			Factura N° {{ nota_credito.afip_ticket.cbte_numero }}
		</b-button> -->
	</div>

</template>
<script>
export default {
	components: {
		BtnFactura: () => import('@/components/common/BtnFactura'),
	},
	props: {
		nota_credito: Object,
	},
	computed: {
		print_url() {
			return '/current-acount/pdf/'+this.nota_credito.id
		},
	},
	methods: {
		print() {
			let link = process.env.VUE_APP_API_URL+'/current-acount/pdf/'+this.nota_credito.id
			window.open(link)
		},
	}
}
</script>