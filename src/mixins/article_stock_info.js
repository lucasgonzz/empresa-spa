export default {
	computed: {
		is_filtered() {
			return this.$store.state.article.is_filtered
		},
		filtered() {
			return this.$store.state.article.filtered
		},
		articles() {
			if (this.is_filtered) {
				console.log('sumando precios de filtrados')
				return this.filtered
			}
			return this.$store.state.article.models
		},
		articles_stock_min() {
			return this.articles.filter(article => {
				// return article.stock != null && article.stock_min != null && article.stock <= article.stock_min  
				return article.stock && article.stock_min && article.stock <= article.stock_min  
			})
		},
		articles_stock_0() {
			return this.articles.filter(article => {
				return article.stock != null && article.stock <= 0
			})
		},
	}
}