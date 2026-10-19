/**
 * Dirección de entrega de un pedido de la tienda online, lista para mostrar y para ubicar en un
 * mapa (misión formas-envio-direcciones-maps, 19/10/2026).
 *
 * Un pedido puede traer la dirección por tres lados, según la tienda que lo creó. Se usa el
 * primero que tenga algo, en este orden:
 *
 *  1. `orders.envio_direccion` (json): la dirección que el comprador eligió o cargó con el buscador
 *     de Google Maps en la tienda nueva. Trae `formatted_address`, los campos sueltos (`street`,
 *     `street_number`, `apartment` = piso/depto, `city`, `province`, `zip_code`, `reference`) y las
 *     coordenadas (`lat`, `lng`). Con la carga a mano de la tienda (si Google no responde) puede
 *     venir sin `formatted_address` ni coordenadas.
 *  2. `orders.envio_destino` (json): el destino que la tienda arma para Zipnova (`calle`, `numero`,
 *     `piso_depto`, `localidad`, `provincia`, `codigo_postal`, `referencia`, `lat`, `lng`). Es lo
 *     que traen los pedidos con Zipnova de una tienda anterior a esta misión.
 *  3. `orders.address` (texto): la línea de siempre. Sin coordenadas: el mapa la ubica por el texto.
 *
 * Forma de la dirección resuelta (o null si no hay nada):
 *
 *     {
 *         texto,              // la línea que se le muestra al operador (con el piso/depto)
 *         texto_para_buscar,  // la que se le pasa al mapa cuando no hay coordenadas (sin el piso/depto)
 *         referencia,         // "entre calles, timbre": '' si no hay
 *         lat, lng,           // números, o null si no hay coordenadas válidas
 *         fuente,             // 'envio_direccion' | 'envio_destino' | 'address'
 *     }
 */
import { json_del_pedido } from '@/utils/formas_de_envio'

/**
 * Un valor como texto recortado ('' para null, undefined o un objeto).
 *
 * @param {*} valor
 * @returns {String}
 */
function texto_de(valor) {
	if (valor === null || typeof valor == 'undefined' || typeof valor == 'object') {
		return ''
	}
	return String(valor).trim()
}

/**
 * Une con ', ' las partes que tienen algo.
 *
 * @param {Array<String>} partes
 * @returns {String}
 */
function unir(partes) {
	return partes.filter(parte => !!parte).join(', ')
}

/**
 * Agrega ", Argentina" a un texto que se va a buscar en el mapa si no lo trae. Sin el país, una
 * dirección sin coordenadas como "San Martín 123, San Martín" puede caer en otro país.
 *
 * @param {String} texto
 * @returns {String}
 */
function con_pais(texto) {
	if (!texto || texto.toLowerCase().indexOf('argentina') != -1) {
		return texto
	}
	return texto + ', Argentina'
}

/**
 * Una coordenada como número, o null si no hay una.
 *
 * 🔴 Un string vacío o de solo espacios es "sin coordenada", no 0: `Number('  ')` da 0, y una
 * latitud 0 con una longitud real dejaría el marcador sobre el ecuador. Solo se aceptan números y
 * strings numéricos: `Number(true)` (1) o `Number([])` (0) tampoco son coordenadas.
 *
 * @param {*} valor
 * @returns {Number|null}
 */
function coordenada_numerica(valor) {
	if (typeof valor == 'number') {
		return isFinite(valor) ? valor : null
	}
	if (typeof valor != 'string') {
		return null
	}
	let recortado = valor.trim()
	if (recortado === '') {
		return null
	}
	let numero = Number(recortado)
	return isFinite(numero) ? numero : null
}

/**
 * Las coordenadas como números, o null si no son válidas. Un 0,0 (el golfo de Guinea) se descarta:
 * es lo que deja un campo numérico vacío, no una dirección real.
 *
 * @param {*} lat
 * @param {*} lng
 * @returns {{lat: Number, lng: Number}|null}
 */
export function coordenadas_de(lat, lng) {
	let lat_numero = coordenada_numerica(lat)
	let lng_numero = coordenada_numerica(lng)
	if (lat_numero === null || lng_numero === null) {
		return null
	}
	if (lat_numero < -90 || lat_numero > 90 || lng_numero < -180 || lng_numero > 180) {
		return null
	}
	if (lat_numero === 0 && lng_numero === 0) {
		return null
	}
	return { lat: lat_numero, lng: lng_numero }
}

/**
 * Arma la dirección resuelta a partir de sus partes, con las coordenadas validadas.
 *
 * @param {String} texto
 * @param {String} texto_para_buscar
 * @param {String} referencia
 * @param {*} lat
 * @param {*} lng
 * @param {String} fuente
 * @returns {Object}
 */
function armar(texto, texto_para_buscar, referencia, lat, lng, fuente) {
	let coordenadas = coordenadas_de(lat, lng)
	return {
		texto: texto,
		texto_para_buscar: con_pais(texto_para_buscar),
		referencia: referencia,
		lat: coordenadas ? coordenadas.lat : null,
		lng: coordenadas ? coordenadas.lng : null,
		fuente: fuente,
	}
}

/**
 * Dirección desde `orders.envio_direccion`, el snapshot que guarda la tienda nueva.
 *
 * La línea es `formatted_address` (la de Google, que ya trae localidad y provincia) o, si la
 * dirección se cargó a mano, "{calle} {altura}, {localidad}, {provincia} (CP {cp})". El piso/depto
 * va al final entre paréntesis: Google no lo conoce, así que no entra en el texto a buscar.
 *
 * @param {Object|String|null} valor `order.envio_direccion` (objeto o json en string).
 * @returns {Object|null}
 */
export function direccion_desde_envio_direccion(valor) {
	let snapshot = json_del_pedido(valor)
	if (!snapshot) {
		return null
	}

	let principal = texto_de(snapshot.formatted_address)
	if (!principal) {
		let calle = [texto_de(snapshot.street), texto_de(snapshot.street_number)].filter(parte => !!parte).join(' ')
		principal = unir([calle, texto_de(snapshot.city), texto_de(snapshot.province)])
		if (principal && texto_de(snapshot.zip_code)) {
			principal += ' (CP ' + texto_de(snapshot.zip_code) + ')'
		}
	}
	if (!principal) {
		return null
	}

	let piso_depto = texto_de(snapshot.apartment)
	let texto = piso_depto ? principal + ' (piso/depto: ' + piso_depto + ')' : principal

	return armar(texto, principal, texto_de(snapshot.reference), snapshot.lat, snapshot.lng, 'envio_direccion')
}

/**
 * Dirección desde `orders.envio_destino`, el destino que la tienda arma para Zipnova. Misma forma
 * que `EnvioDestinoHelper::como_texto()` de la API: "{calle} {numero} {piso_depto}, {localidad},
 * {provincia} (CP {codigo_postal})".
 *
 * Sin calle no es un domicilio (es el destino de un retiro en una sucursal del correo, que solo
 * trae localidad, provincia y código postal): devuelve null.
 *
 * @param {Object|String|null} valor `order.envio_destino` (objeto o json en string).
 * @returns {Object|null}
 */
export function direccion_desde_envio_destino(valor) {
	let destino = json_del_pedido(valor)
	if (!destino || !texto_de(destino.calle)) {
		return null
	}

	let calle_y_numero = [texto_de(destino.calle), texto_de(destino.numero)].filter(parte => !!parte).join(' ')
	let calle_completa = [calle_y_numero, texto_de(destino.piso_depto)].filter(parte => !!parte).join(' ')
	let localidad_y_provincia = [texto_de(destino.localidad), texto_de(destino.provincia)]

	let texto = unir([calle_completa].concat(localidad_y_provincia))
	if (texto_de(destino.codigo_postal)) {
		texto += ' (CP ' + texto_de(destino.codigo_postal) + ')'
	}
	let texto_para_buscar = unir([calle_y_numero].concat(localidad_y_provincia))

	return armar(texto, texto_para_buscar, texto_de(destino.referencia), destino.lat, destino.lng, 'envio_destino')
}

/**
 * Dirección desde `orders.address`, la línea en texto de siempre. Sin coordenadas.
 *
 * @param {String|null} valor
 * @returns {Object|null}
 */
export function direccion_desde_texto(valor) {
	let texto = texto_de(valor)
	if (!texto) {
		return null
	}
	return armar(texto, texto, '', null, null, 'address')
}

/**
 * La dirección de entrega del pedido, del primer lado que tenga algo (ver el orden arriba).
 *
 * @param {Object} order
 * @returns {Object|null}
 */
export function direccion_de_envio_del_pedido(order) {
	if (!order) {
		return null
	}
	let direccion = direccion_desde_envio_direccion(order.envio_direccion)
	if (!direccion) {
		direccion = direccion_desde_envio_destino(order.envio_destino)
	}
	if (!direccion) {
		direccion = direccion_desde_texto(order.address)
	}
	return direccion
}
