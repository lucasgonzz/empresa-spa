/**
 * Lectura del token del acceso de soporte desde la dirección de la página (misión
 * acceso-soporte-firmado, 30/10/2026).
 *
 * Son funciones puras y sin dependencias a propósito: la vista `AccesoSoporte.vue` las llama con
 * `window.location.hash/search/pathname`, y los tests (`tests/acceso-soporte.test.cjs`) las
 * ejercitan sin navegador.
 */

/** Nombre del parámetro que lleva el token, tanto en el fragmento (`#t=`) como en la query (`?t=`). */
const PARAMETRO_TOKEN = 't'

/**
 * Valor no vacío del parámetro `t` de un texto con forma de query string (`t=abc&x=1`).
 *
 * @param {string} texto Query string SIN el `?` ni el `#` inicial.
 * @returns {string|null} El token sin espacios en los bordes, o null si no hay o está vacío.
 */
function valor_del_token(texto) {
	var valor = new URLSearchParams(texto).get(PARAMETRO_TOKEN)

	if (typeof valor !== 'string') {
		return null
	}

	valor = valor.trim()

	return valor === '' ? null : valor
}

/**
 * Lee el token del acceso de soporte de la dirección actual.
 *
 * 🔴 El token que emite el admin viaja en el FRAGMENTO (`/acceso-soporte#t=<token>`): el
 * fragmento no sale nunca del navegador, así que no llega al servidor, no queda en los access
 * logs del hosting ni viaja en el `Referer`. La query (`?t=`) se acepta solo por tolerancia (un
 * link armado a mano, otra herramienta), y el fragmento manda si vienen los dos.
 *
 * @param {string} hash `window.location.hash` (con el `#` inicial, o vacío).
 * @param {string} search `window.location.search` (con el `?` inicial, o vacío).
 * @returns {string|null} El token, o null si no hay ninguno.
 */
export function leer_token_de_acceso_soporte(hash, search) {
	var desde_fragmento = valor_del_token(String(hash || '').replace(/^#/, ''))

	if (desde_fragmento !== null) {
		return desde_fragmento
	}

	return valor_del_token(String(search || '').replace(/^\?/, ''))
}

/**
 * Dirección a la que hay que dejar la barra una vez leído el token: la misma ruta, sin el
 * fragmento y sin el parámetro `t`.
 *
 * Se conservan los demás parámetros de la query a propósito: `forceStable` (el escape para
 * levantar la SPA de un slot sin que se autoexpulse, ver `debe_cambiar_de_version()` en
 * `mixins/check_version.js`) se lee de `window.location.search` DESPUÉS del canje, y borrar la
 * query entera lo perdería. Del fragmento no se conserva nada: lo único que lleva es el token.
 *
 * @param {string} pathname `window.location.pathname`.
 * @param {string} search `window.location.search` (con el `?` inicial, o vacío).
 * @returns {string} Ruta + query restante, lista para `history.replaceState`.
 */
export function direccion_sin_token(pathname, search) {
	var params = new URLSearchParams(String(search || '').replace(/^\?/, ''))

	params.delete(PARAMETRO_TOKEN)

	var resto = params.toString()

	return pathname + (resto ? '?' + resto : '')
}
