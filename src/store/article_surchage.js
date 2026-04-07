import __base_store from '@/store/__base_store'

/**
 * Store de recargos de artículos (modelo `article_surchage`).
 * Construido desde el factory común.
 */
export default __base_store({
	/** Estado propio del modelo. */
	state: {
		model_name: 'article_surchage',
		/** Mantiene el tamaño de página usado históricamente en este módulo. */
		per_page: 25,
	},
})

