import __base_store from '@/store/__base_store'

/**
 * Store de lotes de producción (modelo `production_batch`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'production_batch',
		from_dates: true,
	},
})

