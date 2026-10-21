import __base_store from '@/store/__base_store'

/**
 * Store de cuotas de planes de pago (modelo `payment_plan_cuota`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'payment_plan_cuota',
		from_dates: true,
	},
	actions: {
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

