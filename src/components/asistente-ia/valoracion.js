/**
 * Valoración de las respuestas del agente (misión agente-mejoras-uso-real, 29/10/2026): me gusta / no
 * me gusta y, con no me gusta, el comentario de por qué o qué mejorar (contrato C1,
 * `PUT api/ai-mensajes/{id}/valoracion`).
 *
 * 🔴 ES EL MISMO ARMADO QUE EL DE ia.comerciocity.com (ia-spa/src/lib/valoracion.js), y tiene que
 * seguir siéndolo: el análisis diario de las 22 h lee el comentario de las dos interfaces igual. Las
 * opciones rápidas del cuadro de «no me gusta» viajan DENTRO del comentario, delante del texto libre,
 * en el ORDEN DE LA LISTA (no en el que se tocaron), separadas por « · », y si hay texto, « — » y el
 * texto: «Dato incorrecto — había dos, no uno»; «No hizo lo que pedí · Quedó a medias — faltaron 7
 * clavos». Si se cambia algo acá, se cambia allá.
 */

/** Los dos valores que acepta el API (más `null`, que saca la valoración). */
export const ME_GUSTA = 'me_gusta'
export const NO_ME_GUSTA = 'no_me_gusta'

/** Tope del comentario completo (opciones + texto), el mismo que valida el API. */
export const TOPE_COMENTARIO = 1000

/** Opciones rápidas del cuadro, en el orden en que se muestran y se escriben en el comentario. */
export const OPCIONES_NO_ME_GUSTA = ['No hizo lo que pedí', 'Dato incorrecto', 'Quedó a medias', 'Otra cosa']

/** Separador entre opciones. */
const ENTRE_OPCIONES = ' · '

/** Separador entre las opciones y el texto libre. */
const ANTES_DEL_TEXTO = ' — '

/**
 * Las opciones elegidas, en el orden de la lista (no en el que se tocaron) y sin repetir.
 *
 * @param {Array<String>} elegidas
 * @returns {String}
 */
export function prefijo_de_opciones(elegidas) {
	let lista = Array.isArray(elegidas) ? elegidas : []
	return OPCIONES_NO_ME_GUSTA.filter(function (opcion) {
		return lista.indexOf(opcion) !== -1
	}).join(ENTRE_OPCIONES)
}

/**
 * Cuántos caracteres le quedan al texto libre con estas opciones elegidas (el `maxlength` del
 * textarea), para que el comentario completo no pase el tope.
 *
 * @param {Array<String>} elegidas
 * @returns {Number}
 */
export function lugar_para_el_texto(elegidas) {
	let prefijo = prefijo_de_opciones(elegidas)
	return Math.max(0, TOPE_COMENTARIO - (prefijo ? prefijo.length + ANTES_DEL_TEXTO.length : 0))
}

/**
 * Arma el comentario que viaja al API: «Opción · Opción — texto libre», recortado al tope. Sin
 * opciones queda el texto solo; sin texto, las opciones solas; sin nada, cadena vacía (y entonces no
 * se manda comentario).
 *
 * @param {Array<String>} elegidas Opciones rápidas tocadas.
 * @param {String} texto Lo que escribió el dueño.
 * @returns {String}
 */
export function armar_comentario(elegidas, texto) {
	let prefijo = prefijo_de_opciones(elegidas)
	let libre = String(texto || '').trim()
	let comentario = prefijo && libre ? prefijo + ANTES_DEL_TEXTO + libre : (prefijo || libre)
	if (comentario.length > TOPE_COMENTARIO) {
		comentario = comentario.slice(0, TOPE_COMENTARIO).trim()
	}
	return comentario
}

/**
 * La valoración de un mensaje tal como llega del API. Un API viejo no manda los campos (o la columna
 * todavía no existe en esa base): sin ellos, o con un valor que no se conoce, es «sin valorar».
 *
 * @param {Object} mensaje
 * @returns {String|null} 'me_gusta' | 'no_me_gusta' | null
 */
export function valoracion_de(mensaje) {
	let valor = (mensaje && mensaje.valoracion) || null
	return valor === ME_GUSTA || valor === NO_ME_GUSTA ? valor : null
}
