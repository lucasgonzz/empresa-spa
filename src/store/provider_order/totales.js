import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,
	state: {
		total: [],
	},
	mutations: {
		set_total(state, value) {
			state.total = value 
		},
	},
}