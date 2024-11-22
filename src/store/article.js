import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import moment from 'moment'
import generals from '@/common-vue/mixins/generals'

import stock_movement from '@/store/article/stock_movement'
import edit_addresses_stock from '@/store/article/edit_addresses_stock'
import edit_variants_stock from '@/store/article/edit_variants_stock'

export default {
	namespaced: true,
	modules: {
		stock_movement,
		edit_addresses_stock,
		edit_variants_stock,
	},
	state: {
		filtered_from_buscador: [],

		model_name: 'article',
		route_prefix: 'index/from-status',
		from_dates: false,
		is_selecteable: false,
		not_download_on_mobile: true,

		use_per_page: true,
		use_local_storage: false,
		local_storage_canceled: false,
		// Se usa cuando es belongs_to_many_from_dates. Por ejemplo para ver los pagos de un cliente
		// plural_model_name: '',
		// selected_model: null,
		// from_date: moment().subtract(1, 'months').format('YYYY-MM-DD'),
		// until_date: moment().format('YYYY-MM-DD'),

		from_date: moment().format('YYYY-MM-DD'),
		until_date: '',

		page: 1,
		per_page: 200,
		total_pages: 1, 

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
		setLocalStorage(state, value) {
			state.use_local_storage = value 
		},
		setLocalStorageCanceled(state, value) {
			state.local_storage_canceled = value 
		},

		add_filtered_from_buscador(state, value) {
			let index = state.filtered_from_buscador.findIndex(filter => {
				return filter.key == value.key
			})

			if (index == -1) {
				state.filtered_from_buscador.unshift(value)
			} else {
				state.filtered_from_buscador.splice(index, 1, value)
			}
		},
		filtered_from_buscador(state, value) {
			state.filtered_from_buscador = value 
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
		setIsFiltered(state, value) {
			state.is_filtered = value
		},
		add(state, value) {
			let index = state.models.findIndex(item => {
				return item.id == value.id
			})
			if (index == -1) {
				state.models.unshift(value)
				// console.log('se agrego al final, models quedaron asi:')
				// console.log(state.models)
			} else {
				state.models.splice(index, 1, value)
			}
			if (state.use_local_storage && typeof value.update_local_storage == 'undefined') {
				window.localStorage.setItem(state.model_name+'_user_id_'+window.localStorage.getItem('user_id'), JSON.stringify(state.models))
				window.localStorage.setItem(state.model_name+'_updated_user_id_'+window.localStorage.getItem('user_id'), moment().format('YYYY-MM-DD HH:mm:ss'))
				// console.log('se actualizo localStorage')
				// console.log(window.localStorage.getItem(state.model_name+'_user_id_'+window.localStorage.getItem('user_id')))
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

			if (state.use_local_storage) {
				window.localStorage.setItem(state.model_name+'_user_id_'+window.localStorage.getItem('user_id'), JSON.stringify(state.models))
				window.localStorage.setItem(state.model_name+'_updated_user_id_'+window.localStorage.getItem('user_id'), moment().format('YYYY-MM-DD HH:mm:ss'))
			}

			// Filtereds
			index = state.filtered.findIndex(model => {
				return model.id == state.delete.id
			})
			if (index != -1) {
				state.filtered.splice(index, 1)
			}

			if (state.selected_model) {
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
		removeStock(state, articles) {
			let state_model 
			let index 
			let stock_resultante
			articles.forEach(article => {
				if (article.is_article) {
					state_model = state.models.find(model => {
						return model.id == article.id
					})
					index = state.models.findIndex(item => {
						return item.id == article.id
					})
					if (typeof state_model != 'undefined' && state_model.stock) {
						stock_resultante = state_model.stock - article.amount
						if (stock_resultante > 0) {
							state_model.stock = stock_resultante
						} else {
							state_model.stock = 0
						}
						state.models.splice(index, 1, state_model)
					}
				}
			})
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
		setTotalFilterResults(state, value) {
			state.total_filter_results = value 
		},
		addFiltered(state, value) {
			state.filtered = state.filtered.concat(value)
		},
		setLoadingFiltered(state, value) {
			state.loading_filtered = value 
		},
	},
	actions: {
		getModels({commit, state, dispatch}) {
			commit('setSelected', [])
			commit('setFiltered', [])
			commit('setIsFiltered', false)
			if (state.use_per_page) {
				commit('setPage', 1)
				commit('setModels', [])
				if (state.use_local_storage) {
					let local_storage_models = window.localStorage.getItem(state.model_name+'_user_id_'+window.localStorage.getItem('user_id'))
					if (local_storage_models) { 
						commit('setModels', JSON.parse(local_storage_models))
					}
				}
			}
			return dispatch('_getModels')
		},
		_getModels({commit, state, dispatch}) {
			commit('setLoading', true)
			let url = '/api/'+generals.methods.routeString(state.model_name)
			if (state.plural_model_name) {
				if (state.selected_model) {
					url += '/'+state.selected_model.id
				} else {
					url += '/0'
				}
			} 
			if (state.route_prefix) {
				url += '/'+state.route_prefix
			} 
			if (state.from_dates) {
				url += '/'+state.from_date
			} 
			if (state.until_date != '') {
				url += '/'+state.until_date
			}
			if (state.use_local_storage) {
				url += '/'+window.localStorage.getItem(state.model_name+'_updated_user_id_'+window.localStorage.getItem('user_id'))
			}
			if (state.local_storage_canceled) {
				url += '/null'
			}
			if (state.use_per_page) {
				url += '?page='+state.page 
			}
			return axios.get(url)
			.then(res => {
				if (state.use_per_page) {
					let loaded_models = res.data.models.data
					if (res.data.models.current_page == 1) {
						commit('setTotalPages', res.data.models.last_page)
						if (res.data.models.last_page > 15 && state.use_local_storage) {
							commit('setLocalStorage', false)
							commit('setLocalStorageCanceled', true)
							console.log('se cancelo localStorage porque hay '+state.total_pages+' paginas')
						}
					}
					console.log('se cargo '+state.model_name+' page: '+state.page)
					commit('incrementPage')
					if (state.use_local_storage) {
						loaded_models.forEach(model => {
							model.update_local_storage = false
							commit('add', model)
						})
					} else {
						commit('addModels', loaded_models)
					}
					if (loaded_models.length == state.per_page) {
						dispatch('_getModels')
					} else {
						commit('setLoading', false)
						commit('setPage', 1)
						if (state.use_local_storage) {
							if (state.models.length && state.models[0].id < state.models[state.models.length-1].id) {
								state.models = state.models.reverse()
							}
							window.localStorage.setItem(state.model_name+'_user_id_'+window.localStorage.getItem('user_id'), JSON.stringify(state.models))
							window.localStorage.setItem(state.model_name+'_updated_user_id_'+window.localStorage.getItem('user_id'), moment().format('YYYY-MM-DD HH:mm:ss'))
							dispatch('getDeletedModels')
						}
					}
				} else {
					commit('setLoading', false)
					commit('setModels', res.data.models)
				}
			})
			.catch(err => {
				commit('setLoading', false)
				console.log(err)
			})
		},
		loadMoreFiltered({state, commit}) {
			commit('setLoadingFiltered', true)
			commit('incrementFilterPage')
			return axios.post(`/api/search/${generals.methods.routeString(state.model_name)}/null/1?page=${state.filter_page}`, {
				filters: state.filters,
			})
			.then(res => {
				commit('setLoadingFiltered', false)
				commit('addFiltered', res.data.data)
			})
			.catch(err => {
				console.log(err)
				commit('setLoadingFiltered', false)
			})
		},
		getDeletedModels({state, commit}) {
			return axios.get(`/api/${generals.methods.routeString(state.model_name)}/deleted-models/${window.localStorage.getItem(state.model_name+'_updated_user_id_'+window.localStorage.getItem('user_id'))}`)
			.then(res => {
				console.log('deletedModels')
				console.log(res.data.models)
				res.data.models.forEach(model => {
					commit('setDelete', model)
					commit('delete')
				})
				window.localStorage.setItem(state.model_name+'_updated_user_id_'+window.localStorage.getItem('user_id'), moment().format('YYYY-MM-DD HH:mm:ss'))
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
