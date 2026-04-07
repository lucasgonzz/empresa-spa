import __base_store from '@/store/__base_store'

/**
 * Store de observaciones para PDF de artículos (modelo `article_pdf_observation`).
 * Construido desde el factory común.
 */
export default __base_store({
	/** Estado propio del modelo. */
	state: {
		model_name: 'article_pdf_observation',
	},
})

