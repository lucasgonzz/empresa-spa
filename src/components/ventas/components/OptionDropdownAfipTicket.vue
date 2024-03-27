<template>
	<b-dropdown-item
	v-if="!has_afip_ticket"
	@click="makeAfipTicket">
		<i class="icon-tag"></i>
		Hacer Factura
	</b-dropdown-item>
</template>
<script>
export default {
	computed: {
		selected_sales() {
			return this.$store.state.sale.selected
		},
		has_afip_ticket() {
			return false
			let sales = this.selected_sales.filter(sale => {
				return sale.afip_ticket
			})
			return sales.length
		},
	},
	methods: {
		makeAfipTicket() {
			this.$bvModal.show('confirm-make-afip-tickets')
		}
	} 
}
</script>