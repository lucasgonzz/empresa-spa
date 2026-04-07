import __base_store from '@/store/__base_store'

/**
 * Store de órdenes de producción (modelo `order_production`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'order_production',
		per_page: 25,
	},
})

