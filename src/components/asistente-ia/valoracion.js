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
 * Lo que se le muestra a la persona por cada `code` de error del contrato C1 (los mismos textos que
 * ia-spa/src/api/mensajes.js).
 */
const MENSAJES_POR_CODE = {
	mensaje_inexistente: 'Esa respuesta ya no está disponible. Recargá la conversación.',
	no_es_del_agente: 'Solo se pueden valorar las respuestas del asistente.',
	valoracion_invalida: 'No pudimos guardar tu valoración. Probá de nuevo.',
	comentario_invalido: 'No pudimos guardar tu comentario. Probá de nuevo.',
	comentario_muy_largo: 'El comentario es demasiado largo: dejalo en 1000 caracteres.',
}

/**
 * Cuántos caracteres tiene un texto contados como los cuenta el API (`mb_strlen`): por PUNTOS DE
 * CÓDIGO y no por unidades de UTF-16. Con `.length` un emoji cuenta 2 y el tope se corría.
 *
 * @param {String} texto
 * @returns {Number}
 */
export function largo(texto) {
	return Array.from(String(texto || '')).length
}

/**
 * Los primeros `tope` caracteres de un texto, cortando por puntos de código: un `slice` común puede
 * partir un emoji al medio y dejar un carácter roto al final.
 *
 * @param {String} texto
 * @param {Number} tope
 * @returns {String}
 */
export function recortar(texto, tope) {
	return Array.from(String(texto || '')).slice(0, Math.max(0, tope)).join('')
}

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
	return Math.max(0, TOPE_COMENTARIO - (prefijo ? largo(prefijo) + largo(ANTES_DEL_TEXTO) : 0))
}

/**
 * Arma el comentario que viaja al API: «Opción · Opción — texto libre», recortado al tope (por
 * puntos de código, sin partir un emoji). Sin opciones queda el texto solo; sin texto, las opciones
 * solas; sin nada, cadena vacía (y entonces no se manda comentario).
 *
 * El recorte acá es la última red: el cuadro ya no deja escribir más de lo que entra (ver
 * `lugar_para_el_texto` y ValoracionMensaje.vue::recortar_texto_al_lugar).
 *
 * @param {Array<String>} elegidas Opciones rápidas tocadas.
 * @param {String} texto Lo que escribió el dueño.
 * @returns {String}
 */
export function armar_comentario(elegidas, texto) {
	let prefijo = prefijo_de_opciones(elegidas)
	let libre = String(texto || '').trim()
	let comentario = prefijo && libre ? prefijo + ANTES_DEL_TEXTO + libre : (prefijo || libre)
	if (largo(comentario) > TOPE_COMENTARIO) {
		comentario = recortar(comentario, TOPE_COMENTARIO).trim()
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

/**
 * El texto para el aviso de un PUT de valoración que falló: el del `code` del contrato si vino, y si
 * no, uno por el tipo de falla (como `mensaje_de_error` de ia-spa).
 *
 * @param {Object} err El error de axios.
 * @param {String} generico Lo que se dice si no hay nada más preciso.
 * @returns {String}
 */
export function mensaje_de_error_de_valoracion(err, generico) {
	let response = err && err.response ? err.response : null
	let data = response && response.data && typeof response.data == 'object' ? response.data : {}
	if (data.code && MENSAJES_POR_CODE[data.code]) {
		return MENSAJES_POR_CODE[data.code]
	}
	if (!response) {
		return 'No pudimos conectarnos con el servidor. Revisá tu conexión y volvé a intentar.'
	}
	if (response.status == 401) {
		return 'Tu sesión venció. Volvé a entrar.'
	}
	if (response.status == 403) {
		return data.message || 'No tenés permiso para hacer eso.'
	}
	if (response.status >= 500) {
		return 'Algo falló de nuestro lado. Probá de nuevo en un momento.'
	}
	return generico
}
