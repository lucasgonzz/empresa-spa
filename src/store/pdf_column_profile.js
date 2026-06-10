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
		/**
		 * true solo tras getModels sin filtro (todos los model_name).
		 * Evita marcar como "descargado" en el arranque si solo hay perfiles parciales.
		 */
		all_profiles_loaded: false,
	},
	mutations: {
		...base.mutations,
		/**
		 * Indica si el store tiene el listado completo de perfiles (venta + artículo).
		 *
		 * @param {Object} state
		 * @param {boolean} value
		 */
		setAllProfilesLoaded(state, value) {
			state.all_profiles_loaded = value
		},
		/**
		 * Reemplaza perfiles de un model_name sin borrar los de otros modelos.
		 *
		 * @param {Object} state
		 * @param {Object} payload { model_name: string, models: Array }
		 */
		mergeModelsByModelName(state, payload) {
			const model_name = payload.model_name
			const new_models = payload.models || []
			const other_models = []
			state.models.forEach(function (profile) {
				if (profile.model_name !== model_name) {
					other_models.push(profile)
				}
			})
			state.models = other_models.concat(new_models)
		},
	},
	actions: {
		...base.actions,
		/**
		 * Lista perfiles; opcionalmente filtra por model_name (sale | article).
		 * Con filtro hace merge en el store para no pisar perfiles de otro modelo.
		 *
		 * @param {Object} context
		 * @param {Object} payload { model_name?: string }
		 * @return {Promise}
		 */
		getModels({ commit, state }, payload) {
			commit('setLoading', true)
			const params = {}
			const filter_model_name = payload && payload.model_name ? payload.model_name : null
			if (filter_model_name) {
				params.model_name = filter_model_name
			}
			const url = '/api/' + generals.methods.routeString(state.route_string)
			return axios.get(url, { params })
				.then(function (res) {
					const models = res.data.models || []
					if (filter_model_name) {
						commit('mergeModelsByModelName', {
							model_name: filter_model_name,
							models: models,
						})
					} else {
						commit('setModels', models)
						commit('setAllProfilesLoaded', true)
					}
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
