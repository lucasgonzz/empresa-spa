import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,
	state: {
		font_size: 11,
		font_color: '#FFF',
	},
	mutations: {
		set_font_size(state, value) {
			state.font_size = value 
		},
		set_font_color(state, value) {
			state.font_color = value 
		},
	},
}