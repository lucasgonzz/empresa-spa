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
