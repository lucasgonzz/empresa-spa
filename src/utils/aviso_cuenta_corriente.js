/**
 * Aviso de Vender cuando la venta va a la cuenta corriente del cliente (ronda 6 de la prueba
 * gratuita, 15/11/2026).
 *
 * El defecto: con un cliente elegido (y «Omitir cuenta corriente» apagado) los campos de método de
 * pago y de caja quedan grisados y nada dice por qué. No se cambia la lógica que los grisa: se
 * agrega una línea que lo explica.
 *
 * Función pura: la usa PaymentMethod.vue y la prueba tests/aviso-cuenta-corriente.test.cjs.
 */

/**
 * Texto del aviso, con el nombre del cliente. Null si no hay cliente (no hay nada que avisar).
 *
 * @param {Object|null} client Cliente elegido en Vender ({ name }).
 * @returns {String|null} «Va a la cuenta corriente de «Juan Pérez»: no se cobra ahora.»
 */
export function aviso_venta_a_cuenta_corriente(client) {
	if (!client) {
		return null
	}
	let nombre = client.name ? ('' + client.name).trim() : ''
	if (!nombre.length) {
		return 'Va a la cuenta corriente del cliente: no se cobra ahora.'
	}
	return 'Va a la cuenta corriente de «' + nombre + '»: no se cobra ahora.'
}
