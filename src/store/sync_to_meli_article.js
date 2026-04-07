import __base_store from '@/store/__base_store'

/**
 * Store de sincronización hacia Mercado Libre de artículos.
 */
export default __base_store({
	state: {
		model_name: 'sync_to_meli_article',
		from_dates: true,
	},
})

