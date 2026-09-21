/**
 * Partir el texto de un mensaje del asistente en tramos de texto plano y texto en negrita
 * (misión burbujas-y-negrita-asistente-ia, 21/9/2026).
 *
 * 🔴 ESTO EXISTE JUSTAMENTE PARA NO USAR `v-html`. `AsistenteIaService` le pide a la IA texto
 * plano (D43, `informes/20260815-chat-ia-y-modulo-ia.md`) pero igual llegan respuestas con
 * `**negrita**` de markdown estándar. En vez de sanitizar e inyectar HTML, se corta el string en
 * tramos y la plantilla los pinta con la interpolación normal `{{ }}`, que ya escapa — mismo
 * camino que `menciones.js` para las menciones de cliente/artículo.
 *
 * Solo se interpreta `**...**`. Ningún otro símbolo de markdown (`#`, `_cursiva_`, listas con
 * `-`) se toca: sale tal cual llegó. Un asterisco doble que abre sin cerrar no forma negrita —se
 * deja como texto suelto, asteriscos incluidos— para no comerse contenido real que use `**` por
 * otro motivo (ninguna reescritura basada en heurística vale más que mostrar lo que la IA mandó).
 *
 * @param {String} texto Un tramo de texto (ya cortado por `segmentar_menciones`, o el mensaje
 * entero si no tiene menciones).
 * @returns {Array<{texto: String, negrita: Boolean}>} Concatenar los `texto` de vuelta da el
 * mismo string de entrada MENOS los pares de asteriscos que sí formaron negrita — es lo único que
 * se descarta, a propósito: son marcas de formato, no contenido.
 */
export function segmentar_negrita(texto) {
	if (typeof texto != 'string' || !texto) {
		return [{ texto: texto || '', negrita: false }]
	}

	let PATRON_NEGRITA = /\*\*(.+?)\*\*/g
	let segmentos = []
	let cursor = 0
	let match = PATRON_NEGRITA.exec(texto)

	while (match !== null) {
		if (match.index > cursor) {
			segmentos.push({ texto: texto.slice(cursor, match.index), negrita: false })
		}
		// "****" (contenido vacío entre los asteriscos) no resalta nada: se deja tal cual.
		if (match[1].length) {
			segmentos.push({ texto: match[1], negrita: true })
		} else {
			segmentos.push({ texto: match[0], negrita: false })
		}
		cursor = match.index + match[0].length
		match = PATRON_NEGRITA.exec(texto)
	}

	if (cursor < texto.length) {
		segmentos.push({ texto: texto.slice(cursor), negrita: false })
	}

	return segmentos
}

export default {
	segmentar_negrita,
}
