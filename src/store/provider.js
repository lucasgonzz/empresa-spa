import __base_store from '@/store/__base_store'

/**
 * Store de proveedores (modelo `provider`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'provider',
		use_per_page: true,
		per_page: 100,
	},
})

