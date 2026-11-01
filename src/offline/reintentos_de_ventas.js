/**
 * Cuándo se vuelve a intentar subir una venta hecha sin conexión que el servidor no pudo guardar
 * (misión panchito-venta-price-vender, 1/11/2026).
 *
 * POR QUÉ EXISTE. Un 4xx es un rechazo del servidor y la venta se marca `rechazada_at` (ver
 * sync_sales.js). Un 5xx, en cambio, puede ser pasajero —el MySQL del VPS se cae todas las noches
 * cerca de las 00:00— o determinístico (un bug del back: el de Panchito daba 500 siempre con la
 * misma venta). Desde acá no se puede distinguir una cosa de la otra con un solo intento, y marcar
 * todo 5xx como rechazo haría perder ventas en cada corte. Hasta esta misión el reintento periódico
 * (`vigilar_conexion`, cada 30 s) repetía la misma venta y el mismo aviso sin parar: Panchito
 * generaba unas 4.000 llamadas fallidas por día.
 *
 * LO QUE SE HACE. Una venta que falla por culpa del servidor NO se rechaza ni se borra: queda en
 * el equipo y el reintento PERIÓDICO la saltea durante una pausa que crece con cada fallo seguido
 * (1, 2, 5, 15 y 60 minutos; 60 es el tope). Un corte de minutos se recupera sola enseguida; un
 * error que no se arregla baja de 2.880 intentos por día a 24. La pausa solo frena al reintento
 * periódico: el evento `online` y el inicio de sesión siguen intentando todas las ventas.
 *
 * Son funciones puras (reciben el reloj) para poder probarlas sin navegador.
 */

/** Pausa antes del próximo reintento periódico, según cuántos fallos seguidos lleva la venta. */
export const PAUSAS_ENTRE_REINTENTOS_MS = [
	60 * 1000,
	2 * 60 * 1000,
	5 * 60 * 1000,
	15 * 60 * 1000,
	60 * 60 * 1000,
]

/**
 * Campos que existen solo en la tabla `sales` de IndexedDB y nunca viajan en el POST /sale.
 * sync_sales.js los suma a `CAMPOS_LOCALES`.
 */
export const CAMPOS_LOCALES_DE_REINTENTO = [
	'fallos_de_servidor',
	'ultimo_fallo_de_servidor',
	'ultimo_fallo_at',
	'reintentar_despues_de',
]

/**
 * La pausa que corresponde después de N fallos seguidos del servidor.
 *
 * @param {Number} cantidad_de_fallos Fallos seguidos, contando el que acaba de pasar (>= 1).
 * @returns {Number} Milisegundos.
 */
export function pausa_tras_fallos(cantidad_de_fallos) {
	let indice = Math.max(1, Number(cantidad_de_fallos) || 1) - 1
	return PAUSAS_ENTRE_REINTENTOS_MS[Math.min(indice, PAUSAS_ENTRE_REINTENTOS_MS.length - 1)]
}

/**
 * ¿La venta está en pausa para el reintento periódico?
 *
 * @param {Object} venta Registro de `db.sales`.
 * @param {Number} ahora_ms Reloj (Date.now()).
 * @returns {Boolean} true si todavía no se cumplió su `reintentar_despues_de` (y no es una pausa imposible).
 */
export function esta_en_espera(venta, ahora_ms) {
	if (!venta || !venta.reintentar_despues_de) {
		return false
	}
	let hasta = new Date(venta.reintentar_despues_de).getTime()
	/*
		Una pausa que se pasa de la maxima (60 min) solo puede venir de un reloj del equipo que
		retrocedio despues del fallo: no se respeta, para que la venta no quede salteada de mas.
	*/
	if (hasta - ahora_ms > PAUSAS_ENTRE_REINTENTOS_MS[PAUSAS_ENTRE_REINTENTOS_MS.length - 1]) {
		return false
	}
	return !isNaN(hasta) && hasta > ahora_ms
}

/**
 * Los campos a guardar en la venta después de un fallo del servidor (5xx o sin respuesta). No toca
 * `rechazada_at`: la venta sigue siendo reintentable.
 *
 * @param {Object} venta Registro de `db.sales` (con los fallos anteriores, si los tiene).
 * @param {String} mensaje Lo que dijo el servidor, o el error de red.
 * @param {Number} ahora_ms Reloj (Date.now()).
 * @returns {Object} Para `db.sales.update(id, campos)`.
 */
export function campos_tras_fallo_de_servidor(venta, mensaje, ahora_ms) {
	let fallos = (Number(venta && venta.fallos_de_servidor) || 0) + 1
	return {
		fallos_de_servidor: fallos,
		ultimo_fallo_de_servidor: String(mensaje),
		ultimo_fallo_at: new Date(ahora_ms).toISOString(),
		reintentar_despues_de: new Date(ahora_ms + pausa_tras_fallos(fallos)).toISOString(),
	}
}

/**
 * ¿Hay que mostrarle el aviso al cajero en este fallo? En el primero, en el quinto (ya pasó casi
 * media hora y conviene que avise a soporte) y después cada 20. Antes se avisaba en cada vuelta
 * del reintento, o sea cada 30 segundos.
 *
 * @param {Number} fallos Fallos seguidos, contando el que acaba de pasar.
 * @returns {Boolean}
 */
export function debe_avisar_el_fallo(fallos) {
	return fallos === 1 || fallos === 5 || (fallos > 5 && fallos % 20 === 0)
}
