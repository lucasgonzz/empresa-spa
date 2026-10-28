import Vue from 'vue'
import __base_store from '@/store/__base_store'

/**
 * Store de cuotas de planes de pago (modelo `payment_plan_cuota`) construido desde el factory común.
 */
const cuotas = __base_store({
	state: {
		model_name: 'payment_plan_cuota',
		from_dates: true,
	},
	actions: {
		/**
		 * Cambia el estado de las cuotas conservando el criterio de búsqueda, no las filas.
		 * Click y navegación por URL pasan por acá; si ya coincide, no se pide dos veces.
		 * Los filtros siguen siendo históricos y la restricción a la solapa sale del getter.
		 */
		cambiarSolapa({state, commit, dispatch}, estado) {
			if (['pendiente', 'pagado'].indexOf(estado) === -1 || state.route_prefix === estado) {
				return Promise.resolve()
			}
			// Un criterio guardado puede ser un borrador o haber quedado inactivo al elegir fechas.
			// Solo se repite lo aplicado, incluida una primera búsqueda que todavía no respondió.
			let hay_criterios = (state.is_filtered && !state.listado_por_defecto) || state.loading_filtered

			commit('set_route_prefix', estado)
			commit('incrementar_consulta_vigente_token')
			commit('incrementar_descarga_de_models_token')
			let token = state.consulta_vigente_token
			commit('setLoading', true)
			commit('setModels', [])
			commit('setFiltered', [])
			commit('setSelected', [])
			commit('setTotalFilterPages', null)
			commit('setTotalFilterResults', 0)
			commit('setSaldosFiltrados', null)
			commit('set_totales_de_busqueda', null)

			// Desmontar la paginación antes de volver a 1: su watcher pediría otra búsqueda.
			return Vue.nextTick().then(() => {
				if (state.consulta_vigente_token !== token) {
					return
				}
				commit('setFilterPage', 1)
				if (!hay_criterios) {
					return dispatch('getModels')
				}
				commit('setIsFiltered', true)
				let consulta = dispatch('runGlobalSearch', {page: 1})
				// La búsqueda ya tiene su overlay; el loading local solo desmontó la paginación.
				commit('setLoading', false)
				return consulta
			})
		},
		/**
		 * Pisa el listado por defecto del factory: «Quitar todos los filtros» (BtnRestartFilter) lo
		 * dispara, y el del factory pide TODAS las cuotas de la solapa sin fechas -- o sea un
		 * historico entero con la barra Desde/Hasta todavia visible, que no lo respeta.
		 *
		 * Sin filtros, esta pantalla vuelve a lo que muestra al entrar: el listado por fechas
		 * (`GET payment-plan-cuota/{estado}/from-date`). El historico es solo para cuando el usuario
		 * filtra por una columna (21/10/2026). getModels resetea is_filtered y listado_por_defecto.
		 *
		 * @param {Object} context dispatch
		 * @returns {Promise}
		 */
		runListadoPorDefecto({dispatch}) {
			return dispatch('getModels')
		},
	},
	getters: {
		/**
		 * Marca de pedido que `runGlobalSearch` (__base_store.js) suma al body del POST a
		 * global-search/payment-plan-cuota: restringe la busqueda a la solapa en la que esta parado el
		 * usuario (cuotas pendientes / cuotas pagas).
		 *
		 * Hace falta porque el listado de cada solapa sale de `GET payment-plan-cuota/{estado}/from-date`
		 * (PaymentPlanCuotaController::index), que filtra por estado, pero global-search no pasa por
		 * ahi: sin este criterio un filtro de columna buscaria en TODAS las cuotas y la tabla de
		 * «pendientes» mostraria cuotas pagas.
		 *
		 * Las fechas Desde/Hasta de la barra NO viajan: el filtro es historico a pedido de Lucas
		 * (21/10/2026), por eso lo que se busca no mira `from_date` / `until_date`.
		 *
		 * Va por getter y no por `extra_filters_de_barra` porque BtnRestartFilter vacia ese array al
		 * limpiar los filtros, y con eso se perderia la restriccion a la solapa. `route_prefix` es el
		 * mismo valor que ya usa el listado ('pendiente' | 'pagado', lo fija payment-plan/NavComponent).
		 *
		 * `extra_filters` PISA al del payload (Object.assign en runGlobalSearch), asi que se rearma
		 * entero: los del buscador persistido + los de barra + el estado de la solapa.
		 *
		 * @param {Object} state Estado del modulo.
		 * @returns {Object|null} Claves extra del body, o null mientras no haya solapa elegida.
		 */
		cuerpo_extra_de_busqueda(state) {
			if (state.route_prefix === '' || typeof state.route_prefix === 'undefined') {
				return null
			}
			let del_payload = (state.global_search_payload && state.global_search_payload.extra_filters)
				? state.global_search_payload.extra_filters
				: []
			return {
				extra_filters: del_payload
					.concat(state.extra_filters_de_barra)
					.concat([{key: 'estado', operator: '=', value: state.route_prefix}]),
			}
		},
	},
})

// La intención se marca en este módulo al iniciar la búsqueda, antes de que is_filtered pase a
// true con la respuesta. Elegir fechas la apaga: no se reactivan criterios que quedaron cargados.
let buscar = cuotas.actions.runGlobalSearch
cuotas.actions.runGlobalSearch = function(context, payload = {}) {
	let consulta = buscar(context, payload)
	let token = context.state.consulta_vigente_token
	context.commit('setLoadingFiltered', true)
	return consulta.then(() => {
		if (context.state.consulta_vigente_token === token) {
			context.commit('setLoadingFiltered', false)
		}
	})
}
let listar = cuotas.actions.getModels
cuotas.actions.getModels = function(context) {
	context.commit('setLoadingFiltered', false)
	return listar(context)
}

export default cuotas
