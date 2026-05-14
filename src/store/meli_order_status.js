import __base_store from '@/store/__base_store'

/**
 * Store de estados internos de pedidos Mercado Libre (pendiente / confirmado).
 */
export default __base_store({
	state: {
		model_name: 'meli_order_status',
	},
})
