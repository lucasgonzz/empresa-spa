import computed from '@/mixins/vender/computed'
export default {
	mixins: [computed],
	methods: {

		check_stock_mayor_a_cero(item) {

			if (
				!this.guardar_como_presupuesto 
				&& this.hasExtencion('check_article_stock_en_vender')
				) {

				if (item.is_article) {

					if (item.stock === null || item.stock > 0) {
						return true 
					}
					this.$toast.error('Articulo sin stock, NO se agrego')
					document.getElementById('article-bar-code').value = ''
					return false 

				} else if (item.is_combo) {

					let tiene_stock = true 

					let articles_sin_stock = item.articles.filter(article => {

						if (article.stock !== null && article.stock <= 0) {

							tiene_stock = false
							return true 
						}
					})

					articles_sin_stock.forEach(article => {

						this.$toast.error('El articulo '+article.name+' no tiene stock')
					})

					return tiene_stock
				}
			}
			return true 
		},

		check_stock_disponible(item) {

			let stock_disponible = true

			
			if (
				!this.guardar_como_presupuesto 
				&& this.hasExtencion('check_article_stock_en_vender')) {

				let cantidad_para_vender = item.amount

				
				// if (cantidad_para_vender == '') {
				// 	cantidad_para_vender = 1
				// }

				cantidad_para_vender = Number(cantidad_para_vender)

				if (item.is_article) {

					if (item.stock && Number(item.stock) < cantidad_para_vender) {
						
						stock_disponible = false 
						
						this.$toast.error('Solo hay '+item.stock+' en stock')
					}

				} else if (item.is_combo) {

					let articles_sin_stock = item.articles.filter(article => {

						if (article.stock && Number(article.stock) < cantidad_para_vender) {

							stock_disponible = false
							return true 
						}
					})

					articles_sin_stock.forEach(article => {

						this.$toast.error(article.name+' solo tiene '+article.stock+' en stock')
					})

				}
			}
			return stock_disponible
		},
	}
}