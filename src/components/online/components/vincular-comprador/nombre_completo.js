/**
 * Nombre completo de un comprador de la tienda (`Buyer`), tal como hay que mostrarlo, buscarlo y
 * precargarlo en un cliente nuevo.
 *
 * Existe porque la tienda no guarda el nombre siempre igual. Medido el 24/9/2026: en producción
 * `name` y `surname` van SEPARADOS (la tienda muestra `name surname`), pero en la base de semillas
 * `name` ya trae el apellido ("Lucas gonzalez" con surname "Gonzalez"). Concatenar a ciegas
 * duplicaría el apellido en el segundo caso, y usar solo `name` lo perdería en el primero.
 *
 * Regla: se devuelve `name`; si `surname` no está vacío y NO todas sus palabras (en minúsculas y
 * sin tildes) están ya entre las de `name`, se devuelve `name + ' ' + surname`.
 *
 * Es UNA sola función y vive acá, en su propio módulo, para que la compartan todas las piezas del
 * modal de vincular (el bloque de contexto y el buscador, el cliente nuevo y los avisos): si cada
 * una armara el nombre por su cuenta, el mismo comprador se llamaría distinto según la pantalla.
 * La CELDA de la tabla de Pedidos no la usa: sigue mostrando `buyer.name` tal cual, para que un
 * comprador ya vinculado se vea igual que siempre.
 */

/**
 * Palabras de un texto para poder compararlas: en minúsculas, sin tildes y con solo letras y
 * números ("Pérez-Gómez" → ["perez", "gomez"]).
 *
 * @param {String} texto Texto cualquiera (puede venir vacío, null o undefined).
 * @returns {Array<String>} Las palabras, sin vacíos.
 */
function palabras_normalizadas(texto) {
	return String(texto || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.split(/[^a-z0-9]+/)
		.filter(function (palabra) {
			return palabra !== ''
		})
}

/**
 * Arma el nombre completo del comprador sin duplicar el apellido.
 *
 * @param {Object|null} buyer Comprador con `name` y, si lo tiene, `surname`.
 * @returns {String} El nombre completo, o '' si no hay comprador o no tiene nombre.
 */
export default function nombre_completo(buyer) {
	if (!buyer) {
		return ''
	}

	/** Nombre y apellido tal como vienen, sin espacios de borde. */
	let name = buyer.name ? String(buyer.name).trim() : ''
	let surname = buyer.surname ? String(buyer.surname).trim() : ''

	if (surname === '') {
		return name
	}

	/** Palabras del nombre, para saber si el apellido ya está adentro. */
	let palabras_del_nombre = palabras_normalizadas(name)

	/** true si TODAS las palabras del apellido ya figuran en el nombre. */
	let apellido_ya_incluido = palabras_normalizadas(surname).every(function (palabra) {
		return palabras_del_nombre.indexOf(palabra) !== -1
	})

	if (apellido_ya_incluido) {
		return name
	}

	return (name + ' ' + surname).trim()
}
