import __base_store from '@/store/__base_store'

/**
 * Store de presupuestos (modelo `budget`).
 * Construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'budget',
		/** Presupuestos usan endpoints por fecha; se mantiene el flag. */
		from_dates: true,
		/** Mantiene el tamaño de página usado históricamente en este módulo. */
		per_page: 25,
	},
})

