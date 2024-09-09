<template>
	<div 
	v-if="selected_article"
	class="card selected-article-card">
		<p>
			Articulo: <strong>{{ selected_article.name }}</strong>
		</p>
		<p>
			Stock actual: <strong>{{ selected_article.stock }}</strong>
		</p>
		<p>
			<strong>{{ unidades_vendidas }}</strong> unidades vendidas
		</p>
	</div>
</template>
<script>
export default {
	computed: {
		selected_article() {
			return this.$store.state.reportes.article_performance.selected_article
		},
		article_performances() {
			return this.$store.state.reportes.article_performance.models 
		},
		unidades_vendidas() {
			let total = 0
			this.article_performances.forEach(article_performance => {
				total += Number(article_performance.amount)
			})
			return total
		}
	},
}
</script>
<style lang="sass">
.selected-article-card
	width: 500px
	padding: 15px 
	margin-top: 20px
	p 
		text-align: left
</style>