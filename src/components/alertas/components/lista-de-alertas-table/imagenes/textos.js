import { separadores_es_desde_dato, numero_es as numero_con_decimales } from '@/common-vue/helpers/formato_numero'

/**
 * Textos y cuentas chicas de la solapa Alertas → Imágenes (misión imagenes-catalogo-completo,
 * 27/9/2026).
 *
 * La API manda CÓDIGOS (estados, motivos, criterios, resultado de cada candidata: contrato §5 del
 * plan) y este archivo es el único lugar donde se traducen a lo que lee el comerciante. Así la
 * tabla, el detalle, el aviso de fin de corrida y la píldora de procesos dicen lo mismo con las
 * mismas palabras, y si mañana la API suma un código nuevo se ve igual —humanizado— sin tocar
 * ningún componente.
 *
 * 🔴 Estos textos los lee un cliente: van con acentos, sin jerga ("búsquedas", "a revisar",
 * "fondo no blanco") y sin emojis. Los comentarios pueden ser técnicos; las etiquetas, no.
 */

/** De dónde salió la asignación. */
export const ORIGENES = {
	catalogo: 'Todo el catálogo',
	seleccion: 'Selección del listado',
	asistente: 'Pedido al asistente',
}

/** Estado de la asignación entera. */
export const ESTADOS = {
	pendiente: 'En espera',
	en_proceso: 'Buscando',
	terminada: 'Terminada',
	detenida: 'Detenida',
	fallida: 'Se cortó',
}

/** Por qué se buscó (o se intentó buscar) cada artículo. */
export const CRITERIOS = {
	codigo_de_barras: 'Código de barras',
	nombre: 'Nombre',
}

/**
 * Motivo principal de un artículo, tanto de "No asignadas" como de "A revisar". Los códigos no se
 * pisan entre las dos solapas (contrato §5.2), así que viven en un solo mapa.
 */
export const MOTIVOS = {
	// No asignadas
	sin_datos: 'Sin datos para buscar',
	sin_resultados: 'Sin resultados',
	imagenes_chicas: 'Imágenes muy chicas',
	no_descargables: 'No se pudieron descargar',
	no_corresponden: 'No eran el producto',
	error_de_busqueda: 'Error al buscar',
	sin_cupo: 'Sin búsquedas disponibles',
	error_interno: 'Error al procesar',
	articulo_borrado: 'Artículo borrado',
	rechazada: 'Imagen rechazada',
	quitada: 'Imagen quitada',
	// A revisar
	ia_dudosa: 'La IA no está segura',
	confianza_media: 'Coincidencia a medias',
	imagen_algo_chica: 'Imagen algo chica',
	marca_de_agua: 'Tiene marca de agua',
	texto_superpuesto: 'Tiene texto encima',
	collage: 'Varias fotos juntas',
	sin_validacion_ia: 'Sin revisar por la IA',
}

/** Qué pasó con cada imagen candidata que devolvió la búsqueda (diagnóstico). */
export const RESULTADOS_DE_CANDIDATA = {
	elegida: 'Elegida',
	alternativa: 'Servía, pero había una mejor',
	chica: 'Muy chica',
	no_descargable: 'No se pudo descargar',
	no_es_imagen: 'No era una imagen',
	descartada_por_texto: 'Descartada por el título',
	ia_no_corresponde: 'No era el producto',
	ia_dudosa: 'Dudosa',
	no_evaluada: 'Sin evaluar',
	duplicada: 'Repetida',
}

/**
 * Tono de la etiqueta de cada resultado de candidata: `ok` (verde), `aviso` (ámbar), `mal` (rojo)
 * o `neutro` (gris). Lo usan las miniaturas del diagnóstico.
 */
export const TONOS_DE_CANDIDATA = {
	elegida: 'ok',
	alternativa: 'neutro',
	chica: 'aviso',
	no_descargable: 'aviso',
	no_es_imagen: 'aviso',
	descartada_por_texto: 'mal',
	ia_no_corresponde: 'mal',
	ia_dudosa: 'aviso',
	no_evaluada: 'neutro',
	duplicada: 'neutro',
}

/** Veredicto de la IA sobre la imagen elegida. */
export const VEREDICTOS_IA = {
	si: 'Es el producto',
	no: 'No es el producto',
	dudoso: 'No está segura',
	sin_evaluar: 'Sin evaluar',
}

/** Qué tan segura estaba la IA. */
export const CONFIANZAS_IA = {
	high: 'alta',
	medium: 'media',
	low: 'baja',
}

/** Problemas que la IA le encontró a una imagen. */
export const PROBLEMAS_IA = {
	marca_de_agua: 'marca de agua',
	texto_superpuesto: 'texto encima',
	varias_unidades: 'varias unidades',
	foto_de_ambiente: 'foto de ambiente',
	collage: 'varias fotos juntas',
	borrosa: 'borrosa',
	otro_producto: 'otro producto',
}

/**
 * Las tres solapas del detalle, en el orden que pidió Lucas: primero lo que no se encontró,
 * después lo que hay que mirar y al final lo que ya está.
 */
export const SOLAPAS = [
	{ valor: 'no_asignadas', nombre: 'No asignadas' },
	{ valor: 'a_revisar', nombre: 'A revisar' },
	{ valor: 'asignadas', nombre: 'Asignadas' },
]

/**
 * "sin_resultados" -> "Sin resultados". Para un código que la SPA todavía no conoce: mejor eso
 * que mostrar el código crudo.
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
 * Busca un código en un mapa de textos; si no está, lo humaniza.
 *
 * @param {Object} mapa Uno de los mapas de este archivo.
 * @param {String} clave Código que mandó la API.
 * @returns {String}
 */
export function texto_de(mapa, clave) {
	if (clave === null || typeof clave === 'undefined' || clave === '') {
		return ''
	}
	return mapa[clave] || humanizar(clave)
}

/**
 * True si la asignación todavía corre (o espera su turno en la cola).
 *
 * @param {Object} asignacion RunPayload.
 * @returns {Boolean}
 */
export function esta_activa(asignacion) {
	return !!asignacion && (asignacion.status === 'pendiente' || asignacion.status === 'en_proceso')
}

/**
 * Porcentaje entero de artículos procesados, o null si todavía no se sabe el total.
 *
 * @param {Object} asignacion RunPayload.
 * @returns {Number|null}
 */
export function porcentaje_de(asignacion) {
	if (!asignacion) {
		return null
	}
	let total = Number(asignacion.total_articulos) || 0
	if (!total) {
		return null
	}
	let procesados = Number(asignacion.procesados) || 0
	return Math.max(0, Math.min(100, Math.round(procesados * 100 / total)))
}

/**
 * Un conteo de la asignación como número, con cero si no vino.
 *
 * @param {Object} conteos `conteos` de un RunPayload o de la respuesta de items.
 * @param {String} clave asignadas | a_revisar | no_asignadas | pendientes
 * @returns {Number}
 */
export function conteo(conteos, clave) {
	if (!conteos || typeof conteos !== 'object') {
		return 0
	}
	return Number(conteos[clave]) || 0
}

/**
 * Un entero con separador de miles es-AR ("1.830"). Acepta números o texto.
 *
 * @param {*} valor
 * @returns {String}
 */
export function entero_es(valor) {
	let numero = Number(valor) || 0
	return separadores_es_desde_dato(String(Math.round(numero)))
}

/**
 * Búsquedas por artículo con dos decimales es-AR ("1,46"), o '' si no hay promedio (el contrato
 * lo manda null mientras no se procesó ningún artículo).
 *
 * @param {Number|null} valor
 * @returns {String}
 */
export function promedio_es(valor) {
	if (valor === null || typeof valor === 'undefined' || valor === '') {
		return ''
	}
	return numero_con_decimales(valor, 2)
}

/**
 * La línea de búsquedas de una asignación, tal como la pidió Lucas: "1.830 · 1,46 por
 * artículo". Sin promedio, solo el total.
 *
 * @param {Object} asignacion RunPayload.
 * @returns {String}
 */
export function texto_de_busquedas(asignacion) {
	if (!asignacion) {
		return ''
	}
	let total = entero_es(asignacion.busquedas)
	let promedio = promedio_es(asignacion.busquedas_por_articulo)
	if (!promedio) {
		return total
	}
	return total + ' · ' + promedio + ' por artículo'
}

/**
 * "1 búsqueda" / "3 búsquedas" (y "Sin búsquedas" en cero), para la línea de cada artículo.
 *
 * @param {Number} cantidad
 * @returns {String}
 */
export function busquedas_del_articulo(cantidad) {
	let numero = Number(cantidad) || 0
	if (!numero) {
		return 'Sin búsquedas'
	}
	return entero_es(numero) + (numero === 1 ? ' búsqueda' : ' búsquedas')
}

/**
 * Proveedor de búsqueda para mostrar. Para el comerciante es siempre Google Imágenes (Serper es
 * un intermediario que no le dice nada); el acceso maestro ve además cuál de los dos se usó,
 * porque es lo que decide la cuenta de Google o de Serper que se consumió.
 *
 * @param {String} proveedor serper | google
 * @param {Boolean} con_detalle true para el acceso maestro.
 * @returns {String}
 */
export function texto_de_proveedor(proveedor, con_detalle) {
	if (!con_detalle) {
		return 'Google Imágenes'
	}
	if (proveedor === 'serper') {
		return 'Google Imágenes, por Serper'
	}
	if (proveedor === 'google') {
		return 'Google Imágenes, por Custom Search'
	}
	return 'Google Imágenes'
}
