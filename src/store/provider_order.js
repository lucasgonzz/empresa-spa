import axios from 'axios'
import generals from '@/common-vue/mixins/generals'
import __base_store from '@/store/__base_store'

axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

/**
 * Store de órdenes de proveedor (modelo `provider_order`) construido desde el factory común.
 *
 * Conserva estado y acciones propias del módulo de compras (totales, alertas, filtros AFIP, etc.).
 */
export default __base_store({
	/** Estado específico que extiende al estado base del factory. */
	state: {
		model_name: 'provider_order',
		from_dates: true,
		is_selecteable: false,
		use_per_page: false,
		per_page: 25,

		/** Órdenes pendientes de aviso por recepción incompleta. */
		days_to_advise_models: [],

		/** Relaciones activas en filtrado compuesto. */
		relations_filtered: [],

		/** Opción visual de filtro por facturación AFIP en listado. */
		afip_ticket_show_option: 'con-y-sin-factura',

		/** Diferencias detectadas al importar órdenes desde archivo. */
		import_diff: [],

		/**
		 * Total calculado de la orden en edición (antes en submódulo `totales`).
		 * Se actualiza desde `provider_order_total` en model_functions.
		 */
		total: 0,
	},
	mutations: {
		/**
		 * Persiste el total calculado de la orden en edición.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {number} value Monto total calculado.
		 * @returns {void}
		 */
		set_total(state, value) {
			state.total = value
		},
		/**
		 * Actualiza la opción de filtro por comprobantes AFIP.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {string} value Valor de la opción seleccionada.
		 * @returns {void}
		 */
		setAfipTicketShowOption(state, value) {
			state.afip_ticket_show_option = value
		},
		/**
		 * Guarda el diff de importación para revisión en UI.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Array} value Filas con diferencias de importación.
		 * @returns {void}
		 */
		setImportDiff(state, value) {
			state.import_diff = value
		},
		/**
		 * Actualiza órdenes con días para avisar recepción pendiente.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Array} value Listado devuelto por API.
		 * @returns {void}
		 */
		setDaysToAdvise(state, value) {
			state.days_to_advise_models = value
		},
		/**
		 * Agrega una relación al filtrado compuesto si aún no está registrada.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {string} value Nombre de relación a incluir.
		 * @returns {void}
		 */
		addRelationFiltered(state, value) {
			state.relations_filtered.push(value)
		},
		/**
		 * Quita una relación del filtrado compuesto.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {string} value Nombre de relación a remover.
		 * @returns {void}
		 */
		removeRelationFiltered(state, value) {
			/** Índice de la relación dentro del array activo. */
			let index = state.relations_filtered.findIndex(relation => {
				return relation == value
			})
			state.relations_filtered.splice(index, 1)
		},
	},
	actions: {
		/**
		 * Consulta órdenes con recepción pendiente para alertas del sistema.
		 *
		 * @param {Object} context Contexto de Vuex.
		 * @param {Function} context.commit Commit de Vuex.
		 * @param {Object} context.state Estado del módulo.
		 * @returns {Promise}
		 */
		getDaysToAdvise({ commit, state }) {
			/** URL del endpoint de órdenes con días para avisar sin recibir. */
			let endpoint_url = '/api/' + generals.methods.routeString(state.model_name) + '/days-to-advise/not-received'

			return axios.get(endpoint_url)
				.then(res => {
					commit('setDaysToAdvise', res.data.models)
				})
				.catch(err => {
					commit('setLoading', false)
					console.log(err)
				})
		},
	},
})
