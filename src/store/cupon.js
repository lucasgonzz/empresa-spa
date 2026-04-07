import __base_store from '@/store/__base_store'

/**
 * Store de cupones (modelo `cupon`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'cupon',
		per_page: 25,
	},
})

