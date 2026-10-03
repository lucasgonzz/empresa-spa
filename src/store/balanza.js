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
	},
})
