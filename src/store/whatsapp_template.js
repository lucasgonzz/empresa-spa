import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

/**
 * Store de plantillas de WhatsApp (grupo 137, Prompt 04 en empresa-api).
 *
 * El módulo de conversación (Prompt 06) solo necesita LEER el catálogo de plantillas para
 * ofrecerlas en el composer (filtradas por `status == 'aprobada'` en el componente que las
 * consume). No se agrega acá el ABM completo (crear/editar/solicitar alta) porque no lo pide
 * este prompt; si se necesita a futuro, este store es la base para extenderlo.
 */
export default {
	namespaced: true,
	state: {
		model_name: 'whatsapp_template',
		models: [],
		loading: false,
	},
	mutations: {
		setLoading(state, value) {
			state.loading = value
		},
		setModels(state, value) {
			state.models = value || []
		},
	},
	actions: {
		/**
		 * Carga el catálogo completo de plantillas del owner (estándar + propias).
		 */
		getModels({ commit }) {
			commit('setLoading', true)
			return axios.get('/api/whatsapp-templates')
				.then(res => {
					commit('setLoading', false)
					commit('setModels', res.data.models)
				})
				.catch(err => {
					commit('setLoading', false)
					console.log(err)
				})
		},
	},
}
