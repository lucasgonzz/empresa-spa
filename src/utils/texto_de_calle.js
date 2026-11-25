/**
 * Texto "calle altura" de una dirección de entrega (pedido online, sucursal de correo).
 *
 * 🔴 La altura o la calle pueden venir null/undefined/vacías (sucursales de Andreani, direcciones de Google sin
 * número). Concatenar `street + ' ' + street_number` mostraba "null" o "undefined" en pantalla: se arma siempre
 * acá, descartando lo que no tiene texto. No lo "simplifiques" volviendo a la concatenación.
 *
 * @param {object|null} direccion Objeto con `street` y `street_number`.
 * @returns {string} "Calle 123", "Calle", "123" o '' si no hay nada que mostrar.
 */
export function texto_de_calle(direccion) {
	if (!direccion) {
		return ''
	}
	// Texto de cada parte, vacío si es null/undefined o sólo espacios.
	let partes = [direccion.street, direccion.street_number].map(parte => {
		return parte === null || parte === undefined ? '' : String(parte).trim()
	})
	return partes.filter(parte => parte !== '').join(' ')
}
