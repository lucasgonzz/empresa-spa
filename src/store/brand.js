import __base_store from '@/store/__base_store'

/**
 * Store de marcas (modelo `brand`) construido desde el factory común.
 *
 * Notas:
 * - En API, `brand` no utiliza `from_dates` (no hay ruta `from-date`), por lo tanto no se sobreescribe `_getModels`.
 * - Se conserva el `per_page` histórico (25).
 */
export default __base_store({
	/** Estado propio/override del modelo `brand`. */
	state: {
		model_name: 'brand',
		from_dates: false,
		use_per_page: false,
	},
})

