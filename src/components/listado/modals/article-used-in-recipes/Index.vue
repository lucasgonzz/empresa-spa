<template>
<b-modal
title="Recetas que hacen uso del articulo"
hide-footer
id="article-used-in-recipes">
	<div
	v-if="!loading">
		<b-table
		class="s-2 b-r-1"
		head-variant="dark"
		:fields="fields"
		:items="items"></b-table>
	</div>
	<div 
	v-else
	class="all-center-md">
		<b-spinner
		variant="primary"></b-spinner>
	</div>
</b-modal>
</template>
<script>
export default {
	computed: {
		fields() {
			return [
				{
					key: 'article',
					label: 'Articulo',
				},
				{
					key: 'order_production_status',
					label: 'Estado',
				},
				{
					key: 'amount',
					label: 'Cantidad',
				},
			]
		},
		items() {
			let items = []
			this.models.forEach(model => {
				items.push(model)
			})
			return items		
		},
		models() {
			return this.$store.state.article_used_in_recipes.models 
		},
		loading() {
			return this.$store.state.article_used_in_recipes.loading 
		},
	}
}
</script>