export default {
	methods: {
		total_productos(sales) {
			let total = 0
			sales.forEach(sale => {
				sale.articles.forEach(article => {
					total += Number(article.pivot.amount)
				})
				sale.promocion_vinotecas.forEach(promo => {
					total += Number(promo.pivot.amount)
				})
			})
			return total 
		}
	}
}