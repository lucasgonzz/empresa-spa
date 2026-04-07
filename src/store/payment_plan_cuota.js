import __base_store from '@/store/__base_store'

/**
 * Store de cuotas de planes de pago (modelo `payment_plan_cuota`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'payment_plan_cuota',
		from_dates: true,
	},
})

