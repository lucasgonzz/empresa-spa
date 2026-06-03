import axios from 'axios'
import base from '@/store/table_column_preference'

axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import generals from '@/common-vue/mixins/generals'

export default {
	...base,
	state: {
		...base.state,
		model_name: 'pdf_column_profile',
		route_string: 'pdf-column-profiles',
	},
	actions: {
		...base.actions,
		/**
		 * Lista perfiles; opcionalmente filtra por model_name (sale | article).
		 *
		 * @param {Object} context
		 * @param {Object} payload { model_name?: string }
		 * @return {Promise}
		 */
		getModels({ commit, state }, payload) {
			commit('setLoading', true)
			const params = {}
			if (payload && payload.model_name) {
				params.model_name = payload.model_name
			}
			const url = '/api/' + generals.methods.routeString(state.route_string)
			return axios.get(url, { params })
				.then(function (res) {
					commit('setModels', res.data.models || [])
					commit('setLoading', false)
					return res
				})
				.catch(function (err) {
					commit('setLoading', false)
					throw err
				})
		},
	},
}
