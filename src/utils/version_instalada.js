// Util puro de la versión instalada del sistema (misión version-instalada-historial, 23/11/2026).
// Sin moment ni dependencias: sólo Intl.DateTimeFormat con la zona horaria de Argentina, para que la
// fecha mostrada no dependa de la zona de la computadora del usuario.

/**
 * Zona horaria en la que se muestran todas las fechas de la versión instalada.
 *
 * @type {string}
 */
export const ZONA_HORARIA = 'America/Argentina/Buenos_Aires'

/**
 * Formateador reutilizable: parte una fecha en año, mes, día, hora y minuto argentinos.
 * `hourCycle: 'h23'` evita que la medianoche salga como "24".
 *
 * @type {Intl.DateTimeFormat}
 */
const formateador_argentino = new Intl.DateTimeFormat('en-US', {
	timeZone: ZONA_HORARIA,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
})

/**
 * Pasa un instante (ISO con offset, ISO en UTC o Date) a sus partes en hora argentina.
 *
 * @param {string|Date} iso Instante a convertir.
 * @returns {{anio: number, mes: number, dia: number, hora: number, minuto: number}|null} null si no es una fecha válida.
 */
export function fecha_en_argentina(iso) {
	const fecha = iso instanceof Date ? iso : new Date(iso)
	if (isNaN(fecha.getTime())) {
		return null
	}
	// Partes numéricas indexadas por tipo ('year', 'month', ...).
	const partes = {}
	formateador_argentino.formatToParts(fecha).forEach(parte => {
		partes[parte.type] = parseInt(parte.value, 10)
	})
	return {
		anio: partes.year,
		mes: partes.month,
		dia: partes.day,
		hora: partes.hour,
		minuto: partes.minute,
	}
}

/**
 * Días calendario (en hora argentina) entre la instalación y "ahora". No son bloques de 24 h:
 * pasada la medianoche argentina ya es otro día.
 *
 * @param {string|Date} instalada_en Instante de instalación.
 * @param {string|Date} [ahora] Instante de referencia (por defecto, ahora).
 * @returns {number|null} Cantidad de días (nunca negativa) o null si alguna fecha no es válida.
 */
export function dias_desde_instalacion(instalada_en, ahora) {
	const desde = fecha_en_argentina(instalada_en)
	const hasta = fecha_en_argentina(ahora === undefined ? new Date() : ahora)
	if (!desde || !hasta) {
		return null
	}
	// Se comparan medianoches en UTC de las fechas argentinas: la diferencia es exacta en días.
	const ms_desde = Date.UTC(desde.anio, desde.mes - 1, desde.dia)
	const ms_hasta = Date.UTC(hasta.anio, hasta.mes - 1, hasta.dia)
	return Math.max(0, Math.round((ms_hasta - ms_desde) / 86400000))
}

/**
 * Texto corto de antigüedad: Hoy / Ayer / Hace N días.
 *
 * @param {number|null} dias Días calendario.
 * @returns {string}
 */
export function texto_hace(dias) {
	if (dias === null || dias === undefined) {
		return ''
	}
	if (dias === 0) {
		return 'Hoy'
	}
	if (dias === 1) {
		return 'Ayer'
	}
	return 'Hace ' + dias + ' días'
}

/**
 * Formatea una fecha como dd/mm/aaaa hh:mm en hora argentina.
 *
 * @param {string|Date} iso Instante a formatear.
 * @returns {string} Cadena vacía si la fecha no es válida.
 */
export function formatear_fecha(iso) {
	const partes = fecha_en_argentina(iso)
	if (!partes) {
		return ''
	}
	const dos = numero => (numero < 10 ? '0' : '') + numero
	return dos(partes.dia) + '/' + dos(partes.mes) + '/' + partes.anio + ' ' + dos(partes.hora) + ':' + dos(partes.minuto)
}

/**
 * Etiqueta de la fecha según de dónde salió: la del historial previo es la fecha de publicación
 * (aproximada), el resto es una instalación observada.
 *
 * @param {string} source Origen de la fila (instalacion, sincronizacion, detectada, historial_previo).
 * @returns {string}
 */
export function etiqueta_de_fuente(source) {
	if (source === 'historial_previo') {
		return 'Fecha de publicación (aproximada)'
	}
	return 'Instalada'
}

/**
 * Texto del item del menú.
 *
 * @param {{version: string}|null} current Versión actual del endpoint.
 * @returns {string} `Versión 4.5.0` o `Versión sin registrar`.
 */
export function texto_del_item(current) {
	if (current && current.version) {
		return 'Versión ' + current.version
	}
	return 'Versión sin registrar'
}
