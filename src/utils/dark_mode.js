/**
 * Modo oscuro: aplicar la clase y recordar la última preferencia conocida (grupo 304, prompt 03).
 *
 * La FUENTE DE VERDAD es `users.dark_mode`, que llega en `GET api/user` (prompt 01). Lo que se
 * guarda acá en `localStorage` es solo un recuerdo para pintar bien el primer cuadro, antes de
 * que `auth/me` resuelva quién es el usuario: sin esto, cualquiera con el modo oscuro prendido
 * vería la aplicación en blanco durante todo ese ida y vuelta y después un salto a oscuro.
 */

const DARK_MODE_STORAGE_KEY = 'dark_mode'

/**
 * Pone o saca la clase `dark-mode` en `document.documentElement` (el `<html>`).
 *
 * Va en `<html>` y no en `#app` a propósito: ahí es donde el prompt 02 declara los tokens de
 * color, y desde `<html>` alcanzan también a los modales de bootstrap-vue, que se montan
 * colgando de `<body>`, fuera del árbol de `#app`. Moverlo a `#app` es el "arreglo obvio" que
 * dejaría todos los modales sin los tokens (blancos, ilegibles) en modo oscuro.
 *
 * @param {boolean} activo Si el modo oscuro debe estar activo.
 * @returns {void}
 */
export function apply_dark_mode_class(activo) {
	if (activo) {
		document.documentElement.classList.add('dark-mode')
	} else {
		document.documentElement.classList.remove('dark-mode')
	}
}

/**
 * Lee el recuerdo de modo oscuro guardado en `localStorage`.
 *
 * Envuelto en try/catch: en modo incógnito o con el almacenamiento bloqueado, `localStorage`
 * puede tirar una excepción, y eso no puede hacer caer el arranque de la aplicación.
 *
 * @returns {boolean}
 */
export function read_stored_dark_mode() {
	try {
		return window.localStorage.getItem(DARK_MODE_STORAGE_KEY) === '1'
	} catch (error) {
		return false
	}
}

/**
 * Guarda el recuerdo de modo oscuro en `localStorage`.
 *
 * Mismo try/catch que `read_stored_dark_mode`, y por la misma razón: no puede romper el flujo
 * de quien llama si el almacenamiento está bloqueado.
 *
 * @param {boolean} activo Si el modo oscuro debe quedar recordado como activo.
 * @returns {void}
 */
export function store_dark_mode(activo) {
	try {
		window.localStorage.setItem(DARK_MODE_STORAGE_KEY, activo ? '1' : '0')
	} catch (error) {
		// Almacenamiento bloqueado (modo incógnito, cuota excedida, etc.): no hay nada que hacer.
	}
}
