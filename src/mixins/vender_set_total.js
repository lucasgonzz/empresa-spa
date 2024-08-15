// import model_functions from '@/mixins/model_functions'
export default {
	// mixins: [model_functions],
	computed: {
		vender_items() {
			return this.$store.state.vender.items 
		},
		discounts_id() {
			return this.$store.state.vender.discounts_id 
		},
		surchages_id() {
			return this.$store.state.vender.surchages_id 
		},
		discounts_in_services() {
			return this.$store.state.vender.discounts_in_services 
		},
		surchages_in_services() {
			return this.$store.state.vender.surchages_in_services 
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

			let sub_total = 0  

			if (!total) {

				total = 0
				
				this.total_articles = 0
				this.total_services = 0
				
				let new_items = []

				this.vender_items.forEach(item => {
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
				
				sub_total = this.total_articles + this.total_services

				total = this.aplicar_current_acount_payment_method_discounts(sub_total)

				if (this.owner.redondear_centenas_en_vender) {
					console.log('total sin redondear:')
					console.log(total)
					total = this.redondear_centenas(total)
				}
				
			}
			this.$store.commit('vender/setSubTotal', sub_total)
			this.$store.commit('vender/setTotal', total)
			
			console.log('se puso el sub_total en '+sub_total)
			console.log('se puso el total en '+total)
		},
		redondear_centenas(num) {
			return Math.ceil(num / 100) * 100;
		},
		aplicar_discounts() {
			if (this.discounts_id.length) {

				let discounts_store_ = this.discounts_store 

				let sale_discounts = []

				this.discounts_id.forEach(discount_id => {

					let discount_to_add = discounts_store_.find(_discount => _discount.id == discount_id)

					sale_discounts.push(discount_to_add)

				}) 

				sale_discounts.forEach(discount => {
					this.total_articles -= this.total_articles * Number(discount.percentage) / 100 
					if (this.discounts_in_services) {
						this.total_services -= this.total_services * Number(discount.percentage) / 100 
					}
				})
			}

		},
		aplicar_surchages() {
			if (this.surchages_id.length) {
				let surchages = this.surchages_store 
				
				let sale_surchages = []
				
				this.surchages_id.forEach(id => {
					sale_surchages.push(surchages.find(item => item.id == id))
				}) 

				sale_surchages.forEach(_surchage => {
					this.total_articles += this.total_articles * Number(_surchage.percentage) / 100 
					if (this.surchages_in_services) {
						this.total_services += this.total_services * Number(_surchage.percentage) / 100 
					}
				})
			}
		}
	}
}