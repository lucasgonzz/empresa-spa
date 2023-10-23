<template>
<div
class="m-l-0 m-sm-l-15 m-t-10 m-b-10 m-md-b-0 m-md-t-0">
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
export default {
	computed: {
		articles() {
			return this.$store.state.article.models
		},
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
		articles_stock_min() {
			return this.articles.filter(article => {
				return article.stock && article.stock_min && article.stock <= article.stock_min  
			})
		},
		articles_stock_0() {
			return this.articles.filter(article => {
				return article.stock != null && article.stock <= 0
			})
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