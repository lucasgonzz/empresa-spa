/**
 * «Seguir con Soporte» desde el asistente personal (misión prueba-ayuda-unificada-en-soporte, S2,
 * 10/11/2026).
 *
 * En la prueba gratuita, ante una duda de uso, el asistente deja en su respuesta un adjunto
 * `{ tipo: 'soporte', texto: <pregunta> }` (lo arma `ofrecer_soporte` en empresa-api). El lead lo ve
 * como un botón y, al tocarlo, su pregunta entra a su conversación de Soporte: ahí Martín le contesta
 * con el tour y el video. El asistente NO manda nada solo: el envío es este clic.
 *
 * El envío es el mismo del compositor de Soporte (`support_message/sendMessage` con
 * `agentes_version: 1`), así que el contrato con empresa-api y el admin no cambia (C4).
 */

/** Prefijo de la marca de «ya enviado» en el almacenamiento del navegador, por mensaje del asistente. */
const CLAVE_ENVIADO = 'agentes_soporte_enviado:'

/**
 * Los primeros 24 caracteres del `mensaje_uuid` de una oferta. Son fijos (versión 4 y variante 8, para
 * que pase la regla `uuid` de empresa-api) y los últimos 12 son el id del mensaje del asistente en hex.
 */
const PREFIJO_DEL_UUID = '5e9a1d00-50fe-4a00-8000-'

/** Los envíos en curso de esta pestaña: dos clics rápidos no mandan la pregunta dos veces. */
const en_curso = {}

/**
 * El `mensaje_uuid` de la oferta de un mensaje del asistente: SIEMPRE el mismo para el mismo mensaje.
 *
 * 🔴 Es lo que hace único el envío, y no la marca del navegador. empresa-api deduplica por ese campo
 * (SupportMessageController::store → mensaje_reintentado(), sobre `support_messages.uuid`, que es
 * UNIQUE): si el POST llegó y se perdió la respuesta, si el lead reintenta desde el globo de Soporte
 * (retrySendMessage reusa el uuid) o si vuelve a tocar el botón en otro dispositivo, el servidor
 * devuelve el mensaje que ya existe en vez de crear otro. Con un uuid nuevo por clic, la pregunta
 * llegaba dos veces.
 *
 * Los ids de ai_messages son únicos en la base de la instancia, igual que support_messages.uuid.
 *
 * @param {Number|String} message_id
 * @returns {String|null} null si el id no es un entero positivo.
 */
export function uuid_de_la_oferta(message_id) {
	const id = Number(message_id)
	if (!Number.isInteger(id) || id < 1 || id > 0xffffffffffff) return null
	return PREFIJO_DEL_UUID + ('000000000000' + id.toString(16)).slice(-12)
}

/**
 * La conversación de Soporte a la que va la pregunta: la abierta del SISTEMA más nueva, la misma regla
 * de Soporte.vue::ticket_abierto (el compositor). null cuando no hay: el envío abre una nueva.
 *
 * 🔴 Las de WhatsApp se excluyen a propósito. En la prueba el ticket abierto de WhatsApp es «Prueba
 * gratuita», por donde el admin sigue mandando los recordatorios y el video; pasarlo al sistema con
 * `traspasar_a_sistema` desde este botón se lo cortaría. Por eso acá no hay traspaso ni confirmación.
 *
 * @param {Array<Object>} tickets Los de `support_ticket.models`.
 * @returns {Object|null}
 */
export function ticket_para_seguir(tickets) {
	let abierto = null
	;(Array.isArray(tickets) ? tickets : []).forEach(function (ticket) {
		if (!ticket || ticket.status !== 'open' || ticket.origen === 'whatsapp') return
		if (!abierto || ticket.id > abierto.id) abierto = ticket
	})
	return abierto
}

/**
 * true si la oferta de ese mensaje ya se mandó desde este navegador. Es solo una comodidad de la
 * interfaz (el envío único lo garantiza el uuid). El almacenamiento puede no estar (modo privado).
 *
 * @param {Number|String} message_id
 * @returns {Boolean}
 */
export function ya_enviado(message_id) {
	if (message_id == null) return false
	try {
		return window.localStorage.getItem(CLAVE_ENVIADO + message_id) === '1'
	} catch (e) {
		return false
	}
}

function marcar_enviado(message_id) {
	try {
		window.localStorage.setItem(CLAVE_ENVIADO + message_id, '1')
	} catch (e) {
		// Sin almacenamiento el botón igual queda «Enviado a Soporte» mientras siga en pantalla.
	}
}

/**
 * Abre la pestaña Soporte y manda la pregunta como mensaje del lead.
 *
 * @param {Object} componente El que tocó el botón: da `$store`.
 * @param {Number|String} message_id El mensaje del asistente que trajo la oferta (envío único).
 * @param {String} texto La pregunta.
 * @returns {Promise<String>} 'enviado' | 'cancelado' | 'error'
 */
export function seguir_con_soporte(componente, message_id, texto) {
	const store = componente.$store
	const contenido = typeof texto === 'string' ? texto.trim() : ''
	const mensaje_uuid = uuid_de_la_oferta(message_id)
	if (!contenido || !mensaje_uuid) return Promise.resolve('error')
	if (ya_enviado(message_id)) return Promise.resolve('enviado')
	if (en_curso[message_id] || store.state.support_message.sending) return Promise.resolve('cancelado')
	en_curso[message_id] = true

	store.commit('ai_chat/setAgente', 'soporte')

	return Promise.resolve(store.dispatch('support_ticket/getAgentes'))
		.then(function (cargo) {
			/*
			 * Sin la bandeja no se sabe si hay una conversación abierta: mandar igual abriría una nueva a
			 * ciegas. getAgentes resuelve `false` cuando el pedido falló; el botón queda con su error y
			 * se puede volver a tocar.
			 */
			if (cargo === false) return 'error'
			const ticket = ticket_para_seguir(store.state.support_ticket.models)
			const id = ticket ? ticket.id : null
			// Se abre la conversación antes de mandar: así el globo pendiente aparece donde el lead la ve.
			return Promise.resolve(store.dispatch('support_message/loadTicketMessages', { id: id, agentes: true }))
				.then(function () {
					return store.dispatch('support_message/sendMessage', {
						body: contenido,
						kind: 'text',
						agentes_version: 1,
						mensaje_uuid: mensaje_uuid,
						ticket_id: id,
					})
				})
				.then(function (modelo) {
					if (!modelo) return 'error'
					marcar_enviado(message_id)
					// Sin conversación abierta, el envío creó una: se la deja elegida, como Soporte.vue::enviar.
					if (id == null && modelo.support_ticket_id) {
						store.dispatch('support_message/loadTicketMessages', { id: modelo.support_ticket_id, agentes: true })
					}
					return 'enviado'
				})
		})
		.catch(function () { return 'error' })
		.then(function (resultado) {
			delete en_curso[message_id]
			return resultado
		})
}
