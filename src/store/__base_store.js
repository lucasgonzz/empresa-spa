import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import moment from 'moment'
import generals from '@/common-vue/mixins/generals'

/**
 * Factory de módulo base Vuex para stores de modelos.
 *
 * Objetivo:
 * - Evitar duplicación (la mayoría de stores comparten state/mutations/actions).
 * - Permitir override total (Opción A): cualquier store puede agregar o reescribir state/mutations/actions.
 * - Evitar state compartido entre módulos: el state se construye por función (nuevo objeto por store).
 *
 * Notas:
 * - Mantiene el estilo del proyecto (promesas .then/.catch, sin async/await).
 * - Pensado para stores "CRUD + filtros + selección" usados por la tabla común.
 *
 * @param {Object} options Configuración/overrides del store concreto.
 * @param {Object|Function} options.state Estado extra u override. Si es función, se invoca al construir state.
 * @param {Object} options.mutations Mutations extra u override.
 * @param {Object} options.actions Actions extra u override.
 * @param {Object} options.getters Getters extra u override.
 * @param {Object} options.modules Submódulos Vuex.
 * @returns {Object} Módulo Vuex namespaced listo para registrar.
 */
export default function __base_store(options = {}) {
	/** Estado custom del store concreto (puede ser objeto o función). */
	let custom_state = options.state
	/** Features opcionales del store (apagadas por default). */
	let features = options.features || {}
	/** Mutations custom del store concreto (se mergean, y pueden pisar las base). */
	let custom_mutations = options.mutations || {}
	/** Actions custom del store concreto (se mergean, y pueden pisar las base). */
	let custom_actions = options.actions || {}
	/** Getters custom del store concreto (se mergean, y pueden pisar las base). */
	let custom_getters = options.getters || {}
	/** Submódulos custom del store concreto (ej: article tiene modules internos). */
	let custom_modules = options.modules || {}

	/**
	 * Construye el state base del módulo.
	 * Se retorna como función para que cada módulo tenga su propio state (no compartido).
	 */
	function base_state() {
		/** Estado base compartido por la mayoría de modelos (tabla, filtros, selección, etc). */
		let base = {
			model_name: '',
			route_prefix: '',
			from_dates: false,
			is_selecteable: false,

			use_per_page: false,

			from_date: moment().format('YYYY-MM-DD'),
			until_date: '',

			page: 1,
			per_page: 50,
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
			filter_per_page: 50,
			loading_filtered: false,

			delete: null,
			delete_image_prop: null,
			delete_image_model: null,

			prop_model_to_delete: null,

			display: 'table',

			loading: false,

			props_to_show: [],
		}

		/**
		 * Feature: cache en localStorage para stores con endpoints preparados.
		 * Apagado por default. Pensado para `article` (usa updated_at param + endpoint deleted-models).
		 */
		if (features.local_storage) {
			// Flag que activa el cache en localStorage para el módulo.
			base.use_local_storage = false
			// Flag para cortar el uso de localStorage cuando el dataset es demasiado grande.
			base.local_storage_canceled = false
		}

		/** Estado adicional u override del store concreto. */
		let extra = {}
		if (typeof custom_state === 'function') {
			extra = custom_state() || {}
		} else if (custom_state && typeof custom_state === 'object') {
			extra = custom_state
		}

		return Object.assign({}, base, extra)
	}

	/** Mutations base (copiadas de `src/store/__base.js` y usadas por la mayoría de stores). */
	let base_mutations = {
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
		setFilterPerPage(state, value) {
			let n = parseInt(value, 10)
			if (isNaN(n) || n < 1) {
				n = 5
			}
			if (n > 200) {
				n = 200
			}
			state.filter_per_page = n
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
	}

	/**
	 * Feature: cache localStorage (mutations extras + wrappers).
	 * Se agrega solo si está habilitada para evitar afectar a otros módulos.
	 */
	if (features.local_storage) {
		/** Mutation para activar/desactivar localStorage desde el store concreto. */
		base_mutations.setLocalStorage = function (state, value) {
			state.use_local_storage = value
		}
		/** Mutation para marcar cancelación del uso de localStorage por volumen de datos. */
		base_mutations.setLocalStorageCanceled = function (state, value) {
			state.local_storage_canceled = value
		}

		// Wrapper de add: mantiene funcionalidad base + sincroniza localStorage si corresponde.
		let base_add = base_mutations.add
		base_mutations.add = function (state, value) {
			base_add(state, value)
			if (state.use_local_storage && typeof value.update_local_storage == 'undefined') {
				window.localStorage.setItem(
					state.model_name + '_user_id_' + window.localStorage.getItem('user_id'),
					JSON.stringify(state.models)
				)
				window.localStorage.setItem(
					state.model_name + '_updated_user_id_' + window.localStorage.getItem('user_id'),
					moment().format('YYYY-MM-DD HH:mm:ss')
				)
			}
		}

		// Wrapper de delete: mantiene funcionalidad base + sincroniza localStorage si corresponde.
		let base_delete = base_mutations.delete
		base_mutations.delete = function (state) {
			base_delete(state)
			if (state.use_local_storage) {
				window.localStorage.setItem(
					state.model_name + '_user_id_' + window.localStorage.getItem('user_id'),
					JSON.stringify(state.models)
				)
				window.localStorage.setItem(
					state.model_name + '_updated_user_id_' + window.localStorage.getItem('user_id'),
					moment().format('YYYY-MM-DD HH:mm:ss')
				)
			}
		}
	}

	/** Actions base (copiadas de `src/store/__base.js` y usadas por la mayoría de stores). */
	let base_actions = {
		getModels({commit, state, dispatch}) {
			commit('setSelected', [])
			commit('setFiltered', [])
			commit('setIsFiltered', false)
			if (state.use_per_page) {
				commit('setPage', 1)
				commit('setModels', [])
			}
			return dispatch('_getModels')
		},
		_getModels({commit, state, dispatch}) {
			commit('setLoading', true)
			let url = '/api/' + generals.methods.routeString(state.model_name)
			if (state.plural_model_name) {
				if (state.selected_model) {
					url += '/' + state.selected_model.id
				} else {
					url += '/0'
				}
			}
			if (state.route_prefix != '' || state.route_prefix === 0) {
				url += '/' + state.route_prefix
			}
			if (state.from_dates) {
				url += '/from-date/' + state.from_date
			}
			if (state.until_date != '') {
				url += '/' + state.until_date
			}
			if (state.use_per_page) {
				url += '?page=' + state.page
			}
			return axios.get(url)
			.then(res => {
				if (state.use_per_page) {
					let loaded_models = res.data.models.data
					if (res.data.models.current_page == 1) {
						commit('setTotalPages', res.data.models.last_page)
					}
					console.log('se cargo ' + state.model_name + ' page: ' + state.page)
					commit('incrementPage')
					commit('addModels', loaded_models)
					if (loaded_models.length == state.per_page) {
						dispatch('_getModels')
					} else {
						commit('setLoading', false)
						commit('setPage', 1)
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
			commit('incrementFilterPage')
			return axios.post(`/api/search/${generals.methods.routeString(state.model_name)}/null/1?page=${state.filter_page}`, {
				filters: state.filters,
				per_page: state.filter_per_page,
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
		},

		/**
		 * Ejecuta búsqueda filtrada (POST search) con los criterios actuales del store.
		 * Esto permite re-ejecutar el filtro luego de operaciones masivas (ej: eliminar seleccionados).
		 *
		 * @param {Object} context commit, state
		 * @param {Object} payload
		 * @param {Number|null} payload.page Página a consultar (si no viene, usa state.filter_page).
		 * @returns {Promise}
		 */
		runFilter({commit, state}, payload = {}) {
			/** Página objetivo: por defecto, la actual del store. */
			let page = (payload && payload.page) ? payload.page : state.filter_page
			/** Cantidad por página para resultados filtrados (alineado con backend search). */
			let per_page = state.filter_per_page || 5

			commit('auth/setMessage', 'Filtrando ' + state.model_name, {root: true})
			commit('auth/setLoading', true, {root: true})

			return axios.post('/api/search/' + generals.methods.routeString(state.model_name) + '/null/1?page=' + page, {
				filters: state.filters,
				papelera: false,
				per_page: per_page,
			})
				.then(res => {
					commit('auth/setLoading', false, {root: true})
					commit('auth/setMessage', '', {root: true})

					/** Filas devueltas por la búsqueda (puede ser vacío y sigue siendo filtrado activo). */
					let rows = res.data.data || []
					commit('setIsFiltered', true)
					commit('setFiltered', rows)
					commit('setTotalFilterPages', res.data.last_page)
					commit('setTotalFilterResults', res.data.total)
				})
				.catch(err => {
					commit('auth/setLoading', false, {root: true})
					commit('auth/setMessage', '', {root: true})
					console.log(err)
				})
		},
	}

	/**
	 * Feature: cache localStorage (actions extras + wrappers).
	 * Se agrega solo si está habilitada.
	 */
	if (features.local_storage) {
		let base_get_models = base_actions.getModels
		base_actions.getModels = function ({commit, state, dispatch}) {
			/**
			 * Si usa paginación, opcionalmente precarga modelos desde localStorage.
			 * Esto reduce el tiempo de primera renderización mientras llega el request al server.
			 */
			commit('setSelected', [])
			commit('setFiltered', [])
			commit('setIsFiltered', false)
			if (state.use_per_page) {
				commit('setPage', 1)
				commit('setModels', [])
				if (state.use_local_storage) {
					let local_storage_models = window.localStorage.getItem(state.model_name + '_user_id_' + window.localStorage.getItem('user_id'))
					if (local_storage_models) {
						commit('setModels', JSON.parse(local_storage_models))
					}
				}
			}
			return dispatch('_getModels')
		}

		let base__get_models = base_actions._getModels
		base_actions._getModels = function ({commit, state, dispatch}) {
			/**
			 * Este wrapper mantiene el flujo base y agrega los parámetros esperados por endpoints con localStorage.
			 * IMPORTANTE: está pensado para `article` (contrato de API existente).
			 */
			commit('setLoading', true)
			let url = '/api/' + generals.methods.routeString(state.model_name)
			if (state.plural_model_name) {
				if (state.selected_model) {
					url += '/' + state.selected_model.id
				} else {
					url += '/0'
				}
			}
			if (state.route_prefix != '' || state.route_prefix === 0) {
				url += '/' + state.route_prefix
			}
			if (state.from_dates) {
				url += '/from-date/' + state.from_date
			}
			if (state.until_date != '') {
				url += '/' + state.until_date
			}
			if (state.use_local_storage) {
				url += '/' + window.localStorage.getItem(state.model_name + '_updated_user_id_' + window.localStorage.getItem('user_id'))
			}
			if (state.local_storage_canceled) {
				url += '/null'
			}
			if (state.use_per_page) {
				url += '?page=' + state.page
			}
			return axios.get(url)
				.then(res => {
					if (state.use_per_page) {
						let loaded_models = res.data.models.data
						if (res.data.models.current_page == 1) {
							commit('setTotalPages', res.data.models.last_page)
							// Si hay demasiadas páginas, desactivamos localStorage para evitar peso excesivo.
							if (res.data.models.last_page > 15 && state.use_local_storage) {
								commit('setLocalStorage', false)
								commit('setLocalStorageCanceled', true)
								console.log('se cancelo localStorage porque hay ' + state.total_pages + ' paginas')
							}
						}
						console.log('se cargo ' + state.model_name + ' page: ' + state.page)
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
								if (state.models.length && state.models[0].id < state.models[state.models.length - 1].id) {
									state.models = state.models.reverse()
								}
								window.localStorage.setItem(state.model_name + '_user_id_' + window.localStorage.getItem('user_id'), JSON.stringify(state.models))
								window.localStorage.setItem(state.model_name + '_updated_user_id_' + window.localStorage.getItem('user_id'), moment().format('YYYY-MM-DD HH:mm:ss'))
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
		}

		/**
		 * Trae modelos eliminados desde la última marca (timestamp) guardada en localStorage.
		 * Solo aplica a endpoints que implementen `deleted-models/{updated_at}`.
		 */
		base_actions.getDeletedModels = function ({state, commit}) {
			return axios.get(`/api/${generals.methods.routeString(state.model_name)}/deleted-models/${window.localStorage.getItem(state.model_name + '_updated_user_id_' + window.localStorage.getItem('user_id'))}`)
				.then(res => {
					res.data.models.forEach(model => {
						commit('setDelete', model)
						commit('delete')
					})
					window.localStorage.setItem(state.model_name + '_updated_user_id_' + window.localStorage.getItem('user_id'), moment().format('YYYY-MM-DD HH:mm:ss'))
				})
				.catch(err => {
					console.log(err)
				})
		}
	}

	return {
		namespaced: true,
		state: base_state,
		mutations: Object.assign({}, base_mutations, custom_mutations),
		actions: Object.assign({}, base_actions, custom_actions),
		getters: Object.assign({}, custom_getters),
		modules: Object.assign({}, custom_modules),
	}
}

