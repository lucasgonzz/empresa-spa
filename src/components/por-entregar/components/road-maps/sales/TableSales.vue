<template>
	<b-table
	class="m-t-15"
	:fields="fields"
	:items="items"
	head-variant="dark"></b-table>
</template>
<script>
export default {
	computed: {
		fields() {
			return [
				{
					text: 'N°',
					key: 'num'
				},
				{
					text: 'Total',
					key: 'total',
				},
				{
					text: 'Cliente',
					key: 'client',
				},
			]
		},
		items() {
			let items = []
			this.model.sales.forEach(sale => {
				items.push({
					num: sale.num,
					total: this.price(sale.total),
					client: sale.client ? sale.client.name : null
				})
			})
			return items
		},
		model() {
			return this.$store.state.road_map.model 
		}
	}
}
</script>