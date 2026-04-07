import __base_store from '@/store/__base_store'

/**
 * Store de historial de filtros (modelo `filter_history`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'filter_history',
		from_dates: true,
	},
})

