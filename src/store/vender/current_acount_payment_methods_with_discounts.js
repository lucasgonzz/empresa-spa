import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL
export default {
	namespaced: true,
	state: { 
		total_a_repartir: 0,
		total_repartido: 0,
		payment_methods: [],

		watch_activado: true,
	},
	mutations: {
		set_total_a_repartir(state, value) {
			state.total_a_repartir = value
		},
		set_total_repartido(state, value) {
			state.total_repartido = value
		},
		set_payment_methods(state, value) {
			state.payment_methods = value 
		},
		set_watch_activado(state, value) {
			state.watch_activado = value 
		},
	},
	actions: {
	},
	modules: {
	}
}
