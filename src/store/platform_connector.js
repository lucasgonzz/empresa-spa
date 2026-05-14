import __base_store from '@/store/__base_store'

/**
 * Store `platform_connector`: precarga el catálogo `platform` para el select del formulario.
 */
export default __base_store({
	state: {
		model_name: 'platform_connector',
	},
	actions: {
		/**
		 * Carga conectores y asegura que `platform/models` exista para el ABM.
		 *
		 * @param {Object} context Contexto Vuex (commit, dispatch, state).
		 * @returns {Promise}
		 */
		getModels(context) {
			var commit = context.commit
			var state = context.state
			var dispatch = context.dispatch
			return dispatch('platform/getModels', null, { root: true })
				.catch(function () {
					return null
				})
				.then(function () {
					commit('setSelected', [])
					commit('setFiltered', [])
					commit('setIsFiltered', false)
					if (state.use_per_page) {
						commit('setPage', 1)
						commit('setModels', [])
					}
					return dispatch('_getModels')
				})
		},
	},
})
