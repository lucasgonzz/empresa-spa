<template>
<b-modal
title="Articulos"
hide-footer
size="lg"
id="articulos-creados">
	
	<b-table
	v-if="articles.length"
	class="s-2 b-r-1 animate__animated animate__fadeIn"
	head-variant="dark"
	responsive
	striped
	id="stock-movement-table"
	:fields="fields"
	:items="items">
	</b-table>

</b-modal>
</template>
<script>
export default {
	props: {
		articles: Array,
	},
	computed: {
		fields() {
			return [
				{
					label: 'Numero',
					key: 'num',
				},
				{
					label: 'Codigo Barras',
					key: 'bar_code',
				},
				{
					label: 'Nombre',
					key: 'name',
				},
				{
					label: 'Propiedades actualizadas',
					key: 'updated_props',
				},
			]
		},
		items() {
			let items = []
			let concepto = null 
			this.articles.forEach(article => {
				items.push({
					num: article.num,
					bar_code: article.bar_code,
					name: article.name,
					updated_props: this.get_updated_props(article),
				})
			})
			return items 
		},
	},
	methods: {
		get_updated_props(article) {
			console.log('get_updated_props article:')
			console.log(article)
			let props = ''
			if (article.pivot && article.pivot.updated_props) {


				JSON.parse(article.pivot.updated_props).forEach(prop => {
					props += prop+' | '
				})
			}
			return props
		}
	}
}
</script>