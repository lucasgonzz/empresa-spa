import __base_store from '@/store/__base_store'

/**
 * Store de estados de orden (modelo `order_status`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'order_status',
		per_page: 25,
	},
})

