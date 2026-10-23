/**
 * Consolidar ventas en una factura desde la cuenta corriente (mision
 * cc-consolidar-desde-cuenta-corriente, 23/10/2026).
 *
 * Son las reglas puras (sin store ni `this`) que comparten tres piezas del modal de cuenta
 * corriente: el footer (BtnPagoNotaCredito.vue, que ofrece el boton y valida al apretarlo), la
 * lista (List.vue, que dibuja el badge de la venta ya consolidada) y los tests.
 *
 * El endpoint que consolida es el de siempre (`POST api/sales/consolidar-facturacion`) y es el que
 * manda: desde el 23/10/2026 valida la lista (`ConsolidarFacturacionHelper::validar()`) y rechaza
 * con 422 una venta ya consolidada, con factura autorizada, de otro cliente o inexistente. Lo de
 * aca (`motivo_para_no_consolidar`) es la primera linea: avisa antes de abrir el modal, nombrando
 * la venta, en vez de dejar que el usuario complete el formulario para recibir el rechazo.
 */

/**
 * Si el movimiento es el DEBITO de una venta. Un movimiento de venta trae `sale_id`, la venta
 * cargada en `sale` (la API la incluye en el listado) y `debe`. Ojo: una nota de credito de esa
 * venta tambien trae `sale_id` y `sale`, pero va por el `haber`: no es la venta.
 *
 * @param {Object} movimiento
 * @returns {Boolean}
 */
export function es_debito_de_venta(movimiento) {
	return !!movimiento.sale_id
		&& !!movimiento.sale
		&& Number(movimiento.debe) > 0
		&& movimiento.status != 'nota_credito'
}

/**
 * Los movimientos de la seleccion que son una venta.
 *
 * @param {Array} seleccion Movimientos seleccionados en la cuenta corriente.
 * @returns {Array|null} La seleccion si TODOS los movimientos son debitos de venta, o null
 *   (seleccion vacia, o con un pago, una nota de credito, un saldo inicial...). Con una seleccion
 *   mezclada el boton de consolidar no se ofrece: no hay una lectura razonable de "consolidar" un
 *   pago.
 */
export function movimientos_de_venta(seleccion) {
	if (!seleccion || !seleccion.length) {
		return null
	}

	return seleccion.every(es_debito_de_venta) ? seleccion : null
}

/**
 * Las ventas distintas de una lista de movimientos de venta, en el orden en que vienen. Una venta
 * puede aparecer en mas de un movimiento; al consolidar viaja una sola vez.
 *
 * @param {Array} movimientos Movimientos de venta (ver `movimientos_de_venta`).
 * @returns {Array} Las ventas (`movimiento.sale`), sin repetir.
 */
export function ventas_sin_repetir(movimientos) {
	let vistas = {}
	let ventas = []

	movimientos.forEach(movimiento => {
		if (!vistas[movimiento.sale.id]) {
			vistas[movimiento.sale.id] = true
			ventas.push(movimiento.sale)
		}
	})

	return ventas
}

/**
 * Si la venta ya tiene un comprobante autorizado por ARCA (con CAE).
 *
 * @param {Object} sale
 * @returns {Boolean}
 */
function tiene_comprobante_autorizado(sale) {
	return (sale.afip_tickets || []).some(ticket => ticket.cae && String(ticket.cae).trim() !== '')
}

/**
 * Por que una seleccion de ventas no se puede consolidar, o null si se puede. Es la misma regla de
 * negocio que aplica el menu "Seleccion" de Ventas (OptionDropdownConsolidarFacturacion.vue) mas
 * las dos que el endpoint rechaza: la venta que ya esta consolidada y la que ya tiene factura.
 *
 * @param {Array}  movimientos Movimientos de venta (ver `movimientos_de_venta`).
 * @param {Number} client_id   El cliente dueño de la cuenta corriente.
 * @returns {String|null} El mensaje para el usuario, o null si se puede.
 */
export function motivo_para_no_consolidar(movimientos, client_id) {
	for (let i = 0; i < movimientos.length; i++) {
		let sale = movimientos[i].sale

		if (sale.is_consolidacion_facturacion) {
			return 'No se puede incluir una venta que ya es factura consolidada.'
		}
		if (sale.consolidacion_facturacion_id) {
			return 'La venta N° ' + sale.num + ' ya fue consolidada en otra factura.'
		}
		if (tiene_comprobante_autorizado(sale)) {
			return 'La venta N° ' + sale.num + ' ya tiene una factura autorizada: no se puede consolidar.'
		}
		if (String(sale.client_id) !== String(client_id)) {
			return 'La venta N° ' + sale.num + ' no es de este cliente: solo se consolidan ventas del mismo cliente.'
		}
	}

	return null
}

/**
 * La factura en la que quedo consolidada una venta, para el badge de la fila.
 *
 * Solo para el movimiento que ES la venta (ver `es_debito_de_venta`): la nota de credito de una
 * venta consolidada no lleva el badge.
 *
 * La factura no es de la venta sino de la venta CONTENEDORA (`consolidacion_facturacion`), que la
 * API suma al listado desde esta mision. Tres casos, de mas a menos informacion:
 *   - la contenedora tiene un comprobante con CAE: "Consolidada en factura N° 183";
 *   - la contenedora existe pero el comprobante todavia no tiene CAE (o no se emitio): se dice la
 *     venta ("Consolidada en la venta N° 395") y en el titulo que falta la factura;
 *   - la API es vieja y no manda la contenedora: se sabe que esta consolidada pero no en cual.
 *
 * @param {Object} movimiento El movimiento de la cuenta corriente (con su `sale`).
 * @returns {{texto: String, titulo: String}|null} null si la venta no esta consolidada.
 */
export function consolidada_en(movimiento) {
	if (!movimiento || !es_debito_de_venta(movimiento)) {
		return null
	}

	let sale = movimiento.sale

	if (!sale.consolidacion_facturacion_id) {
		return null
	}

	let contenedora = sale.consolidacion_facturacion

	if (!contenedora) {
		return {
			texto: 'Consolidada en factura',
			titulo: 'Esta venta se incluyó en una factura consolidada.',
		}
	}

	let tickets = contenedora.afip_tickets || []
	let con_cae = tickets.find(ticket => ticket.cae && ticket.cbte_numero)

	if (con_cae) {
		return {
			texto: 'Consolidada en factura N° ' + con_cae.cbte_numero,
			titulo: 'Esta venta se facturó junto con otras en la factura N° ' + con_cae.cbte_numero
				+ ' (venta consolidada N° ' + contenedora.num + ').',
		}
	}

	return {
		texto: 'Consolidada en la venta N° ' + contenedora.num,
		titulo: 'Esta venta se incluyó en la venta consolidada N° ' + contenedora.num
			+ ', cuya factura todavía no tiene CAE.',
	}
}
