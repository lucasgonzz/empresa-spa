import axios from 'axios'
import __base_store from '@/store/__base_store'

/**
 * Store de importación entrante ML → artículos.
 */
export default __base_store({
	state: {
		model_name: 'sync_from_meli_article',
		from_dates: true,
	},
	actions: {
		/**
		 * Dispara una nueva corrida de importación (POST + encola job en API).
		 *
		 * @param {Object} context Vuex action context.
		 * @return {Promise}
		 */
		run_sync(context) {
			context.commit('auth/setMessage', 'Iniciando importación desde Mercado Libre', { root: true })
			context.commit('auth/setLoading', true, { root: true })

			return axios.post('/api/sync-from-meli-article', {})
				.then(function (res) {
					context.commit('add', res.data.model)
					context.commit('auth/setLoading', false, { root: true })
					context.commit('auth/setMessage', '', { root: true })

					return res.data.model
				})
				.catch(function (err) {
					context.commit('auth/setLoading', false, { root: true })
					context.commit('auth/setMessage', '', { root: true })
					throw err
				})
		},
		/**
		 * Consulta un registro de sync por id (para polling de estado).
		 *
		 * @param {Object} context Vuex action context.
		 * @param {number} sync_id Id del registro.
		 * @return {Promise}
		 */
		fetch_sync_by_id(context, sync_id) {
			return axios.get('/api/sync-from-meli-article/' + sync_id)
				.then(function (res) {
					context.commit('add', res.data.model)

					return res.data.model
				})
		},
	},
})
