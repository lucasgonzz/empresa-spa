import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

export default {
	namespaced: true,
	state: {
		article: null,
		variant: null,
	},
	mutations: {
		set_article(state, value) {
			state.article = value 
		},
		set_variant(state, value) {
			state.variant = value 
		},
	},
}