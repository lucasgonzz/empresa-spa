import __base_store from '@/store/__base_store'

/**
 * Store de sincronización hacia Tienda Nube de artículos.
 */
export default __base_store({
	state: {
		model_name: 'sync_to_tn_article',
		from_dates: true,
	},
})

