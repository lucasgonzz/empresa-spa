export default {
	methods: {
		getArticleAmountInSale(sale, selected_article) {
			let article = sale.articles.find(article => {
				return article.id == selected_article.id 
			})
			return article.pivot.amount - article.pivot.returned_amount
		}
	}
}