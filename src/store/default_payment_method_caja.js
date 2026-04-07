import __base_store from '@/store/__base_store'

/**
 * Store de métodos de pago por defecto de caja (modelo `default_payment_method_caja`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'default_payment_method_caja',
	},
})

