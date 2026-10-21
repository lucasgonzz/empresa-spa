import __base_store from '@/store/__base_store'

/**
 * Store de movimientos de producción (modelo `production_movement`) construido desde el factory común.
 *
 * Hasta el 21/10/2026 este store estaba escrito a mano, copiando una versión vieja del base, y no
 * tenía `runListadoPorDefecto` ni `runGlobalSearch`: el botón "Historico" de la pantalla (y el
 * buscador general, y el paginado) despachaba una acción que no existía y la pantalla no mostraba
 * nada. Con el factory recibe todo el circuito del Historico paginado, igual que el resto de los
 * módulos que se ven por fecha.
 */
export default __base_store({
	state: {

		/* ----------------------------------------------

			Propiedades personalizadas

		*/

		/** Cantidad del movimiento en el estado de producción del que se viene (lo usa InputAmount). */
		order_production_status_desde: null,

		// ----------------------------------------------

		model_name: 'production_movement',
		from_dates: true,
		is_selecteable: false,
		use_per_page: false,
		per_page: 25,
	},
	mutations: {
		/**
		 * Guarda la cantidad del estado de producción "desde" el que se mueve el movimiento en edición.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {number|null} value Cantidad en el estado anterior.
		 * @returns {void}
		 */
		set_order_production_status_desde(state, value) {
			state.order_production_status_desde = value
		},
	},
})
