import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL
export default {
	namespaced: true,
	state: {
		functions_to_execute: [],
		info_to_show: [],
		message_text: '',
		color_variant: '',
	},
	mutations: {
		set_functions_to_execute(state, value) {
			state.functions_to_execute = value
		},
		set_info_to_show(state, value) {
			state.info_to_show = value
		},
		set_message_text(state, value) {
			state.message_text = value
		},
		set_color_variant(state, value) {
			state.color_variant = value
		},
	},
	actions: {
	},
}
