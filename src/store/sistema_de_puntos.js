import __base_store from '@/store/__base_store'

/**
 * Store del ABM del sistema de puntos (modelo `sistema_de_puntos`) construido desde el factory comun.
 *
 * El factory arma la URL con routeString(model_name), asi que pega contra /api/sistema-de-puntos,
 * que es exactamente el `Route::resource('sistema-de-puntos', ...)` del grupo gateado por la
 * extension `puntos_clientes`.
 */
export default __base_store({
	state: {
		model_name: 'sistema_de_puntos',
	},
})
