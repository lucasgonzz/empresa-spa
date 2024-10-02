import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,
	state: {
		models: [],
	},
	mutations: {
		setModels(state, value) {
			state.models = value 
		},
	},
	actions: {
		getModels({state, commit}) {
			return axios.get('api/deposit-movement-en-curso')
			.then(res => {
				commit('setModels', res.data.models)
			})
			.catch(err => {
				console.log(err)
			})
		}
	}
}