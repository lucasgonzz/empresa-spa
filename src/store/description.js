import __base_store from '@/store/__base_store'

/**
 * Store de descripciones (modelo `description`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'description',
		per_page: 25,
	},
})

