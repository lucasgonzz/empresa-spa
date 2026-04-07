import __base_store from '@/store/__base_store'

/**
 * Store de planes de pago (modelo `payment_plan`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'payment_plan',
		from_dates: true,
	},
})

