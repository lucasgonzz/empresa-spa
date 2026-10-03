/**
 * Tickets de balanza en VENDER (mision balanzas-configurables, 3/10/2026).
 *
 * Las balanzas dejaron de ser extensiones (`balanza_bar_code`, `plu_balanza_bar_code`) y pasaron a
 * ser una configuracion del dueño, `users.tickets_de_balanza`, que elige en Configuracion -> Modulo
 * de VENDER -> "Tickets de balanza":
 *
 *   - 'plu'      -> el codigo trae el PLU del articulo y el peso (La Martina).
 *   - 'balanzas' -> cada balanza (ABM -> Balanzas) tiene un codigo de ticket propio y un articulo,
 *                   y el ticket trae el importe o el peso (Panchito).
 *   - 'ninguno' o NULL (nunca se configuro) -> VENDER no lee tickets de balanza.
 *
 * Lo que vive aca son reglas puras (sin store ni `this`, sin imports) que usa
 * components/vender/components/remito/header-form/ArticleBarCode.vue. Con conexion el ticket lo lee
 * la API (BalanzaHelper); sin conexion, o con "Utilizar articulos descargados para buscar por codigo
 * de barras", lo lee leer_ticket_por_balanzas() de este archivo, que es LA MISMA regla. Si una
 * cambia, cambian las dos.
 */

/**
 * Digitos del importe o del peso que se leen cuando la balanza no dice cuantos (`digitos` vacio).
 * Con 7 la lectura del importe es exactamente la de la vieja extension `balanza_bar_code`
 * (`substr(-8)` -> primeros 7), que es la que usa Panchito.
 */
export const DIGITOS_POR_DEFECTO = {
	importe: 7,
	peso: 5,
}

/**
 * unidad_medida_id del Gramo: el peso de un articulo que se vende por gramo NO se divide por 1000.
 * Misma regla que el PLU (set_article_from_plu de ArticleBarCode.vue y la API).
 */
export const UNIDAD_MEDIDA_GRAMO = 2

/**
 * El modo de tickets de balanza del dueño: 'plu', 'balanzas' o null.
 *
 * Misma regla que UserHelper::modo_tickets_de_balanza() de la API: cualquier valor que no sea uno
 * de los dos modos (null, 'ninguno', vacio, un valor viejo) es null, o sea "no lee tickets". Se lee
 * SIEMPRE del dueño: el empleado la recibe adentro de `user.owner`.
 *
 * @param {Object|null} owner El dueño (computed `owner` del mixin general).
 * @returns {String|null}
 */
export function leer_modo_tickets_de_balanza(owner) {
	if (!owner) {
		return null
	}

	let modo = owner.tickets_de_balanza

	if (modo === 'plu' || modo === 'balanzas') {
		return modo
	}

	return null
}

/**
 * El prefijo de una balanza, solo con digitos. La API ya lo guarda normalizado (le saca lo que no
 * es digito al dar de alta); esto es la misma normalizacion por si llega algo distinto.
 *
 * @param {*} prefijo
 * @returns {String}
 */
function normalizar_prefijo(prefijo) {
	if (prefijo === null || typeof prefijo == 'undefined') {
		return ''
	}
	return String(prefijo).replace(/\D/g, '')
}

/**
 * Cuantos digitos del ticket son el importe o el peso para una balanza: los suyos, o los de
 * DIGITOS_POR_DEFECTO si estan vacios (o no son un entero positivo).
 *
 * @param {Object} balanza
 * @param {String} tipo_dato 'importe' | 'peso'
 * @returns {Number}
 */
function digitos_de_la_balanza(balanza, tipo_dato) {
	let digitos = balanza.digitos

	if (digitos === null || typeof digitos == 'undefined' || digitos === '') {
		return DIGITOS_POR_DEFECTO[tipo_dato]
	}

	let numero = Number(digitos)

	if (isNaN(numero) || numero < 1 || Math.floor(numero) !== numero) {
		return DIGITOS_POR_DEFECTO[tipo_dato]
	}

	return numero
}

/**
 * Lee un ticket con las balanzas del dueño ("Por balanza"). Es la regla de la API
 * (BalanzaHelper::leer_ticket_por_balanzas), para leer el ticket SIN CONEXION:
 *
 *   1. El codigo tiene que ser solo digitos.
 *   2. Candidatas: las balanzas cuyo prefijo es el comienzo del codigo. Gana el prefijo MAS LARGO
 *      (con 22 y 2203 cargadas, el ticket 2203... es de la 2203); empate -> la de id mas chico.
 *   3. Digitos: los de la balanza, o 7 (importe) / 5 (peso).
 *   4. Si el codigo es mas corto que prefijo + digitos + 1, no es un ticket de esa balanza: no se
 *      lee (no se prueba con otra balanza de prefijo mas corto).
 *   5. El valor son los `digitos` caracteres ANTERIORES AL ULTIMO (el ultimo es el verificador),
 *      como entero: 2201000027143 con 7 digitos -> "0002714" -> 2714.
 *
 * El valor es el importe en pesos (tipo 'importe') o el peso tal como lo marca la balanza (tipo
 * 'peso': pasar a la cantidad del renglon con cantidad_desde_peso(), que necesita el articulo).
 *
 * @param {String|Number} codigo Codigo escaneado (ya sin espacios: getBarCode()).
 * @param {Array} balanzas Balanzas del dueño (store `balanza`): {id, prefijo, article_id, tipo_dato, digitos, nombre}.
 * @returns {Object|null} {balanza, tipo_dato, digitos, valor}, o null si el codigo no es un ticket de ninguna.
 */
export function leer_ticket_por_balanzas(codigo, balanzas) {

	let texto = (codigo === null || typeof codigo == 'undefined') ? '' : String(codigo)

	if (!/^\d+$/.test(texto)) {
		return null
	}

	if (!Array.isArray(balanzas) || !balanzas.length) {
		return null
	}

	let ganadora = null
	let prefijo_ganador = ''

	balanzas.forEach(balanza => {

		let prefijo = normalizar_prefijo(balanza ? balanza.prefijo : null)

		if (!prefijo || texto.indexOf(prefijo) !== 0) {
			return
		}

		let le_gana = !ganadora
			|| prefijo.length > prefijo_ganador.length
			|| (prefijo.length == prefijo_ganador.length && Number(balanza.id) < Number(ganadora.id))

		if (le_gana) {
			ganadora = balanza
			prefijo_ganador = prefijo
		}
	})

	if (!ganadora) {
		return null
	}

	let tipo_dato = ganadora.tipo_dato == 'peso' ? 'peso' : 'importe'

	let digitos = digitos_de_la_balanza(ganadora, tipo_dato)

	if (texto.length < prefijo_ganador.length + digitos + 1) {
		return null
	}

	// El ultimo caracter es el verificador: el valor son los `digitos` anteriores a el.
	let fin = texto.length - 1

	let valor = parseInt(texto.substring(fin - digitos, fin), 10)

	return {
		balanza: ganadora,
		tipo_dato: tipo_dato,
		digitos: digitos,
		valor: valor,
	}
}

/**
 * La cantidad de un renglon a partir del peso de un ticket: en kilos (peso / 1000), salvo que el
 * articulo se venda por gramo, que va tal cual. Misma regla que el PLU.
 *
 * @param {Number} valor Peso como lo marca la balanza (gramos).
 * @param {Object} articulo Articulo del ticket (necesita unidad_medida_id).
 * @returns {Number}
 */
export function cantidad_desde_peso(valor, articulo) {
	if (articulo && articulo.unidad_medida_id == UNIDAD_MEDIDA_GRAMO) {
		return valor
	}
	return valor / 1000
}

/**
 * El precio que el vendedor tipeo en el input "Personalizado" de un renglon y todavia no confirmo
 * con Enter, o null si no hay ninguno.
 *
 * Lo usa el ticket de balanza con importe antes de sumar el importe al renglon: el renglon pasa a
 * tener varios precios, y con varios precios el total del renglon es SOLO la suma de las filas
 * (getTotalItem() suma calculated_price_vender y la API guarda solo las filas). Si el precio
 * tipeado no se confirma primero como fila -lo mismo que hace el Enter-, se pierde sin aviso.
 *
 * Un 0 (o algo que no es un numero) no cuenta: no suma nada y solo agregaria una fila vacia.
 *
 * @param {Object} linea Renglon del remito.
 * @returns {Number|String|null} El precio tal como esta en el renglon (como lo guarda el Enter), o null.
 */
export function precio_tipeado_pendiente(linea) {
	if (!linea) {
		return null
	}

	let valor = linea.price_vender_personalizado

	if (valor === null || typeof valor == 'undefined' || String(valor).trim() === '') {
		return null
	}

	let numero = Number(valor)

	if (isNaN(numero) || !isFinite(numero) || numero === 0) {
		return null
	}

	return valor
}

/**
 * La cantidad con la que un precio tipeado pendiente pasa a ser fila de varios precios.
 *
 * El Enter de "Personalizado" crea la fila con la cantidad vacia (= 1). Aca se respeta eso cuando
 * el renglon tiene cantidad 1 (o vacia), que es el caso de siempre; si el renglon tiene otra
 * cantidad se la lleva la fila, porque con varios precios la cantidad del renglon deja de contar y
 * el renglon cambiaria de total sin que nadie lo pida (con 2 a $5.000 pasaria a sumar $5.000).
 *
 * @param {Object} linea Renglon del remito.
 * @returns {Number|String} '' para cantidad 1 o vacia; si no, la cantidad del renglon.
 */
export function cantidad_de_la_fila_pendiente(linea) {
	let cantidad = linea ? linea.amount : ''

	if (
		cantidad === ''
		|| cantidad === null
		|| typeof cantidad == 'undefined'
		|| Number(cantidad) === 1
	) {
		return ''
	}

	return cantidad
}
