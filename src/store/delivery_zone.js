import __base_store from '@/store/__base_store'

/**
 * Store de zonas de entrega (modelo `delivery_zone`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'delivery_zone',
		per_page: 25,
	},
})

