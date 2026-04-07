import __base_store from '@/store/__base_store'

/**
 * Store de métodos de pago (modelo `payment_method`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'payment_method',
		per_page: 25,
	},
})

