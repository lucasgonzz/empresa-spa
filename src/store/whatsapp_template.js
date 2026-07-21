import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

/**
 * Store de plantillas de WhatsApp (grupo 137, Prompt 04 en empresa-api).
 *
 * El módulo de conversación (Prompt 06) solo necesita LEER el catálogo de plantillas para
 * ofrecerlas en el composer (filtradas por `status == 'aprobada'` en el componente que las
 * consume). El Prompt 07 agrega acá el ABM completo (crear/editar/borrar/solicitar alta) que
 * consume la pantalla de Configuración del agente.
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
		/**
		 * Inserta o reemplaza (por id) una plantilla en el listado. Se usa después de
		 * crear/actualizar/solicitar alta para reflejar el modelo devuelto por la API sin
		 * tener que recargar todo el catálogo.
		 *
		 * @param {Object} state
		 * @param {Object} value Plantilla devuelta por la API.
		 */
		addOrReplace(state, value) {
			let index = state.models.findIndex(template => template.id == value.id)
			if (index == -1) {
				state.models.unshift(value)
			} else {
				state.models.splice(index, 1, value)
			}
		},
		/**
		 * Quita una plantilla del listado por id (después de borrarla en la API).
		 *
		 * @param {Object} state
		 * @param {number} id
		 */
		removeModel(state, id) {
			let index = state.models.findIndex(template => template.id == id)
			if (index != -1) {
				state.models.splice(index, 1)
			}
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

		/**
		 * Crea una plantilla propia del negocio. Nace `borrador` (lo define el backend).
		 *
		 * @param {Object} payload Campos del formulario: name, category, language, body_preview, variables.
		 * @returns {Promise}
		 */
		createModel({ commit }, payload) {
			return axios.post('/api/whatsapp-templates', payload)
				.then(res => {
					commit('addOrReplace', res.data.model)
					return res
				})
		},

		/**
		 * Actualiza una plantilla propia del negocio (las `is_system` las bloquea el backend con 403).
		 *
		 * @param {Object} payload
		 * @param {number} payload.id
		 * @returns {Promise}
		 */
		updateModel({ commit }, payload) {
			return axios.put('/api/whatsapp-templates/' + payload.id, payload)
				.then(res => {
					commit('addOrReplace', res.data.model)
					return res
				})
		},

		/**
		 * Borra una plantilla propia del negocio.
		 *
		 * @param {number} id
		 * @returns {Promise}
		 */
		deleteModel({ commit }, id) {
			return axios.delete('/api/whatsapp-templates/' + id)
				.then(res => {
					commit('removeModel', id)
					return res
				})
		},

		/**
		 * Pasa una plantilla de `borrador` a `pendiente_meta`: el equipo de ComercioCity la
		 * carga a mano en Meta y luego la marca `aprobada` o `rechazada`.
		 *
		 * @param {number} id
		 * @returns {Promise}
		 */
		solicitarAlta({ commit }, id) {
			return axios.put('/api/whatsapp-templates/' + id + '/solicitar-alta')
				.then(res => {
					commit('addOrReplace', res.data.model)
					return res
				})
		},
	},
}
