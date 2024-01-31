<template>
<div
class="m-l-0 m-sm-l-15 m-t-15 m-r-15">
	<b-button
	class="m-r-15"
	v-b-modal="'articles-stock-min'"
	variant="warning"
	v-if="articles_stock_min.length">
		{{ articles_stock_min.length }} con stock minimo
	</b-button>
	<b-button
	v-b-modal="'articles-stock-0'"
	variant="danger"
	v-if="articles_stock_0.length">
		{{ articles_stock_0.length }} sin stock 
	</b-button>
	<b-button-group
	v-if="is_admin"
	class="m-l-15 d-none d-lg-inline-block">
		<b-button
		title="¿De donde viene este dato?"
		v-b-popover.hover.bottom="'Sumamos los costos de los articulos multiplicados por su tock, siempre que tengan los articulos tengan asigando un stock y sea mayor a 0'" 
		variant="outline-success">
			Costos: {{ price(total.cost) }}  
		</b-button>
		<b-button
		title="¿De donde viene este dato?"
		v-b-popover.hover.bottom="'Sumamos los precios finales de los articulos multiplicados por su tock, siempre que tengan los articulos tengan asigando un stock y sea mayor a 0'" 
		variant="success">
			Precios: {{ price(total.final_price) }}  
		</b-button>
	</b-button-group>
</div>
</template>
<script>
import article_stock_info from '@/mixins/article_stock_info'
export default {
	mixins: [article_stock_info],
	computed: {
		total() {
			let total = {
				cost: 0,
				final_price: 0
			}
			this.articles.forEach(article => {
				if (article.stock && article.stock > 0) {
					if (article.cost) {
						total.cost += article.cost * article.stock
					}
					total.final_price += article.final_price * article.stock
				}
			})
			return total
		},
	},
}
</script>
<style scoped lang="sass">
.container-fluid
	padding: 0

.botones-opciones
	display: flex
	flex-direction: row
	align-items: center	
	justify-content: flex-end
	@media screen and (max-width: 768px)
		margin-top: 1em
</style>