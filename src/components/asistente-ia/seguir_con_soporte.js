import { confirmar_traspaso } from '@/components/asistente-ia/traspaso'

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
 * `agentes_version: 1`), así que el contrato con empresa-api y el admin no cambia (C4). Lo único que se
 * decide acá es a QUÉ conversación va (ver `ticket_para_seguir`).
 */

/** Prefijo de la marca de «ya enviado» en el almacenamiento del navegador, por mensaje del asistente. */
const CLAVE_ENVIADO = 'agentes_soporte_enviado:'

/** Los envíos en curso de esta pestaña: dos clics rápidos no mandan la pregunta dos veces. */
const en_curso = {}

/**
 * La conversación de Soporte a la que va la pregunta: la abierta del sistema más nueva y, si no hay,
 * la abierta de WhatsApp más nueva (la de la prueba gratuita la abre el admin por WhatsApp). null
 * cuando no hay ninguna abierta: el envío abre una nueva, como el compositor sin conversación elegida.
 *
 * Primero la del sistema porque seguir en una de WhatsApp pide pasarla al sistema (confirmar_traspaso):
 * si ya hay una del sistema abierta, no hay por qué hacerle esa pregunta al lead.
 *
 * @param {Array<Object>} tickets Los de `support_ticket.models`.
 * @returns {Object|null}
 */
export function ticket_para_seguir(tickets) {
	let del_sistema = null
	let de_whatsapp = null
	;(Array.isArray(tickets) ? tickets : []).forEach(function (ticket) {
		if (!ticket || ticket.status !== 'open') return
		if (ticket.origen === 'whatsapp') {
			if (!de_whatsapp || ticket.id > de_whatsapp.id) de_whatsapp = ticket
		} else if (!del_sistema || ticket.id > del_sistema.id) {
			del_sistema = ticket
		}
	})
	return del_sistema || de_whatsapp
}

/**
 * true si mandar en esa conversación la pasa al sistema: la misma regla de Soporte.vue::preparar_envio.
 *
 * @param {Object|null} ticket
 * @returns {Boolean}
 */
export function necesita_traspaso(ticket) {
	return Boolean(ticket && ticket.origen === 'whatsapp' && !ticket.sistema_exclusivo_at)
}

/**
 * true si la oferta de ese mensaje ya se mandó desde este navegador. El almacenamiento puede no estar
 * (modo privado, bloqueado): entonces solo cuenta lo de esta pestaña.
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
 * @param {Object} componente El que tocó el botón: da `$store` y `$bvModal` (para la confirmación).
 * @param {Number|String} message_id El mensaje del asistente que trajo la oferta (envío único).
 * @param {String} texto La pregunta.
 * @returns {Promise<String>} 'enviado' | 'cancelado' | 'error'
 */
export function seguir_con_soporte(componente, message_id, texto) {
	const store = componente.$store
	const contenido = typeof texto === 'string' ? texto.trim() : ''
	if (!contenido) return Promise.resolve('error')
	if (ya_enviado(message_id)) return Promise.resolve('enviado')
	if (en_curso[message_id] || store.state.support_message.sending) return Promise.resolve('cancelado')
	en_curso[message_id] = true

	store.commit('ai_chat/setAgente', 'soporte')

	let ticket = null
	return Promise.resolve(store.dispatch('support_ticket/getAgentes'))
		.then(function () {
			ticket = ticket_para_seguir(store.state.support_ticket.models)
			return necesita_traspaso(ticket) ? confirmar_traspaso(componente) : true
		})
		.then(function (confirmado) {
			if (!confirmado) return 'cancelado'
			const id = ticket ? ticket.id : null
			// Se abre la conversación antes de mandar: así el globo pendiente aparece donde el lead la ve.
			return Promise.resolve(store.dispatch('support_message/loadTicketMessages', { id: id, agentes: true }))
				.then(function () {
					const envio = { body: contenido, kind: 'text', agentes_version: 1, ticket_id: id }
					if (necesita_traspaso(ticket)) envio.traspasar_a_sistema = 1
					return store.dispatch('support_message/sendMessage', envio)
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
