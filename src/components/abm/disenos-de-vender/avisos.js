/*
	Avisos (toasts) de la solapa y del editor de Diseños de Vender (mision diseno-vender-configurable,
	28/9/2026).

	🔴 POR QUE TODO AVISO PASA POR ACA: vue-toast-notification (0.6.3, el que usa la SPA) pinta el
	mensaje con innerHTML (`domProps: {innerHTML: message}` en su dist, o sea un v-html). Un mensaje
	armado con texto que escribio un usuario se ejecuta como HTML: un empleado con acceso al ABM
	nombra un diseño `<img src=x onerror=...>` y el script corre en la sesion del dueño cuando este
	toca "Usar este diseño" o "Duplicar" (el aviso dice el nombre). Es XSS guardado.

	Por eso ningun componente de esta carpeta llama a this.$toast directo: llama a avisar(), que
	escapa el mensaje ENTERO antes de mostrarlo. Se escapa todo y no solo el nombre porque ningun
	aviso de aca necesita HTML, y asi un texto nuevo no puede olvidarse de escapar su parte variable
	(tambien van escapados los mensajes del backend, que son texto plano).

	Los msgBoxConfirm de bootstrap-vue NO necesitan esto: el texto que reciben lo ponen como nodo de
	texto (slot con un string), no como HTML. Y lo que se interpola en las plantillas ({{ }} o un
	atributo con v-bind) ya lo escapa Vue.
*/

/* Caracteres con significado en HTML y su entidad */
const ENTIDADES = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
}

/**
 * Escapa un texto para que se muestre tal cual adentro de HTML.
 *
 * @param {*} texto
 * @returns {string}
 */
export function escapar_html(texto) {
	if (texto === null || typeof texto == 'undefined') {
		return ''
	}
	return String(texto).replace(/[&<>"']/g, function (caracter) {
		return ENTIDADES[caracter]
	})
}

/**
 * Muestra un aviso (toast) con el mensaje escapado.
 *
 * @param {Object} vm componente (usa su $toast)
 * @param {string} tipo 'success' | 'error' | 'warning' | 'info'
 * @param {string} mensaje texto plano
 * @returns {void}
 */
export function avisar(vm, tipo, mensaje) {
	if (!vm || !vm.$toast || typeof vm.$toast[tipo] != 'function') {
		return
	}
	vm.$toast[tipo](escapar_html(mensaje))
}
