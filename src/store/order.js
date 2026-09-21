import axios from 'axios'
import generals from '@/common-vue/mixins/generals'
import __base_store from '@/store/__base_store'
import { env } from '@/runtime_config'

axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

/**
 * Store de pedidos migrado a `__base_store`.
 *
 * Se conserva el estado adicional `unconfirmed_models` y la acción custom
 * para consultar pedidos sin confirmar.
 */
export default __base_store({
	/** Estado específico de `order` que extiende al estado base. */
	state: {
		model_name: 'order',
		from_dates: true,
		per_page: 25,
		unconfirmed_models: [],
	},
	mutations: {
		/**
		 * Actualiza la lista de pedidos sin confirmar.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Array} value Pedidos sin confirmar devueltos por API.
		 * @returns {void}
		 */
		setUnconfirmedModels(state, value) {
			state.unconfirmed_models = value
		},
	},
	actions: {
		/**
		 * Ejecuta el filtrado de pedidos sin depender del loading global `auth`.
		 *
		 * 🔴 Este `runFilter` es PROPIO de `order` y REEMPLAZA por completo al de `__base_store.js`
		 * (`actions: Object.assign({}, base_actions, custom_actions)` ahi: `custom_actions` pisa
		 * cualquier key que comparta nombre, no lo complementa). Por eso el guard de "ultima
		 * intencion gana" (`state.consulta_vigente_token`, agregado en la mision
		 * compras-tabla-vacia-por-fecha del 21/9/2026) tiene que repetirse ACA a mano: sin esto,
		 * Pedidos —modulo "por fecha" igual que Compras, con `change_from_dates_option`— quedaba
		 * expuesto a la misma carrera que dejaba la tabla mostrando el resultado de una busqueda
		 * vieja en vez del dia elegido. Un camino real que la dispara: `opciones-filtrados-
		 * seleccion/Index.vue::refresh_filter_results()` dispatchea `order/runFilter` despues de un
		 * borrado/actualizacion masiva sobre un listado filtrado, y esa respuesta puede volver
		 * despues de que el usuario ya cambio de dia.
		 *
		 * @param {Object} context Contexto de Vuex.
		 * @param {Function} context.commit Commit de Vuex.
		 * @param {Object} context.state Estado del módulo.
		 * @param {Object} payload Datos opcionales del filtrado.
		 * @param {Number|null} payload.page Página a consultar (si no viene usa `filter_page`).
		 * @returns {Promise}
		 */
		runFilter({commit, state}, payload = {}) {
			/** Página a consultar para el listado filtrado. */
			let page = (payload && payload.page) ? payload.page : state.filter_page
			/** Cantidad por página para resultados de búsqueda. */
			let per_page = state.filter_per_page || 5
			/** Endpoint de búsqueda común para el modelo pedido. */
			let endpoint_url = '/api/search/' + generals.methods.routeString(state.model_name) + '/null/1?page=' + page

			// Esta llamada pasa a ser la intencion vigente (mutacion base, ver doc completa en
			// state.consulta_vigente_token de __base_store.js). Se captura el token DESPUES de
			// incrementarlo: es el numero que esta request tiene que seguir viendo vigente cuando
			// vuelva para que su resultado siga valiendo.
			commit('incrementar_consulta_vigente_token')
			let token_de_esta_consulta = state.consulta_vigente_token

			commit('setLoadingFiltered', true)

			return axios.post(endpoint_url, {
				filters: state.filters,
				papelera: false,
				per_page: per_page,
			})
				.then(res => {
					// El indicador de carga se apaga siempre, gane o pierda la carrera: nada mas lo
					// prende a partir de aca, y dejarlo pisado seria peor que el bug que este guard
					// corrige.
					commit('setLoadingFiltered', false)

					// 🔴 Guard de carrera: si el token vigente cambio mientras esta request viajaba,
					// el usuario ya paso a otra cosa (cambio de fecha, otra busqueda) y esta
					// respuesta llego tarde. Se descarta sin commitear nada de lo que sigue: no hace
					// falta ni loguearlo, es trafico normal de una request que perdio la carrera.
					if (state.consulta_vigente_token !== token_de_esta_consulta) {
						return
					}

					/** Filas devueltas por backend (puede venir vacío y sigue siendo filtro activo). */
					let rows = res.data.data || []

					commit('setIsFiltered', true)
					commit('setFiltered', rows)
					commit('setTotalFilterPages', res.data.last_page)
					commit('setTotalFilterResults', res.data.total)
				})
				.catch(err => {
					commit('setLoadingFiltered', false)
					console.log(err)
				})
		},
		/**
		 * Trae desde API los pedidos pendientes de confirmación.
		 *
		 * @param {Object} context Contexto de Vuex.
		 * @param {Function} context.commit Commit de Vuex.
		 * @param {Object} context.state Estado del módulo.
		 * @returns {Promise}
		 */
		getUnconfirmedModels({commit, state}) {
			/** URL del endpoint de pedidos sin confirmar para el modelo actual. */
			let endpoint_url = '/api/' + generals.methods.routeString(state.model_name) + '/unconfirmed/models'

			/*
			 * `skip_navigation_cancel`: este polling (5 min) es la red de seguridad contra plata
			 * perdida si Pusher se cae; no depende de qué pantalla esté abierta, así que una
			 * navegación ajena no lo tiene que cancelar (misión cartel-sin-conexion-accesorios,
			 * 18/9/2026).
			 */
			return axios.get(endpoint_url, { skip_navigation_cancel: true })
				.then(res => {
					commit('setUnconfirmedModels', res.data.models)
				})
				.catch(err => {
					commit('setLoading', false)
					console.log(err)
				})
		},
	},
})
