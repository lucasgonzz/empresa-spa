export default {
	computed: {
		addresses() {
			return this.$store.state.address.models 
		},
		price_types() {
			return this.$store.state.price_type.models 
		},
		properties_to_show() {
			let props = this.get_properties_to_show_ordenadas('article')

			if (this.authenticated && this.hasExtencion('articulo_margen_de_ganancia_segun_lista_de_precios')) {

				props = props.filter(prop => prop.key != 'percentage_gain')
				props = props.filter(prop => prop.key != 'price')
				props = props.filter(prop => prop.key != 'final_price')

				this.price_types.forEach(price_type => {

					if (this.no_esta_agregada('price_type_', price_type, props)) {

						props.push({
							text: price_type.name,
							key: 'price_type_'+price_type.id,
							type: 'text',
							// not_show_on_form: true,
						})
					}
					
				})
			}

			if (this.current_acount_payment_method_discounts.length) {

				this.current_acount_payment_method_discounts.forEach(dicount => {

					if (this.no_esta_agregada('payment_method_discount_', dicount, props)) {

						props.push({
							text: dicount.current_acount_payment_method.name,
							key: 'payment_method_discount_'+dicount.id,
							type: 'text',
							not_show_on_form: true,
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
						not_show_on_form: true,
					})
				}
			})

			console.log('Listado props:')
			console.log(props)

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
		get_model_form_price_type_slot(model) {
			return 'price_type_'+model.id
		},
		get_table_price_type_prop(model) {
			return 'table-prop-price_type_'+model.id
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
		get_price_type_price(article, price_type) {

			let article_price_type = article.price_types.find(_price_type => {
				return _price_type.id == price_type.id
			})

			if (typeof article_price_type != 'undefined') {

				return this.price(article_price_type.pivot.final_price)
			}
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