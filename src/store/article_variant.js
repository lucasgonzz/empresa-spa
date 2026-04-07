import __base_store from '@/store/__base_store'

/**
 * Store de variantes de artículos (modelo `article_variant`).
 * Construido desde el factory común.
 */
export default __base_store({
	/** Estado propio del modelo. */
	state: {
		model_name: 'article_variant',
	},
})

