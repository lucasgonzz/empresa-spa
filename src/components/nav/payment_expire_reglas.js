// Reglas puras del cartel de pago de la mensualidad (PaymentExpire.vue). Misión embudo-juan-pipeline, E4.
//
// Durante la prueba gratuita vigente no se tiene que dibujar ningún cartel ni modal de cobro: no le cobramos
// nada al que está probando. Las reglas viven acá, sin Vue ni store, para poder probarlas solas.
import { prueba_vigente } from '@/components/asistente-ia/prueba_en_soporte'

// Milisegundos de un día, para contar días enteros entre dos fechas.
const MS_POR_DIA = 24 * 60 * 60 * 1000

/**
 * Convierte el `payment_expired_at` del dueño a Date en hora local (igual que hacía moment): una fecha
 * sola ('2026-11-25') o con hora ('2026-11-25 10:00:00' / ISO sin zona) se interpreta como local.
 *
 * @param {String|Date} fecha_pago Fecha de vencimiento del pago.
 * @returns {Date}
 */
function parsear_fecha_local(fecha_pago) {
	if (fecha_pago instanceof Date) {
		return fecha_pago
	}
	let texto = String(fecha_pago).trim().replace(' ', 'T')
	// Sólo fecha: sin hora, Date la tomaría como UTC; se fuerza medianoche local.
	if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
		texto += 'T00:00:00'
	}
	return new Date(texto)
}

/**
 * Días que faltan para el vencimiento del pago. Negativo si ya venció; 999 si no hay fecha.
 * Misma cuenta que tenía el componente: `moment().diff(fecha, 'days') * -1` (trunca hacia cero).
 *
 * @param {Object|null} owner Dueño de la cuenta (con `payment_expired_at`).
 * @param {Date} hoy Momento actual.
 * @returns {Number}
 */
export function dias_para_vencer(owner, hoy) {
	if (!owner || !owner.payment_expired_at) {
		return 999
	}
	const fecha = parsear_fecha_local(owner.payment_expired_at)
	// Días enteros transcurridos desde el vencimiento (truncados hacia cero), con el signo invertido.
	const dias = Math.trunc((hoy.getTime() - fecha.getTime()) / MS_POR_DIA) * -1
	// Evita devolver -0.
	return dias || 0
}

/**
 * ¿Se dibuja el cartel de pago? No en prueba vigente; si no, cuando faltan menos de 3 días (o ya venció).
 *
 * @param {Object|null} user Usuario de la sesión (trae `prueba` si es una instancia de prueba).
 * @param {Object|null} owner Dueño de la cuenta.
 * @param {Date} hoy Momento actual.
 * @returns {Boolean}
 */
export function debe_mostrar_cartel_de_pago(user, owner, hoy) {
	if (prueba_vigente(user)) {
		return false
	}
	return dias_para_vencer(owner, hoy) < 3
}

/**
 * ¿Hay que abrir el modal "aviso-vencido" cada tanto? No en prueba vigente; si no, cuando el pago ya
 * venció o vence hoy (menos de 1 día) y no es sábado ni domingo.
 *
 * @param {Object|null} user Usuario de la sesión.
 * @param {Object|null} owner Dueño de la cuenta.
 * @param {Date} hoy Momento actual.
 * @returns {Boolean}
 */
export function debe_abrir_aviso_vencido(user, owner, hoy) {
	if (prueba_vigente(user)) {
		return false
	}
	if (!owner || !owner.payment_expired_at) {
		return false
	}
	// getDay(): 0 = domingo, 6 = sábado.
	if (hoy.getDay() === 0 || hoy.getDay() === 6) {
		return false
	}
	return dias_para_vencer(owner, hoy) < 1
}
