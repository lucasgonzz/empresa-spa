import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import moment from 'moment'
import generals from '@/common-vue/mixins/generals'
export default {
	namespaced: true,
	state: {
		/*
			Paginacion server-side de las lineas de una sugerencia de compra, contra
			GET purchase-suggestion/{id}/articles (molde de stock_suggestion_article.js).
		*/

		// Lineas de la pagina actual de la tabla priorizada.
		articles: [],
		// Sugerencia a la que pertenecen las lineas pedidas.
		purchase_suggestion_id: null,
		paginacion: {
			page: 1,
			per_page: 50,
			total: 0,
			last_page: 1,
		},
		// Filtros y orden vigentes de la tabla priorizada.
		filtros: {
			provider_id: 0,
			solo_cambio_de_proveedor: false,
			order: 'prioridad',
		},
		loading_articles: false,
		/*
			Token de la ultima peticion de getArticles (mismo patron de
			stock_suggestion_article.js): dos pedidos en vuelo (cambio rapido de
			filtro o de pagina) pueden resolverse fuera de orden, y sin token la
			respuesta vieja pisaria a la nueva en la tabla.
		*/
		peticion_token: 0,
	},
	mutations: {
		set_articles(state, value) {
			state.articles = value
		},
		set_purchase_suggestion_id(state, value) {
			state.purchase_suggestion_id = value
		},
		set_paginacion(state, value) {
			state.paginacion = value
		},
		/*
			Merge parcial: permite pisar un solo filtro sin re-declarar los otros
			(ej: {provider_id: 3}).
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
		 * Pide una pagina de lineas de la sugerencia al endpoint paginado.
		 *
		 * @param {Object} payload
		 * @param {Number} [payload.purchase_suggestion_id] Sugerencia a consultar; si no viene, se reusa la ultima.
		 * @param {Number} [payload.page] Pagina a pedir (default 1).
		 * @returns {Promise}
		 */
		getArticles({state, commit}, payload = {}) {
			if (payload.purchase_suggestion_id) {
				commit('set_purchase_suggestion_id', payload.purchase_suggestion_id)
			}
			if (!state.purchase_suggestion_id) {
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
			// El filtro en 0 significa "todos los proveedores": no se manda para
			// que el backend no filtre.
			if (state.filtros.provider_id) {
				params.provider_id = state.filtros.provider_id
			}
			// Mismo criterio: solo se manda cuando esta prendido. Mandar
			// solo_cambio_de_proveedor=0 activaria el filtro igual del lado del
			// backend, que decide con $request->filled() (un "0" cuenta como
			// "lleno" para Laravel: filled() solo descarta null, '' y []).
			if (state.filtros.solo_cambio_de_proveedor) {
				params.solo_cambio_de_proveedor = 1
			}

			return axios.get('/api/purchase-suggestion/' + state.purchase_suggestion_id + '/articles', {params: params})
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
