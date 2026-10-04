import __base_store from '@/store/__base_store'

/**
 * Store de balanzas (modelo `balanza`) construido desde el factory común.
 * Misión balanzas-configurables (3/10/2026).
 *
 * Se descarga al iniciar sesión (mixins/call_methods.js, entra por recursos-iniciales en la misma
 * request) porque VENDER la lee SIN CONEXIÓN: con "Por balanza" y sin internet (o con "Utilizar
 * articulos descargados para buscar por codigo de barras"), el ticket se lee con estas balanzas
 * (src/utils/balanzas.js) y el artículo se trae de la base local. Es un catálogo chico (una fila por
 * balanza) y para quien no usa balanzas es una lista vacía.
 */
export default __base_store({
	state: {
		model_name: 'balanza',
		/*
			Sin cartel global de error para este listado. Con una API que todavia no conoce el recurso
			(la SPA y la API de un cliente no se actualizan en el mismo instante), recursos-iniciales
			lo devuelve en `no_soportados`, la SPA lo pide suelto, recibe un 404 y, sin esto, sacaba un
			toast rojo generico en CADA arranque, aunque el cliente no use balanzas. Sin el listado
			VENDER no se rompe: el store queda vacio y sin conexion simplemente no lee tickets "Por
			balanza". Mismo criterio que store/vender_layout.js y store/article_ticket_design.js. Se
			traduce a `skip_global_error_event` en __base_store::_getModels.
		*/
		omitir_cartel_de_conexion_en_listado: true,
	},
})
