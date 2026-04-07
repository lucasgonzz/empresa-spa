import __base_store from '@/store/__base_store'

/**
 * Store de localidades (modelo `location`) construido desde el factory común.
 */
export default __base_store({
	/** Estado propio del modelo `location`. */
	state: {
		model_name: 'location',
	},
})

