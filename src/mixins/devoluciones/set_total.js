export default {
	data() {
		return {
			total_devolucion: 0,
		}
	},
	computed: {
		articles() {
			return this.$store.state.devoluciones.articles
		},
		discounts_id() {
			return this.$store.state.devoluciones.discounts_id
		},
		surchages_id() {
			return this.$store.state.devoluciones.surchages_id
		},
		discounts_store() {
			return this.$store.state.discount.models
		},
		surchages_store() {
			return this.$store.state.surchage.models
		},
	},
	methods: {
		set_total_devolucion() {

			console.log('mixin set_total_devolucion')
			this.total_devolucion = 0
			
			this.articles.forEach(article => {

				let unidades_devueltas = Number(article.returned_amount)

				if (article.ya_devueltas) {
					unidades_devueltas -= Number(article.ya_devueltas)
				}

				let total_article = article.price_vender * unidades_devueltas
				console.log('total_article: '+total_article)
				
				if (article.pivot.discount) {

					total_article -= total_article * article.pivot.discount / 100
				}	


				this.total_devolucion += total_article

				article.unidades_devueltas = unidades_devueltas
			})

			this.aplicar_discounts()
			this.aplicar_surchages()

			console.log('set_total_devolucion: '+this.total_devolucion)

			this.$store.commit('devoluciones/set_total_devolucion_manual', this.total_devolucion)
		},
		aplicar_discounts() {
			if (this.discounts_id.length) {

				let discounts_store_ = this.discounts_store 

				let devolucion_discounts = []

				this.discounts_id.forEach(discount_id => {

					let discount_to_add = discounts_store_.find(_discount => _discount.id == discount_id)

					devolucion_discounts.push(discount_to_add)

				}) 

				devolucion_discounts.forEach(discount => {
					this.total_devolucion -= this.total_devolucion * Number(discount.percentage) / 100 
				})
			}
		},
		aplicar_surchages() {
			if (this.surchages_id.length) {
				let surchages = this.surchages_store 
				
				let devolucion_surchages = []
				
				this.surchages_id.forEach(id => {
					devolucion_surchages.push(surchages.find(item => item.id == id))
				}) 

				devolucion_surchages.forEach(surchage => {
					this.total_devolucion += this.total_devolucion * Number(surchage.percentage) / 100 
				})
			}
		}
	}
}