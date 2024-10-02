import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,
	state: {
		article: null,
	},
	mutations: {
		set_article(state, value) {
			state.article = value 
		},
	},
}