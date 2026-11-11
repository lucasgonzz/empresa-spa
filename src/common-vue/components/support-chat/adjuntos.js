// Qué se puede adjuntar en el chat de Soporte (misión prueba-e2e-campana-imperio, 11/11/2026).
//
// Hasta hoy el selector de archivos solo ofrecía audios e imágenes: un negocio en prueba no tenía cómo
// mandarle su lista de precios a Soporte desde el sistema. Ahora ofrece además Excel, CSV y PDF. Las
// imágenes siguen pasando por el editor y los audios por la grabación: acá solo se suman los documentos.
//
// Sin Vue ni store, para que MessageInput.vue y Conversation.vue pregunten lo mismo y para poder probarlo.
// Las extensiones y el tope son los mismos que valida empresa-api (SupportMessageAttachment).

/** Extensiones de documento que acepta el chat. */
export const EXTENSIONES_DE_DOCUMENTO = ['xlsx', 'xls', 'csv', 'pdf']

/** Tope de un documento, en bytes (10 MB). Audios e imágenes no tienen tope propio, como hasta ahora. */
export const TOPE_DE_DOCUMENTO = 10 * 1024 * 1024

/** El `accept` del selector de archivos: lo de siempre más los documentos. */
export const ACEPTA = 'audio/*,image/*,' + EXTENSIONES_DE_DOCUMENTO.map(extension => '.' + extension).join(',')

/**
 * @param {String} nombre Nombre de un archivo.
 * @returns {String} La extensión en minúsculas, sin el punto ('' si no tiene).
 */
export function extension_de(nombre) {
	const partes = String(nombre || '').split('.')
	return partes.length > 1 ? partes.pop().toLowerCase() : ''
}

/**
 * true si el archivo es un documento (Excel, CSV o PDF). Un audio o una imagen nunca lo son, se llamen
 * como se llamen: siguen por su camino de siempre.
 *
 * @param {File|Object|null} archivo Algo con `name` y `type`.
 * @returns {Boolean}
 */
export function es_documento(archivo) {
	if (!archivo) return false
	const tipo = String(archivo.type || '')
	if (tipo.indexOf('image/') === 0 || tipo.indexOf('audio/') === 0 || tipo.indexOf('video/') === 0) return false
	return EXTENSIONES_DE_DOCUMENTO.indexOf(extension_de(archivo.name)) !== -1
}

/**
 * Por qué no se puede adjuntar el archivo, o null si se puede. Hoy el único motivo es el peso de un
 * documento; cualquier otro archivo se acepta como hasta ahora.
 *
 * @param {File|Object|null} archivo
 * @returns {String|null} El texto para mostrarle al usuario.
 */
export function rechazo_del_adjunto(archivo) {
	if (es_documento(archivo) && Number(archivo.size) > TOPE_DE_DOCUMENTO) {
		return 'El archivo pesa más de 10 MB. Achicalo o mandalo en partes.'
	}
	return null
}

/**
 * El nombre que se muestra en la burbuja de un adjunto que no es audio ni imagen: el original si la API lo
 * guardó (`original_name`, desde esta misión); si no, «Adjunto», que es lo que se mostraba siempre.
 *
 * @param {Object|null} adjunto Fila de `message.attachments`.
 * @returns {String}
 */
export function nombre_del_adjunto(adjunto) {
	const nombre = adjunto && typeof adjunto.original_name === 'string' ? adjunto.original_name.trim() : ''
	return nombre || 'Adjunto'
}
