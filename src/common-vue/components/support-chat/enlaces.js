/**
 * Encontrar las direcciones web (http/https) adentro del texto de un mensaje del chat, para que
 * el dueño las pueda tocar en vez de copiarlas a mano (E10 de la prueba con cliente gruñón, ronda 5,
 * 14/11/2026: «Acá se ve cómo se hace: https://recursos…» y el enlace de la encuesta de la prueba
 * llegaban como texto muerto).
 *
 * 🔴 ESTO NO ARMA HTML. El chat pinta texto plano por decisión (D43: cero `v-html` con nada que venga
 * del API o de la IA). Acá solo se calculan RANGOS sobre el string; la plantilla dibuja cada enlace
 * con `<a :href target="_blank" rel="noopener noreferrer">{{ texto }}</a>` y la interpolación normal
 * de Vue, que escapa. Ningún pedazo del mensaje se inyecta como HTML en ningún punto.
 *
 * Las reglas:
 *
 *   1. Solo `http://` y `https://`, escritos al principio de la dirección. Un dominio pelado
 *      («comerciocity.com») no se enlaza, ni `javascript:`, `data:`, `mailto:` ni nada más: el
 *      esquema lo exige la regex Y lo vuelve a comprobar `new URL()` (protocolo y host no vacío), así
 *      que una dirección que el navegador no entiende como http(s) queda como texto.
 *   2. La dirección empieza en el borde de una palabra: «xhttps://…» no es un enlace, y tampoco la
 *      que viene pegada a otra cosa con `: / @ . -` («javascript:https://…», «x.https://…»): eso es
 *      parte de otro texto, no una dirección que alguien escribió para que se toque.
 *   3. La puntuación de cierre pegada al final NO es parte del enlace: `. , ; : ! ? » " ' …` y los
 *      `)` / `]` que no tienen su par de apertura adentro de la dirección («(ver https://x.com/a)» deja
 *      el paréntesis afuera; «https://es.wikipedia.org/wiki/Foo_(bar)» lo conserva).
 *   4. Corta en espacios, comillas dobles, `< >`, `« »`, la comilla invertida y el asterisco. El
 *      asterisco es a propósito: es la marca de negrita (`**…**`, formato.js) y una dirección escrita
 *      en negrita tiene que terminar donde empiezan los asteriscos de cierre.
 *   6. El host que se lee es el que se abre: no se enlaza una dirección con usuario o clave
 *      («https://bueno.com@malo.com»), con caracteres invisibles o de dirección de escritura, ni
 *      una cuyo host `new URL` traduce a otro (puntos de otros alfabetos, `%2E`, dominios con eñe
 *      o acentos, que pasan a punycode). Tampoco una de más de LARGO_MAXIMO caracteres.
 *   5. El texto visible es la dirección tal cual se escribió (sin acortar), y el `href` es ese mismo
 *      texto: no se normaliza con `URL.href` para que lo que se ve sea exactamente lo que se abre.
 *
 * Son funciones puras, sin Vue ni DOM: las prueba tests/agentes-enlaces-en-mensajes.test.cjs.
 */

// Candidato: el esquema y todo lo que siga hasta un carácter que no puede ir sin codificar en una
// dirección (o que, en el chat, cierra una frase o una negrita). La puntuación final se recorta
// después, porque adentro de la dirección sí puede ir («?v=T6.16», «a,b»).
const PATRON_CANDIDATO = /https?:\/\/[^\s<>"«»`*]+/gi

// `…` también: «https://x.com/a…» es una frase que sigue, no parte de la dirección.
const PUNTUACION_FINAL = '.,;:!?»"\'…'

const PARES = { ')': '(', ']': '[' }

// Tope de largo de un candidato: una dirección real del chat no pasa de unos cientos de
// caracteres. Más larga que esto queda como texto: no se valida ni se recorta, y así ninguna
// entrada armada a propósito puede hacer trabajar de más a cada re-render.
export const LARGO_MAXIMO = 2048

// Invisibles y de dirección de escritura (bidi): controles C0 y C1, los de ancho cero
// (U+200B–U+200F), los embebidos/overrides bidi (U+202A–U+202E), los aislados bidi y el joiner
// de palabra (U+2060–U+2069) y el BOM (U+FEFF). Con cualquiera de ellos lo que se ve no es lo que
// se abre, así que la dirección entera queda como texto.
const CARACTERES_INVISIBLES = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/

/**
 * Le saca a un candidato la puntuación de cierre que pertenece a la frase y no a la dirección
 * (regla 3). Repite hasta que no quede nada que sacar: «https://x.com/a).» pierde el punto y
 * después el paréntesis.
 *
 * 🔴 LINEAL a propósito (revisión de E10): las aperturas y cierres de paréntesis y corchetes se
 * cuentan UNA vez y se descuentan a medida que se recorta, y el string se corta una sola vez al
 * final. Contar con `split` en cada vuelta (como se hizo primero) era cuadrático: 50.000 «)»
 * pegados congelaban el navegador más de un minuto.
 *
 * @param {String} candidato
 * @returns {String}
 */
function recortar_puntuacion(candidato) {
	let cuenta = { '(': 0, ')': 0, '[': 0, ']': 0 }
	for (let i = 0; i < candidato.length; i++) {
		let caracter = candidato.charAt(i)
		if (Object.prototype.hasOwnProperty.call(cuenta, caracter)) {
			cuenta[caracter]++
		}
	}
	let fin = candidato.length
	while (fin > 0) {
		let ultimo = candidato.charAt(fin - 1)
		if (PUNTUACION_FINAL.indexOf(ultimo) !== -1) {
			fin--
			continue
		}
		let apertura = PARES[ultimo]
		if (apertura && cuenta[apertura] < cuenta[ultimo]) {
			cuenta[ultimo]--
			fin--
			continue
		}
		break
	}
	return candidato.slice(0, fin)
}

/**
 * true si el navegador entiende la dirección como http(s) y abriría EXACTAMENTE el host que se
 * lee (reglas 1 y 6).
 *
 * @param {String} direccion
 * @returns {Boolean}
 */
export function es_direccion_web(direccion) {
	// Después de `//` tiene que venir el host: «http:///x» el navegador lo «arregla» a otro host
	// distinto del que se ve, así que no se enlaza.
	if (typeof direccion != 'string' || direccion.length > LARGO_MAXIMO || !/^https?:\/\/[^/\\]/i.test(direccion)) {
		return false
	}
	if (CARACTERES_INVISIBLES.test(direccion)) {
		return false
	}
	// La autoridad tal como se escribió: lo que va entre `//` y el primer `/`, `?` o `#`.
	let despues = direccion.slice(direccion.indexOf('//') + 2)
	let autoridad = despues.split(/[/?#\\]/)[0]
	// Usuario y clave («https://bueno.com@malo.com»): el host real es el de después del `@`, y lo
	// que se lee primero es otro. Nunca se enlaza.
	if (autoridad.indexOf('@') !== -1) {
		return false
	}
	let url
	try {
		url = new URL(direccion)
	} catch (error) {
		return false
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return false
	}
	if (url.hostname === '' || url.username !== '' || url.password !== '') {
		return false
	}
	// El host que se escribió (sin el puerto) tiene que ser el mismo que abre el navegador. Si
	// `new URL` lo traduce («x.com。y» → «x.com.y», un `%2E`, un dominio con eñe o acentos que pasa
	// a punycode) la dirección no se enlaza: ante la duda, texto.
	let host_escrito = autoridad.toLowerCase()
	if (host_escrito.charAt(0) !== '[') {
		host_escrito = host_escrito.replace(/:[0-9]*$/, '')
	} else {
		host_escrito = host_escrito.replace(/^(\[[^\]]*\])(:[0-9]*)?$/, '$1')
	}
	return url.hostname === host_escrito
}

/**
 * Los rangos [inicio, fin) de cada dirección web del texto, sobre las posiciones del string
 * original. No se solapan entre sí y salen en orden.
 *
 * @param {*} texto
 * @returns {Array<{inicio: Number, fin: Number, href: String}>}
 */
export function rangos_de_enlaces(texto) {
	if (typeof texto != 'string' || !texto) {
		return []
	}
	let rangos = []
	let patron = new RegExp(PATRON_CANDIDATO.source, PATRON_CANDIDATO.flags)
	let match = patron.exec(texto)
	while (match !== null) {
		let inicio = match.index
		let anterior = inicio > 0 ? texto.charAt(inicio - 1) : ''
		// Regla 2: pegado a una letra, un número o `: / @ . -` no es el comienzo de una dirección.
		// El tope de largo va ANTES de recortar: un candidato enorme ni se recorre.
		if (!/[A-Za-z0-9_:\/@.-]/.test(anterior) && match[0].length <= LARGO_MAXIMO) {
			let direccion = recortar_puntuacion(match[0])
			if (es_direccion_web(direccion)) {
				rangos.push({ inicio: inicio, fin: inicio + direccion.length, href: direccion })
			}
		}
		match = patron.exec(texto)
	}
	return rangos
}

/**
 * Partir un texto en tramos sueltos y tramos de enlace. Concatenar los `texto` devuelve el mismo
 * string de entrada, sin perder ni agregar nada.
 *
 * @param {*} texto
 * @returns {Array<{texto: String, enlace: String|null}>}
 */
export function segmentar_enlaces(texto) {
	if (typeof texto != 'string' || !texto) {
		return []
	}
	let tramos = []
	let cursor = 0
	rangos_de_enlaces(texto).forEach(function (rango) {
		if (rango.inicio > cursor) {
			tramos.push({ texto: texto.slice(cursor, rango.inicio), enlace: null })
		}
		tramos.push({ texto: texto.slice(rango.inicio, rango.fin), enlace: rango.href })
		cursor = rango.fin
	})
	if (cursor < texto.length) {
		tramos.push({ texto: texto.slice(cursor), enlace: null })
	}
	return tramos
}

export default {
	LARGO_MAXIMO,
	es_direccion_web,
	rangos_de_enlaces,
	segmentar_enlaces,
}
