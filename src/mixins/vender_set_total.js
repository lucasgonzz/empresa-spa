import model_functions from '@/mixins/model_functions'
export default {
	mixins: [model_functions],
	computed: {
		items() {
			return this.$store.state.vender.items 
		},
		discounts_id() {
			return this.$store.state.vender.discounts_id 
		},
		surchages_id() {
			return this.$store.state.vender.surchages_id 
		},
		discounts_store() {
			return this.$store.state.discount.models 
		},
		surchages_store() {
			return this.$store.state.surchage.models 
		},
	},
	data() {
		return {
			total_articles: 0,
			total_services: 0,
		}
	},
	methods: {
		setTotal(total = null) {
			if (!total) {
				total = 0
				this.total_articles = 0
				this.total_services = 0
				let new_items = []

				this.items.forEach(item => {
					item.total = this.getTotalItem(item, false)
					if (item.is_service) {
						this.total_services += this.getTotalItem(item, false)
					} else if (item.is_article) {
						this.total_articles += this.getTotalItem(item, false)
					}
					// total += this.getTotalItem(item, false)
					new_items.push(item)
				})

				this.aplicar_discounts()

				this.aplicar_surchages()
				
				this.$store.commit('vender/setItems', new_items)
				
				total = this.total_articles + this.total_services

				total = this.aplicar_current_acount_payment_method_discounts(total)
				
				console.log('se puso el total en '+total)
			}
			this.$store.commit('vender/setTotal', total)
		},
		aplicar_discounts() {
			if (this.discounts_id.length) {

				let discounts_store_ = discounts_store.state.models 

				let sale_discounts = []

				this.discounts_id.forEach(discount_id => {

					let discount_to_add = discounts_store_.find(_discount => _discount.id == discount_id)

					sale_discounts.push(discount_to_add)

				}) 

				sale_discounts.forEach(discount => {
					this.total_articles -= this.total_articles * Number(discount.percentage) / 100 
					if (state.discounts_in_services) {
						this.total_services -= this.total_services * Number(discount.percentage) / 100 
					}
				})
			}

		},
		aplicar_surchages() {
			if (this.surchages_id.length) {
				let surchages = this.surchages_store.state.models 
				
				let sale_surchages = []
				
				this.surchages_id.forEach(id => {
					sale_surchages.push(surchages.find(item => item.id == id))
				}) 

				sale_surchages.forEach(_surchage => {
					this.total_articles += this.total_articles * Number(_surchage.percentage) / 100 
					if (state.surchages_in_services) {
						this.total_services += this.total_services * Number(_surchage.percentage) / 100 
					}
				})
			}
		}
	}
}