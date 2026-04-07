import __base_store from '@/store/__base_store'

/**
 * Store de descuentos por método de pago en cuenta corriente (modelo `current_acount_payment_method_discount`).
 * Construido desde el factory común.
 */
export default __base_store({
	/** Estado propio del modelo. */
	state: {
		model_name: 'current_acount_payment_method_discount',
	},
})

