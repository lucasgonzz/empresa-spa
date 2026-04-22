<template>
	<b-table
	head-variant="dark"
	:fields="fields"
	:items="items"></b-table>
</template>
<script>
export default {
	computed: {
		provider_order() {
			return this.$store.state.provider_order.model 
		},
		fields() {
			return [
				{
					text: 'Iva',
					key: 'iva'
				},
				{
					text: 'Neto',
					key: 'neto'
				},
				{
					text: 'Importe',
					key: 'iva_importe'
				},
			]
		},
		items() {
			let items = []
			
			if (this.provider_order && this.provider_order.iva_breakdown) {

				this.provider_order.iva_breakdown.forEach(iva => {
					items.push({
						iva: iva.percentage,
						neto: this.price(iva.neto),
						iva_importe: this.price(iva.iva_importe),
					})
				})
			}

			return items
		}
	}
}
</script>