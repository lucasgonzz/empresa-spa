import __base_store from '@/store/__base_store'

/**
 * Store de información de ticket de artículos (modelo `article_ticket_info`).
 * Construido desde el factory común.
 */
export default __base_store({
	/** Estado propio del modelo. */
	state: {
		model_name: 'article_ticket_info',
	},
})

