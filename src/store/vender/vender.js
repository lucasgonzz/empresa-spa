// import Vue from 'vue'
import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL
import previus_sales from '@/store/vender/previus_sales'
import discounts_store from '@/store/discount'
import surchages_store from '@/store/surchage'
import mixin_vender from '@/mixins/vender'
import model_functions from '@/mixins/model_functions'
export default {
	namespaced: true,
	state: {
		items: [],
		article: {bar_code: '', provider_code: '', num: '', name: '', amount: ''},
		new_article: '',
		article_for_sale: {},
		total: 0,
		
		client: null,
		discounts_id: [],
		surchages_id: [],
		price_type: null,
		save_current_acount: 1,
		make_current_acount_pago: 0,
		save_nota_credito: 0,
		nota_credito_description: '',
		save_afip_ticket: 0,
		discounts_in_services: 0,
		surchages_in_services: 0,
		current_acount_payment_method_id: 3,
		afip_information_id: 0,
		employee_id: 0,
		address_id: 0,
		sale_type_id: 0,

		returned_items: [],

		vendiendo: false,
		sale: null,
	},
	mutations: {
		setItems(state, value) {
			state.items = value
		},
		addItem(state, value) {
			state.items.unshift(value)
		},
		setArticle(state, value) { 
			if (!value) {
				state.article.bar_code = ''
				state.article.name = ''
				state.article.amount = ''
			} else {
				state.article = value
			}
		},
		addCombo(state, value) {
			state.items.unshift(value)
		},
		setNewArticle(state, value) {
			state.new_article = value
		},
		addItem(state, item) {
			state.items.unshift(item)
		},
		setArticleForSale(state, value) {
			state.article_for_sale = value
		},
		setVendiendo(state, value) {
			state.vendiendo = value
		},
		setDiscountsId(state, value) {
			state.discounts_id = value
		},
		addDiscountId(state, value) {
			state.discounts_id.push(value)
		},
		setSurchagesId(state, value) {
			state.surchages_id = value
		},
		addSurchageId(state, value) {
			state.surchages_id.push(value)
		},
		setPriceType(state, value) {
			state.price_type = value
		},
		setSaveCurrentAcount(state, value) {
			state.save_current_acount = value
		},
		setMakeCurrentAcountPago(state, value) {
			state.make_current_acount_pago = value
		},
		setSaveNotaCredito(state, value) {
			state.save_nota_credito = value
		},
		setNotaCreditoDescription(state, value) {
			state.nota_credito_description = value
		},
		setSaveAfipTicket(state, value) {
			state.save_afip_ticket = value
		},
		setDiscountsInServices(state, value) {
			state.discounts_in_services = value
		},
		setSurchagesInServices(state, value) {
			state.surchages_in_services = value
		},
		setCurrentAcountPaymentMethodId(state, value) {
			state.current_acount_payment_method_id = value
		},
		setAfipInformationId(state, value) {
			state.afip_information_id = value
		},
		setEmployeeId(state, value) {
			state.employee_id = value
		},
		setAddressId(state, value) {
			state.address_id = value
		},
		setReturnedItems(state, value) {
			state.returned_items = value
		},
		addReturnedItem(state, value) {
			let index = state.returned_items.findIndex(item => {
				return item.id == value.id 
			})
			if (index == -1) {
				state.returned_items.push(value)
			} else {
				state.returned_items.splice(index, 1, value)
			}
		},
		setSaleTypeId(state, value) {
			state.sale_type_id = value
		},
		setClient(state, value) {
			state.client = value
		},
		setSale(state, value) {
			state.sale = value
		},
		setTotal(state, total = null) {
			if (total) {
				state.total = total
			} else {
				state.total = 0
				let total_articles = 0
				let total_services = 0
				let new_items = []
				state.items.forEach(item => {
					item.total = model_functions.methods.getTotalItem(item, false)
					if (item.is_service) {
						total_services += model_functions.methods.getTotalItem(item, false)
					} else if (item.is_article) {
						total_articles += model_functions.methods.getTotalItem(item, false)
					}
					state.total += model_functions.methods.getTotalItem(item, false)
					new_items.push(item)
				})
				if (state.discounts_id.length) {
					let discounts = discounts_store.state.models 
					let sale_discounts = []
					state.discounts_id.forEach(id => {
						sale_discounts.push(discounts.find(item => item.id == id))
					}) 
					console.log('sale_discounts')
					console.log(sale_discounts)
					sale_discounts.forEach(discount => {
						total_articles -= total_articles * Number(discount.percentage) / 100 
						if (state.discounts_in_services) {
							total_services -= total_services * Number(discount.percentage) / 100 
						}
					})
				}
				if (state.surchages_id.length) {
					let surchages = surchages_store.state.models 
					let sale_surchages = []
					state.surchages_id.forEach(id => {
						sale_surchages.push(surchages.find(item => item.id == id))
					}) 
					sale_surchages.forEach(_surchage => {
						total_articles += total_articles * Number(_surchage.percentage) / 100 
						if (state.surchages_in_services) {
							total_services += total_services * Number(_surchage.percentage) / 100 
						}
					})
				}
				state.items = new_items
				state.total = total_articles + total_services
			}
		},
		removeItem(state, item) {
			let index = state.items.findIndex(i => {
				return i.id == item.id
			})
			state.items.splice(index, 1)
		},
		updateItem(state, item) {
			let index = state.items.findIndex(art => {
				return art.id == item.id
			})
			state.items.splice(index, 1, item)
		},
	},
	actions: {
		vender({ commit, state }, info) {
			commit('setVendiendo', true)
			return axios.post('/api/sale', {
				save_afip_ticket: state.save_afip_ticket,
				items: state.items,
				client_id: state.client ? state.client.id : null ,
				discounts_id: state.discounts_id,
				surchages_id: state.surchages_id,
				save_current_acount: state.save_current_acount,
				make_current_acount_pago: state.make_current_acount_pago,
				sale_type_id: state.sale_type_id,
				discounts_in_services: state.discounts_in_services,
				surchages_in_services: state.surchages_in_services,
				current_acount_payment_method_id: state.current_acount_payment_method_id,
				afip_information_id: state.afip_information_id,
				employee_id: state.employee_id,
				address_id: state.address_id,
			})
			.then(res => {
				console.log('vendido')
				let sale = res.data.model
				console.log(sale)
				commit('setSale', sale)
				commit('setVendiendo', false)
				commit('setItems', [])
				commit('setDiscountsId', [])
				commit('setSurchagesId', [])
				// commit('setSaleTypeId', 1)
				commit('setClient', null)
				commit('setTotal', 0)
				commit('sale/add', sale, {root: true})
			})
			.catch(err => {
				commit('setVendiendo', false)
				console.log(err)
			})
		}
	},
	modules: {
		previus_sales,
	}
}
