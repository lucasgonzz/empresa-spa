import __base_store from '@/store/__base_store'

/**
 * Store de rangos de pre-importación de artículos (modelo `article_pre_import_range`).
 * Construido desde el factory común.
 */
export default __base_store({
	/** Estado propio del modelo. */
	state: {
		model_name: 'article_pre_import_range',
	},
})

