export default {
	computed: {
		addresses() {
			return this.$store.state.address.models 
		},
		properties_to_show() {
			let props = this.get_properties_to_show_ordenadas('article')

			this.addresses.forEach(address => {

				if (this.no_esta_agregada(address, props)) {

					console.log('agregando la direccion '+address.street)
					props.push({
						text: address.street,
						key: 'address_'+address.id,
						type: 'text',
					})
				}
			})

			return props 
		},
	},
	methods: {
		no_esta_agregada(address, props) {
			let prop = props.find(_prop => {
				return _prop.key == 'address_'+address.id 
			})
			return typeof prop == 'undefined'
		},
		get_table_address_prop(address) {
			return 'table-prop-address_'+address.id
		},
		get_address_stock(article, address) {
			
			let article_address = article.addresses.find(_address => {
				return _address.id == address.id
			})

			if (typeof article_address != 'undefined') {

				return article_address.pivot.amount
			}

			if (article.article_variants.length) {

				let stock_in_address = 0

				article.article_variants.forEach(variant => {

					variant.addresses.forEach(variant_address => {

						if (variant_address.id == address.id) {

							stock_in_address += Number(variant_address.pivot.amount)
						}
					})
				})

				return stock_in_address
			}
		}
	}
}