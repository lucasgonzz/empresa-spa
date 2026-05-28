<template>
	<div
	v-if="sale.client && sale.client.phone">
		
		<b-button
		class="m-l-10"
		variant="success"
		@click="whatsapp">
			<i class="icon-whatsapp"></i>
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		sale: Object,
		from_budget: {
			type: Boolean,
			default: false
		}
	},
	methods: {
		whatsapp() {
			let link = 'https://api.whatsapp.com/send?phone='+this.sale.client.phone+'&text=Hola '+this.client_name()+', te acercamos el comprobante de tu compra N° '+this.sale.num+': '
			
			if (this.from_budget) {
				link += this.owner.api_url+'/budget/pdf/'+this.sale.id+'/1' 
			} else {

				if (this.sale.afip_ticket) {
					link += this.owner.api_url+'/sale/afip-ticket-pdf/'+this.sale.id 
				} else {
					link += this.owner.api_url+'/sale/pdf/'+this.sale.id+'/1/0/0' 
				}
			}
			window.open(link)
		},
		client_name() {
			return this.sale.client.name.split(' ')[0].toUpperCase()
		}
	}
}
</script>