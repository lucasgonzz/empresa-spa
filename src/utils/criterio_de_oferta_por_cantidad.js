/**
 * Criterio UNICO para decidir si una oferta por cantidad de un articulo
 * (`article_price_ranges`, lo que el ABM llama "Oferta por cantidad") fija un PRECIO ABSOLUTO o
 * descuenta un PORCENTAJE (mision oferta-por-cantidad-porcentaje, 24/9/2026).
 *
 * Es el espejo de `empresa-api/app/Http/Controllers/Helpers/CriterioDeOfertaPorCantidadHelper.php`,
 * funcion por funcion y con los mismos casos borde, igual que `criterio_de_precio.js` lo es de
 * `CriterioDePrecioHelper.php`.
 *
 * 🔴 LA REGLA ESTA ESCRITA EN CUATRO LUGARES Y LOS CUATRO TIENEN QUE COINCIDIR BORDE POR BORDE.
 * Si se cambia aca, hay que cambiarla en las otras tres:
 *
 *   1. empresa-api/app/Http/Controllers/Helpers/CriterioDeOfertaPorCantidadHelper.php -- PERSISTE
 *   2. Este archivo (empresa-spa)                                                     -- el ABM y el ERP al VENDER
 *   3. tienda-api/.../ArticlePriceRangeHelper                                         -- COBRA en la tienda
 *   4. tienda-spa/src/mixins/generals.js                                              -- MUESTRA en la tienda
 *
 * Si difieren en un solo borde, el comprador ve un numero en la pantalla y le cobran otro: la
 * mision del 16/9/2026 encontro un tramo que MOSTRABA $3.000 y COBRABA $3.948, sin error y sin log.
 *
 * ──────────────────────────────────────────────────────────────────────────────────────────────
 * LOS CRITERIOS, LITERALES
 * ──────────────────────────────────────────────────────────────────────────────────────────────
 *
 *   1. `price > 0` -> PRECIO FIJO. Gana siempre, aunque tambien haya porcentaje. Es lo unico que
 *      existia hasta esta mision, asi que cualquier fila vieja de cualquier cliente sigue
 *      comportandose EXACTAMENTE igual que antes.
 *
 *   2. Si no, `porcentaje > 0 && porcentaje < 100` -> PORCENTAJE. El 100 queda AFUERA a proposito:
 *      dejaria el precio en cero, y un articulo regalado no es un descuento por cantidad, es un
 *      dato mal cargado.
 *
 *   3. Cualquier otra cosa -> NINGUNO: la oferta NO aplica y la linea sale al precio normal. Nunca
 *      un default permisivo.
 *
 * 🔴 El tramo GANADOR se elige solo por `amount`, SIN mirar estos valores, y recien sobre el
 * ganador se pregunta el modo (ver `check_price_range` en mixins/vender/article_price_range.js).
 * Filtrar por modo antes del desempate daria otro precio en el borde exacto de dos tramos.
 *
 * 🔴 `es_positivo` se IMPORTA de `criterio_de_precio.js`, no se copia: es el mismo criterio de
 * "hay un valor cargado" que ya cerro el bug del `percentage_gain = 0`, y valida la cadena entera
 * con una expresion regular porque parseFloat('1,5') da 1.5 mientras que el back (is_numeric) lo
 * rechaza. Reescribirlo aca seria abrir de nuevo ese hueco.
 */

import { es_positivo, a_numero } from './criterio_de_precio'

export { es_positivo }

/** La oferta fija un precio unitario absoluto (`price` > 0). */
export const MODO_PRECIO_FIJO = 'precio_fijo'

/** La oferta descuenta un porcentaje sobre el precio que la linea iba a tener. */
export const MODO_PORCENTAJE = 'porcentaje'

/** La oferta no tiene ningun valor usable: no aplica. */
export const MODO_NINGUNO = 'ninguno'

/**
 * True si el valor es un porcentaje de descuento USABLE: mayor a 0 y menor a 100.
 *
 * @param {*} valor
 * @returns {Boolean}
 */
export function es_porcentaje_usable(valor) {
	if (!es_positivo(valor)) {
		return false
	}

	return a_numero(valor) < 100
}

/**
 * Resuelve el modo de una oferta a partir de sus dos valores sueltos, sin modelo de por medio
 * (asi sirve igual sobre una fila de la base, sobre lo que hay en el formulario o sobre un tramo
 * que llega embebido en el articulo).
 *
 * @param {*} price      el precio absoluto del tramo
 * @param {*} porcentaje el porcentaje de descuento del tramo
 * @returns {String} una de las tres constantes de este modulo
 */
export function resolver(price, porcentaje) {
	if (es_positivo(price)) {
		return MODO_PRECIO_FIJO
	}

	if (es_porcentaje_usable(porcentaje)) {
		return MODO_PORCENTAJE
	}

	return MODO_NINGUNO
}

/**
 * El porcentaje como lo lee una persona: sin los decimales que no aportan y con coma decimal.
 *
 * `15.00` -> `'15'`, `12.50` -> `'12,5'`, `7.25` -> `'7,25'`. La columna es decimal(8,2), asi que
 * sin esto todo cartel diria "15.00% de descuento".
 *
 * Es el gemelo de `porcentaje_legible()` de `CriterioDeOfertaPorCantidadHelper` (empresa-api) y de
 * `tienda-spa/src/mixins/generals.js`: es el mismo numero anunciado a la misma persona, en el
 * aviso de VENDER, en el cartel del local y en la pantalla de la tienda. Si cambia el formato de
 * un lado, cambia de los tres.
 *
 * @param {*} valor
 * @returns {String}
 */
export function porcentaje_legible(valor) {
	let numero = a_numero(valor)

	if (numero === null) {
		return ''
	}

	/* Se recortan los ceros a la derecha y despues el punto que queda suelto: 15.00 -> "15",
	   12.50 -> "12,5". El orden importa: con un solo replace de "0." un 100 quedaria en "1". */
	let texto = numero.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')

	return texto.replace('.', ',')
}

/**
 * El precio unitario que le corresponde a una oferta, dado el precio que la linea IBA A TENER.
 *
 * 🔴 `precio_base` es el precio de esa linea EN LA MISMA ESCALA en la que el llamador va a usar el
 * resultado. Esa es la decision de Lucas del 24/9/2026 y es lo que hace que la oferta siga al
 * precio: si el comercio cambia el precio del articulo, el precio de la oferta cambia solo, sin
 * tocar el tramo. En el ERP eso significa aplicarlo AL FINAL de getPriceVender(), con la lista de
 * precios, el metodo de pago, los recargos, las cuotas, el IVA y la moneda ya adentro del numero.
 *
 * @param {*} price       el precio absoluto del tramo
 * @param {*} porcentaje  el porcentaje de descuento del tramo
 * @param {*} precio_base el precio que la linea iba a tener
 * @returns {Number|null} el precio unitario con la oferta aplicada, o null si la oferta no aplica
 */
export function precio(price, porcentaje, precio_base) {
	let modo = resolver(price, porcentaje)

	if (modo === MODO_PRECIO_FIJO) {
		return a_numero(price)
	}

	if (modo === MODO_PORCENTAJE) {

		/* Sin precio base no hay a que aplicarle el porcentaje. Devolver 0 seria regalar el
		   articulo; devolver null lo manda al precio normal, que es el lado seguro. */
		let base = a_numero(precio_base)

		if (base === null) {
			return null
		}

		return base * (1 - (a_numero(porcentaje) / 100))
	}

	return null
}
