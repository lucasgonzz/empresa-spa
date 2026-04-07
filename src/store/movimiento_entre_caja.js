import __base_store from '@/store/__base_store'

/**
 * Store de movimientos entre cajas (modelo `movimiento_entre_caja`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'movimiento_entre_caja',
		from_dates: true,
	},
})

