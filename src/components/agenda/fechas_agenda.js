import moment from 'moment'

/**
 * Fechas de la agenda, en castellano y sin depender del locale de moment.
 *
 * La app no registra el locale 'es' de moment (el resto del sistema imprime DD/MM/YY y listo),
 * asi que "lun 21 sep" y "septiembre 2026" se arman a mano con estas tablas. Todo recibe y
 * devuelve fechas como 'YYYY-MM-DD': es lo que manda la API y lo que se compara como texto.
 *
 * 🔴 Nunca `new Date('YYYY-MM-DD')`: el navegador lo interpreta en UTC y en Argentina (UTC-3)
 * corre la fecha un dia para atras. Siempre moment(fecha, FORMATO).
 */

export const FORMATO = 'YYYY-MM-DD'

/* Indexados por moment().day(): 0 = domingo */
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/* Indexados por moment().month(): 0 = enero */
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/* Cabecera de la grilla del calendario, de lunes a domingo */
export const CABECERA_SEMANA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

/**
 * @param {String} fecha YYYY-MM-DD
 * @returns {moment}
 */
export function parsear(fecha) {
	return moment(fecha, FORMATO)
}

/**
 * Dias de diferencia entre dos fechas (positivo si `fecha` es posterior a `respecto_de`).
 *
 * @param {String} fecha YYYY-MM-DD
 * @param {String} respecto_de YYYY-MM-DD
 * @returns {Number}
 */
export function dias_entre(fecha, respecto_de) {
	return parsear(fecha).diff(parsear(respecto_de), 'days')
}

/**
 * "lun 21 sep" (con el año solo si no es el de la fecha de referencia, para no repetirlo en
 * cada fila).
 *
 * @param {String} fecha YYYY-MM-DD
 * @param {String} respecto_de YYYY-MM-DD, define de que año no hace falta hablar
 * @returns {String}
 */
export function fecha_corta(fecha, respecto_de) {
	let f = parsear(fecha)
	let texto = DIAS_CORTOS[f.day()] + ' ' + f.date() + ' ' + MESES_CORTOS[f.month()]
	if (respecto_de && parsear(respecto_de).year() != f.year()) {
		texto += ' ' + f.year()
	}
	return texto
}

/**
 * "lunes 21 de septiembre" (titulo del dia seleccionado en el calendario).
 *
 * @param {String} fecha YYYY-MM-DD
 * @returns {String}
 */
export function fecha_larga(fecha) {
	let f = parsear(fecha)
	return DIAS_LARGOS[f.day()] + ' ' + f.date() + ' de ' + MESES_LARGOS[f.month()]
}

/**
 * Linea secundaria de una fila: "hoy", "mañana", "venció hace 3 días", "lun 21 sep".
 *
 * Los dias relativos se dicen solo cuando de verdad ayudan (hoy, mañana, atrasos); para
 * cualquier otra fecha el nombre del dia dice mas que "en 12 días".
 *
 * @param {String} fecha YYYY-MM-DD
 * @param {String} hoy YYYY-MM-DD, el `hoy` que manda la API
 * @returns {String}
 */
export function fecha_relativa(fecha, hoy) {
	let dias = dias_entre(fecha, hoy)
	if (dias === 0) {
		return 'hoy'
	}
	if (dias === 1) {
		return 'mañana'
	}
	if (dias === -1) {
		return 'venció ayer'
	}
	if (dias < -1) {
		return 'venció hace ' + Math.abs(dias) + ' días'
	}
	return fecha_corta(fecha, hoy)
}

/**
 * "Septiembre 2026", cabecera del calendario.
 *
 * @param {String} mes YYYY-MM
 * @returns {String}
 */
export function etiqueta_mes(mes) {
	let f = moment(mes + '-01', FORMATO)
	let nombre = MESES_LARGOS[f.month()]
	return nombre.charAt(0).toUpperCase() + nombre.slice(1) + ' ' + f.year()
}

/**
 * "cada mes", "cada 2 semanas", "cada día", "cada 3 años".
 *
 * @param {String} slug day | week | month | year (slug de unidad_frecuencias)
 * @param {Number} cantidad
 * @returns {String}
 */
export function texto_recurrencia(slug, cantidad) {
	let n = Number(cantidad) || 1
	let nombres = {
		day: ['día', 'días'],
		week: ['semana', 'semanas'],
		month: ['mes', 'meses'],
		year: ['año', 'años'],
	}
	let par = nombres[slug]
	if (!par) {
		return 'se repite'
	}
	if (n === 1) {
		return 'cada ' + par[0]
	}
	return 'cada ' + n + ' ' + par[1]
}

/**
 * Rango de la grilla mensual: del LUNES de la primera semana del mes al DOMINGO de la ultima.
 * Lo usan el store (para pedirle ese rango a la API) y el calendario (para dibujar las celdas),
 * asi que vive en un solo lugar: si los dos lo calcularan por su cuenta, una celda podria
 * quedar sin sus tareas por un dia de diferencia.
 *
 * @param {String} mes YYYY-MM
 * @returns {{desde: String, hasta: String}} YYYY-MM-DD, inclusive; como mucho 42 dias
 */
export function rango_grilla_mes(mes) {
	let inicio_mes = moment(mes + '-01', FORMATO).startOf('month')
	let fin_mes = inicio_mes.clone().endOf('month')
	// isoWeekday: lunes = 1 ... domingo = 7
	let desde = inicio_mes.clone().subtract(inicio_mes.isoWeekday() - 1, 'days')
	let hasta = fin_mes.clone().add(7 - fin_mes.isoWeekday(), 'days')
	return {
		desde: desde.format(FORMATO),
		hasta: hasta.format(FORMATO),
	}
}

/**
 * Domingo de la semana de una fecha (la agrupacion "Esta semana" de la lista llega hasta ahi).
 *
 * @param {String} fecha YYYY-MM-DD
 * @returns {String} YYYY-MM-DD
 */
export function domingo_de_la_semana(fecha) {
	let f = parsear(fecha)
	return f.add(7 - f.isoWeekday(), 'days').format(FORMATO)
}
