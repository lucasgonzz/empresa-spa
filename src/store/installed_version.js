import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

/**
 * Store de la versión instalada del sistema y su historial (misión version-instalada-historial).
 * Se alimenta de GET /api/installed-version.
 */
export default {
	namespaced: true,
	state: {
		// Versión actual: {version, installed_at, source, title} o null.
		current: null,
		// Historial de versiones del comercio, la más reciente primero.
		history: [],
		// true cuando ya se intentó al menos una vez (haya salido bien o mal).
		loaded: false,
	},
	mutations: {
		set_data(state, data) {
			state.current = data && data.current ? data.current : null
			state.history = data && Array.isArray(data.history) ? data.history : []
			state.loaded = true
		},
	},
	actions: {
		/**
		 * Pide la versión instalada. Ante un error (por ejemplo una API vieja sin la ruta) deja los
		 * datos vacíos y `loaded` en true: el menú muestra "Versión sin registrar" sin romperse.
		 *
		 * @param {object} ctx Contexto de Vuex.
		 * @returns {Promise<void>}
		 */
		fetch({ commit }) {
			return axios.get('/api/installed-version')
				.then(res => {
					commit('set_data', res.data)
				})
				.catch(() => {
					commit('set_data', null)
				})
		},
	},
}
