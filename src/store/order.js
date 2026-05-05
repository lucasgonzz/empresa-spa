import axios from 'axios'
import generals from '@/common-vue/mixins/generals'
import __base_store from '@/store/__base_store'

axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

/**
 * Store de pedidos migrado a `__base_store`.
 *
 * Se conserva el estado adicional `unconfirmed_models` y la acción custom
 * para consultar pedidos sin confirmar.
 */
export default __base_store({
	/** Estado específico de `order` que extiende al estado base. */
	state: {
		model_name: 'order',
		from_dates: true,
		per_page: 25,
		unconfirmed_models: [],
	},
	mutations: {
		/**
		 * Actualiza la lista de pedidos sin confirmar.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Array} value Pedidos sin confirmar devueltos por API.
		 * @returns {void}
		 */
		setUnconfirmedModels(state, value) {
			state.unconfirmed_models = value
		},
	},
	actions: {
		/**
		 * Ejecuta el filtrado de pedidos sin depender del loading global `auth`.
		 *
		 * @param {Object} context Contexto de Vuex.
		 * @param {Function} context.commit Commit de Vuex.
		 * @param {Object} context.state Estado del módulo.
		 * @param {Object} payload Datos opcionales del filtrado.
		 * @param {Number|null} payload.page Página a consultar (si no viene usa `filter_page`).
		 * @returns {Promise}
		 */
		runFilter({commit, state}, payload = {}) {
			/** Página a consultar para el listado filtrado. */
			let page = (payload && payload.page) ? payload.page : state.filter_page
			/** Cantidad por página para resultados de búsqueda. */
			let per_page = state.filter_per_page || 5
			/** Endpoint de búsqueda común para el modelo pedido. */
			let endpoint_url = '/api/search/' + generals.methods.routeString(state.model_name) + '/null/1?page=' + page

			commit('setLoadingFiltered', true)

			return axios.post(endpoint_url, {
				filters: state.filters,
				papelera: false,
				per_page: per_page,
			})
				.then(res => {
					/** Filas devueltas por backend (puede venir vacío y sigue siendo filtro activo). */
					let rows = res.data.data || []

					commit('setIsFiltered', true)
					commit('setFiltered', rows)
					commit('setTotalFilterPages', res.data.last_page)
					commit('setTotalFilterResults', res.data.total)
					commit('setLoadingFiltered', false)
				})
				.catch(err => {
					commit('setLoadingFiltered', false)
					console.log(err)
				})
		},
		/**
		 * Trae desde API los pedidos pendientes de confirmación.
		 *
		 * @param {Object} context Contexto de Vuex.
		 * @param {Function} context.commit Commit de Vuex.
		 * @param {Object} context.state Estado del módulo.
		 * @returns {Promise}
		 */
		getUnconfirmedModels({commit, state}) {
			/** URL del endpoint de pedidos sin confirmar para el modelo actual. */
			let endpoint_url = '/api/' + generals.methods.routeString(state.model_name) + '/unconfirmed/models'

			return axios.get(endpoint_url)
				.then(res => {
					commit('setUnconfirmedModels', res.data.models)
				})
				.catch(err => {
					commit('setLoading', false)
					console.log(err)
				})
		},
	},
})
