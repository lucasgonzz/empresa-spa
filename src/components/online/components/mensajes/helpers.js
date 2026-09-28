import moment from 'moment'
import nombre_completo from '@/components/online/components/vincular-comprador/nombre_completo'

/**
 * Ayudantes compartidos del submódulo "Mensajes" de Tienda Online (misión mensajes-tienda-online,
 * 28/9/2026). Viven en un módulo propio para que la bandeja, la conversación, el toast del
 * anfitrión y la tabla de Alertas nombren al comprador y rotulen los mensajes igual: si cada pieza
 * armara el texto por su cuenta, el mismo comprador se llamaría distinto según la pantalla.
 */

/**
 * Rótulo de los mensajes que el sistema manda solo (confirmación de pedido, pago acreditado, etc.).
 * La clave es `messages.type` tal como lo escribe `MessageHelper` de empresa-api; un mensaje escrito
 * a mano por el comercio o por el comprador viaja con `type` en null y no lleva rótulo.
 */
export const ROTULOS_POR_TIPO = {
	order_confirmed: 'Pedido confirmado',
	order_canceled: 'Pedido cancelado',
	order_finished: 'Pedido listo',
	order_delivered: 'Pedido entregado',
	payment_success: 'Pago acreditado',
	payment_error: 'Error en el pago',
	question_answered: 'Pregunta respondida',
	cart_amount_updated: 'Carrito actualizado',
}

/**
 * Rótulo de los mensajes que ESCRIBE EL COMPRADOR pero llegan con un `type`: el de "Ayuda →
 * Escribinos" de la tienda se guarda con `type = 'help'` (`HelpController` de tienda-api). No es
 * automático: lo escribió una persona, y el rótulo solo dice por dónde entró.
 */
export const ROTULOS_DEL_COMPRADOR = {
	help: 'Consulta desde Ayuda',
}

/**
 * Rótulo de un mensaje, o null si no lleva.
 *
 * 🔴 Un mensaje del comprador (`from_buyer`) NUNCA se rotula como automático: los automáticos los
 * manda el sistema en nombre del comercio. Del comprador solo se rotulan los `type` conocidos de
 * `ROTULOS_DEL_COMPRADOR`; cualquier otro `type` se muestra como lo que es, un mensaje suyo.
 *
 * Del lado del comercio, un `type` que no está en la lista (uno que agregue el backend mañana) sí
 * se marca como automático: dibujarlo como si el comercio lo hubiera escrito a mano sería mentirle
 * al que lee.
 *
 * @param {Object|null} message Mensaje con `type` y `from_buyer`.
 * @returns {String|null}
 */
export function rotulo_del_mensaje(message) {
	if (!message || !message.type) {
		return null
	}
	if (es_verdadero(message.from_buyer)) {
		return ROTULOS_DEL_COMPRADOR[message.type] || null
	}
	return ROTULOS_POR_TIPO[message.type] || ROTULOS_DEL_COMPRADOR[message.type] || 'Mensaje automático'
}

/**
 * Ícono del rótulo: el rayo para lo que mandó el sistema solo, el signo de pregunta para una
 * consulta que el comprador escribió desde Ayuda.
 *
 * @param {Object|null} message
 * @returns {String} clase de bootstrap-icons.
 */
export function icono_del_rotulo(message) {
	if (message && ROTULOS_DEL_COMPRADOR[message.type]) {
		return 'bi-question-circle'
	}
	return 'bi-lightning-charge-fill'
}

/**
 * Los booleanos del contrato (`from_buyer`, `read`, `text_truncado`) llegan como `true`/`false`,
 * pero un endpoint viejo o un modelo sin castear los manda como 0/1 (o '0'/'1'). Con `!!` un '0'
 * daría true; con esto los cuatro casos salen bien.
 *
 * @param {*} valor
 * @returns {Boolean}
 */
export function es_verdadero(valor) {
	return valor === true || valor === 1 || valor === '1'
}

/**
 * Nombre del comprador para mostrar en la bandeja, el header, el toast y Alertas. Si no tiene
 * nombre cae al email, al teléfono y, en última instancia, al número de comprador: una fila sin
 * título no se puede elegir.
 *
 * @param {Object|null} buyer Comprador (`{id, name, surname, email, phone}`) o null.
 * @param {Number|null} buyer_id Id a usar si no hay comprador cargado todavía.
 * @returns {String}
 */
export function nombre_del_comprador(buyer, buyer_id) {
	let nombre = nombre_completo(buyer)
	if (nombre) {
		return nombre
	}
	if (buyer && buyer.email) {
		return String(buyer.email)
	}
	if (buyer && buyer.phone) {
		return String(buyer.phone)
	}
	let id = buyer && buyer.id ? buyer.id : buyer_id
	return id ? 'Comprador #' + id : 'Comprador'
}

/**
 * Hora si la fecha es de hoy, fecha corta si es de otro día: el mismo criterio que la bandeja de
 * WhatsApp (`whatsapp/chats-list/ChatRow.vue`).
 *
 * @param {String} fecha
 * @returns {String}
 */
export function hora_o_fecha(fecha) {
	if (!fecha) {
		return ''
	}
	let m = moment(fecha)
	if (m.isSame(moment(), 'day')) {
		return m.format('HH:mm')
	}
	if (m.isSame(moment().subtract(1, 'day'), 'day')) {
		return 'Ayer'
	}
	return m.format('DD/MM/YY')
}

/**
 * Texto del separador de día de la conversación: "Hoy", "Ayer" o la fecha. Del año en curso no se
 * repite el año; de otro año sí, si no "3 de marzo" sería ambiguo en una charla vieja.
 *
 * @param {String} fecha
 * @returns {String}
 */
export function texto_de_dia(fecha) {
	let m = moment(fecha)
	if (m.isSame(moment(), 'day')) {
		return 'Hoy'
	}
	if (m.isSame(moment().subtract(1, 'day'), 'day')) {
		return 'Ayer'
	}
	if (m.isSame(moment(), 'year')) {
		return m.format('D [de] MMMM')
	}
	return m.format('D [de] MMMM [de] YYYY')
}

/**
 * Escapa un texto para meterlo en HTML. Hace falta en el toast de "Nuevo mensaje de...": el
 * plugin de toasts (vue-toast-notification) dibuja el mensaje con `v-html`, y el nombre del
 * comprador lo escribe el propio comprador en la tienda. Sin esto, un nombre con etiquetas se
 * ejecutaría adentro del sistema de gestión.
 *
 * @param {String} texto
 * @returns {String}
 */
export function escapar_html(texto) {
	return String(texto == null ? '' : texto)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}
