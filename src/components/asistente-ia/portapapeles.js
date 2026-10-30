/**
 * Copiar al portapapeles desde la ventana del agente (misión agente-mejoras-uso-real, 29/10/2026):
 * el botón «Copiar» de cada mensaje, como en ia-spa (lib/portapapeles.js).
 *
 * `navigator.clipboard` no existe fuera de HTTPS (un sistema abierto por IP en la red del local) y
 * puede estar bloqueado por permisos, así que queda el camino viejo del textarea temporal, el mismo
 * criterio que la clave de conexión de ConfiguracionAgente.vue. Acá el textarea va a <body>: el
 * panel del chat no es un b-modal y no le roba el foco.
 */

/**
 * El camino viejo: un textarea fuera de la vista, seleccionado, y `execCommand('copy')`.
 *
 * @param {String} texto
 * @returns {Boolean} true si el navegador dijo que copió.
 */
function copiar_con_textarea_temporal(texto) {
	let textarea = document.createElement('textarea')
	textarea.value = texto
	textarea.setAttribute('readonly', '')
	textarea.setAttribute('aria-hidden', 'true')
	textarea.style.position = 'fixed'
	textarea.style.left = '-9999px'
	textarea.style.top = '0'
	document.body.appendChild(textarea)
	textarea.select()
	let copio = false
	try {
		copio = document.execCommand('copy')
	} catch (error) {
		copio = false
	}
	document.body.removeChild(textarea)
	return copio
}

/**
 * Copia un texto. Resuelve SIEMPRE (nunca rechaza): con true si copió y false si no, así quien llama
 * decide qué mostrar sin un `.catch`.
 *
 * @param {String} texto
 * @returns {Promise<Boolean>}
 */
export function copiar_al_portapapeles(texto) {
	if (!texto) {
		return Promise.resolve(false)
	}
	if (navigator.clipboard && navigator.clipboard.writeText) {
		return navigator.clipboard.writeText(texto)
			.then(function () {
				return true
			})
			.catch(function () {
				return copiar_con_textarea_temporal(texto)
			})
	}
	return Promise.resolve(copiar_con_textarea_temporal(texto))
}
