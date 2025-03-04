import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,
	state: {
		models: [],
		ultimos_movimientos: 10,
		concepto_id: 0,
		loading: false,
	},
	mutations: {
		setModels(state, value) {
			state.models = value 
		},
		setLoading(state, value) {
			state.loading = value 
		},
		set_ultimos_movimientos(state, value) {
			state.ultimos_movimientos = value 
		},
		set_concepto_id(state, value) {
			state.concepto_id = value 
		},
	},
	actions: {
		getModels({state, commit}, article) {
			commit('setLoading', true)
			return axios.get('api/stock-movement/'+article.id+'/'+state.ultimos_movimientos+'/'+state.concepto_id)
			.then(res => {
				commit('setLoading', false)
				commit('setModels', res.data.models) 
			})
			.catch(err => {
				commit('setLoading', false)
			})
		}
	}
}