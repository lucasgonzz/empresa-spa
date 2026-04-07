import __base_store from '@/store/__base_store'

/**
 * Store de movimientos de lotes de producción (modelo `production_batch_movement`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'production_batch_movement',
	},
})

