import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import moment from 'moment'
import generals from '@/common-vue/mixins/generals'
export default {
	namespaced: true,
	state: {
		model: null
	},
	mutations: {
		setModel(state, value) {
			state.model = value 
		},
	},
	actions: {
	},
}
