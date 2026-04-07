import __base_store from '@/store/__base_store'

/**
 * Store de tipos de método de pago para cuenta corriente AFIP (modelo `c_a_payment_method_type`).
 * Construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'c_a_payment_method_type',
	},
})

