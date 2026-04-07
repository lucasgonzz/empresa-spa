import __base_store from '@/store/__base_store'

/**
 * Store de colores (modelo `color`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'color',
		per_page: 25,
	},
})

