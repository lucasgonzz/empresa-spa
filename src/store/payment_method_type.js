import __base_store from '@/store/__base_store'

/**
 * Store de tipos de método de pago (modelo `payment_method_type`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'payment_method_type',
		per_page: 25,
	},
})

