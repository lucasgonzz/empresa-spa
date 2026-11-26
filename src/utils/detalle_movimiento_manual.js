/**
 * Detalle de un movimiento manual de cuenta corriente (ticket #182).
 *
 * El defecto: en la cuenta corriente de un proveedor, el botón «Detalle» de una nota de débito
 * cargada a mano no hacía nada, porque showDetails (List.vue) sólo sabía abrir ventas, presupuestos
 * y pedidos a proveedor. La nota manual no tiene ninguno de los tres: lo único que tiene para
 * contar es su `description`. Estas funciones puras deciden cuándo corresponde el modal propio y
 * qué mostrar en él.
 *
 * Las usa List.vue y las prueba tests/detalle-nota-manual-cuenta-corriente.test.cjs.
 */

// Título por defecto del modal si el movimiento no trae `detalle`.
const TITULO_POR_DEFECTO = 'Nota de débito'

// Estados de movimientos que se resuelven con el recibo (printPago), nunca con el modal.
const ESTADOS_CON_RECIBO = ['nota_credito', 'pago_from_client']

/**
 * Indica si el botón «Detalle» de este movimiento debe abrir el modal propio.
 * Es true sólo cuando no es un pago/nota de crédito y no está vinculado a una venta, un
 * presupuesto ni un pedido a proveedor (esos siguen su camino de siempre).
 *
 * @param {Object|null} movimiento Movimiento de cuenta corriente.
 * @returns {Boolean} true si corresponde el modal 'detalle-movimiento-manual'.
 */
export function abre_detalle_propio(movimiento) {
	if (!movimiento) {
		return false
	}
	if (ESTADOS_CON_RECIBO.indexOf(movimiento.status) !== -1) {
		return false
	}
	return !movimiento.sale_id && !movimiento.budget_id && !movimiento.provider_order_id
}

/**
 * Formatea una fecha ISO ('2026-11-20T10:00:00.000000Z' o '2026-11-20') como dd/mm/aaaa tomando
 * los primeros 10 caracteres, sin pasar por Date para que la zona horaria no corra el día.
 *
 * @param {String|null} fecha_iso Fecha tal como llega de la API.
 * @returns {String} Fecha dd/mm/aaaa, o '' si no se puede leer.
 */
function formatear_fecha(fecha_iso) {
	const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha_iso || '')
	if (!coincidencia) {
		return ''
	}
	return coincidencia[3] + '/' + coincidencia[2] + '/' + coincidencia[1]
}

/**
 * Arma lo que muestra el modal de un movimiento manual.
 *
 * @param {Object} movimiento Movimiento de cuenta corriente.
 * @returns {{titulo: String, texto: String, tiene_texto: Boolean, fecha: String, importe: Number}}
 *          `texto` es la descripción sin espacios en los bordes pero con sus saltos de línea;
 *          `tiene_texto` es false si no hay descripción (null, vacía o sólo espacios).
 */
export function detalle_de_movimiento_manual(movimiento) {
	const origen = movimiento || {}
	// Descripción recortada en los bordes; los saltos de línea del medio se conservan.
	const texto = typeof origen.description === 'string' ? origen.description.trim() : ''
	const titulo = origen.detalle && String(origen.detalle).trim() ? String(origen.detalle).trim() : TITULO_POR_DEFECTO
	return {
		titulo: titulo,
		texto: texto,
		tiene_texto: texto.length > 0,
		fecha: formatear_fecha(origen.created_at),
		importe: Number(origen.debe) || 0,
	}
}
