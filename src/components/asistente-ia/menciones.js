/**
 * Partir el texto de un mensaje del asistente en segmentos de texto suelto y menciones
 * (misión agente-ia-mano-derecha, §1 del contrato, 16/9/2026).
 *
 * 🔴 ESTO EXISTE JUSTAMENTE PARA NO USAR `v-html`. El chat pinta texto plano por decisión
 * (D43), repetida en `MessageBubble.vue`, `AccionCard.vue`, `ia/Informe.vue` y
 * `Conversation.vue`, y no hay ninguna librería de markdown en `package.json`. El API manda
 * las menciones ANOTADAS aparte —`[{ tipo, id, texto }]`— y acá se calculan los cortes; la
 * plantilla las dibuja con la interpolación normal `{{ }}`, que ya escapa. Ningún string que
 * venga del servidor se inyecta como HTML en ningún punto de este camino.
 *
 * `contenido` NO se toca: sale entero, partido en pedazos que concatenados vuelven a dar el
 * mismo string. Es lo que sostiene que una mención mal armada no rompa nada (regla 2) y que
 * la SPA vieja, que ignora `menciones`, muestre exactamente lo mismo.
 *
 * Las cinco reglas del contrato, y dónde vive cada una:
 *
 *   1. Las menciones anotan, no reemplazan  -> `segmentar_menciones()` corta y no sustituye.
 *   2. `texto` que no matchea se descarta en silencio -> el `indexOf` no encuentra nada y esa
 *      mención simplemente no aporta ningún rango. Sin `console.error`: un mensaje se lee
 *      igual de bien sin sus menciones, y ensuciar la consola del cliente no arregla nada.
 *   3. Se marcan TODAS las ocurrencias -> el `while` de `rangos_de_las_menciones()`.
 *   4. Sin solapamientos, gana la más larga -> el orden por largo descendente + la criba.
 *   5. Un `tipo` desconocido se ignora -> `TIPOS_CONOCIDOS` en `es_mencion_valida()`.
 *
 * Y la sexta, que no está numerada en el contrato pero es la de compatibilidad hacia atrás:
 * si `menciones` no viene (API viejo), se devuelve un único segmento con el texto plano de
 * siempre.
 *
 * 🔴 El matcheo es por literal exacto con `indexOf`, a propósito, y NO con una expresión
 * regular: los nombres de artículos y clientes reales traen paréntesis, corchetes, puntos,
 * signos de pregunta y barras ("LAMPARA 7W (PACK X10)", "Ferretería + Corralón"). Armar un
 * regex con eso adentro sin escapar revienta o —peor— matchea de más. Con `indexOf` no hay
 * nada que escapar.
 */

/**
 * Tipos de mención que esta SPA sabe dibujar. Cualquier otro se ignora y su texto se pinta
 * como texto normal (regla 5): es lo que permite que el API agregue un tipo nuevo sin que una
 * pestaña vieja muestre algo raro.
 *
 * @type {Array<String>}
 */
const TIPOS_CONOCIDOS = ['cliente', 'articulo']

/**
 * true si una mención del payload es utilizable.
 *
 * @param {*} mencion Un elemento del array `menciones` tal como vino del API.
 * @returns {Boolean}
 */
function es_mencion_valida(mencion) {
	if (!mencion || typeof mencion != 'object') {
		return false
	}
	if (TIPOS_CONOCIDOS.indexOf(mencion.tipo) == -1) {
		return false
	}
	if (mencion.id === null || typeof mencion.id == 'undefined' || mencion.id === '') {
		return false
	}
	return typeof mencion.texto == 'string' && mencion.texto.length > 0
}

/**
 * Los tramos de `texto` que quedan marcados, ya resuelto el solapamiento y ordenados de
 * izquierda a derecha.
 *
 * @param {String} texto El `contenido` del mensaje.
 * @param {*} menciones El array `menciones` del mensaje (puede no venir).
 * @returns {Array<Object>} [{ inicio, fin, mencion }] sin solaparse, ordenados por `inicio`.
 */
function rangos_de_las_menciones(texto, menciones) {
	if (!Array.isArray(menciones) || !menciones.length) {
		return []
	}

	// Todas las ocurrencias de todas las menciones válidas (regla 3). El cursor avanza el
	// largo de la aguja y no un carácter: una mención no se solapa consigo misma ("aa"
	// dentro de "aaa" es UNA ocurrencia, no dos).
	let candidatos = []
	menciones.forEach(function (mencion) {
		if (!es_mencion_valida(mencion)) {
			return
		}
		let aguja = mencion.texto
		let desde = 0
		let inicio = texto.indexOf(aguja, desde)
		while (inicio != -1) {
			candidatos.push({
				inicio: inicio,
				fin: inicio + aguja.length,
				mencion: mencion,
			})
			desde = inicio + aguja.length
			inicio = texto.indexOf(aguja, desde)
		}
	})

	if (!candidatos.length) {
		return []
	}

	// 🔴 Regla 4, y el orden importa: primero por LARGO descendente y recién después por
	// posición. Una criba de izquierda a derecha implementaría "gana la que empieza antes",
	// que no es lo mismo: con "Ferretería Tucumana" y "Tucumana SRL" pisándose en el medio,
	// la de izquierda a derecha se queda con la primera aunque sea la más corta. El contrato
	// dice que gana la más larga, que es la que nombra al modelo con menos ambigüedad.
	candidatos.sort(function (a, b) {
		let por_largo = (b.fin - b.inicio) - (a.fin - a.inicio)
		if (por_largo != 0) {
			return por_largo
		}
		return a.inicio - b.inicio
	})

	let elegidos = []
	candidatos.forEach(function (candidato) {
		let pisa = elegidos.some(function (elegido) {
			return candidato.inicio < elegido.fin && elegido.inicio < candidato.fin
		})
		if (!pisa) {
			elegidos.push(candidato)
		}
	})

	elegidos.sort(function (a, b) {
		return a.inicio - b.inicio
	})

	return elegidos
}

/**
 * Parte el contenido de un mensaje en segmentos para pintar.
 *
 * Concatenar los `texto` de todos los segmentos devuelve EXACTAMENTE `contenido`: no se
 * agrega, no se saca y no se reordena nada. Los saltos de línea quedan adentro de los
 * segmentos de texto suelto y los sigue dibujando el `white-space: pre-wrap` de la viñeta.
 *
 * @param {*} contenido El `contenido` del mensaje (si no es string, se trata como vacío).
 * @param {*} menciones El array `menciones` del mensaje (si no viene, todo es texto suelto).
 * @returns {Array<Object>} [{ texto, mencion }] con `mencion` null en el texto suelto.
 */
export function segmentar_menciones(contenido, menciones) {
	let texto = typeof contenido == 'string' ? contenido : ''
	if (!texto) {
		return []
	}

	let rangos = rangos_de_las_menciones(texto, menciones)
	if (!rangos.length) {
		return [{ texto: texto, mencion: null }]
	}

	let segmentos = []
	let cursor = 0
	rangos.forEach(function (rango) {
		if (rango.inicio > cursor) {
			segmentos.push({ texto: texto.slice(cursor, rango.inicio), mencion: null })
		}
		segmentos.push({ texto: texto.slice(rango.inicio, rango.fin), mencion: rango.mencion })
		cursor = rango.fin
	})
	if (cursor < texto.length) {
		segmentos.push({ texto: texto.slice(cursor), mencion: null })
	}

	return segmentos
}

export default {
	segmentar_menciones,
}
