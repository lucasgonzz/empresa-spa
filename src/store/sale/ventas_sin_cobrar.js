import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	namespaced: true,
	state: {
		models: [],
		ventas_sin_cobrar: [],
		/*
			Días de antigüedad que pide el usuario desde la toolbar de Cobros.

			null significa "sin filtro propio": el backend resuelve con su cascada de siempre
			(el día configurado por rol, y el umbral por venta cuando la venta tiene el suyo).
			No es lo mismo que 0, que es un valor válido y quiere decir "todas".
		*/
		dias: null,
	},
	mutations: {
		setModels(state, value) {
			state.models = value
		},
		setVentasSinCobrar(state, value) {
			state.ventas_sin_cobrar = value
		},
		/**
		 * Guarda los días del input de la toolbar.
		 *
		 * El input vacío ('' o null) vuelve a null a propósito: vacío quiere decir "como
		 * siempre", no "cero días". Si se guardara '' tal cual, getModels armaría `?dias=`
		 * y el backend tendría que adivinar.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {String|Number|null} value Valor crudo del input.
		 * @returns {void}
		 */
		setDias(state, value) {
			if (value === '' || value === null || typeof value == 'undefined') {
				state.dias = null
				return
			}
			state.dias = value
		},
	},
	actions: {
		/**
		 * Trae los clientes con ventas sin cobrar.
		 *
		 * 🔴 Lee `state.dias` en vez de recibir un payload, y eso es a propósito: el
		 * `dispatch('sale/ventas_sin_cobrar/getModels')` de Alertas.vue no se toca, así que la
		 * action tiene que poder enterarse del filtro sin que el que la despacha se entere de
		 * que existe. Sin `dias` seteado sale exactamente la misma request de siempre.
		 */
		getModels({state, commit}) {
			let url = 'api/sales-ventas-sin-cobrar'
			if (state.dias !== null && state.dias !== '') {
				url += '?dias=' + state.dias
			}
			return axios.get(url)
			.then(res => {
				console.log('ventas_sin_cobrar:')
				console.log(res.data)
				commit('setModels', res.data.models)
			})
			.catch(err => {
				console.log(err)
			})
		}
	}
}
