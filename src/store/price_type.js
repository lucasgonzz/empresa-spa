import __base_store from '@/store/__base_store'

/**
 * Store de tipos de precio (modelo `price_type`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'price_type',
		per_page: 25,
	},
})

