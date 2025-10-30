import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import moment from 'moment'
import generals from '@/common-vue/mixins/generals'
export default {
	namespaced: true,
	state: {
		stock_suggestion_articles: [],
	},
	mutations: {
		set_stock_suggestion_articles(state, value) {
			state.stock_suggestion_articles = value
		},
	},
}
