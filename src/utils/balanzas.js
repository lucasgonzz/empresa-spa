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
