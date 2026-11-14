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

/** Prefijo de la marca de «ya enviado» en el almacenamiento del navegador, por uuid de la oferta. */
const CLAVE_ENVIADO = 'agentes_soporte_enviado:'

/** Los envíos en curso de esta pestaña: dos clics rápidos no mandan la pregunta dos veces. */
const en_curso = {}

/** El formato de la regla `uuid` de Laravel, que es la que valida empresa-api. */
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * El `mensaje_uuid` de una oferta: el `uuid` que trae el adjunto, o null si no trae uno válido.
 *
 * 🔴 Es lo que hace único el envío, y no la marca del navegador. Lo genera empresa-api al crear la oferta
 * (HerramientaDeOfrecerSoporte, Str::uuid()), así que es el mismo en cualquier dispositivo y en cada
 * reintento: SupportMessageController::store → mensaje_reintentado() deduplica por él
 * (`support_messages.uuid`, UNIQUE) y devuelve el mensaje que ya existe. Nunca se deriva del id del
 * mensaje: el admin guarda ese uuid UNIQUE entre TODOS los clientes y los ids se repiten entre
 * instancias. Sin uuid (una respuesta de una API anterior) no hay envío: el botón no se muestra.
 *
 * @param {Object|null} oferta El adjunto `{ tipo: 'soporte', texto, uuid }`.
 * @returns {String|null}
 */
export function uuid_de_la_oferta(oferta) {
	const uuid = oferta && typeof oferta.uuid === 'string' ? oferta.uuid.trim() : ''
	return FORMATO_UUID.test(uuid) ? uuid.toLowerCase() : null
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
 * @param {String} uuid El de la oferta (uuid_de_la_oferta).
 * @returns {Boolean}
 */
export function ya_enviado(uuid) {
	if (!uuid) return false
	try {
		return window.localStorage.getItem(CLAVE_ENVIADO + uuid) === '1'
	} catch (e) {
		return false
	}
}

function marcar_enviado(uuid) {
	try {
		window.localStorage.setItem(CLAVE_ENVIADO + uuid, '1')
	} catch (e) {
		// Sin almacenamiento el botón igual queda «Enviado a Soporte» mientras siga en pantalla.
	}
}

/**
 * Abre la pestaña Soporte y manda la pregunta como mensaje del lead.
 *
 * @param {Object} componente El que tocó el botón: da `$store`.
 * @param {Object} oferta El adjunto `{ tipo: 'soporte', texto, uuid }`.
 * @returns {Promise<String>} 'enviado' | 'cancelado' | 'error'
 */
export function seguir_con_soporte(componente, oferta) {
	const store = componente.$store
	const contenido = oferta && typeof oferta.texto === 'string' ? oferta.texto.trim() : ''
	const mensaje_uuid = uuid_de_la_oferta(oferta)
	if (!contenido || !mensaje_uuid) return Promise.resolve('error')
	if (ya_enviado(mensaje_uuid)) return Promise.resolve('enviado')
	if (en_curso[mensaje_uuid] || store.state.support_message.sending) return Promise.resolve('cancelado')
	en_curso[mensaje_uuid] = true

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
					marcar_enviado(mensaje_uuid)
					// Sin conversación abierta, el envío creó una: se la deja elegida, como Soporte.vue::enviar.
					if (id == null && modelo.support_ticket_id) {
						store.dispatch('support_message/loadTicketMessages', { id: modelo.support_ticket_id, agentes: true })
					}
					return 'enviado'
				})
		})
		.catch(function () { return 'error' })
		.then(function (resultado) {
			delete en_curso[mensaje_uuid]
			return resultado
		})
}
