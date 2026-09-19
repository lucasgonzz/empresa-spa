/**
 * Id de pestaña para el candado de sesión por pestaña (misión candado-sesion-por-pestana,
 * 19/9/2026). Se manda como header `X-Tab-Id` en todas las requests (ver interceptor en
 * `main.js`) para que `AuthHelper::checkUserLastActivity()` pueda, cuando el owner activó el
 * modo estricto, distinguir pestañas del mismo navegador aunque compartan la misma cookie de
 * sesión Laravel.
 *
 * Va en `sessionStorage` y NO en `localStorage` a propósito: `sessionStorage` no se comparte
 * entre pestañas aunque compartan cookie/origen -que es exactamente la propiedad que hace
 * falta-, mientras que `localStorage` sí se comparte y todas las pestañas terminarían mandando
 * el mismo id, anulando el candado que se está construyendo.
 */

const TAB_ID_STORAGE_KEY = 'tab_id'

/**
 * Genera un id de pestaña. Usa `crypto.randomUUID()` cuando el navegador lo soporta (Chrome
 * ≥92, todos los navegadores modernos) y cae a un fallback manual si no -no hace falta que sea
 * un UUID válido, solo que sea único por pestaña-.
 *
 * @returns {string}
 */
function generar_tab_id() {
	if (window.crypto && typeof window.crypto.randomUUID === 'function') {
		return window.crypto.randomUUID()
	}

	// Fallback: timestamp + azar, suficiente para distinguir pestañas (no se persiste entre
	// sesiones ni se usa como identificador de seguridad).
	return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
}

/**
 * Devuelve el id de ESTA pestaña, generándolo una sola vez por pestaña y recordándolo en
 * `sessionStorage` para que sobreviva a una navegación o a un F5 sin cambiar -si cambiara en
 * cada request, cada request se vería a sí mismo como una pestaña nueva ganando el candado, y el
 * modo estricto expulsaría a la propia pestaña en el siguiente request-.
 *
 * Envuelto en try/catch: en modo incógnito con el almacenamiento bloqueado, `sessionStorage`
 * puede tirar una excepción, y eso no puede hacer caer el arranque de la aplicación ni el envío
 * de requests -sin id persistido, se genera uno nuevo en memoria por request, que en el peor
 * caso deja el candado estricto comportándose como si cada request fuera una pestaña distinta
 * (degradado, no roto: el owner con el modo estricto prendido en un navegador con el storage
 * bloqueado vería que ninguna pestaña se sostiene, pero eso no es peor que no mandar el header).
 *
 * @returns {string}
 */
export function get_tab_id() {
	try {
		let tab_id = window.sessionStorage.getItem(TAB_ID_STORAGE_KEY)
		if (!tab_id) {
			tab_id = generar_tab_id()
			window.sessionStorage.setItem(TAB_ID_STORAGE_KEY, tab_id)
		}
		return tab_id
	} catch (error) {
		return generar_tab_id()
	}
}
