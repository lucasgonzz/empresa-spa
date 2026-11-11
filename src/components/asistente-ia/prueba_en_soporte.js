// La prueba gratuita vive en Soporte (misión prueba-e2e-campana-imperio, 11/11/2026).
//
// Mientras la prueba está vigente, Agentes abre en Soporte (y no en el Asistente personal), y Soporte abre
// sola la conversación de la prueba en vez de la pantalla vacía. Las dos reglas viven acá, sin Vue ni store,
// para que Anfitrion.vue y Soporte.vue pregunten lo mismo y para poder probarlas solas.

/**
 * ¿La prueba gratuita del usuario está vigente?
 *
 * 🔴 No alcanza con `prueba.activa`: cuando el negocio contrata, `vence_at` pasa a null y `activa` sigue en
 * true (el modo prueba dura hasta que importe sus datos). Vigente es «tiene vencimiento y no venció», lo
 * mismo que `PruebaHelper::en_periodo_vigente()` en la API. Un cliente real y una demo no traen `prueba`.
 *
 * @param {Object|null} user El usuario de la sesión (`auth.user`).
 * @returns {Boolean}
 */
export function prueba_vigente(user) {
	const prueba = user && user.prueba
	return !!(prueba && prueba.vence_at && !prueba.vencida)
}

/**
 * ¿Agentes tiene que abrir en Soporte? Con la prueba vigente y la pestaña Soporte disponible.
 *
 * @param {Object|null} user
 * @param {Boolean} puede_soporte Si la cuenta tiene la extensión `support_chat`.
 * @returns {Boolean}
 */
export function abre_en_soporte(user, puede_soporte) {
	return !!puede_soporte && prueba_vigente(user)
}

const NOMBRE_DE_LA_PRUEBA = /prueba\s+gratuita/i

/**
 * La conversación que Soporte abre sola al entrar durante la prueba, o null si hay que dejar la pantalla
 * vacía de siempre.
 *
 * Solo entre las ABIERTAS, del sistema o de WhatsApp (la de la prueba nace en WhatsApp y se ve en el
 * sistema). Con una sola, es esa. Con varias: la que tenga mensajes de Soporte sin leer; si ninguna los
 * tiene, la de la prueba (el admin la titula «Prueba gratuita»); y si tampoco se la reconoce, la de
 * actividad más reciente. `tickets` llega ordenado por último mensaje, lo más nuevo primero, que es como lo
 * deja el store `support_ticket`.
 *
 * @param {Array<Object>} tickets `support_ticket.models`.
 * @returns {Object|null}
 */
export function conversacion_de_la_prueba(tickets) {
	const abiertas = (tickets || []).filter(ticket => ticket && ticket.id != null && ticket.status === 'open')
	if (!abiertas.length) return null
	return abiertas.find(ticket => Number(ticket.unread_messages_count) > 0)
		|| abiertas.find(ticket => NOMBRE_DE_LA_PRUEBA.test(String(ticket.name || '')))
		|| abiertas[0]
}
