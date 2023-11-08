import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL
export default {
	namespaced: true,
	state: {
		model: {},
		loading: false,
	},
	mutations: {
		setModel(state, value) {
			state.model = value
		},
		setLoading(state, value) {
			state.loading = value 
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
	},
	actions: {
		getModel({ commit }, order) {
			commit('setLoading', true)
			return axios.get('/api/mercado-pago/payment/'+order.payment_id)
			.then(res => {
				commit('setLoading', false)
				commit('setModel', res.data.payment)
			})
			.catch(err => {
				commit('setLoading', false)
				console.log(err)
			})
		},

	},
	modules: {
	}
}
