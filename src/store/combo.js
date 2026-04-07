import __base_store from '@/store/__base_store'

/**
 * Store de combos (modelo `combo`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'combo',
		per_page: 25,
	},
})

