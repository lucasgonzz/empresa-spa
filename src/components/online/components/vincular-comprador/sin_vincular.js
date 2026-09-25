/**
 * Regla ÚNICA de "comprador sin vincular": la usa el badge de la tabla de Pedidos y el bloque del
 * modal del comprador en Tienda online → Clientes. Tienen que decir lo mismo, y por eso la regla
 * vive en un solo lugar.
 *
 * Un comprador está SIN VINCULAR cuando:
 *   - no tiene `comercio_city_client_id`, o
 *   - tiene el id pero la API mandó `comercio_city_client` en null: es un vínculo colgante (el
 *     cliente se borró). `CreateSaleOrderHelper::get_client_id()` de empresa-api ya lo trata como
 *     "sin cliente" al confirmar el pedido, así que el badge dice lo mismo que el sistema.
 *
 * Si `comercio_city_client` es `undefined` (una API que todavía no carga la relación) NO se puede
 * afirmar que esté colgante: se lo trata como vinculado en cuanto haya id. Por eso la regla
 * distingue `undefined` de `null` y no usa un `!buyer.comercio_city_client` a secas.
 *
 * @param {Object|null} buyer Comprador (`order.buyer` o una fila de Tienda online → Clientes).
 * @returns {Boolean} true si hay comprador y no está vinculado a ningún cliente vivo.
 */
export default function sin_vincular(buyer) {
	if (!buyer) {
		return false
	}

	if (!buyer.comercio_city_client_id) {
		return true
	}

	return typeof buyer.comercio_city_client !== 'undefined' && buyer.comercio_city_client === null
}
