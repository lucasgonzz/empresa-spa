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
	},
	data() {
		return {
			properties_to_show: [],
		}
	},
	watch: {
		// addresses() {
		// 	this.set_properties_to_show()
		// },
		price_types() {
			console.log('Se va a llamar desde price_types')
			this.set_properties_to_show()
		},
		props_to_show() {
			console.log('Se va a llamar desde props_to_show')
			this.set_properties_to_show()
		},
	},
	created() {
		// console.log('Se va a llamar desde CREATED')
		// this.set_properties_to_show()
	},
	methods: {
		set_properties_to_show() {

			let props = []

			if (this.props_to_show.length) {

				props = this.props_to_show
			} else {

				props = this.get_properties_to_show_ordenadas('article')
			}

			console.log('Empieza con estas props:')
			console.log(props)


			if (!this.owner.online) {
				props = props.filter(prop => prop.key != 'images')
			}

			if (this.hasExtencion('no_usar_codigos_de_barra')) {
				props = props.filter(prop => prop.key != 'bar_code')
			}

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
							no_usar_en_filtros: true,
							// not_show_on_form: true,
						})
					}
					
				})
			}

			// Encuentra la posición de la propiedad 'final_price'
			const final_price_index = props.findIndex(prop => prop.key === 'final_price');
			let insertIndex = final_price_index + 1;

			if (this.current_acount_payment_method_discounts.length) {

				this.current_acount_payment_method_discounts.forEach(dicount => {

					if (this.no_esta_agregada('payment_method_discount_', dicount, props)) {

						props.splice(insertIndex, 0, {
							text: dicount.current_acount_payment_method.name,
							key: 'payment_method_discount_'+dicount.id,
							type: 'text',
							not_show_on_form: true,
							no_usar_en_filtros: true,
						});
					}
				})
			}

			// Encuentra la posición de la propiedad 'stock'
			const stockIndex = props.findIndex(prop => prop.key === 'stock');
			insertIndex = stockIndex + 1;

			this.addresses.forEach(address => {

				if (this.no_esta_agregada('address_', address, props)) {

					props.splice(insertIndex, 0, {
						text: address.street,
						key: 'address_' + address.id,
						type: 'text',
						not_show_on_form: true,
						no_usar_en_filtros: true,
					});

					// console.log('agregando la direccion '+address.street)
					// props.push({
					// 	text: address.street,
					// 	key: 'address_'+address.id,
					// 	type: 'text',
					// 	not_show_on_form: true,
					// 	no_usar_en_filtros: true,
					// })
				}
			})

			// props.push({
			// 	text: 'Creado',
			// 	key: 'created_at',
			// 	type: 'date',
			// 	is_date: true,
			// 	not_show_on_form: true,
			// })
			// props.push({
			// 	text: 'Actualizado',
			// 	key: 'updated_at',
			// 	type: 'date',
			// 	is_date: true,
			// 	not_show_on_form: true,
			// })

			console.log('Listado props:')
			console.log(props)

			this.properties_to_show = props
		},
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