import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import moment from 'moment'
import generals from '@/common-vue/mixins/generals'
export default {
	namespaced: true,
	state: {
		model_name: 'article',
		route_prefix: '',
		from_dates: false,
		is_selecteable: false,

		// Descarga paginada vía GET papelera (no precarga todas las páginas).
		use_per_page: false,
		// Se usa cuando es belongs_to_many_from_dates. Por ejemplo para ver los pagos de un cliente
		// plural_model_name: '',
		// selected_model: null,
		// from_date: moment().subtract(1, 'months').format('YYYY-MM-DD'),
		// until_date: moment().format('YYYY-MM-DD'),

		from_date: moment().format('YYYY-MM-DD'),
		until_date: '',

		page: 1,
		per_page: 25,
		total_pages: 1,
		/**
		 * Si true, la tabla debe armar filtros + orden deleted_at DESC y disparar búsqueda POST (search+papelera).
		 */
		pending_default_papelera_search: false,

		models: [],
		model: {},
		selected: [],
		filters: [],
		filtered: [],
		is_filtered: false,
		filter_page: 1,
		total_filter_pages: null,
		total_filter_results: 0,
		loading_filtered: false,

		delete: null,
		delete_image_prop: null,
		delete_image_model: null,
		
		prop_model_to_delete: null,

		display: 'table',

		loading: false,

		props_to_show: [],
	},
	mutations: {
		set_props_to_show(state, value) {
			state.props_to_show = value
		},
		set_route_prefix(state, value) {
			state.route_prefix = value 
		},
		setLoading(state, value) {
			state.loading = value
		},
		setModel(state, value) {
			if (value.model) {
				state.model = value.model
				if (value.properties.length) {
					value.properties.forEach(prop => {
						state.model[prop.key] = prop.value 
					})
				}
			} else {
				let obj = {
					id: null
				}
				require(`@/models/${state.model_name}`).default.properties.forEach(prop => {
					obj[prop.key] = prop.value 
				})
				if (value.properties.length) {
					value.properties.forEach(prop => {
						obj[prop.key] = prop.value 
					})
				}
				state.model = obj
			}
		},
		addModels(state, value) {
			state.models = state.models.concat(value)
		},
		incrementPage(state) {
			state.page++
		},
		setPage(state, value) {
			state.page = value 
		},
		setTotalPages(state, value) {
			state.total_pages = value 
		},
		setModels(state, value) {
			if (value) {
				state.models = value
			} else {
				state.models = []
			}
		},
		setSelectedModel(state, value) {
			state.selected_model = value 
		},
		setSelected(state, value) {
			state.selected = value
		},
		addSelected(state, value) {
			let index = state.selected.findIndex(selected_model => {
				return selected_model.id == value.id 
			})
			if (index != -1) {
				state.selected.splice(index, 1)
			} else {
				state.selected.push(value)
			}
		},
		setFiltered(state, value) {
			state.filtered = value
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
		setIsFiltered(state, value) {
			state.is_filtered = value
		},
		add(state, value) {
			let index = state.models.findIndex(item => {
				return item.id == value.id
			})
			if (index == -1) {
				state.models.unshift(value)
			} else {
				state.models.splice(index, 1, value)
			}

			index = state.filtered.findIndex(item => {
				return item.id == value.id
			})
			if (index != -1) {
				state.filtered.splice(index, 1, value)
			} 
		},
		setDelete(state, value) {
			state.delete = value
		},
		delete(state) {
			// Models
			let index = state.models.findIndex(model => {
				return model.id == state.delete.id
			})
			state.models.splice(index, 1)

			// Filtereds
			index = state.filtered.findIndex(model => {
				return model.id == state.delete.id
			})
			if (index != -1) {
				state.filtered.splice(index, 1)
			}

			if (state.selected_model && state.selected_model[state.plural_model_name]) {
				index = state.selected_model[state.plural_model_name].findIndex(model => {
					return model.id == state.delete.id
				})
				state.selected_model[state.plural_model_name].splice(index, 1)
			}
		},
		setDeleteImageProp(state, value) {
			state.delete_image_prop = value
		},
		setDeleteImageModel(state, value) {
			state.delete_image_model = value
		},
		deleteImage(state, value) {
			let index = state.models.images.findIndex(model => {
				return model.id == state.delete_image.id
			})
			if (index != -1) {
				state.model.images.splice(index, 1)
			}
		},
		setPropModelToDelete(state, value) {
			state.prop_model_to_delete = value
		},
		deletePropModel(state) {
			let index = state.model[state.prop_model_to_delete.key].findIndex(model => {
				return model.id == state.prop_model_to_delete.id
			})
			state.model[state.prop_model_to_delete.key].splice(index, 1)
		},
		setDisplay(state, value) {
			state.display = value 
		},
		setFromDate(state, value) {
			state.from_date = value
		},
		setUntilDate(state, value) {
			state.until_date = value
		},
		setIsSelecteable(state, value) {
			state.is_selecteable = value
		},
		setFromDates(state, value) {
			state.from_dates = value
		},
		incrementFilterPage(state) {
			state.filter_page++
		},
		setFilterPage(state, value) {
			state.filter_page = value 
		},
		setTotalFilterPages(state, value) {
			state.total_filter_pages = value 
		},
		addFiltered(state, value) {
			state.filtered = state.filtered.concat(value)
		},
		setTotalFilterResults(state, value) {
			state.total_filter_results = value 
		},
		setPendingDefaultPapeleraSearch(state, value) {
			state.pending_default_papelera_search = !!value
		},
		setLoadingFiltered(state, value) {
			state.loading_filtered = value 
		},
	},
	actions: {
		getModels({commit, state}) {
			commit('setSelected', [])
			commit('setFiltered', [])
			commit('setIsFiltered', false)
			commit('setFilterPage', 1)
			commit('setTotalFilterPages', null)
			commit('setTotalFilterResults', 0)
			commit('setPage', 1)
			commit('setModels', [])
			commit('setPendingDefaultPapeleraSearch', true)
			return Promise.resolve()
		},
		/**
		 * Ejecuta POST search con papelera:true y criterios del módulo raíz (misma idea que filtrar en la tabla).
		 * Incluye 0 resultados sin error (papelera vacía).
		 *
		 * @param {Object} context state, rootState, commit
		 * @returns {Promise}
		 */
		run_papelera_search_from_store({state, rootState, commit}) {
			let mn = state.model_name
			let filters = rootState[mn].filters
			let page = state.filter_page
			let per_page = rootState[mn].filter_per_page || 5
			commit('auth/setMessage', 'Filtrando ' + mn, {root: true})
			commit('auth/setLoading', true, {root: true})
			return axios.post('/api/search/' + generals.methods.routeString(mn) + '/null/1?page=' + page, {
				filters: filters,
				papelera: true,
				per_page: per_page,
			})
				.then(res => {
					commit('auth/setLoading', false, {root: true})
					let rows = res.data.data || []
					commit('setIsFiltered', true)
					commit('setFiltered', rows)
					commit('setTotalFilterPages', res.data.last_page)
					commit('setTotalFilterResults', res.data.total)
				})
				.catch(err => {
					commit('auth/setLoading', false, {root: true})
					console.log(err)
				})
		},
		loadMoreFiltered({state, commit, rootState}) {
			commit('incrementFilterPage')
			// Criterios viven en el módulo raíz (article/sale); resultados en este submódulo.
			let filters = rootState[state.model_name].filters
			return axios.post(`/api/search/${generals.methods.routeString(state.model_name)}/null/1?page=${state.filter_page}`, {
				filters: filters,
				papelera: true,
				per_page: rootState[state.model_name].filter_per_page,
			})
			.then(res => {
				commit('addFiltered', res.data.data)
			})
			.catch(err => {
				console.log(err)
			})
		},
		delete({ commit, state }) {
			return axios.delete(`/api/${generals.methods.routeString(state.model_name)}/${state.delete.id}`)
			.then(() => {
				commit('delete')
			})
			.catch((err) => {
				console.log(err)
			})
		},
		deleteImageProp({ commit, state }) {
			return axios.delete(`/api/delete-image-prop/${generals.methods.routeString(state.model_name)}/${state.model.id}/${state.delete_image_prop}`)
			.then((res) => {
				commit('add', res.data.model)
			})
			.catch((err) => {
				console.log(err)
			})
		},
		deleteImageModel({ commit, state }) {
			return axios.delete(`/api/delete-image-model/${generals.methods.routeString(state.model_name)}/${state.model.id}/${state.delete_image_model.id}`)
			.then((res) => {
				commit('add', res.data.model)
			})
			.catch((err) => {
				console.log(err)
			})
		},
		deletePropModel({ commit, state }) {
			return axios.delete(`/api/${generals.methods.routeString(state.prop_model_to_delete.has_many.model_name)}/${state.prop_model_to_delete.id}`)
			.then(res => {
				commit('deletePropModel')
			})
			.catch(err => {
				console.log(err)
			})
		}
	},
}
