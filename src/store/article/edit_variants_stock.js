import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,
	state: {
		article: null,

		variants_to_update: []
	},
	mutations: {
		set_article(state, value) {
			state.article = value 
		},
		set_variants_to_update(state, value) {
			state.variants_to_update = value 
		},
	},
}