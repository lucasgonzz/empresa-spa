<template>
<div
class="m-l-15">
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
</div>
</template>
<script>
export default {
	computed: {
		articles() {
			return this.$store.state.article.models
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