import __base_store from '@/store/__base_store'

/**
 * Store de tipos de propiedad de artículos (modelo `article_property_type`).
 * Construido desde el factory común.
 */
export default __base_store({
	/** Estado propio del modelo. */
	state: {
		model_name: 'article_property_type',
	},
})

