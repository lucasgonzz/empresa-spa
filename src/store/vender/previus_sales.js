import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL
import previus_sales from '@/store/vender/previus_sales'
import mixin_vender from '@/mixins/vender'
export default {
	namespaced: true,
	state: { 
		previus_sale: {},
		previus_returned_articles: [],
		previus_returned_services: [],
		index: 0,
		loading_previus: false,
		loading_next: false,
		updating: false,
	},
	mutations: {
		incrementIndex(state) {
			state.index++
		},
		decrementIndex(state) {
			state.index--
		},
		setIndex(state, value) {
			state.index = value
		},
		setPreviusSale(state, value) {
			state.previus_sale = value
		},
		setPreviusReturnedArticles(state, value) {
			state.previus_returned_articles = value
		},
		setPreviusReturnedServices(state, value) {
			state.previus_returned_services = value
		},
		setLoadingPrevius(state, value) {
			state.loading_previus = value
		},
		setLoadingNext(state, value) {
			state.loading_next = value
		},
		setUpdating(state, value) {
			state.updating = value
		},
	},
	actions: {
		getSale({ commit, state }) {
			return axios.get('/api/previus-next/sale/'+state.index)
			.then(res => {
				console.log(res.data.model)
				commit('setLoadingPrevius', false)
				commit('setLoadingNext', false)
				if (res.data.model) {
					commit('setPreviusSale', res.data.model)
				}
			})
			.catch(err => {
				commit('setLoadingPrevius', false)
				commit('setLoadingNext', false)
				console.log(err)
			})
		},
		updateSale({ commit, state }, info) {
			commit('setUpdating', true)
			return axios.put('/api/sale/'+state.previus_sale.id, {
				client_id: info.client_id,
				items: info.items,
				discounts_id: info.discounts_id,
				surchages_id: info.surchages_id,
				save_nota_credito: info.save_nota_credito,
				returned_items: info.returned_items,
				nota_credito_description: info.nota_credito_description,
				discounts_in_services: info.discounts_in_services,
				surchages_in_services: info.surchages_in_services,
				current_acount_payment_method_id: info.current_acount_payment_method_id,
				afip_information_id: info.afip_information_id,
				sale_type_id: info.sale_type_id,
				address_id: info.address_id,
				employee_id: info.employee_id,
			})
			.then(res => {
				commit('sale/add', res.data.model, {root: true})
				commit('setUpdating', false)
			})
			.catch(err => {
				commit('setUpdating', false)
				console.log(err)
			})
		},
	},
	modules: {
	}
}
