export default {
	computed: {
		vender_items() {
			return this.$store.state.vender.items 
		},
	},
	methods: {
		setItemsPrices(only_the_last = false, from_pivot = false) {
			if (only_the_last) {
				console.log('setenado precio el ultimo')
				let last_item = this.vender_items[0] 
				last_item.price_vender = this.getPriceVender(last_item) 
			} else {
				console.log('seteando todos los precios. from_pivot: '+from_pivot)
				console.log(this.vender_items)
				this.vender_items.forEach(item => {
					// if (!item.default_in_vender) {
						item.price_vender = this.getPriceVender(item, from_pivot) 
					// }
				})
			}
		},
	}
}