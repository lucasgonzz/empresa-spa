import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import moment from 'moment'
import generals from '@/common-vue/mixins/generals'
export default {
	namespaced: true,
	state: {
		current_page: 0,
		order_by: 'mayor-a-menor',
	},
	mutations: {
		setCurrentPage(state, value) {
			state.current_page = value
		},
		incrementCurrentPage(state, value) {
			state.current_page++
		},
		decrementCurrentPage(state, value) {
			state.current_page--
		},
		setOrderBy(state, value) {
			state.order_by = value
		},
	},
	actions: {
	},
}
