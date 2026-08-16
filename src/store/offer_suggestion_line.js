import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,
	state: {
		/*
			Dos tablas server-side del modulo de ofertas, en un solo modulo: las
			LINEAS sugeridas de una corrida (GET offer-suggestion/{id}/lines) y las
			ofertas YA ACTIVADAS (GET client-offer). Van juntas a proposito: las
			activas solo se listan al lado de las sugeridas, no tienen CRUD propio, y
			un tercer modulo de Vuex por una tabla que solo se lee es ruido.
			Molde de purchase_suggestion_article.js.
		*/

		// Lineas sugeridas de la pagina actual.
		lines: [],
		// Corrida a la que pertenecen las lineas pedidas.
		offer_suggestion_id: null,
		paginacion: {
			page: 1,
			per_page: 50,
			total: 0,
			last_page: 1,
		},
		// Filtros y orden vigentes de la tabla de sugeridas (todos server-side).
		filtros: {
			client_id: 0,
			criterio: '',
			solo_sin_activar: false,
			order: 'prioridad',
		},
		loading_lines: false,
		// Token de la ultima peticion de getLines (patron de
		// purchase_suggestion_article.js): dos pedidos en vuelo (cambio rapido de
		// filtro o de pagina) pueden resolverse fuera de orden, y sin el la
		// respuesta vieja pisaria a la nueva en la tabla.
		peticion_token: 0,

		// Ofertas ya activadas (client_offers) de la pagina actual.
		activas: [],
		paginacion_activas: {
			page: 1,
			per_page: 50,
			total: 0,
			last_page: 1,
		},
		filtros_activas: {
			estado: 'activa',
			client_id: 0,
		},
		loading_activas: false,
		// Token propio para las activas: las dos tablas se piden en paralelo, asi
		// que compartir un solo contador haria que un pedido descartara al otro.
		peticion_token_activas: 0,
	},
	mutations: {
		set_lines(state, value) {
			state.lines = value
		},
		set_offer_suggestion_id(state, value) {
			state.offer_suggestion_id = value
		},
		set_paginacion(state, value) {
			state.paginacion = value
		},
		// Merge parcial: pisa un filtro sin re-declarar los otros (ej: {client_id: 3}).
		set_filtros(state, value) {
			state.filtros = Object.assign({}, state.filtros, value)
		},
		set_loading_lines(state, value) {
			state.loading_lines = value
		},
		incrementar_peticion_token(state) {
			state.peticion_token++
		},
		set_activas(state, value) {
			state.activas = value
		},
		set_paginacion_activas(state, value) {
			state.paginacion_activas = value
		},
		set_filtros_activas(state, value) {
			state.filtros_activas = Object.assign({}, state.filtros_activas, value)
		},
		set_loading_activas(state, value) {
			state.loading_activas = value
		},
		incrementar_peticion_token_activas(state) {
			state.peticion_token_activas++
		},
	},
	actions: {
		/**
		 * Pide una pagina de lineas sugeridas de la corrida.
		 * payload: {offer_suggestion_id?, page?}. Sin corrida en el payload se
		 * reusa la ultima pedida; sin ninguna, no sale ningun request.
		 */
		getLines({state, commit}, payload = {}) {
			if (payload.offer_suggestion_id) {
				commit('set_offer_suggestion_id', payload.offer_suggestion_id)
			}
			if (!state.offer_suggestion_id) {
				return Promise.resolve()
			}
			commit('set_loading_lines', true)
			// Se captura el token ANTES de despachar: si al volver la respuesta el
			// token del state ya es otro, hubo un pedido mas nuevo y esta respuesta
			// se descarta (el loading lo apaga el pedido vigente).
			commit('incrementar_peticion_token')
			let token = state.peticion_token

			let params = {
				page: payload.page || 1,
				per_page: state.paginacion.per_page,
				order: state.filtros.order,
			}
			// El 0 (cliente) y el '' (criterio) significan "todos": no se mandan
			// para que el backend no filtre.
			if (state.filtros.client_id) {
				params.client_id = state.filtros.client_id
			}
			if (state.filtros.criterio) {
				params.criterio = state.filtros.criterio
			}
			// El booleano solo se manda cuando esta prendido: mandar
			// solo_sin_activar=0 activaria el filtro igual del lado del backend,
			// que decide con $request->filled() (un "0" cuenta como "lleno" para
			// Laravel: filled() solo descarta null, '' y []).
			if (state.filtros.solo_sin_activar) {
				params.solo_sin_activar = 1
			}

			return axios.get('/api/offer-suggestion/' + state.offer_suggestion_id + '/lines', {params: params})
			.then(res => {
				if (token != state.peticion_token) {
					return
				}
				commit('set_loading_lines', false)
				let paginator = res.data.models
				commit('set_lines', paginator.data)
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
				commit('set_loading_lines', false)
				console.log(err)
			})
		},
		/**
		 * Pide una pagina de ofertas ya activadas (client_offers). payload: {page?}.
		 */
		getActivas({state, commit}, payload = {}) {
			commit('set_loading_activas', true)
			commit('incrementar_peticion_token_activas')
			let token = state.peticion_token_activas

			let params = {
				page: payload.page || 1,
				per_page: state.paginacion_activas.per_page,
				estado: state.filtros_activas.estado,
			}
			if (state.filtros_activas.client_id) {
				params.client_id = state.filtros_activas.client_id
			}

			return axios.get('/api/client-offer', {params: params})
			.then(res => {
				if (token != state.peticion_token_activas) {
					return
				}
				commit('set_loading_activas', false)
				let paginator = res.data.models
				commit('set_activas', paginator.data)
				commit('set_paginacion_activas', {
					page: paginator.current_page,
					per_page: paginator.per_page,
					total: paginator.total,
					last_page: paginator.last_page,
				})
			})
			.catch(err => {
				if (token != state.peticion_token_activas) {
					return
				}
				commit('set_loading_activas', false)
				console.log(err)
			})
		},
	},
}
