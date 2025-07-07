<template>
	<div
	v-if="sale.client">
		<b-button
		@click.stop="show_current_acount">
			{{ sale.client.name }}
		</b-button>

		<b-button
		class="m-l-10"
		variant="success"
		@click="whatsapp"
		v-if="sale.client.phone">
			<i class="icon-whatsapp"></i>
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		sale: Object,
	},
	methods: {
		show_current_acount() {
			this.showClientCurrentAcount(this.sale)
		},
		whatsapp() {
			let link = 'https://api.whatsapp.com/send?phone='+this.sale.client.phone+'&text=Hola '+this.sale.client.name+', te acercamos el comprobante de tu compra N° '+this.sale.num+': '
			
			if (this.sale.afip_ticket) {
				link += this.owner.api_url+'/sale/afip-ticket-pdf/'+this.sale.id 
			} else {
				link += this.owner.api_url+'/sale/pdf/'+this.sale.id+'/1/0/0' 
			}
			window.open(link)
		}
	}
}
</script>