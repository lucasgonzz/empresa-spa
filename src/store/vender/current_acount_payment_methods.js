import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL
export default {
	namespaced: true,
	state: { 
		total_a_repartir: 0,
		total_repartido: 0,
		metodos_de_pago_seleccionados: [],
	},
	mutations: {
		set_total_a_repartir(state, value) {
			state.total_a_repartir = value
		},
		set_total_repartido(state, value) {
			state.total_repartido = value
		},
		set_metodos_de_pago_seleccionados(state, value) {
			state.metodos_de_pago_seleccionados = value 
		},
	},
	actions: {
	},
	modules: {
	}
}
