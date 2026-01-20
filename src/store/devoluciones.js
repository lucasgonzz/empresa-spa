import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,
	state: {
		num_sale: '',
		client: null,
		
		sale: null,

		discounts_id: [],
		surchages_id: [],

		items: [],

		total_devolucion: 0,

		descriptions: [],

		regresar_stock: 1,
		address_id: 0,
		generar_current_acount: 1,
		facturar_nota_credito: 0,
	},
	mutations: {
		set_num_sale(state, value) {
			state.num_sale = value 
		},
		set_descriptions(state, value) {
			state.descriptions = value 
		},
		add_description(state) {
			state.descriptions.push({
				notes: '',
				price: '',
				iva_id: 2,
			})
		},
		delete_description(state, description) {

			let index = state.descriptions.findIndex(d => {
				return d.notes == description.notes
				&& d.price == description.price
			})

			if (index != -1) {
				state.descriptions.splice(index, 1)
			}
		},
		set_client(state, value) {
			state.client = value 
		},
		set_sale(state, value) {
			state.sale = value 
		},
		set_discounts_id(state, value) {
			state.discounts_id = value
		},
		add_discount_id(state, value) {
			state.discounts_id.push(value)
		},
		set_surchages_id(state, value) {
			state.surchages_id = value
		},
		add_surchage_id(state, value) {
			state.surchages_id.push(value)
		},
		set_items(state, value) {
			state.items = value 
		},
		add_item(state, value) {
			state.items.push(value) 
		},
		set_total_devolucion_manual(state, value) {
			console.log('set_total_devolucion_manual: '+value)
			state.total_devolucion = value 
		},
		set_regresar_stock(state, value) {
			state.regresar_stock = value 
		},
		set_generar_current_acount(state, value) {
			state.generar_current_acount = value 
		},
		set_address_id(state, value) {
			state.address_id = value 
		},
		set_facturar_nota_credito(state, value) {
			state.facturar_nota_credito = value 
		},
		remove_item(state, value) {
			let index = state.items.findIndex(item => item.id == value.id)
			if (index != -1) {
				state.items.splice(index, 1)
			}
		},


		format_items(state, sale) {

			console.log('format_articles, sale:')
			console.log(sale)

			let items = []

			sale.articles.forEach(article => {
				items.push({
					...article,
					is_article: true,
					price_vender: article.pivot.price,
					amount: article.pivot.amount,
					article_variant_id: article.pivot.article_variant_id,
					discount: article.pivot.discount,
					returned_amount: article.pivot.returned_amount,
					ya_devueltas: article.pivot.returned_amount,
				})
			})

			sale.services.forEach(service => {
				items.push({
					...service,
					is_service: true,
					price_vender: service.pivot.price,
					amount: service.pivot.amount,
					discount: service.pivot.discount,
					returned_amount: service.pivot.returned_amount,
					ya_devueltas: service.pivot.returned_amount,
				})
			})

			console.log('items:')
			console.log(items)
			state.items = items
			console.log(state.items)
		},
	},
	actions: {

		search_sale({state, commit}) {
				
			commit('auth/setMessage', 'Buscando venta', {root: true})
			commit('auth/setLoading', true, {root: true})

			return axios.get('api/devoluciones/search-sale/'+state.num_sale)
			.then(res => {
				
				commit('auth/setLoading', false, {root: true})

				let sale = res.data.sale  

				if (sale) {

					commit('set_sale', sale)

					if (sale.client) {

						commit('set_client', sale.client)
					}

					if (sale.address_id) {

						commit('set_address_id', sale.address_id)
					}

					if (sale.afip_ticket) {

						commit('set_facturar_nota_credito', 1)
					} else {

						commit('set_facturar_nota_credito', 0)
					}

					if (
						sale.client 
						&& !sale.omitir_en_cuenta_corriente
					) {

						commit('set_generar_current_acount', 1)
					} else {

						commit('set_generar_current_acount', 0)
					}

					commit('format_articles', sale)
				} else {

					commit('set_sale', null)
				}
			})
			.catch(err => {
				commit('auth/setLoading', false, {root: true})
			})
		},
	},
}
