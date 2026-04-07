import __base_store from '@/store/__base_store'

/**
 * Store de condiciones de IVA (modelo `iva_condition`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'iva_condition',
		per_page: 25,
	},
})

