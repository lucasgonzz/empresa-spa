<template>
	<b-table
	head-variant="dark"
	responsive
	:fields="fields"
	:items="items">
	</b-table>
</template>
<script>
export default {
	computed: {
		stock_suggestion_articles() {
			return this.$store.state.stock_suggestion_article.stock_suggestion_articles 
		},
		fields() {
			return [
				{
					label: 'Num',
					key: 'id',
				},
				{
					label: 'Cod barras',
					key: 'bar_code',
				},
				{
					label: 'Cod Prov',
					key: 'provider_code',
				},
				{
					label: 'Deposito Origen',
					key: 'from_address',
				}, 
				{
					label: 'Deposito Destino',
					key: 'to_address',
				},
				{
					label: 'Cantidad',
					key: 'cantidad',
				},
			]
		},
		items() { 
			
			let items = []

			console.log('stock_suggestion_articles:')
			console.log(this.stock_suggestion_articles)

			this.stock_suggestion_articles.forEach(article => {
				items.push({...article})
			})
			
			return items 
		}
	}
}
</script>