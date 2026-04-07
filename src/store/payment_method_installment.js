import __base_store from '@/store/__base_store'

/**
 * Store de cuotas por método de pago (modelo `payment_method_installment`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'payment_method_installment',
	},
})

