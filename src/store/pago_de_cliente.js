import __base_store from '@/store/__base_store'

/**
 * Store de pagos de cliente (modelo `pago_de_cliente`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'pago_de_cliente',
		from_dates: true,
	},
})

