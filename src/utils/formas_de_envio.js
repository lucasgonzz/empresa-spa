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

/**
 * Si un valor guardado en el pedido es un número usable (la foto del precio del envío). Null,
 * undefined, '' y textos no numéricos significan "el pedido no tiene foto".
 *
 * @param {*} valor
 * @returns {Boolean}
 */
function es_numero_guardado(valor) {
	return valor !== null && typeof valor != 'undefined' && String(valor).trim() !== '' && isFinite(Number(valor))
}

/**
 * Lo que la forma de envío propia le sumó al total de UN pedido (misión
 * truvari-carrito-entrega-pago, 26/11/2026).
 *
 * La tienda deja en el pedido la foto de lo que cobró (`orders.envio_zona_precio`): si la forma
 * tenía "envío gratis desde $ X" o "gratis con combos", el precio pudo ser 0 aunque la forma
 * cueste más hoy. Se usa esa foto cuando existe; si no (pedido viejo o tienda vieja) se lee el
 * precio vivo de la forma, como siempre.
 *
 * 🔴 Una forma a convenir aporta 0 SIEMPRE, con o sin foto.
 *
 * @param {Object|null} order Pedido (con `delivery_zone` y `envio_zona_precio`).
 * @returns {Number}
 */
export function precio_de_forma_propia_del_pedido(order) {
	if (!order) {
		return 0
	}
	if (es_forma_propia_a_convenir(order.delivery_zone)) {
		return 0
	}
	if (es_numero_guardado(order.envio_zona_precio)) {
		return Number(order.envio_zona_precio)
	}
	return precio_de_forma_propia(order.delivery_zone)
}

/**
 * Texto del costo de la forma propia de un pedido, para el modal de envío.
 *
 * "A convenir" / "Gratis (compras desde $ 80.000)" / "Gratis (con combos)" / "Gratis" / el importe
 * cobrado / "Sin costo para el comprador" (pedido sin foto y forma de $0).
 *
 * @param {Object|null} order Pedido (con `delivery_zone`, `envio_zona_precio`, `envio_zona_gratis_motivo`).
 * @param {Function} formato_precio Convierte un número en "$ 7.000" (el `price` de la app).
 * @returns {String}
 */
export function texto_costo_forma_propia_del_pedido(order, formato_precio) {
	if (!order || !order.delivery_zone) {
		return ''
	}
	let zona = order.delivery_zone
	if (es_forma_propia_a_convenir(zona)) {
		return 'A convenir'
	}
	let precio = precio_de_forma_propia_del_pedido(order)
	if (precio > 0) {
		return formato_precio(precio)
	}
	// Precio 0: gratis si hay foto (la tienda lo resolvió así); si no hay foto es una forma de $0.
	if (!es_numero_guardado(order.envio_zona_precio)) {
		return 'Sin costo para el comprador'
	}
	if (order.envio_zona_gratis_motivo == 'monto' && Number(zona.envio_gratis_desde) > 0) {
		return 'Gratis (compras desde ' + formato_precio(zona.envio_gratis_desde) + ')'
	}
	if (order.envio_zona_gratis_motivo == 'combo') {
		return 'Gratis (con combos)'
	}
	return 'Gratis'
}

/**
 * Si el envío del pedido sale por Andreani (misión envios-andreani, 25/11/2026). Espejo de
 * `Order::envio_va_por_andreani()` de empresa-api.
 *
 * Hacen falta las DOS cosas: `envio_opcion` con algo adentro (el comprador eligió una opción de
 * Andreani en la tienda) y `envio_proveedor === 'andreani'`. Es la pregunta contraria a
 * `envio_va_por_zipnova()`, que ya excluye cualquier proveedor que no sea el suyo: un pedido nunca
 * da verdadero en las dos.
 *
 * 🔴 En esta etapa NO se genera la orden ni la etiqueta por la API de Andreani (decisión del
 * dueño del producto, 25/11/2026): el comercio carga el envío a mano en el portal de Andreani con
 * los datos que arma `texto_datos_andreani()`.
 *
 * @param {Object|null} order
 * @returns {Boolean}
 */
export function envio_va_por_andreani(order) {
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
	return proveedor === 'andreani'
}

/**
 * Un valor como texto recortado ('' para null, undefined u objetos).
 *
 * @param {*} valor
 * @returns {String}
 */
function texto_simple(valor) {
	if (valor === null || typeof valor == 'undefined' || typeof valor == 'object') {
		return ''
	}
	return String(valor).trim()
}

/**
 * Un número como lo escribe un argentino: coma decimal y punto de miles ("15.000", "2,5").
 * Los enteros no llevan decimales; el resto, hasta 3 (los kilos de un bulto) sin ceros de sobra.
 *
 * @param {*} valor
 * @returns {String} '' si no es un número.
 */
function numero_legible(valor) {
	let numero = Number(valor)
	if (valor === null || typeof valor == 'undefined' || valor === '' || !isFinite(numero)) {
		return ''
	}
	let partes = String(Math.round(numero * 1000) / 1000).split('.')
	partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
	return partes.join(',')
}

/**
 * Texto plano con todo lo que el comercio necesita para cargar el envío a mano en el portal de
 * Andreani: es lo que copia el botón "Copiar datos" del modal Envío de un pedido Andreani.
 *
 * Se arma sólo con lo que hay (lectura tolerante, contrato PLAN §10.1): sin bultos, sin destino o
 * sin la tarjeta conectada, igual sale el resto. Cada bulto va en su propia línea.
 *
 * 🔴 Nunca incluye credenciales: del `integracion.config` se leen SÓLO `cliente`,
 * `contrato_domicilio` y `contrato_sucursal`; cualquier otra clave (usuario, contraseña, token)
 * se ignora aunque llegue por error.
 *
 * El destinatario es el del destino que armó la tienda (`envio_destino`); si no hay, el comprador
 * del pedido. En un retiro en sucursal se imprime SÓLO la sucursal elegida (no el domicilio) y el
 * contrato de sucursal; a domicilio, la dirección y el contrato de domicilio.
 *
 * @param {Object} order Pedido de la tienda (con envio_opcion, envio_destino, buyer...).
 * @param {Object|null} integracion Item `andreani` de `GET integraciones` (puede ser null).
 * @returns {String}
 */
export function texto_datos_andreani(order, integracion) {
	let pedido = order || {}
	let opcion = json_del_pedido(pedido.envio_opcion) || {}
	let destino = json_del_pedido(pedido.envio_destino)
	let buyer = pedido.buyer || {}
	let config = integracion && integracion.config ? integracion.config : {}
	let andreani = opcion.andreani || {}
	let es_sucursal = !!opcion.es_punto_de_retiro || andreani.tipo === 'sucursal' || opcion.service_type === 'sucursal'
	let lineas = []

	// --- Pedido y servicio ---
	lineas.push('PEDIDO N° ' + (pedido.num ? pedido.num : pedido.id))
	lineas.push('Servicio: ' + (es_sucursal ? 'Retiro en sucursal Andreani' : 'Envío a domicilio'))
	if (Number(opcion.precio) > 0) {
		lineas.push('Costo del envío cobrado al comprador: $ ' + numero_legible(opcion.precio))
	}

	// --- Cuenta de Andreani (de la tarjeta) ---
	let contrato = es_sucursal ? config.contrato_sucursal : config.contrato_domicilio
	if (texto_simple(config.cliente)) {
		lineas.push('N° de cliente: ' + texto_simple(config.cliente))
	}
	if (texto_simple(contrato)) {
		lineas.push('Contrato de ' + (es_sucursal ? 'sucursal' : 'domicilio') + ': ' + texto_simple(contrato))
	}

	// --- Destinatario ---
	let nombre = []
	let telefono = ''
	let email = ''
	let documento = ''
	if (destino && (destino.nombre || destino.apellido)) {
		nombre = [destino.nombre, destino.apellido]
		telefono = destino.telefono
		email = destino.email
	} else {
		nombre = [buyer.name, buyer.surname]
		telefono = buyer.phone
		email = buyer.email
	}
	if (destino && destino.documento) {
		documento = destino.documento
	}
	lineas.push('')
	lineas.push('DESTINATARIO')
	let nombre_completo = nombre.filter(parte => !!texto_simple(parte)).join(' ')
	if (nombre_completo) {
		lineas.push('Nombre: ' + nombre_completo)
	}
	if (texto_simple(documento)) {
		lineas.push('DNI: ' + texto_simple(documento))
	}
	if (texto_simple(telefono)) {
		lineas.push('Teléfono: ' + texto_simple(telefono))
	}
	if (texto_simple(email)) {
		lineas.push('Email: ' + texto_simple(email))
	}

	// --- Dirección o sucursal ---
	if (es_sucursal) {
		let point_id = destino && destino.point_id ? destino.point_id : opcion.point_id
		let puntos = Array.isArray(opcion.puntos_de_retiro) ? opcion.puntos_de_retiro : []
		let punto = puntos.filter(item => texto_simple(item.point_id) === texto_simple(point_id))[0]
		let linea_sucursal = 'Sucursal: N° ' + texto_simple(point_id)
		if (punto) {
			let calle = [texto_simple(punto.street), texto_simple(punto.street_number)].filter(parte => !!parte).join(' ')
			linea_sucursal += ' · ' + [texto_simple(punto.description), calle, texto_simple(punto.city)].filter(parte => !!parte).join(' · ')
		}
		lineas.push(linea_sucursal)
		if (destino && texto_simple(destino.codigo_postal)) {
			lineas.push('Código postal: ' + texto_simple(destino.codigo_postal))
		}
	} else {
		let direccion = ''
		if (destino && texto_simple(destino.calle)) {
			let calle = [texto_simple(destino.calle), texto_simple(destino.numero)].filter(parte => !!parte).join(' ')
			direccion = [calle, texto_simple(destino.piso_depto)].filter(parte => !!parte).join(' ')
			let zona = [texto_simple(destino.localidad), texto_simple(destino.provincia)].filter(parte => !!parte).join(', ')
			direccion = [direccion, zona].filter(parte => !!parte).join(', ')
			if (texto_simple(destino.codigo_postal)) {
				direccion += ' (CP ' + texto_simple(destino.codigo_postal) + ')'
			}
		} else {
			direccion = texto_simple(pedido.address)
		}
		if (direccion) {
			lineas.push('Dirección: ' + direccion)
		}
		if (destino && texto_simple(destino.referencia)) {
			lineas.push('Referencia: ' + texto_simple(destino.referencia))
		}
	}

	// --- Bultos (uno por línea) y valor declarado ---
	let bultos = Array.isArray(andreani.bultos) ? andreani.bultos : []
	if (bultos.length) {
		lineas.push('')
		lineas.push('BULTOS')
		bultos.forEach((bulto, indice) => {
			let linea = 'Bulto ' + (indice + 1) + ': ' + numero_legible(bulto.kilos) + ' kg'
			linea += ' · ' + numero_legible(bulto.alto_cm) + ' x ' + numero_legible(bulto.ancho_cm) + ' x ' + numero_legible(bulto.largo_cm) + ' cm (alto x ancho x largo)'
			if (Number(bulto.valor_declarado) > 0) {
				linea += ' · valor declarado $ ' + numero_legible(bulto.valor_declarado)
			}
			lineas.push(linea)
		})
	}
	if (Number(andreani.valor_declarado_total) > 0) {
		lineas.push('Valor declarado total: $ ' + numero_legible(andreani.valor_declarado_total))
	}

	return lineas.join('\n')
}
