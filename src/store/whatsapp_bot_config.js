import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import __base_store from '@/store/__base_store'

/**
 * Store singleton de configuración del bot WhatsApp.
 * El endpoint real es whatsapp-bot/config (no el resource estándar whatsapp-bot-config).
 */
export default __base_store({
	state: {
		model_name: 'whatsapp_bot_config',
		route_string: 'whatsapp-bot/config',
		from_dates: false,
		use_per_page: false,
	},
	actions: {
		/**
		 * Carga la única configuración del usuario; la expone como lista de 0 o 1 ítem para el ABM.
		 */
		_getModels({ commit, state }) {
			commit('setLoading', true)

			return axios.get('/api/' + state.route_string)
				.then(res => {
					commit('setLoading', false)

					const model = res.data.model

					if (model) {
						commit('setModels', [model])
					} else {
						commit('setModels', [])
					}
				})
				.catch(err => {
					commit('setLoading', false)
					console.log(err)
				})
		},
	},
})
