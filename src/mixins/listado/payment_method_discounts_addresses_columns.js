export default {
	computed: {
		addresses() {
			return this.$store.state.address.models
		},
		price_types() {
			return this.$store.state.price_type.models
		},
		props_to_show() {
			return this.$store.state.article.props_to_show
		},
		properties_to_show() {
	        return this.set_properties_to_show()
	    }
	},
	methods: {
		set_properties_to_show() {

			let props = []

			if (this.props_to_show.length) {

				props = this.props_to_show
			} else {

				props = this.get_properties_to_show_ordenadas('article')
			}

			// En el listado NO renderizamos group_title (eso es solo para el modal/Form)
		    // Si entran acá, rompen el cálculo de índices y el orden de columnas.
		    props = props.filter(prop => prop.key)

			if (
				this.user
				&& !this.owner.online
				&& !this.hasExtencion('imagenes')
			) {
				props = props.filter(prop => prop.key != 'images')
			}

			return props
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
			return this.article_simbolo_moneda(article, price)
		},
		get_price_type_price(article, price_type) {

			if (this.hasExtencion('ventas_en_dolares')) {

				let price_type_monedas = article.price_type_monedas.filter(_price_type => {
					return _price_type.price_type_id == price_type.id
				})


				if (price_type_monedas.length > 0) {

					let pesos = price_type_monedas.find(p => p.moneda_id == 1)

					let price

					if (
						typeof pesos != 'undefined'
						&& typeof pesos.final_price != 'undefined'
						&& pesos.final_price != ''
						&& pesos.final_price !== null
						&& pesos.final_price != 0
					) {

						price = this.price(pesos.final_price)
					}


					let dolar = price_type_monedas.find(p => p.moneda_id == 2)

					if (
						typeof dolar != 'undefined'
						&& typeof dolar.final_price != 'undefined'
						&& dolar.final_price != ''
						&& dolar.final_price !== null
						&& dolar.final_price != 0
					) {

						price += ' | '+this.price(dolar.final_price)+' USD'
					}

					return price
				}

			} else {

				let article_price_type = article.price_types.find(_price_type => {
					return _price_type.id == price_type.id
				})

				if (typeof article_price_type != 'undefined') {

					return this.price(article_price_type.pivot.final_price)
				}
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

				console.log('sumando address de las variants')

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
		},
	},
}
