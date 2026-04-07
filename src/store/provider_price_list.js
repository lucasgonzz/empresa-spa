import __base_store from '@/store/__base_store'

/**
 * Store de listas de precio de proveedor.
 */
export default __base_store({
	state: {
		model_name: 'provider_price_list',
		per_page: 25,
	},
})

