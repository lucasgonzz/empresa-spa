import __base_store from '@/store/__base_store'

/**
 * Store de configuraciones (modelo `configuration`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'configuration',
		per_page: 25,
	},
})

