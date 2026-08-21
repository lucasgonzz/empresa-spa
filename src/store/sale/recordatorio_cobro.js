import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

/**
 * Módulo Vuex del recordatorio de cobro por WhatsApp (alertas > Cobros).
 *
 * Tres cosas que conviene tener presentes antes de tocar algo acá:
 *
 * 1. 🔴 El backend NUNCA recibe la lista de ventas. Recibe `client_id` y `dias`, y vuelve a
 *    resolver la query con el recorte del usuario autenticado. Si el front mandara ids, un
 *    empleado con `ver_solo_las_ventas_suyas` podría hacerle llegar a un cliente ventas que
 *    no le corresponde ver.
 * 2. Los `dias` salen de `sale/ventas_sin_cobrar`, no de un payload: la previsualización y el
 *    envío tienen que hablar del MISMO recorte que está viendo el usuario en pantalla.
 * 3. Cero async/await: todo con `let self = this` y `.then()`/`.catch()`, como manda el repo.
 */
export default {
	namespaced: true,

	state: {
		/** Respuesta de `GET recordatorio-cobro/preview/{client_id}`. null mientras no hay nada cargado. */
		preview: null,

		/**
		 * Estado del lote en curso: `{uuid, total, total_clientes, procesados, enviados,
		 * fallidos, terminado}`. Arranca con lo que devuelve el 202 y después lo va pisando
		 * el polling.
		 */
		lote: null,

		/** true mientras hay un POST de envío en vuelo. Deshabilita los botones. */
		enviando: false,

		/** Clientes que el backend NO encoló, con su motivo. 🔴 Se muestran, no se ocultan. */
		salteados: [],
	},

	mutations: {
		setPreview(state, value) {
			state.preview = value
		},
		setEnviando(state, value) {
			state.enviando = value
		},
		setSalteados(state, value) {
			state.salteados = value ? value : []
		},
		/**
		 * Guarda el estado del lote que devuelve el polling, conservando `total_clientes`.
		 *
		 * `total_clientes` sólo viaja en el 202 (los clientes que se miraron), mientras que el
		 * endpoint de estado devuelve `total` (los que efectivamente se encolaron). Si se
		 * pisara el objeto entero, la pantalla perdería el número con el que arrancó.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Object} value Objeto `lote` de la respuesta.
		 * @returns {void}
		 */
		setLote(state, value) {
			if (!value) {
				state.lote = null
				return
			}
			let total_clientes = state.lote ? state.lote.total_clientes : null
			state.lote = Object.assign({}, value, {
				total_clientes: total_clientes !== null ? total_clientes : value.total,
			})
		},
		/**
		 * Arma el estado inicial del lote con el 202 del envío, antes de que haya un solo tick
		 * de polling. Sin esto la barra arranca vacía y sin número, que es justo el momento en
		 * el que el usuario necesita ver que algo pasó.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Object} data Cuerpo del 202: `{lote_uuid, total_clientes, encolados, salteados}`.
		 * @returns {void}
		 */
		setLoteDesdeRespuesta(state, data) {
			state.salteados = data.salteados ? data.salteados : []
			state.lote = {
				uuid: data.lote_uuid,
				total: data.encolados,
				total_clientes: data.total_clientes,
				procesados: 0,
				enviados: 0,
				fallidos: 0,
				// Sin nada encolado no hay job que vaya a mover un contador: el lote ya terminó.
				terminado: !data.encolados,
			}
		},
		/** Deja el módulo como recién cargado. Se llama al abrir cada modal. */
		reset(state) {
			state.preview = null
			state.lote = null
			state.enviando = false
			state.salteados = []
		},
	},

	actions: {
		/**
		 * Previsualiza el recordatorio de un cliente: el mensaje YA ARMADO, con el nombre, los
		 * montos y las ventas resueltos.
		 *
		 * 🔴 Previsualizar y enviar comparten el armado en el backend. Acá no se toca ni una
		 * coma del `body`: si el front lo retocara, mostraría una cosa y saldría otra.
		 *
		 * @param {Object} context commit, rootState.
		 * @param {Number} client_id Cliente a previsualizar.
		 * @returns {Promise}
		 */
		getPreview({commit, rootState}, client_id) {
			commit('setPreview', null)
			let url = 'api/recordatorio-cobro/preview/' + client_id
			let dias = rootState.sale.ventas_sin_cobrar.dias
			if (dias !== null && dias !== '') {
				url += '?dias=' + dias
			}
			return axios.get(url)
			.then(res => {
				commit('setPreview', res.data.preview)
				return res.data.preview
			})
			.catch(err => {
				console.log(err)
				return Promise.reject(err)
			})
		},

		/**
		 * Encola el recordatorio de un solo cliente. Devuelve un 202 con la misma forma que el
		 * masivo, así que el resultado se lee igual en los dos modales.
		 *
		 * @param {Object} context commit, rootState.
		 * @param {Number} client_id Cliente al que se le manda.
		 * @returns {Promise}
		 */
		enviar({commit, rootState}, client_id) {
			commit('setEnviando', true)
			return axios.post('api/recordatorio-cobro/enviar', {
				client_id: client_id,
				dias: rootState.sale.ventas_sin_cobrar.dias,
			})
			.then(res => {
				commit('setEnviando', false)
				commit('setLoteDesdeRespuesta', res.data)
				return res.data
			})
			.catch(err => {
				commit('setEnviando', false)
				console.log(err)
				return Promise.reject(err)
			})
		},

		/**
		 * Encola el recordatorio para todos los clientes del filtro.
		 *
		 * 🔴 No se le manda ninguna lista: el backend recalcula los clientes con la misma
		 * secuencia que armó la pantalla, para que el recorte por rol valga también acá.
		 *
		 * @param {Object} context commit, rootState.
		 * @returns {Promise}
		 */
		enviarMasivo({commit, rootState}) {
			commit('setEnviando', true)
			return axios.post('api/recordatorio-cobro/enviar-masivo', {
				dias: rootState.sale.ventas_sin_cobrar.dias,
			})
			.then(res => {
				commit('setEnviando', false)
				commit('setLoteDesdeRespuesta', res.data)
				return res.data
			})
			.catch(err => {
				commit('setEnviando', false)
				console.log(err)
				return Promise.reject(err)
			})
		},

		/**
		 * Un tick del progreso. Lo llama el `setInterval` del modal masivo cada 2 segundos.
		 *
		 * Devuelve el lote para que el que hace el polling pueda decidir si sigue o corta sin
		 * tener que espiar el state.
		 *
		 * @param {Object} context commit, state.
		 * @returns {Promise}
		 */
		getEstadoLote({commit, state}) {
			if (!state.lote || !state.lote.uuid) {
				return Promise.resolve(null)
			}
			return axios.get('api/recordatorio-cobro/lote/' + state.lote.uuid)
			.then(res => {
				commit('setLote', res.data.lote)
				return res.data.lote
			})
			.catch(err => {
				console.log(err)
				return Promise.reject(err)
			})
		},
	},
}
