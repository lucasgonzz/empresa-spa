/**
 * Utilidades puras del aviso de actualización del sistema (misión aviso-actualizacion-sistema,
 * 25/11/2026). Sin Vue, sin axios y sin store: se pueden probar con `node --test`.
 *
 * Contrato con empresa-api (plan §2.4 / §4.3): mientras el sistema se actualiza, la API contesta
 * HTTP 503 con `{error: 'sistema_actualizando', message, reintentar_en_segundos}` en cualquier ruta
 * con sesión, en el login y durante el `artisan down` del deploy. Es un estado NORMAL (no una falla),
 * por eso lo reconoce un helper propio y no entra en los manejos de error genéricos.
 */

/** Valor de `error` que manda la API en la marca de "sistema actualizando". */
export const ERROR_SISTEMA_ACTUALIZANDO = 'sistema_actualizando'

/** Texto por defecto cuando la API no manda `message` (el mismo que escribe la API). */
export const MENSAJE_SISTEMA_ACTUALIZANDO = 'Estamos actualizando el sistema. Mientras tanto no se puede usar. Cuando termine vas a poder ingresar de nuevo desde esta pantalla.'

/** Primera oración del mensaje: la tarjeta del login ya la muestra como título. */
const ORACION_TITULO = 'Estamos actualizando el sistema.'

/**
 * ¿Este error de axios es la marca de "sistema actualizando"?
 *
 * Verdadero sólo con HTTP 503 y `data.error === 'sistema_actualizando'`. El 503 genérico del
 * `down` de Laravel (`{message: 'Service Unavailable'}`) o el de un proxy caído NO lo son: esos
 * siguen siendo "sin conexión".
 *
 * @param {*} err Error de axios (con `response`) o cualquier otro valor.
 * @returns {Boolean}
 */
export function es_respuesta_de_actualizacion(err) {
	// Sin respuesta (red cortada) o algo que no es un error de axios: no es la marca.
	if (!err || !err.response) {
		return false
	}
	// La respuesta del servidor y su cuerpo (puede ser texto HTML de un proxy, o nada).
	const respuesta = err.response
	const datos = respuesta.data
	return respuesta.status === 503
		&& !!datos
		&& typeof datos === 'object'
		&& datos.error === ERROR_SISTEMA_ACTUALIZANDO
}

/**
 * Texto que se le muestra a la persona cuando llega la marca.
 *
 * @param {*} err Error de axios que ya pasó por `es_respuesta_de_actualizacion`.
 * @returns {String} El `message` de la API o, si no vino o está vacío, el texto por defecto.
 */
export function mensaje_de_actualizacion(err) {
	// Cuerpo de la respuesta, si lo hay.
	const datos = err && err.response ? err.response.data : null
	if (datos && typeof datos.message === 'string' && datos.message.trim() !== '') {
		return datos.message.trim()
	}
	return MENSAJE_SISTEMA_ACTUALIZANDO
}

/**
 * Quita del mensaje la oración que la tarjeta del login ya usa de título, para no repetirla.
 *
 * @param {String} mensaje Mensaje completo de la marca.
 * @returns {String} El resto del mensaje; si no queda nada, el mensaje original.
 */
export function detalle_de_mensaje(mensaje) {
	// Mensaje limpio de espacios sobrantes.
	const texto = typeof mensaje === 'string' ? mensaje.trim() : ''
	if (texto.indexOf(ORACION_TITULO) === 0) {
		// Lo que sigue a la primera oración.
		const resto = texto.slice(ORACION_TITULO.length).trim()
		return resto !== '' ? resto : texto
	}
	return texto
}

/**
 * "Faltan N computadoras por confirmar", conjugado.
 *
 * @param {Number} cantidad Computadoras que todavía no contestaron.
 * @returns {String}
 */
export function texto_faltan(cantidad) {
	if (cantidad === 1) {
		return 'Falta 1 computadora por confirmar'
	}
	return 'Faltan ' + cantidad + ' computadoras por confirmar'
}

/**
 * Minutos que quedan para responder, redondeados hacia arriba (mientras quede tiempo se ve al
 * menos "1 minuto"; en 0 el servidor ya cerró el pedido).
 *
 * @param {Number} segundos Segundos restantes.
 * @returns {Number} Minutos enteros, nunca negativos.
 */
export function minutos_para_responder(segundos) {
	// Segundos como número válido y no negativo.
	const restantes = Number(segundos)
	if (!isFinite(restantes) || restantes <= 0) {
		return 0
	}
	return Math.ceil(restantes / 60)
}
