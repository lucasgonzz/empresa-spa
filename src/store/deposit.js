import __base_store from '@/store/__base_store'

/**
 * Store de depósitos (modelo `deposit`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'deposit',
		per_page: 25,
	},
})

