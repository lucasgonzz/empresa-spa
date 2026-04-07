import __base_store from '@/store/__base_store'

/**
 * Store de estados de presupuesto (modelo `budget_status`).
 * Construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'budget_status',
		/** Mantiene el tamaño de página usado históricamente en este módulo. */
		per_page: 25,
	},
})

