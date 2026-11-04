/**
 * La lista «Precio final» en Vender (misión prueba-listas-siempre, 3/11/2026, corrección C5 del chequeo).
 *
 * Con UNA sola lista y que sea la «Precio final», Vender precia EXACTAMENTE como un negocio sin listas:
 * `final_price` del artículo, convertido con la cotización de la VENTA. Sus filas por moneda
 * (`price_type_monedas`) quedan fijas al `users.dollar` del último recálculo: son informativas hasta que
 * exista una segunda lista. Si se usaran, un artículo con costo en dólares de un dueño que no cotiza
 * cobraría con el dólar de la cuenta y no con el que el vendedor puso en la venta.
 *
 * Funciones puras: las usan el store de listas, el mixin de precios y la re-expresión del comprobante.
 */

/**
 * ¿Estas son las listas de una cuenta con una sola lista, la «Precio final»?
 *
 * @param {Array} listas Las listas de precios cargadas.
 * @returns {Boolean}
 */
export function es_solo_lista_precio_final(listas) {
	return Array.isArray(listas)
		&& listas.length === 1
		&& Number(listas[0].es_precio_final) === 1
}

/**
 * ¿Estas listas se dibujan? Dos o más, o una sola que NO es la «Precio final». Es la pregunta de lo que en la
 * base leía `price_types.length`, y por eso NO mira el flag: una cuenta `lista_de_precios_por_categoria` o con
 * listas y el flag apagado sigue viendo sus columnas. Una cuenta con una sola lista PROPIA, también. Solo la
 * «Precio final» sola se ve como un negocio sin listas.
 *
 * @param {Array} listas Las listas de precios cargadas.
 * @returns {Boolean}
 */
export function se_ven_las_listas(listas) {
	return Array.isArray(listas)
		&& listas.length > 0
		&& !es_solo_lista_precio_final(listas)
}

/**
 * ¿El renglón trae sus propios precios por moneda, de los que Vender tiene que tomar el precio?
 *
 * @param {Object} item Renglón de Vender.
 * @param {Boolean} solo_precio_final Lo que dice es_solo_lista_precio_final() de la cuenta.
 * @returns {Boolean}
 */
export function trae_precios_propios_por_moneda(item, solo_precio_final) {
	return !solo_precio_final
		&& Array.isArray(item.price_type_monedas)
		&& item.price_type_monedas.length > 0
}
