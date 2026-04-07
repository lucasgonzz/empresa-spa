import __base_store from '@/store/__base_store'

/**
 * Store de pendientes completados (modelo `pending_completed`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'pending_completed',
		from_dates: true,
	},
})

