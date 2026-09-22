import { segmentar_menciones } from '@/components/asistente-ia/menciones'

/**
 * Partir el contenido de un mensaje del asistente en las hojas finales para pintar, cruzando
 * MENCIONES (`menciones.js`) y NEGRITA (`**...**` de markdown estándar) como dos capas
 * independientes sobre el mismo string (misión burbujas-y-negrita-asistente-ia, 21/9/2026).
 *
 * 🔴 ESTO EXISTE JUSTAMENTE PARA NO USAR `v-html`. `AsistenteIaService` le pide a la IA texto
 * plano (D43, `informes/20260815-chat-ia-y-modulo-ia.md`) pero igual llegan respuestas con
 * negrita de markdown. En vez de sanitizar e inyectar HTML, se corta el string en tramos y la
 * plantilla los pinta con la interpolación normal `{{ }}`, que ya escapa.
 *
 * 🔴 Por qué NO alcanza con negrita-adentro-de-cada-segmento-de-mención (lo que se probó
 * primero y falló en la verificación manual): si el asterisco de apertura cae en el tramo de
 * texto ANTES de una mención y el de cierre en el tramo de DESPUÉS —"El cliente **Juan Pérez
 * debe**", con "Juan Pérez" marcado como mención adentro de la negrita— cada tramo aislado ve
 * un solo asterisco suelto, ninguno arma el par, y los dos `**` quedan pegados en pantalla:
 * exactamente lo que Lucas pidió que no pase. La única forma de garantizar que ningún
 * asterisco de formato llegue a verse es resolver los dos rangos (mención y negrita) sobre el
 * MISMO string completo antes de cortar nada.
 *
 * Cómo se resuelve: se calculan los rangos de mención (reconstruidos a partir de
 * `segmentar_menciones`, que ya resuelve solapamientos ENTRE menciones) y los rangos de
 * negrita (directo del regex, que ya avanza de a un match y no se solapa consigo mismo) sobre
 * las mismas posiciones del string original. Se juntan todos los puntos de corte de los dos
 * conjuntos, se parte el string en las hojas mínimas entre esos puntos, y cada hoja consulta
 * INDEPENDIENTEMENTE si cae adentro de una mención y si cae adentro de una negrita — las dos
 * cosas pueden ser ciertas a la vez (un nombre de cliente en negrita) sin que ninguna le gane a
 * la otra. Los asteriscos de apertura y cierre nunca forman parte de ninguna hoja: se
 * descartan siempre, caigan donde caigan.
 *
 * Solo se interpreta `**...**`. Ningún otro símbolo de markdown (`#`, `_cursiva_`, listas con
 * `-`) se toca: sale tal cual llegó. Un asterisco doble que abre sin cerrar no forma negrita
 * —se deja como texto suelto, asteriscos incluidos— para no comerse contenido real que use
 * `**` por otro motivo.
 *
 * @param {*} contenido El `contenido` del mensaje (si no es string, se trata como vacío).
 * @param {*} menciones El array `menciones` del mensaje (si no viene, no hay mención alguna).
 * @returns {Array<{texto: String, mencion: Object|null, negrita: Boolean}>} Concatenar los
 * `texto` de vuelta da el mismo string de entrada MENOS los pares de asteriscos que formaron
 * negrita — es lo único que se descarta, a propósito: son marcas de formato, no contenido.
 */
export function segmentar_mensaje(contenido, menciones) {
	let texto = typeof contenido == 'string' ? contenido : ''
	if (!texto) {
		return []
	}

	// Rango [inicio, fin) de cada mención, reconstruido caminando la concatenación de
	// segmentar_menciones (que ya resuelve solapamientos entre menciones, regla 4 de su
	// propio contrato): así no hay que reimplementar ese cálculo acá.
	let cursor = 0
	let rangos_mencion = []
	segmentar_menciones(texto, menciones).forEach(function (segmento) {
		let inicio = cursor
		let fin = cursor + segmento.texto.length
		if (segmento.mencion) {
			rangos_mencion.push({ inicio: inicio, fin: fin, mencion: segmento.mencion })
		}
		cursor = fin
	})

	// Rangos de negrita: `marcadores` son los DOS pares de asteriscos de cada match (se
	// descartan siempre) y `negritas` es lo que queda adentro (se resalta). "****" (sin
	// contenido adentro) no cuenta como negrita: no hay nada que resaltar, así que ni
	// siquiera se registra como marcador — se deja tal cual, igual que un asterisco suelto.
	let PATRON_NEGRITA = /\*\*(.+?)\*\*/g
	let puntos_de_corte = new Set([0, texto.length])
	let marcadores = []
	let negritas = []
	let match = PATRON_NEGRITA.exec(texto)
	while (match !== null) {
		let inicio_total = match.index
		let fin_total = match.index + match[0].length
		let inicio_interno = inicio_total + 2
		let fin_interno = fin_total - 2
		if (fin_interno > inicio_interno) {
			marcadores.push({ inicio: inicio_total, fin: inicio_interno })
			marcadores.push({ inicio: fin_interno, fin: fin_total })
			negritas.push({ inicio: inicio_interno, fin: fin_interno })
			puntos_de_corte.add(inicio_total)
			puntos_de_corte.add(inicio_interno)
			puntos_de_corte.add(fin_interno)
			puntos_de_corte.add(fin_total)
		}
		match = PATRON_NEGRITA.exec(texto)
	}
	rangos_mencion.forEach(function (rango) {
		puntos_de_corte.add(rango.inicio)
		puntos_de_corte.add(rango.fin)
	})

	let puntos = Array.from(puntos_de_corte).sort(function (a, b) {
		return a - b
	})

	// Los puntos de corte incluyen los bordes de TODOS los rangos (mención, marcador,
	// negrita), así que ningún rango puede empezar o terminar en la mitad de una hoja: el
	// punto de inicio de la hoja alcanza para saber si cae adentro de un rango o no.
	function rango_que_contiene(rangos, punto) {
		return rangos.find(function (rango) {
			return punto >= rango.inicio && punto < rango.fin
		})
	}

	let resultado = []
	for (let i = 0; i < puntos.length - 1; i++) {
		let inicio = puntos[i]
		let fin = puntos[i + 1]
		if (fin <= inicio) {
			continue
		}
		let es_marcador = marcadores.some(function (marcador) {
			return inicio >= marcador.inicio && fin <= marcador.fin
		})
		if (es_marcador) {
			continue
		}
		let mencion = rango_que_contiene(rangos_mencion, inicio)
		resultado.push({
			texto: texto.slice(inicio, fin),
			mencion: mencion ? mencion.mencion : null,
			negrita: !!rango_que_contiene(negritas, inicio),
		})
	}

	return resultado
}

export default {
	segmentar_mensaje,
}
