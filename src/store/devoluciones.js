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

		articles: [],

		total_devolucion: 0,

		regresar_stock: 1,
		address_id: 0,
		generar_current_acount: 1,
		facturar_nota_credito: 0,
	},
	mutations: {
		set_num_sale(state, value) {
			state.num_sale = value 
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
		set_articles(state, value) {
			state.articles = value 
		},
		add_article(state, value) {
			state.articles.push(value) 
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
		remove_article(state, value) {
			let index = state.articles.findIndex(art => art.id == value.id)
			if (index != -1) {
				state.articles.splice(index, 1)
			}
		},



		format_articles(state, sale) {

			console.log('format_articles')

			let _articles = []

			sale.articles.forEach(article => {
				_articles.push({
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

			console.log(_articles)
			state.articles = _articles
			console.log(state.articles)
		},


		// set_total_devolucion(state) {

		// 	let total_devolucion = 0
			
		// 	state.articles.forEach(article => {

		// 		let unidades_devueltas = Number(article.returned_amount)

		// 		if (article.ya_devueltas) {
		// 			unidades_devueltas -= Number(article.ya_devueltas)
		// 		}

		// 		console.log('unidades_devueltas: '+unidades_devueltas)
		// 		// if (unidades_devueltas > 0) {

		// 			let total_article = article.price_vender * unidades_devueltas
		// 			console.log('total_article: '+total_article)
					
		// 			if (article.pivot.discount) {

		// 				total_article -= total_article * article.pivot.discount / 100
		// 			}	

		// 			if (state.sale) {

		// 				state.sale.discounts.forEach(discount => {

		// 					total_article -= total_article * discount.pivot.percentage / 100
		// 				})

		// 				state.sale.surchages.forEach(surchage => {

		// 					total_article += total_article * surchage.pivot.percentage / 100
		// 				})
		// 			}


		// 			total_devolucion += total_article

		// 			article.unidades_devueltas = unidades_devueltas
		// 		// }
		// 	})

		// 	if ()

		// 	console.log('set_total_devolucion: '+total_devolucion)

		// 	state.total_devolucion = total_devolucion
		// },
		
		// aplicar_discounts() {
		// 	if (this.discounts_id.length) {

		// 		let discounts_store_ = this.discounts_store 

		// 		let sale_discounts = []

		// 		this.discounts_id.forEach(discount_id => {

		// 			let discount_to_add = discounts_store_.find(_discount => _discount.id == discount_id)

		// 			sale_discounts.push(discount_to_add)

		// 		}) 

		// 		sale_discounts.forEach(discount => {
		// 			this.total_articles -= this.total_articles * Number(discount.percentage) / 100 
		// 			this.total_combos -= this.total_combos * Number(discount.percentage) / 100 
		// 			if (this.discounts_in_services) {
		// 				this.total_services -= this.total_services * Number(discount.percentage) / 100 
		// 			}
		// 		})
		// 	}

		// },
		// aplicar_surchages() {
		// 	if (this.surchages_id.length) {
		// 		let surchages = this.surchages_store 
				
		// 		let sale_surchages = []
				
		// 		this.surchages_id.forEach(id => {
		// 			sale_surchages.push(surchages.find(item => item.id == id))
		// 		}) 

		// 		sale_surchages.forEach(_surchage => {
		// 			this.total_articles += this.total_articles * Number(_surchage.percentage) / 100 
		// 			this.total_combos += this.total_combos * Number(_surchage.percentage) / 100 
		// 			if (this.surchages_in_services) {
		// 				this.total_services += this.total_services * Number(_surchage.percentage) / 100 
		// 			}
		// 		})
		// 	}
		// }
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
