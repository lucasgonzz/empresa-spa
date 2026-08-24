import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import moment from 'moment'
import generals from '@/common-vue/mixins/generals'
export default {
	namespaced: true,
	state: {
		stock_suggestion_articles: [],

		/*
			Lo que sigue es de la vista propia de sugerencias (extension
			'sugerencias_inteligentes'): paginacion server-side contra
			GET stock-suggestion/{id}/articles. El array de arriba y su mutation
			son del modal viejo (NavComponent) y quedan intactos a proposito.
		*/

		// Lineas de la pagina actual de la tabla priorizada.
		articles: [],
		// Sugerencia a la que pertenecen las lineas pedidas.
		stock_suggestion_id: null,
		paginacion: {
			page: 1,
			per_page: 50,
			total: 0,
			last_page: 1,
		},
		// Filtros y orden vigentes de la tabla priorizada.
		filtros: {
			from_address_id: 0,
			to_address_id: 0,
			order: 'prioridad',
		},
		loading_articles: false,
		/*
			Token de la ultima peticion de getArticles (patron de los grupos
			299/303, como el modal de analisis IA): dos pedidos en vuelo (cambio
			rapido de filtro o de pagina) pueden resolverse fuera de orden, y sin
			token la respuesta vieja pisaria a la nueva en la tabla.
		*/
		peticion_token: 0,
	},
	mutations: {
		set_stock_suggestion_articles(state, value) {
			state.stock_suggestion_articles = value
		},
		set_articles(state, value) {
			state.articles = value
		},
		set_stock_suggestion_id(state, value) {
			state.stock_suggestion_id = value
		},
		set_paginacion(state, value) {
			state.paginacion = value
		},
		/*
			Merge parcial: permite pisar un solo filtro sin re-declarar los otros
			(ej: {from_address_id: 3}).
		*/
		set_filtros(state, value) {
			state.filtros = Object.assign({}, state.filtros, value)
		},
		set_loading_articles(state, value) {
			state.loading_articles = value
		},
		incrementar_peticion_token(state) {
			state.peticion_token++
		},
	},
	actions: {
		/**
		 * Pide una pagina de lineas de la sugerencia al endpoint paginado nuevo.
		 *
		 * @param {Object} payload
		 * @param {Number} [payload.stock_suggestion_id] Sugerencia a consultar; si no viene, se reusa la ultima.
		 * @param {Number} [payload.page] Pagina a pedir (default 1).
		 * @returns {Promise}
		 */
		getArticles({state, commit}, payload = {}) {
			if (payload.stock_suggestion_id) {
				commit('set_stock_suggestion_id', payload.stock_suggestion_id)
			}
			if (!state.stock_suggestion_id) {
				return Promise.resolve()
			}
			let page = payload.page || 1
			commit('set_loading_articles', true)

			// Se captura el token ANTES de despachar: si al volver la respuesta
			// el token del state ya es otro, hubo un pedido mas nuevo y esta
			// respuesta se descarta (el loading lo apaga el pedido vigente).
			commit('incrementar_peticion_token')
			let token = state.peticion_token

			let params = {
				page: page,
				per_page: state.paginacion.per_page,
				order: state.filtros.order,
			}
			// Los filtros en 0 significan "todos": no se mandan para que el backend no filtre.
			if (state.filtros.from_address_id) {
				params.from_address_id = state.filtros.from_address_id
			}
			if (state.filtros.to_address_id) {
				params.to_address_id = state.filtros.to_address_id
			}

			return axios.get('/api/stock-suggestion/' + state.stock_suggestion_id + '/articles', {params: params})
			.then(res => {
				if (token != state.peticion_token) {
					return
				}
				commit('set_loading_articles', false)
				let paginator = res.data.models
				commit('set_articles', paginator.data)
				commit('set_paginacion', {
					page: paginator.current_page,
					per_page: paginator.per_page,
					total: paginator.total,
					last_page: paginator.last_page,
				})
			})
			.catch(err => {
				if (token != state.peticion_token) {
					return
				}
				commit('set_loading_articles', false)
				console.log(err)
			})
		},
	},
}
