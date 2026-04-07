import __base_store from '@/store/__base_store'

/**
 * Store de rangos de precio de artículos (modelo `article_price_range`).
 * Construido desde el factory común.
 */
export default __base_store({
	/** Estado propio del modelo. */
	state: {
		model_name: 'article_price_range',
	},
})

