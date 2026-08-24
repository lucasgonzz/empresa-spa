import __base_store from '@/store/__base_store'

/**
 * Store de overrides de liquidación/comisión por método de pago dentro de una caja
 * (modelo `caja_liquidacion_config`) construido desde el factory común.
 *
 * El listado se filtra por caja seteando `route_prefix` con el id de la caja antes de
 * despachar `getModels` (mismo patrón que `movimiento_caja`/`apertura_caja`), matcheando
 * la ruta del backend `GET caja-liquidacion-config/{caja_id}`.
 */
export default __base_store({
	state: {
		model_name: 'caja_liquidacion_config',
	},
})
