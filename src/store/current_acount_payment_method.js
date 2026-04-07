import __base_store from '@/store/__base_store'

/**
 * Store de métodos de pago de cuenta corriente (modelo `current_acount_payment_method`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'current_acount_payment_method',
		per_page: 25,
	},
})

