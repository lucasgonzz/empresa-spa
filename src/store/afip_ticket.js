import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import moment from 'moment'
import generals from '@/common-vue/mixins/generals'
export default {
	namespaced: true,
	state: {
		problemas_al_facturar: [],

		afip_tickets_for_make: [],

		afip_information_id: 0,
		afip_tipo_comprobante_id: 0,

		loading: false,

		props_to_show: [],
	},
	mutations: {
		set_props_to_show(state, value) {
			state.props_to_show = value
		},
		set_afip_tickets_for_make(state, value) {
			state.afip_tickets_for_make = value
		},
		add_afip_tickets_for_make(state, value) {
			state.afip_tickets_for_make.push(value)
		},
		setLoading(state, value) {
			state.loading = value
		},
		setFilters(state, value) {
			state.filters = value
		},
		addFilter(state, filter_to_add) {
			let index = state.filters.findIndex(filter => {
				return filter.key == filter_to_add.key
			})

			if (index == -1) {
				state.filters.unshift(filter_to_add)
			} else {
				state.filters.splice(index, 1, filter_to_add)
			}
		},
		setFiltered(state, value) {
			state.filtered = value
		},
		set_problemas_al_facturar(state, value) {
			state.problemas_al_facturar = value
		},
		set_afip_information_id(state, value) {
			state.afip_information_id = value
		},
		set_afip_tipo_comprobante_id(state, value) {
			state.afip_tipo_comprobante_id = value
		},
	},
	actions: {
		get_problemas_al_facturar({commit, state, dispatch}) {
			commit('setLoading', true)
			let url = '/api/afip-ticket/problemas-al-facturar'
			return axios.get(url)
			.then(res => {
				
				commit('setLoading', false)
				commit('set_problemas_al_facturar', res.data.models)
			})
			.catch(err => {
				commit('setLoading', false)
				console.log(err)
			})
		},
	},
}
