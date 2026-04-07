import __base_store from '@/store/__base_store'

/**
 * Store de órdenes de Mercado Libre (modelo `meli_order`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'meli_order',
		from_dates: true,
	},
})

