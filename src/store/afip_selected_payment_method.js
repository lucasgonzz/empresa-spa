import __base_store from '@/store/__base_store'

/**
 * Store de método de pago seleccionado para AFIP (modelo `afip_selected_payment_method`).
 * Construido desde el factory común.
 */
export default __base_store({
	/** Estado propio del modelo. */
	state: {
		model_name: 'afip_selected_payment_method',
	},
})

