// Cookie CSRF propia del sistema (misión prueba-e2e-campana-imperio, ronda 4, 14/11/2026).
//
// En una prueba gratuita el sistema y la tienda del negocio viven bajo `.comerciocity.com` y los dos
// escribían la misma cookie `XSRF-TOKEN`: el sistema le pisaba el token a la tienda y el pedido de la
// tienda daba 419. En una prueba vigente empresa-api emite su token en una cookie con nombre propio,
// derivado del host de la API, y deja de emitir `XSRF-TOKEN`. Acá se calcula ese mismo nombre y, si la
// cookie existe, axios lee el token de ella (`xsrfCookieName`) para los pedidos a la API. Si no existe
// (todo cliente que no está en prueba, o una API vieja) no se toca nada: queda `XSRF-TOKEN`.
//
// 🔴 Contrato con empresa-api: el nombre es 'XSRF-' + el host de la API (sin protocolo ni puerto) con
// cada carácter que no sea letra o número cambiado por '_'. Si cambia de un lado, cambia del otro.

/**
 * @param {string} direccion URL absoluta.
 * @returns {string|null} El host en minúsculas, sin puerto; null si no es una URL absoluta.
 */
function host_de(direccion) {
	if (typeof direccion !== 'string' || !/^https?:\/\//i.test(direccion)) return null
	try {
		return new URL(direccion).hostname.toLowerCase() || null
	} catch (error) {
		return null
	}
}

/**
 * @param {string} api_url La URL de la API del sistema (VUE_APP_API_URL).
 * @returns {string|null} 'XSRF-api_ferreteria_comerciocity_com', o null si la URL no sirve.
 */
export function nombre_cookie_xsrf_propia(api_url) {
	const host = host_de(api_url)
	return host ? 'XSRF-' + host.replace(/[^A-Za-z0-9]/g, '_') : null
}

/**
 * @param {string} cookies El `document.cookie`.
 * @param {string} nombre
 * @returns {Boolean} Si hay una cookie con ese nombre exacto.
 */
export function hay_cookie(cookies, nombre) {
	if (typeof cookies !== 'string' || !nombre) return false
	// El nombre trae guiones y guiones bajos: se escapa igual por si algún día trae otra cosa.
	const literal = nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	return new RegExp('(^|;\\s*)' + literal + '=').test(cookies)
}

/**
 * La cookie de la que axios tiene que leer el token para este pedido, o null para dejar la de
 * siempre. Solo para pedidos a la API del sistema: a cualquier otro host no se le cambia nada.
 *
 * @param {object} config La configuración del pedido de axios (url, baseURL).
 * @param {string} api_url
 * @param {string} cookies El `document.cookie`.
 * @returns {string|null}
 */
export function cookie_xsrf_del_pedido(config, api_url, cookies) {
	const nombre = nombre_cookie_xsrf_propia(api_url)
	if (!nombre || !config) return null
	const destino = host_de(config.url) || host_de(config.baseURL)
	if (!destino || destino !== host_de(api_url)) return null
	return hay_cookie(cookies, nombre) ? nombre : null
}

/**
 * Interceptor de request para una instancia de axios. La URL de la API se pide en cada pedido porque
 * `config.js` (runtime_config) se puede cargar después de crear las instancias.
 *
 * @param {Function} obtener_api_url
 * @returns {Function}
 */
export function interceptor_cookie_xsrf_propia(obtener_api_url) {
	return function (config) {
		const cookies = typeof document !== 'undefined' ? document.cookie : ''
		const nombre = cookie_xsrf_del_pedido(config, obtener_api_url(), cookies)
		if (nombre) config.xsrfCookieName = nombre
		return config
	}
}
