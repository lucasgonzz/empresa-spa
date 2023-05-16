import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import moment from 'moment'
import generals from '@/common-vue/mixins/generals'
export default {
	namespaced: true,
	state: {
		debe_id: 0,
		haber_id: 0,
		models: [],
		loading: false,
	},
	mutations: {
		setDebeId(state, value) {
			state.debe_id = value
			state.haber_id = 0
		},
		setHaberId(state, value) {
			state.haber_id = value
			state.debe_id = 0
		},
		setLoading(state, value) {
			state.loading = value 
		},
		setModels(state, value) {
			state.models = value 
		},
	},
	actions: {
		getModels({commit, state, dispatch}, info) {
			commit('setLoading', true)
			return axios.get('api/pagado-por/'+info.model_name+'/'+info.model_id+'/'+state.debe_id+'/'+state.haber_id)
			.then(res => {
				commit('setModels', res.data.models)
				commit('setLoading', false)
			})
			.catch(err => {
				commit('setLoading', false)
				console.log(err)
			})
		},
	},
}
