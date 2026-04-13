export default {
	data() {
		return {
			total_devolucion: 0,
			total_articles: 0,
			total_services: 0,
		}
	},
	computed: {
		items() {
			return this.$store.state.devoluciones.items
		},
		descriptions() {
			return this.$store.state.devoluciones.descriptions
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
		aplicar_recargos_directo_a_items() {
			return this.$store.state.devoluciones.aplicar_recargos_directo_a_items
		},
		sale() {
			return this.$store.state.devoluciones.sale
		},
	},
	methods: {
		set_total_devolucion() {

			console.log('mixin set_total_devolucion')

			console.log(this.items)
			this.total_devolucion = 0
			this.total_articles = 0
			this.total_services = 0
			
			this.items.forEach(item => {

				let unidades_devueltas = Number(item.returned_amount)

				if (item.ya_devueltas) {
					unidades_devueltas -= Number(item.ya_devueltas)
				}

				let total_item = item.price_vender * unidades_devueltas
				
				if (item.pivot.discount) {

					total_item -= total_item * item.pivot.discount / 100
				}	


				if (item.is_article) {
					this.total_articles += total_item
				} else if (item.is_service) {
					this.total_services += total_item
				}

				item.unidades_devueltas = unidades_devueltas
			})

			this.aplicar_discounts()
			this.aplicar_surchages()

			this.aplicar_descriptions()

			this.total_devolucion += this.total_articles + this.total_services

			console.log('set_total_devolucion: '+this.total_devolucion)

			this.$store.commit('devoluciones/set_total_devolucion_manual', this.total_devolucion)
		},
		aplicar_descriptions() {
			this.descriptions.forEach(des => {
				if (
					des.price
					&& Number(des.price) > 0
				) {
					this.total_devolucion += Number(des.price)
				}
			})
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
					this.total_articles -= this.total_articles * Number(discount.percentage) / 100 

					if (this.sale.discounts_in_services) {
						this.total_services -= this.total_services * Number(discount.percentage) / 100 
					}
				})
			}
		},
		aplicar_surchages() {
			console.log('aplicar_recargos_directo_a_items:')
			console.log(this.aplicar_recargos_directo_a_items)
			if (
				!this.aplicar_recargos_directo_a_items
				&& this.surchages_id.length
			) {
				let surchages = this.surchages_store 
				
				let devolucion_surchages = []
				
				this.surchages_id.forEach(id => {
					devolucion_surchages.push(surchages.find(item => item.id == id))
				}) 

				devolucion_surchages.forEach(surchage => {
					this.total_articles += this.total_articles * Number(surchage.percentage) / 100 

					if (this.sale.surchages_in_services) {
						this.total_services += this.total_services * Number(surchage.percentage) / 100 
					}
				})
			}
		}
	}
}