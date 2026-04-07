import __base_store from '@/store/__base_store'

/**
 * Store de comprobantes AFIP de orden de proveedor (modelo `provider_order_afip_ticket`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'provider_order_afip_ticket',
		per_page: 25,
	},
})

