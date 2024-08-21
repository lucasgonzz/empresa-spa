export default {
	computed: {
		addresses() {
			return this.$store.state.address.models 
		},
		properties_to_show() {
			let props = this.get_properties_to_show_ordenadas('article')

			if (this.current_acount_payment_method_discounts.length) {

				this.current_acount_payment_method_discounts.forEach(dicount => {

					if (this.no_esta_agregada('payment_method_discount_', dicount, props)) {

						props.push({
							text: dicount.current_acount_payment_method.name,
							key: 'payment_method_discount_'+dicount.id,
							type: 'text',
						})
					}
				})
			}

			this.addresses.forEach(address => {

				if (this.no_esta_agregada('address_', address, props)) {

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
		no_esta_agregada(model_name, model, props) {
			let prop = props.find(_prop => {
				return _prop.key == model_name+model.id 
			})
			return typeof prop == 'undefined'
		},
		get_table_relation_prop(relation_name, model) {
			return 'table-prop-'+relation_name+'_'+model.id
		},
		get_table_address_prop(model) {
			return 'table-prop-address_'+model.id
		},
		get_table_paymen_discount_prop(model) {
			return 'table-prop-payment_method_discount_'+model.id
		},
		get_payment_discount(article, payment_discount) {
			let price = this.aplicar_monto_descuento(article.final_price, payment_discount.current_acount_payment_method.id)
			return this.price(this.redondear(price))
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