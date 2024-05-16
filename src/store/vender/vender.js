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
		to_check: 0,
		checked: 0,
		confirmed: 0,
		price_type: null,
		save_current_acount: 1,
		omitir_en_cuenta_corriente: 0,
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
		observations: '',
		numero_orden_de_compra: '',

		guardar_como_presupuesto: 0,
		budget: null,

		returned_items: [],

		vendiendo: false,
		sale: null,

		afip_results: null,
	},
	mutations: {
		setGuardarComoPresupuesto(state, value) {
			state.guardar_como_presupuesto = value 
		},
		setBudget(state, value) {
			state.budget = value 
		},
		setItems(state, value) {
			console.log('vender/setItems')
			state.items = value
			console.log(state.items)
		},
		addItem(state, value) {
			state.items.unshift(value)
		},
		replceItem(state, value) {
			let index = state.items.findIndex(item => {
				return item.id == value.id 
			})
			if (index != -1) {
				console.log('quitando item')
				state.items.splice(index, 1, value)
			} 
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
		setToCheck(state, value) {
			state.to_check = value
		},
		setChecked(state, value) {
			state.checked = value
		},
		setConfirmed(state, value) {
			state.confirmed = value
		},
		setPriceType(state, value) {
			state.price_type = value
		},
		setSaveCurrentAcount(state, value) {
			state.save_current_acount = value
		},
		set_omitir_en_cuenta_corriente(state, value) {
			state.omitir_en_cuenta_corriente = value 
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
		setObservations(state, value) {
			state.observations = value
		},
		set_numero_orden_de_compra(state, value) {
			state.numero_orden_de_compra = value
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
					
					// if (previus_sales.state.previus_sale.id) {
					// 	discounts = previus_sales.state.previus_sale.discounts.map(discount => {
					// 		return {
					// 			...discount,
					// 			percentage: discount.pivot.percentage
					// 		}
					// 	})
					// }
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
					// if (previus_sales.state.previus_sale.id) {
					// 	surchages = previus_sales.state.previus_sale.surchages.map(surchage => {
					// 		return {
					// 			...surchage,
					// 			percentage: surchage.pivot.percentage
					// 		}
					// 	})
					// }
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
		incrementFilterPage(state) {
			state.filter_page++
		},
		setFilterPage(state, value) {
			state.filter_page = value 
		},
		setTotalFilterPages(state, value) {
			state.total_filter_pages = value 
		},
		setTotalFilterResults(state, value) {
			state.total_filter_results = value 
		},
		addFiltered(state, value) {
			state.filtered = state.filtered.concat(value)
		},
		setLoadingFiltered(state, value) {
			state.loading_filtered = value 
		},
		setAfipResult(state, value) {
			state.afip_results = value 
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
				to_check: state.to_check,
				checked: state.checked,
				confirmed: state.confirmed,
				observations: state.observations,
				omitir_en_cuenta_corriente: state.omitir_en_cuenta_corriente,
				numero_orden_de_compra: state.numero_orden_de_compra,
			})
			.then(res => {
				console.log('vendido')
				let sale = res.data.model
				console.log(sale)
				commit('setSale', sale)
				commit('setVendiendo', false)
				// commit('setItems', [])
				// commit('setDiscountsId', [])
				// commit('setSurchagesId', [])
				// // commit('setSaleTypeId', 1)
				// commit('setClient', null)
				// commit('setObservations', '')
				// commit('setTotal', 0)
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
