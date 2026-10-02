/**
 * Criterio UNICO del IVA en los precios de VENDER (mision iva-a-articulos-sin-iva-en-vender,
 * 1/10/2026).
 *
 * Es puro a proposito: sin Vuex, sin `this`, sin efectos. Se puede probar con node sin levantar
 * nada, y es lo unico que hay que razonar para saber por que un renglon sale con o sin IVA. Lo
 * llama src/mixins/generals.js::ajustar_precio_segun_iva_aplicado(), que es quien sabe leer el
 * store (flags actuales, venta o presupuesto que se esta editando, condicion fiscal de la cuenta).
 *
 * LOS DOS CHECKS DE VENDER
 *   - "Precios con IVA" (`iva_aplicado`): prendido por defecto, deja cada precio TAL CUAL el
 *     listado. Apagado, a los articulos que tienen el IVA adentro del precio se les saca.
 *   - "Sumar IVA a los artículos sin IVA" (`iva_en_articulos_sin_iva`): solo cuenta con "Precios
 *     con IVA" prendido (en la interfaz se deshabilita y vuelve a 0 al apagarlo). Prendido, a los
 *     articulos que tienen `aplicar_iva` apagado en el listado se les SUMA el IVA de su alicuota.
 *
 * EL FACTOR DE UN ESTADO (m = 1 + alicuota/100)
 *
 *   | ¿el precio del listado incluye IVA? | Precios con IVA | check nuevo | factor |
 *   |-------------------------------------|-----------------|-------------|--------|
 *   | si                                  | prendido        | —           | 1      |
 *   | si                                  | apagado         | —           | 1/m    |
 *   | no                                  | prendido        | prendido    | m      |
 *   | no                                  | prendido        | apagado     | 1      |
 *   | no                                  | apagado         | (no cuenta) | 1      |
 *
 * EL AJUSTE
 *   precio = precio_de_partida × factor(estado_actual) / factor(estado_de_partida)
 *
 * donde el estado de partida es el que tenia el precio al llegar a VENDER: el del listado
 * (Precios con IVA prendido, check nuevo apagado: factor 1) para un articulo recien buscado, o el
 * de la venta / presupuesto guardado para un renglon que sale del pivot.
 *
 * El factor se maneja como EXPONENTE de m (-1, 0 o 1) y no como numero: asi el ajuste es siempre
 * "dividir por m" o "multiplicar por m" una sola vez, exactamente la misma cuenta que hacia la
 * regla vieja. Multiplicar por (1/m) en vez de dividir por m cambia el ultimo decimal y un renglon
 * que hoy da $1.000,00 podria pasar a dar $999,99999.
 *
 * 🔴 Cambio de comportamiento consciente (pedido de Lucas): hasta esta mision, con "Precios con
 * IVA" apagado se le sacaba el IVA a TODOS los renglones con alicuota, incluidos los articulos que
 * no lo tienen aplicado (quedaban por debajo del listado). Desde aca esos quedan igual al listado.
 */

/**
 * Normaliza un flag 0/1 que puede llegar como numero, string, booleano, null o undefined.
 *
 * @param {*} valor
 * @param {number} por_defecto Lo que vale si no llega (null/undefined).
 * @returns {number} 1 o 0.
 */
export function flag(valor, por_defecto = 0) {
	if (valor === null || typeof valor === 'undefined') {
		return por_defecto ? 1 : 0
	}
	if (valor === true || valor === 1 || valor === '1') {
		return 1
	}
	if (valor === false || valor === 0 || valor === '0' || valor === '') {
		return 0
	}
	return Number(valor) == 1 ? 1 : 0
}

/**
 * Arma un estado de IVA normalizado a partir de los dos flags.
 *
 * El check nuevo se guarda "efectivo" (iva_aplicado && nuevo): con "Precios con IVA" apagado no
 * tiene efecto, aunque por algun camino haya quedado en 1.
 *
 * @param {*} iva_aplicado
 * @param {*} iva_en_articulos_sin_iva
 * @returns {{iva_aplicado: number, iva_en_articulos_sin_iva: number}}
 */
export function estado_de_iva(iva_aplicado, iva_en_articulos_sin_iva) {
	// "Precios con IVA" normalizado; si no viene, prendido (el default del sistema).
	let aplicado = flag(iva_aplicado, 1)
	// Check nuevo normalizado; si no viene, apagado (el default de la columna).
	let nuevo = flag(iva_en_articulos_sin_iva, 0)

	return {
		iva_aplicado: aplicado,
		iva_en_articulos_sin_iva: aplicado && nuevo ? 1 : 0,
	}
}

/**
 * El estado del listado: el precio tal cual se ve en el listado de articulos.
 *
 * @returns {{iva_aplicado: number, iva_en_articulos_sin_iva: number}}
 */
export function estado_del_listado() {
	return estado_de_iva(1, 0)
}

/**
 * Dice si el precio de LISTADO de un renglon de VENDER ya tiene el IVA adentro.
 *
 * Espejo de ArticlePricesHelper::aplicar_iva() de empresa-api: el IVA se suma al precio del
 * articulo si `article.aplicar_iva` esta prendido o si la cuenta es Monotributista.
 *
 *   - Monotributista: siempre true (comportamiento de siempre, sin cambios).
 *   - Articulo con `aplicar_iva` EXPLICITAMENTE apagado (0, false, '0'): false.
 *   - Cualquier otro caso -servicios, combos, promociones, renglones sin el campo, `aplicar_iva`
 *     undefined o null-: true, que es como se trataba a todos hasta esta mision. Un renglon que
 *     llega sin el dato no cambia de precio por no tenerlo.
 *
 * @param {Object} item Renglon de VENDER.
 * @param {boolean} es_monotributista Condicion fiscal de la cuenta.
 * @returns {boolean}
 */
export function precio_del_item_incluye_iva(item, es_monotributista) {
	if (es_monotributista) {
		return true
	}

	if (!item || !item.is_article) {
		return true
	}

	// Valor crudo del flag del articulo, tal cual vino de la API (o del listado offline).
	let aplicar_iva = item.aplicar_iva

	if (aplicar_iva === 0 || aplicar_iva === false || aplicar_iva === '0') {
		return false
	}

	return true
}

/**
 * Exponente de m que le corresponde a un estado (ver la tabla de arriba): el factor es m^exponente.
 *
 * @param {boolean} incluye_iva Si el precio del listado del renglon tiene el IVA adentro.
 * @param {{iva_aplicado: number, iva_en_articulos_sin_iva: number}} estado
 * @returns {number} -1, 0 o 1.
 */
export function exponente_de_iva(incluye_iva, estado) {
	if (incluye_iva) {
		// Con IVA adentro: solo "Precios con IVA" apagado se lo saca.
		return estado.iva_aplicado ? 0 : -1
	}

	// Sin IVA adentro: solo el check nuevo (efectivo) se lo suma.
	return estado.iva_aplicado && estado.iva_en_articulos_sin_iva ? 1 : 0
}

/**
 * Factor numerico de un estado (m^exponente). Para leer y para los tests: el ajuste usa el
 * exponente, ver el encabezado.
 *
 * @param {boolean} incluye_iva
 * @param {{iva_aplicado: number, iva_en_articulos_sin_iva: number}} estado
 * @param {number} iva_percentage Alicuota en porcentaje (21, 10.5...).
 * @returns {number}
 */
export function factor_de_iva(incluye_iva, estado, iva_percentage) {
	// Multiplicador entre neto y precio con IVA.
	let m = 1 + (Number(iva_percentage) / 100)
	return Math.pow(m, exponente_de_iva(incluye_iva, estado))
}

/**
 * Ajusta un precio desde el estado en que llego al estado en que tiene que salir.
 *
 * Si la alicuota es 0 (o Exento / No Gravado, que el mixin normaliza a 0) no se toca nada. Si el
 * ajuste es nulo, el precio se devuelve TAL CUAL llego (sin pasarlo por Number), como hacia la
 * regla vieja.
 *
 * @param {number|string} price Precio de partida.
 * @param {number} iva_percentage Alicuota en porcentaje.
 * @param {boolean} incluye_iva Si el precio del listado del renglon tiene el IVA adentro.
 * @param {{iva_aplicado: number, iva_en_articulos_sin_iva: number}} estado_actual
 * @param {{iva_aplicado: number, iva_en_articulos_sin_iva: number}} estado_de_partida
 * @returns {number|string}
 */
export function ajustar_precio_por_iva(price, iva_percentage, incluye_iva, estado_actual, estado_de_partida) {
	if (!(Number(iva_percentage) > 0)) {
		return price
	}

	// Cuantas veces hay que multiplicar (positivo) o dividir (negativo) por m.
	let diferencia = exponente_de_iva(incluye_iva, estado_actual) - exponente_de_iva(incluye_iva, estado_de_partida)

	if (diferencia == 0) {
		return price
	}

	// Multiplicador entre neto y precio con IVA.
	let m = 1 + (Number(iva_percentage) / 100)
	// Precio que se va ajustando, de a un m por vez.
	let ajustado = Number(price)

	while (diferencia > 0) {
		ajustado = ajustado * m
		diferencia--
	}
	while (diferencia < 0) {
		ajustado = ajustado / m
		diferencia++
	}

	return ajustado
}

/**
 * Resuelve el estado de partida de un renglon.
 *
 *   - No sale del pivot (articulo buscado en el listado, precio a mano sobre uno nuevo): el estado
 *     del listado.
 *   - Sale del pivot de una venta que se esta actualizando: los flags guardados en la venta
 *     (`iva_en_articulos_sin_iva` en 0 si no viene: una venta guardada antes de esta mision).
 *   - Sale del pivot de un presupuesto guardado: los flags del presupuesto. Si el presupuesto no
 *     trae `iva_aplicado`, se usa el estado actual (no se ajusta), como hacia la regla vieja.
 *   - Sale del pivot sin venta ni presupuesto guardado: el estado actual (no se ajusta).
 *
 * @param {boolean} from_pivot
 * @param {{iva_aplicado: number, iva_en_articulos_sin_iva: number}} estado_actual
 * @param {Object|null} previus_sale Venta que se esta actualizando (con id), si hay.
 * @param {Object|null} budget Presupuesto que se esta editando (con id), si hay.
 * @returns {{iva_aplicado: number, iva_en_articulos_sin_iva: number}}
 */
export function estado_de_partida_de_iva(from_pivot, estado_actual, previus_sale, budget) {
	if (!from_pivot) {
		return estado_del_listado()
	}

	if (previus_sale && previus_sale.id) {
		return estado_de_iva(flag(previus_sale.iva_aplicado, 0), previus_sale.iva_en_articulos_sin_iva)
	}

	if (budget && budget.id) {
		if (typeof budget.iva_aplicado !== 'undefined' && budget.iva_aplicado !== null) {
			return estado_de_iva(flag(budget.iva_aplicado, 0), budget.iva_en_articulos_sin_iva)
		}
		return estado_actual
	}

	return estado_actual
}
