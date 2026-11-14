// El aviso antes de seguir en el sistema una conversación que empezó en WhatsApp.
//
// Lo usan dos pestañas de Agentes: el Asistente personal (Panel.vue) y Soporte (Soporte.vue). La lógica y
// los botones son los mismos; cambia solo el texto. El de Soporte se reescribió en la misión
// prueba-e2e-campana-imperio (11/11/2026): el negocio en prueba llega a esa conversación recién entrado al
// sistema, y «seguirá únicamente en el sistema» no le decía qué iba a pasar con las respuestas.
const TEXTOS = {
	asistente: {
		cuerpo: 'Al enviar, esta conversación seguirá únicamente en el sistema, incluso si cerrás sesión. Tu historial queda acá.',
		titulo: '¿Seguir esta conversación en el sistema?',
		aceptar: 'Continuar y enviar',
	},
	soporte: {
		cuerpo: 'Vas a seguir hablando con Soporte desde tu sistema. Las respuestas te van a llegar acá, no por WhatsApp. Lo que ya hablaron queda guardado.',
		titulo: '¿Seguimos por acá?',
		aceptar: 'Sí, enviar',
	},
}

/**
 * @param {Object} componente El que pregunta: da `$bvModal`.
 * @param {String} [canal] 'soporte' para la conversación con Soporte; sin él, el texto del Asistente personal.
 * @returns {Promise<Boolean|null>} Lo que resuelve msgBoxConfirm: true si aceptó.
 */
export function confirmar_traspaso(componente, canal) {
	const textos = TEXTOS[canal] || TEXTOS.asistente
	return componente.$bvModal.msgBoxConfirm(
		textos.cuerpo,
		{
			id: 'agentes-confirmar-traspaso',
			title: textos.titulo,
			okTitle: textos.aceptar,
			cancelTitle: 'Cancelar',
			centered: true,
		}
	)
}
