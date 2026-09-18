import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

import generals from '@/common-vue/mixins/generals'

/**
 * Dice si un comprador tiene al menos un mensaje.
 * Mira el agregado `messages_count` que manda el listado y, si no vino, el largo de `messages`.
 *
 * @param {Object} buyer Comprador tal como está en el store `buyer`.
 * @returns {boolean}
 */
function buyer_has_messages(buyer) {
	if (Number(buyer.messages_count || 0) > 0) {
		return true
	}
	return Array.isArray(buyer.messages) && buyer.messages.length > 0
}

/**
 * Fecha del último mensaje de un comprador en milisegundos, para ordenar la bandeja de chats.
 * Prefiere el agregado `last_message_at` del listado y cae a `messages[último].created_at`.
 * Sin ninguna de las dos devuelve 0: el comprador va al final sin romper el sort.
 *
 * @param {Object} buyer Comprador tal como está en el store `buyer`.
 * @returns {number}
 */
function buyer_last_message_timestamp(buyer) {
	// Fecha a convertir: el agregado, o la del último mensaje cargado si el agregado no vino.
	let last_message_at = buyer.last_message_at
	if (!last_message_at && Array.isArray(buyer.messages) && buyer.messages.length) {
		last_message_at = buyer.messages[buyer.messages.length - 1].created_at
	}
	if (!last_message_at) {
		return 0
	}
	// Milisegundos desde epoch; una fecha inválida se trata igual que ninguna.
	let timestamp = new Date(last_message_at).getTime()
	return isNaN(timestamp) ? 0 : timestamp
}

export default {
	namespaced: true,
	state: {
		model_name: 'message',

		models: [],
		model: {},
		to_show: [],
		selected: [],

		selected_buyer: null,
		chats_to_show: [],
		show_articles: false,
		selected_article: null,

		delete: null,
		delete_image: null,

		prop_model_to_delete: null,

		display: 'table',

		loading: false,

		props_to_show: [],
	},
	mutations: {
		set_props_to_show(state, value) {
			state.props_to_show = value
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
		setModels(state, value) {
			if (value) {
				state.models = value
			} else {
				state.models = []
			}
		},
		setSelectedBuyer(state, buyer) {
			state.selected_buyer = buyer
		},
		setShowArticles(state, value) {
			state.show_articles = value
		},
		setSelectedArticle(state, value) {
			state.selected_article = value
		},
		setChatsToShow(state, buyers_models) {
			/*
				Busco los buyers ya descargados, filtro los que tengan mensajes (leídos o sin
				leer) y los ordeno por la fecha del último mensaje.

				Se decide con los agregados del listado (`messages_count`, `last_message_at`) y
				no con `messages`: desde el 9/9/2026 GET /api/buyer ya no trae la historia de
				mensajes de cada comprador (en Fenix eran 88k mensajes por llamada y tumbó el
				VPS), así que `messages` llega vacío y recién se llena al abrir la conversación
				(message/getModels). Mirar `messages.length` acá dejaría la bandeja vacía.
				El fallback a `messages` queda para un payload viejo, que trae la historia y
				ningún agregado.
			*/
			// Listado de buyers a evaluar para la bandeja de chats.
			// Se espera que venga desde `rootState.buyer.models` o un filtro manual (ej: buscador).
			let buyers_to_evaluate = Array.isArray(buyers_models) ? buyers_models : []
			let buyers = []
			buyers_to_evaluate.forEach(buyer => {
				if (buyer && buyer_has_messages(buyer)) {
					buyers.push(buyer)
				}
			})
			let buyers_sort = buyers.sort((a, b) => buyer_last_message_timestamp(b) - buyer_last_message_timestamp(a))
			state.chats_to_show = buyers_sort
		},
		setToShow(state, value) {
			if (value) {
				state.to_show = value
			} else {
				state.to_show = state.models.slice(0, 20)
			}
		},
		addToShow(state, value) {
			state.to_show = state.to_show.concat(state.models.slice(state.to_show.length, state.to_show.length + 20))
		},
		setSelected(state, value) {
			state.selected = []
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
		},
		setDelete(state, value) {
			state.delete = value
		},
		delete(state) {
			let index = state.models.findIndex(model => {
				return model.id == state.delete.id
			})
			state.models.splice(index, 1)
		},
		setDeleteImage(state, value) {
			state.delete_image = value
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
		deleteImage(state, value) {
			let index = state.models.images.findIndex(model => {
				return model.id == state.delete.id
			})
			state.models.splice(index, 1)
		},
		setDisplay(state, value) {
			state.display = value 
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
		/**
		 * Arma `chats_to_show` tomando como fuente los buyers ya cargados en el store `buyer`.
		 *
		 * Notas:
		 * - En este proyecto, `buyer.js` exporta el módulo Vuex (factory), no el estado vivo.
		 * - Por eso, para acceder al estado real, se usa `rootState.buyer.models`.
		 *
		 * @param {Object} context Contexto Vuex.
		 * @param {Array|null} buyers_to_show Lista opcional filtrada (por ejemplo desde el buscador).
		 * @returns {void}
		 */
		setChatsToShow({ commit, rootState }, buyers_to_show = null) {
			// Si viene un listado filtrado (por búsqueda), lo uso; si no, uso el store `buyer`.
			let buyers_models = buyers_to_show
			if (!Array.isArray(buyers_models)) {
				buyers_models = rootState && rootState.buyer ? rootState.buyer.models : []
			}
			commit('setChatsToShow', buyers_models)
		},
		getModels({ commit, state }, buyer_id = null) {
			if (!buyer_id) {
				buyer_id = state.selected_buyer.id
			}
			commit('setLoading', true)
			return axios.get(`/api/${generals.methods.routeString(state.model_name)}/${buyer_id}`)
			.then(res => {
				commit('setLoading', false)
				// Actualizo los mensajes dentro del buyer ya cargado en el módulo `buyer`.
				let index = this.state.buyer.models.findIndex(buyer => {
					return buyer.id == buyer_id
				})
				if (index != -1) {
					this.state.buyer.models[index].messages = res.data.models
				}
			})
			.catch(err => {
				commit('setLoading', false)
				console.log(err)
			})
		},
		setMessagesRead({ state }) {
			return axios.get('api/message/set-read/'+state.selected_buyer.id)
			.catch(err => {
				console.log(err)
			})
			console.log('Se marcaron como leidos')
		},
		delete({ commit, state }) {
			return axios.delete(`/api/${generals.methods.routeString(state.model_name)}/${state.delete.id}`)
			.then(() => {
				commit('delete')
				commit('setToShow')
			})
			.catch((err) => {
				console.log(err)
			})
		},
		deleteImage({ commit, state }) {
			return axios.delete(`/api/${generals.methods.routeString(state.model_name)}/image/${state.delete_image.id}`)
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
