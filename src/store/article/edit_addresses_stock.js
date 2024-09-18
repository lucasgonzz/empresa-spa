import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,
	state: {
		article: null,

		addresses: []
	},
	mutations: {
		set_article(state, value) {
			state.article = value 
		},
		setLoading(state, value) {
			state.loading = value 
		},
	},
	actions: {
		getModels({state, commit}, article) {
			commit('setLoading', true)
			return axios.get('api/stock-movement/'+article.id)
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