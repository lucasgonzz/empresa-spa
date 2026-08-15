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

		/**
		 * Guarda la configuración funcional del agente (grupo 137, Prompt 07): personalidad y
		 * los dos toggles de automatización. Pega al mismo endpoint que la config técnica de
		 * Kapso (ABM → Integraciones), pero manda solo estos 3 campos: el controller de la API
		 * arma el `updateOrCreate` con `$request->has(...)` por campo, así que no pisa los
		 * campos técnicos que esta pantalla no conoce.
		 *
		 * @param {Object} payload
		 * @param {string} payload.agent_personality Texto libre con la personalidad del agente.
		 * @param {boolean} payload.ai_enabled_default Si los chats nuevos nacen con IA prendida.
		 * @param {boolean} payload.auto_send_sale_pdf Si se manda el PDF de la venta automáticamente.
		 * @returns {Promise}
		 */
		updateAgentConfig({ commit, state }, payload) {
			return axios.put('/api/' + state.route_string, {
				agent_personality: payload.agent_personality,
				ai_enabled_default: payload.ai_enabled_default,
				auto_send_sale_pdf: payload.auto_send_sale_pdf,
			})
				.then(res => {
					// Refleja el modelo guardado (incluye los campos técnicos que ya tenía).
					commit('setModels', [res.data.model])
					return res
				})
		},

		/**
		 * Guarda la configuración TÉCNICA de la conexión con Kapso (solapa "Conexión" del modal
		 * del módulo, misión whatsapp-agente): las tres credenciales y el switch de activo.
		 *
		 * Manda SOLO estos 4 campos, y es a propósito: el controller de la API arma el
		 * `updateOrCreate` leyendo campo por campo con `$request->has(...)`, así que lo que no
		 * viaja no se toca. Gracias a eso esta pantalla y la del agente (`updateAgentConfig`)
		 * pegan al mismo endpoint sin pisarse. Si alguna vez se manda el form entero desde acá,
		 * un guardado de conexión le borra la personalidad al agente (y al revés).
		 *
		 * Sin `.catch()` a propósito: el error tiene que llegar entero al componente, que es
		 * quien muestra el `message` del 422 (ej: "no se puede activar el bot sin credenciales").
		 *
		 * @param {Object} payload
		 * @param {string} payload.phone_number_id ID del número del negocio en Kapso.
		 * @param {string} payload.kapso_api_key Clave para mandarle mensajes a Kapso.
		 * @param {string} payload.webhook_secret Secreto con el que se firma cada mensaje entrante.
		 * @param {boolean} payload.is_active Si el bot está prendido.
		 * @returns {Promise}
		 */
		updateConnectionConfig({ commit, state }, payload) {
			return axios.put('/api/' + state.route_string, {
				phone_number_id: payload.phone_number_id,
				kapso_api_key: payload.kapso_api_key,
				webhook_secret: payload.webhook_secret,
				is_active: payload.is_active,
			})
				.then(res => {
					// Refleja el modelo guardado (incluye los campos del agente que ya tenía).
					commit('setModels', [res.data.model])
					return res
				})
		},
	},
})
