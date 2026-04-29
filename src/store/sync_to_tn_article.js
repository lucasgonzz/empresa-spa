import __base_store from '@/store/__base_store'
import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

/**
 * Store de sincronización hacia Tienda Nube de artículos.
 * Mantiene también el conteo de sincronizaciones fallidas para el badge del menú.
 */
export default __base_store({
	state: {
		model_name: 'sync_to_tn_article',
		use_per_page: true,
		from_dates: true,

		// filter_per_page: 1,

		/* Cantidad de sincronizaciones con status 'error'; alimenta el badge del menú */
		failed_count: 0,
	},
	mutations: {
		/**
		 * Actualiza la cantidad de sincronizaciones fallidas.
		 *
		 * @param {Object} state  Estado del store.
		 * @param {number} value  Nuevo conteo de errores.
		 */
		setFailedCount(state, value) {
			state.failed_count = value
		},
	},
	actions: {
		/**
		 * Consulta al API la cantidad de sincronizaciones TN con estado 'error'
		 * y actualiza el estado 'failed_count'.
		 */
		getFailedCount({ commit }) {
			return axios.get('api/sync-to-tn-article/failed-count')
				.then(res => {
					commit('setFailedCount', res.data.count)
				})
				.catch(err => {
					console.log('Error al obtener failed_count de TN:', err)
				})
		},
	},
})

