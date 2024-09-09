import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import moment from 'moment'
import generals from '@/common-vue/mixins/generals'
export default {
	namespaced: true,
	state: {
		model_name: 'article_performance',

		selected_article: null,
		models: [],

		loading: false,
	},
	mutations: {
		setLoading(state, value) {
			state.loading = value
		},
		setModels(state, value) {
			state.models = value
		},
		setSelectedArticle(state, value) {
			state.selected_article = value
		},
	},
	actions: {
		getModels({commit, state, dispatch}) {
			commit('setLoading', true)
			let url = '/api/'+generals.methods.routeString(state.model_name)+'/'+state.selected_article.id
			return axios.get(url)
			.then(res => {
				
				commit('setLoading', false)
				commit('setModels', res.data.models)
			})
			.catch(err => {
				commit('setLoading', false)
				console.log(err)
			})
		},
	},
}
