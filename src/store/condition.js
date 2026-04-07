import __base_store from '@/store/__base_store'

/**
 * Store de condiciones (modelo `condition`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'condition',
		per_page: 25,
	},
})

