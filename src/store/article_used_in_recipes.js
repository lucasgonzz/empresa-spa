import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import moment from 'moment'
import generals from '@/common-vue/mixins/generals'
export default {
	namespaced: true,
	state: {
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
		getModels({ commit, state }, article) {
			commit('setLoading', true)
			return axios.get(`api/recipe/article-used-in-recipes/${article.id}`)
			.then(res => {
				commit('setLoading', false)
				commit('setModels', res.data.models)
			})
			.catch((err) => {
				commit('setLoading', false)
				console.log(err)
			})
		},
	},
}
