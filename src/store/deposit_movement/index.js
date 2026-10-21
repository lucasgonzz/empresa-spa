import __base_store from '@/store/__base_store'
import en_curso from '@/store/deposit_movement/en_curso'

/**
 * Store de movimientos de depósito (modelo `deposit_movement`) construido desde el factory común.
 *
 * Hasta el 21/10/2026 este store estaba escrito a mano, copiando una versión vieja del base, y no
 * tenía `runListadoPorDefecto` ni `runGlobalSearch`: el botón "Historico" de la pantalla (y el
 * buscador general, y el paginado) despachaba una acción que no existía y la pantalla no mostraba
 * nada. Con el factory recibe todo el circuito del Historico paginado, igual que el resto de los
 * módulos que se ven por fecha.
 *
 * Submódulo `en_curso`: los movimientos del empleado cuyo stock todavía no se movió (alertas).
 */
export default __base_store({
	state: {
		model_name: 'deposit_movement',
		from_dates: true,
		is_selecteable: false,
		use_per_page: false,
	},
	modules: {
		en_curso,
	},
})
