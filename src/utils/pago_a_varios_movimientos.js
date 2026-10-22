/**
 * Pago de la cuenta corriente dirigido a VARIOS movimientos (mision pago-cc-multiples-movimientos,
 * 22/10/2026).
 *
 * Hasta esta mision "Registrar pago para ..." funcionaba con UN solo movimiento seleccionado. Ahora
 * se pueden elegir varios (por ejemplo cuatro ventas) y el pago se imputa a esos y no al resto.
 *
 * Lo que vive aca son las reglas puras (sin store ni `this`) que comparten el boton que abre el
 * pago (BtnPagoNotaCredito.vue, que precarga el monto) y el modal (PaymentMethods.vue, que reparte
 * contra el total). Tienen que dar el mismo numero: si cambia una cuenta, cambian las dos pantallas
 * y la que hace la API para saber cuanto le falta a cada debito (`debe - pagandose`, en
 * CurrentAcountPagoHelper::procesarPago()).
 */

// Estados de un movimiento que todavia se puede pagar. Es la misma lista que ya usaba el boton con
// un solo movimiento: un movimiento 'pagado', una nota de credito o un pago no se pagan.
export const ESTADOS_PAGABLES = ['saldo_inicial', 'sin_pagar', 'pagandose']

/**
 * Redondea a centavos. Una suma de decimales deja residuos de coma flotante (50.1 + 50.2 da
 * 100.30000000000001) que no tienen que llegar al input ni a la pantalla.
 *
 * @param {Number} valor
 * @returns {Number}
 */
export function redondear_a_centavos(valor) {
	return Math.round(valor * 100) / 100
}

/**
 * Lo que falta pagar de un movimiento: `debe` menos lo que ya se le pago (`pagandose`). Los dos
 * llegan de Laravel como string decimal ("1500.00") y pueden venir null.
 *
 * @param {Object} movimiento Movimiento de la cuenta corriente.
 * @returns {Number} A centavos. Puede ser 0 o negativo si el movimiento no tiene saldo.
 */
export function saldo_pendiente(movimiento) {
	let debe = Number(movimiento.debe) || 0
	let pagandose = Number(movimiento.pagandose) || 0

	return redondear_a_centavos(debe - pagandose)
}

/**
 * Suma de lo que falta pagar de una lista de movimientos, a centavos.
 *
 * @param {Array} movimientos
 * @returns {Number}
 */
export function suma_de_saldos(movimientos) {
	let total = 0

	movimientos.forEach(movimiento => {
		total += saldo_pendiente(movimiento)
	})

	return redondear_a_centavos(total)
}

/**
 * Marca de tiempo de la fecha de un movimiento, o NaN si no es una fecha ISO (AAAA-MM-DD, con
 * "T" o con espacio antes de la hora, que son los dos formatos con que Laravel serializa un
 * timestamp). Un formato ambiguo como 10/11/2026 no se interpreta: Date.parse lo leeria como mes/dia
 * y ordenaria mal sin avisar.
 *
 * @param {*} fecha
 * @returns {Number}
 */
function marca_de_tiempo(fecha) {
	if (typeof fecha != 'string' || !/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
		return NaN
	}

	return Date.parse(fecha.replace(' ', 'T'))
}

/**
 * Ordena del mas viejo al mas nuevo, por fecha y despues por id: el mismo orden en que la API
 * imputa los debitos dirigidos (created_at, id). No muta la lista que recibe.
 *
 * Si alguna fecha no se puede leer (otro formato que el ISO que manda Laravel) se ordena solo por
 * id, que crece con el momento de alta: mejor un orden estable que uno armado con una fecha mal
 * parseada. El primero de la lista es el que viaja como `to_pay`, asi que importa que sea el mas
 * viejo.
 *
 * @param {Array} movimientos
 * @returns {Array} Una copia ordenada.
 */
export function ordenar_por_antiguedad(movimientos) {
	let copia = movimientos.slice()

	let fechas_legibles = copia.every(movimiento => !isNaN(marca_de_tiempo(movimiento.created_at)))

	copia.sort((a, b) => {
		if (fechas_legibles) {
			let diferencia = marca_de_tiempo(a.created_at) - marca_de_tiempo(b.created_at)
			if (diferencia !== 0) {
				return diferencia
			}
		}
		return Number(a.id) - Number(b.id)
	})

	return copia
}

/**
 * Los movimientos contra los que se puede registrar un pago, o null si la seleccion no sirve.
 *
 * - Con UNO: se habilita si esta en un estado pagable (mismo criterio de siempre, sin mirar importes).
 * - Con DOS O MAS: tienen que estar TODOS en un estado pagable y con saldo por pagar. Una mezcla (una
 *   venta, una nota de credito, algo ya pagado) no se puede imputar: el boton vuelve a "Registrar
 *   pago" a secas.
 *
 * @param {Array} seleccionados Movimientos seleccionados en la lista.
 * @returns {Array|null} Los movimientos del mas viejo al mas nuevo, o null.
 */
export function movimientos_a_pagar(seleccionados) {
	if (!seleccionados || !seleccionados.length) {
		return null
	}

	let todos_pagables = seleccionados.every(movimiento => ESTADOS_PAGABLES.indexOf(movimiento.status) != -1)

	if (!todos_pagables) {
		return null
	}

	if (seleccionados.length == 1) {
		return seleccionados.slice()
	}

	let todos_con_saldo = seleccionados.every(movimiento => saldo_pendiente(movimiento) > 0)

	if (!todos_con_saldo) {
		return null
	}

	return ordenar_por_antiguedad(seleccionados)
}
