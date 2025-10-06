import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import moment from 'moment'
import generals from '@/common-vue/mixins/generals'
export default {
	namespaced: true,
	state: {
		meli_category: null,
		article_meli_attributes: [],
		categories_predictor: [],
	},
	mutations: {
		set_categories_predictor(state, value) {
			state.categories_predictor = value
		},
		set_meli_category(state, value) {
			state.meli_category = value
		},
		set_article_meli_attributes(state, value) {
			state.article_meli_attributes = value
		},
	},
}
