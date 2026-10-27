/**
 * Textos y cuentas chicas de la sub-solapa Alertas → Catálogo → Medidas (misión
 * medidas-masivas-catalogo, 27/10/2026).
 *
 * La API manda CÓDIGOS (estados, motivos, criterios, alcances) y este archivo es el único lugar donde
 * se traducen a lo que lee el comerciante. Así la tabla, el detalle y el modal dicen lo mismo con las
 * mismas palabras, y si mañana la API suma un código nuevo se ve igual —humanizado— sin tocar ningún
 * componente.
 *
 * 🔴 Estos textos los lee un cliente: van con acentos, sin jerga ("a revisar", "sin datos") y sin
 * emojis. Los comentarios pueden ser técnicos; las etiquetas, no.
 *
 * 🔴 Dos palabras, dos cosas (igual que en Imágenes). La CORRIDA entera —una fila de la tabla, con su
 * detalle— es una "búsqueda de medidas". BÚSQUEDA a secas es cada consulta al buscador de internet
 * (Serper), que es lo que se cuenta y se cobra. Para no mezclar las dos, el encabezado habla de
 * "consultas" al buscador.
 */

import { numero_es as numero_con_decimales } from '@/common-vue/helpers/formato_numero'
import { entero_es, a_numero } from '@/utils/medidas_de_catalogo'

export { entero_es }

/** De dónde salió la corrida. */
export const ORIGENES = {
	catalogo: 'Todo el catálogo',
	seleccion: 'Selección del listado',
}

/** Estado de la corrida entera. */
export const ESTADOS = {
	pendiente: 'En espera',
	en_proceso: 'En curso',
	terminada: 'Terminada',
	detenida: 'Detenida',
	fallida: 'Se cortó',
}

/** Por qué criterio se buscó (o se intentó buscar) cada artículo. */
export const CRITERIOS = {
	codigo_de_barras: 'Código de barras',
	codigo_proveedor: 'Código de proveedor',
	nombre: 'Nombre',
}

/**
 * Qué tipo de medidas eran las que encontró la búsqueda (`alcance` de cada campo): decisión D4 del
 * plan, cualquier dato sirve, pero se dice de cuál se trata.
 */
export const ALCANCES = {
	producto: 'Medidas del producto',
	envio: 'Medidas del envío',
	embalaje: 'Medidas del embalaje',
	caja: 'Medidas de la caja',
	paquete: 'Medidas del paquete',
}

/** Motivo principal de un artículo, de las tres solapas. Los códigos no se pisan entre solapas. */
export const MOTIVOS = {
	// A revisar (decisiones D1 y D2 del plan)
	variante_dudosa: 'Variante dudosa',
	medidas_parciales: 'Medidas parciales',
	coincidencia_por_nombre: 'Coincidencia por nombre',
	coincidencia_probable: 'Coincidencia probable',
	// Asignada sola (D1): el código del artículo está en la página y trae las cuatro medidas.
	codigo_exacto: 'Código exacto',
	// Sin datos (D3)
	sin_resultados: 'Sin resultados',
	sin_datos_del_articulo: 'Faltan datos del artículo',
	ia_sin_respuesta: 'La IA no respondió',
	no_coincide: 'No era el producto',
	sin_medidas_en_la_pagina: 'La página no trae medidas',
	sin_cupo: 'Sin búsquedas disponibles',
	error_de_busqueda: 'Error al buscar',
	error_interno: 'Error al procesar',
	articulo_borrado: 'Artículo borrado',
	// Resueltos a mano
	rechazada: 'Propuesta rechazada',
	quitada: 'Medidas quitadas',
	// No es una falla: cuando le tocó el turno, el artículo ya tenía todas las medidas.
	ya_tenia_medidas: 'Ya tenía medidas',
	en_otra_corrida: 'Esperando revisión en otra búsqueda',
}

/**
 * Motivos que piden mirar el artículo o que son un problema del sistema o del cupo: van en ámbar.
 * Todo lo que no está acá va en gris (incluye los códigos que la SPA todavía no conoce).
 */
export const MOTIVOS_DE_AVISO = [
	'variante_dudosa',
	'medidas_parciales',
	'coincidencia_por_nombre',
	'coincidencia_probable',
	'sin_cupo',
	'error_de_busqueda',
	'ia_sin_respuesta',
	'error_interno',
]

/** Por qué se descartó una página leída (diagnóstico de "Sin datos"). */
export const MOTIVOS_DE_DESCARTE = {
	sin_el_codigo: 'No traía el código del artículo',
	no_tiene_el_codigo: 'No traía el código del artículo',
	otro_producto: 'Era otro producto',
	no_coincide: 'No era el producto',
	sin_medidas: 'No traía medidas',
	sin_medidas_en_la_pagina: 'No traía medidas',
	no_descargable: 'No se pudo abrir',
	no_es_html: 'No era una página web',
	es_pdf: 'Era un PDF (no se leen)',
	valores_invalidos: 'Los valores no coincidían con la cita',
	repetida: 'Repetida',
	no_evaluada: 'No se llegó a leer',
}

/** Cómo terminó cada plan de búsqueda (`resultado` del diagnóstico). */
export const RESULTADOS_DE_PLAN = {
	sin_resultados: 'El buscador no devolvió resultados.',
	tope_demo: 'No se buscó: se llegó al tope de consultas de la demo.',
	error_de_busqueda: 'El buscador falló.',
	sin_paginas: 'Ninguna de las páginas servía para leer las medidas.',
	ia_sin_respuesta: 'La IA no respondió.',
	otro_producto: 'La IA dijo que las páginas eran de otro producto.',
	sin_medidas: 'Las páginas no traían medidas que se pudieran validar.',
	datos: 'Se encontraron medidas.',
}

/** Qué tan seguro estaba la IA de que la página era el mismo producto (`match`). */
export const COINCIDENCIAS_DE_LA_IA = {
	exacto: 'el mismo producto',
	probable: 'probablemente el mismo producto',
	variante_distinta: 'una variante o presentación distinta',
	otro_producto: 'otro producto',
}

/** Textos de las pantallas (títulos, ayudas, estados vacíos). */
export const TEXTOS = {
	intro: 'Cada búsqueda de medidas queda acá. Abrí una para ver qué peso y medidas se encontraron en internet, qué quedó para revisar y de qué artículos no se pudo sacar nada. Las consultas son las que se le hicieron al buscador.',
	boton_catalogo: 'Buscar peso y medidas de todo el catálogo',
	no_disponible: {
		titulo: 'Esta pantalla todavía no está disponible',
		pista: 'Tu sistema todavía no tiene la búsqueda de peso y medidas, o todavía no está activada para tu negocio. Aparece sola cuando esté lista.',
	},
	sin_corridas: {
		titulo: 'Todavía no hay búsquedas de medidas',
		pista: 'Cuando se busquen el peso y las medidas de tus artículos, cada búsqueda queda acá: qué se encontró, qué conviene revisar y de qué artículos no se pudo sacar nada.',
	},
	error_corridas: {
		titulo: 'No pudimos traer las búsquedas de medidas',
		pista: 'Revisá la conexión y volvé a intentar.',
	},
	nota_a_revisar: 'Estas medidas todavía no están cargadas en los artículos: se cargan recién cuando las aprobás. Solo se completan los campos que el artículo tiene vacíos.',
	nota_asignadas: 'Estas medidas ya se cargaron en el artículo. Si alguna no te convence, podés quitarla.',
	nota_sin_datos: 'No se encontró nada confiable para estos artículos. Abrí «Ver qué se probó» para ver las consultas y las páginas que se leyeron.',
}

/**
 * "sin_resultados" -> "Sin resultados". Para un código que la SPA todavía no conoce: mejor eso que
 * mostrar el código crudo.
 *
 * @param {String} clave
 * @returns {String}
 */
export function humanizar(clave) {
	let texto = String(clave || '').replace(/_/g, ' ').trim()
	if (!texto) {
		return ''
	}
	return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Busca un código en un mapa de textos (con `hasOwnProperty`, así un código como "constructor" no
 * encuentra propiedades heredadas de Object); si no está, lo humaniza.
 *
 * @param {Object} mapa Uno de los mapas de este archivo.
 * @param {String} clave Código que mandó la API.
 * @returns {String}
 */
export function texto_de(mapa, clave) {
	if (clave === null || typeof clave === 'undefined' || clave === '') {
		return ''
	}
	if (Object.prototype.hasOwnProperty.call(mapa, clave)) {
		return mapa[clave]
	}
	return humanizar(clave)
}

/**
 * True si la corrida todavía corre (o espera su turno en la cola).
 *
 * @param {Object} corrida RunPayload normalizado.
 * @returns {Boolean}
 */
export function esta_activa(corrida) {
	return !!corrida && (corrida.status === 'pendiente' || corrida.status === 'en_proceso')
}

/**
 * Porcentaje entero de artículos procesados, o null si todavía no se sabe el total.
 *
 * @param {Object} corrida RunPayload normalizado.
 * @returns {Number|null}
 */
export function porcentaje_de(corrida) {
	if (!corrida) {
		return null
	}
	let total = a_numero(corrida.total)
	if (!total) {
		return null
	}
	let procesados = a_numero(corrida.procesados)
	return Math.max(0, Math.min(100, Math.round(procesados * 100 / total)))
}

/**
 * Un conteo de la corrida como número, con cero si no vino.
 *
 * @param {Object} conteos `conteos` de un RunPayload o de la respuesta de items.
 * @param {String} clave asignadas | a_revisar | sin_datos | pendientes | errores
 * @returns {Number}
 */
export function conteo(conteos, clave) {
	if (!conteos || typeof conteos !== 'object') {
		return 0
	}
	return a_numero(conteos[clave])
}

/**
 * Qué se buscó en una corrida: "Todo el catálogo" y, si fue solo con stock, "solo con stock".
 *
 * @param {Object} corrida RunPayload normalizado.
 * @returns {String}
 */
export function texto_de_alcance_de_la_corrida(corrida) {
	if (!corrida) {
		return ''
	}
	let origen = texto_de(ORIGENES, corrida.origen)
	return corrida.solo_con_stock ? origen + ' · solo con stock' : origen
}

/**
 * Consultas por artículo con dos decimales es-AR ("2,10"), o '' si no hay artículos procesados.
 *
 * @param {Object} corrida RunPayload normalizado.
 * @returns {String}
 */
export function consultas_por_articulo(corrida) {
	if (!corrida || !a_numero(corrida.procesados)) {
		return ''
	}
	return numero_con_decimales(a_numero(corrida.busquedas) / a_numero(corrida.procesados), 2)
}

/**
 * La línea de consultas de una corrida: "1.830 · 2,10 por artículo". Sin artículos procesados, solo
 * el total.
 *
 * @param {Object} corrida RunPayload normalizado.
 * @returns {String}
 */
export function texto_de_consultas(corrida) {
	if (!corrida) {
		return ''
	}
	let total = entero_es(corrida.busquedas)
	let promedio = consultas_por_articulo(corrida)
	return promedio ? total + ' · ' + promedio + ' por artículo' : total
}

/**
 * "1 consulta" / "3 consultas" (y "Sin consultas" en cero), para la línea de cada artículo.
 *
 * @param {Number} cantidad
 * @returns {String}
 */
export function consultas_del_articulo(cantidad) {
	let numero = a_numero(cantidad)
	if (!numero) {
		return 'Sin consultas'
	}
	return entero_es(numero) + (numero === 1 ? ' consulta' : ' consultas')
}

/**
 * Minutos estimados a texto: "45 min", "11 h", "11 h 7 min".
 *
 * @param {Number} minutos
 * @returns {String}
 */
export function duracion_en_texto(minutos) {
	let total = Math.round(a_numero(minutos))
	if (total < 60) {
		return total + ' min'
	}
	let horas = Math.floor(total / 60)
	let resto = total % 60
	return horas + ' h' + (resto ? ' ' + resto + ' min' : '')
}

/**
 * Dólares con dos decimales es-AR ("7,50").
 *
 * @param {Number} valor
 * @returns {String}
 */
export function dolares_en_texto(valor) {
	return numero_con_decimales(a_numero(valor), 2)
}
