export default {
	computed: {
		items() {
			return this.$store.state.vender.items 
		},
	},
	methods: {

		/* 
			Controlo si a los articulos que se agregaron por defecto, 
		 	se les asigno un precio, si no se les asigno un precio,
		 	los saco de la venta antes de mandarla a que se guarde
		*/ 
		checkDefaultArticles() {

			if (this.hasExtencion('articles_default_in_vender')) {
				
				let default_articles = this.items.filter(item => {
					return item.is_article 
							&& item.default_in_vender 
							&& (item.price_vender == '' && typeof item.varios_precios == 'undefined')
				})
				default_articles.forEach(article => {
					this.$store.commit('vender/removeItem', article)
				})
			}

		},
	}
}