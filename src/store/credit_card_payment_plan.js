import __base_store from '@/store/__base_store'

/**
 * Store de planes de pago de tarjeta (modelo `credit_card_payment_plan`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'credit_card_payment_plan',
	},
})

