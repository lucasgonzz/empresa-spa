/**
 * Formas de envío de un pedido de la tienda online (misión formas-envio-direcciones-maps,
 * 19/10/2026).
 *
 * Un pedido con envío a domicilio (`orders.deliver == 1`) puede salir de dos maneras:
 *
 *  - Por correo con **Zipnova**: el comprador eligió una opción de correo en la tienda y quedó en
 *    `orders.envio_opcion`. El envío se crea en Zipnova (y se le cobra al comercio) recién cuando
 *    el comercio confirma el pedido.
 *  - Por una **forma de envío propia** del comercio (`orders.delivery_zone`, el ABM "Formas de
 *    envío propias", tabla `delivery_zones`): con un precio fijo, o con el costo **a convenir**
 *    (`delivery_zones.costo_a_convenir`), por ejemplo "Acordar con el vendedor". Una forma propia
 *    NO escribe nunca `envio_opcion`.
 *
 * Acá viven las preguntas que se hacen sobre eso el modal de envío, las columnas del listado de
 * pedidos y los totales, para que no las conteste cada uno a su manera. Son funciones puras: no
 * leen el store ni el componente.
 */

/**
 * Devuelve el objeto de una columna json del pedido, venga como objeto (cast `array` de la API) o
 * como string (una API sin el cast). Null si no hay nada o si el string no es un json válido.
 *
 * Mismo criterio que `EnvioModal::json_de()` y `model_functions::order_envio_opcion()`: el listado
 * no se tiene que romper en un cliente con la SPA nueva y la API vieja.
 *
 * @param {Object|String|null} valor
 * @returns {Object|null}
 */
export function json_del_pedido(valor) {
	if (!valor) {
		return null
	}
	if (typeof valor == 'string') {
		try {
			let parseado = JSON.parse(valor)
			return parseado && typeof parseado == 'object' ? parseado : null
		} catch (e) {
			return null
		}
	}
	return typeof valor == 'object' ? valor : null
}

/**
 * Si el envío del pedido sale por Zipnova. Espejo de `Order::envio_va_por_zipnova()` de
 * empresa-api, que es la única pregunta que se hace el backend al confirmar el pedido y en el
 * botón "Generar envío": si la SPA dijera otra cosa, el modal ofrecería generar un envío que la
 * API rechaza (o al revés).
 *
 * Hacen falta las DOS cosas:
 *  - `envio_opcion` con algo adentro (el comprador eligió un correo de Zipnova).
 *  - `envio_proveedor` vacío o `'zipnova'`: vacío es el pedido de una tienda que todavía no
 *    escribía el proveedor; cualquier otro valor es otro proveedor y no sale a Zipnova.
 *
 * @param {Object} order
 * @returns {Boolean}
 */
export function envio_va_por_zipnova(order) {
	if (!order) {
		return false
	}
	let opcion = json_del_pedido(order.envio_opcion)
	if (!opcion || !Object.keys(opcion).length) {
		return false
	}
	let proveedor = order.envio_proveedor === null || typeof order.envio_proveedor == 'undefined'
		? ''
		: String(order.envio_proveedor).trim().toLowerCase()
	return proveedor === '' || proveedor === 'zipnova'
}

/**
 * Si una forma de envío propia tiene el costo a convenir con el comprador (no se cobra nada en
 * la tienda). Tolera el `1`/`'1'`/`true` con que puede llegar el booleano, y una API vieja que no
 * manda la columna (= no es a convenir, el comportamiento de siempre).
 *
 * @param {Object|null} delivery_zone
 * @returns {Boolean}
 */
export function es_forma_propia_a_convenir(delivery_zone) {
	if (!delivery_zone) {
		return false
	}
	let valor = delivery_zone.costo_a_convenir
	return valor === true || Number(valor) === 1
}

/**
 * Lo que una forma de envío propia le suma al total del pedido.
 *
 * 🔴 Una forma a convenir aporta 0 SIEMPRE, sin mirar su `price`: es el contrato de la misión (la
 * tienda tampoco la cobra, ni en pantalla ni en Mercado Pago). El ERP igual guarda `price = 0` al
 * tildarla, pero una fila vieja podría tener un precio cargado de antes.
 *
 * @param {Object|null} delivery_zone
 * @returns {Number}
 */
export function precio_de_forma_propia(delivery_zone) {
	if (!delivery_zone || es_forma_propia_a_convenir(delivery_zone)) {
		return 0
	}
	let precio = Number(delivery_zone.price)
	return isNaN(precio) ? 0 : precio
}
