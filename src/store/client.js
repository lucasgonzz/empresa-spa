import __base_store from '@/store/__base_store'

/**
 * Store de clientes construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'client',
		from_dates: false,
		not_download_on_mobile: true,
		use_per_page: true,
		per_page: 100,
	},
})

