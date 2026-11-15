import { segmentar_menciones } from '@/components/asistente-ia/menciones'
import { rangos_de_enlaces } from '@/common-vue/components/support-chat/enlaces'

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
 * TERCERA CAPA, ENLACES (E10, 14/11/2026): las direcciones http(s) del texto (`enlaces.js`, con sus
 * reglas de esquema y puntuación final) se resuelven sobre el MISMO string y aportan sus bordes a los
 * puntos de corte, igual que las otras dos capas. Una hoja que cae adentro de una dirección lleva su
 * `enlace` (el href) y la plantilla la dibuja como `<a>` con interpolación — sigue sin haber HTML
 * armado en ningún lado. Una dirección que se pisa con una mención NO se enlaza (la mención ya es un
 * tramo especial, con su propio clic y su ficha). Una dirección en negrita sí: la hoja es enlace y
 * negrita a la vez, porque la dirección nunca incluye un asterisco (regla 4 de `enlaces.js`).
 *
 * Solo se interpreta `**...**`. Ningún otro símbolo de markdown (`#`, `_cursiva_`, listas con
 * `-`) se toca: sale tal cual llegó. Un asterisco doble que abre sin cerrar no forma negrita
 * —se deja como texto suelto, asteriscos incluidos— para no comerse contenido real que use
 * `**` por otro motivo.
 *
 * @param {*} contenido El `contenido` del mensaje (si no es string, se trata como vacío).
 * @param {*} menciones El array `menciones` del mensaje (si no viene, no hay mención alguna).
 * @returns {Array<{texto: String, mencion: Object|null, negrita: Boolean, enlace: String|null}>} Concatenar los
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

	// Rangos de enlace: se descartan los que se pisan con una mención (la mención gana siempre,
	// es un tramo especial con su propio comportamiento). Con la negrita no pueden cruzarse a
	// medias: la dirección corta antes de cualquier asterisco.
	// Los dos conjuntos están ordenados: un cursor sobre las menciones que solo avanza (lineal).
	let indice_mencion = 0
	let enlaces = rangos_de_enlaces(texto).filter(function (enlace) {
		while (indice_mencion < rangos_mencion.length && rangos_mencion[indice_mencion].fin <= enlace.inicio) {
			indice_mencion++
		}
		let rango = rangos_mencion[indice_mencion]
		return !(rango && rango.inicio < enlace.fin)
	})
	enlaces.forEach(function (enlace) {
		puntos_de_corte.add(enlace.inicio)
		puntos_de_corte.add(enlace.fin)
	})

	let puntos = Array.from(puntos_de_corte).sort(function (a, b) {
		return a - b
	})

	// Los puntos de corte incluyen los bordes de TODOS los rangos (mención, marcador,
	// negrita), así que ningún rango puede empezar o terminar en la mitad de una hoja: el
	// punto de inicio de la hoja alcanza para saber si cae adentro de un rango o no.
	//
	// 🔴 Lineal (revisión de E10): cada conjunto de rangos está ordenado y sin solapamientos
	// propios, y las hojas se recorren en orden, así que cada conjunto lleva un cursor que solo
	// avanza. Buscar con `find` en cada hoja era cuadrático: un mensaje con miles de enlaces o
	// negritas tardaba segundos en cada re-render.
	function cursor_de(rangos) {
		let posicion = 0
		return function (punto) {
			while (posicion < rangos.length && rangos[posicion].fin <= punto) {
				posicion++
			}
			let rango = rangos[posicion]
			return rango && punto >= rango.inicio && punto < rango.fin ? rango : undefined
		}
	}
	let marcador_en = cursor_de(marcadores)
	let mencion_en = cursor_de(rangos_mencion)
	let enlace_en = cursor_de(enlaces)
	let negrita_en = cursor_de(negritas)

	let resultado = []
	for (let i = 0; i < puntos.length - 1; i++) {
		let inicio = puntos[i]
		let fin = puntos[i + 1]
		if (fin <= inicio) {
			continue
		}
		// Un marcador es borde de corte en sus dos puntas: la hoja que empieza adentro de uno está
		// entera adentro de él (lo mismo que preguntaba antes `inicio >= m.inicio && fin <= m.fin`).
		if (marcador_en(inicio)) {
			continue
		}
		let mencion = mencion_en(inicio)
		let enlace = enlace_en(inicio)
		resultado.push({
			texto: texto.slice(inicio, fin),
			mencion: mencion ? mencion.mencion : null,
			negrita: !!negrita_en(inicio),
			enlace: enlace ? enlace.href : null,
		})
	}

	return resultado
}

export default {
	segmentar_mensaje,
}
