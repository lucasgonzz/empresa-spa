import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,
	state: {
		models: [],
		loading: [],
	},
	mutations: {
		setModels(state, value) {
			state.models = value 
		},
		setLoading(state, value) {
			state.loading = value 
		},
	},
	actions: {
		getModels({state, commit}, fecha_entrega) {
			return axios.get('api/road-map/search-sales/'+fecha_entrega)
			.then(res => {
				commit('setModels', res.data.models)
			})
			.catch(err => {
				console.log(err)
			})
		}
	}
}