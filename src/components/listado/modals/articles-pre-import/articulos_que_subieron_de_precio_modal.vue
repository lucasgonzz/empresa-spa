<template>
<b-modal
hide-footer
size="lg"
id="articulos-que-subieron-de-precio">
	<b-table
	:fields="properties"
	head-variant="dark"
	:items="items"></b-table>
</b-modal>
</template>
<script>
export default {
	components: {
		TableComponent: () => import('@/common-vue/components/display/table/Index'),
	},
	computed: {
		articles_pre_import() {
			return this.$store.state.articles_pre_import.model 
		},
		properties() {
			return [
				{
					key: 'articulo'
				},
				{
					key: 'costo_actual'
				},
				{
					key: 'costo_nuevo'
				},
				{
					key: 'porcentaje'
				},
			]		
		},
		items() {
			let items = []
			if (this.articles_pre_import.articles)
			this.articles_pre_import.articles.forEach(article => {
				items.push({
					articulo: article.name,
					costo_actual: this.price(article.pivot.costo_actual),
					costo_nuevo: this.price(article.pivot.costo_nuevo),
					porcentaje: this.get_procentaje_de_aumento(article),
				})
			})
			return items
		}
	},
	methods: {
		get_procentaje_de_aumento(article) {
			let porcentaje = (Number(article.pivot.costo_nuevo) * 100 / Number(article.pivot.costo_actual)) - 100
			// return porcentaje+'%'
			return porcentaje.toFixed(2)+'%'
		} 
	}
}
</script>