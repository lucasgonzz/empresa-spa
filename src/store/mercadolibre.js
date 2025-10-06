import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,
	state: {
		meli_category: {},
	},
	mutations: {
		set_props_to_show(state, value) {
			state.props_to_show = value
		},
	},
	actions: {
	},
}
