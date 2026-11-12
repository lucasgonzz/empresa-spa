/**
 * ¿Qué caja pone Vender sola cuando el desplegable ofrece una sola? (misión prueba-primera-venta, 12/11/2026)
 *
 * Función pura, sin store ni componente: la usa Caja.vue y la prueba tests/caja-unica-de-vender.test.cjs.
 *
 * 🔴 La caja por defecto del método de pago manda SIEMPRE. Si el método tiene una por defecto configurada
 * para esa sucursal y NO es la única que se ofrece (por ejemplo «Transferencia → Banco» con Banco cerrada y
 * solo «Efectivo» abierta), no se elige nada: poner Efectivo metería la transferencia en el arqueo de
 * efectivo sin avisar. Ahí el guardado frena y el aviso dice que esa caja está cerrada y dónde se abre.
 *
 * Solo elige cuando:
 *  - hay exactamente UNA caja que acepta el método de pago, y
 *  - el método no tiene caja por defecto, o la por defecto es esa misma, y
 *  - la venta no la tiene puesta ya.
 *
 * @param {Array<Object>} opciones Las cajas que ofrece el desplegable (get_caja_options, sin el «Seleccione
 *                                 caja»): `{ value, text }`.
 * @param {Array<Object>} cajas El catálogo de cajas del store, para saber qué métodos acepta cada una.
 * @param {Number|null} payment_method_id Método de pago de la venta.
 * @param {Object|null} caja_por_defecto La caja por defecto del método y la sucursal (get_caja_por_defecto),
 *                                       abierta o cerrada, o null si no hay configuración.
 * @param {Number|null} caja_actual_id La caja que la venta tiene puesta.
 * @returns {Number|null} el id a poner, o null si no hay que tocar nada.
 */
export function caja_unica_a_elegir(opciones, cajas, payment_method_id, caja_por_defecto, caja_actual_id) {

	let candidatas = (opciones || []).filter(opcion => opcion && opcion.value).filter(opcion => {
		return acepta_el_metodo((cajas || []).find(caja => caja.id == opcion.value), payment_method_id)
	})

	if (candidatas.length !== 1) {
		return null
	}

	let unica = candidatas[0].value

	if (caja_por_defecto && caja_por_defecto.id != unica) {
		return null
	}

	if (caja_actual_id == unica) {
		return null
	}

	return unica
}

/**
 * Una caja con métodos de pago asignados acepta solo esos (mismo criterio que set_cajas_habilitadas).
 *
 * @param {Object|undefined} caja
 * @param {Number|null} payment_method_id
 * @returns {boolean}
 */
function acepta_el_metodo(caja, payment_method_id) {
	if (!caja) {
		return false
	}

	let metodos = caja.current_acount_payment_methods

	if (!Array.isArray(metodos) || !metodos.length || !payment_method_id) {
		return true
	}

	return metodos.some(metodo => metodo.id == payment_method_id)
}
