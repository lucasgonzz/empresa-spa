/**
 * Código propio del dueño (SKU) en el campo «Cod barras» de VENDER, SIN conexión o con «Usar cache de
 * artículos» (ronda 5 de la prueba gratuita, 14/11/2026, ítem E9b).
 *
 * Con conexión y sin cache lo resuelve la API (VenderController::articulo_por_sku_exacto); este archivo
 * repite la MISMA regla contra la cache de artículos (Dexie, src/offline/db.js), para que el código del
 * dueño entre igual con y sin internet:
 *  - igualdad exacta tras trim, sin distinguir mayúsculas («f-101» encuentra «F-101»), sin «contiene»;
 *  - un SKU que tienen dos o más artículos no encuentra ninguno;
 *  - solo artículos activos (la cache ya baja solo activos; igual se mira `status` si viene).
 *
 * La cache no tiene índice por `sku` (subir la versión de Dexie cierra la base en las otras pestañas):
 * igual que el índice de códigos de variante (utils/variantes_en_cache.js), se recorre la tabla UNA vez
 * y se arma en memoria `sku normalizado -> id` (o AMBIGUO). Después cada Enter es una consulta a ese
 * objeto y, si hay match, un get por clave primaria. Lo invalida la sincronización de la cache
 * (src/offline/sync_articles.js) después de cada bulkPut y bulkDelete. Un índice viejo no mete un
 * artículo equivocado: el artículo se vuelve a leer y su SKU se vuelve a comparar.
 *
 * Solo se llega acá cuando ningún código de barras, PLU, variante ni ticket de balanza coincidió
 * (ArticleBarCode.vue::respaldo_por_sku_en_cache).
 */
import db from '@/offline/db'

/** Marca de un SKU que tienen dos o más artículos: no se elige ninguno. */
const AMBIGUO = -1

/**
 * El SKU como se compara: texto, sin espacios en las puntas y en minúsculas. '' si no hay nada.
 *
 * @param {*} valor
 * @returns {String}
 */
export function normalizar_sku(valor) {
	if (valor === undefined || valor === null) {
		return ''
	}
	return String(valor).trim().toLowerCase()
}

/**
 * Si un artículo de la cache se puede vender por su código propio: sin `status`, o `active`.
 *
 * @param {Object} article
 * @returns {Boolean}
 */
function articulo_activo(article) {
	return !article.status || article.status == 'active'
}

/**
 * Suma un artículo al índice (función pura sobre el objeto que recibe, para poder testearla).
 *
 * @param {Object} indice `sku normalizado -> id` (o AMBIGUO).
 * @param {Object} article Artículo de la cache.
 * @returns {void}
 */
export function sumar_al_indice_de_skus(indice, article) {
	if (!article || !articulo_activo(article)) {
		return
	}
	let sku = normalizar_sku(article.sku)
	if (sku === '') {
		return
	}
	if (typeof indice[sku] == 'undefined') {
		indice[sku] = article.id
	} else if (indice[sku] !== article.id) {
		indice[sku] = AMBIGUO
	}
}

/**
 * El id del ÚNICO artículo con ese SKU según el índice, o null (ninguno o varios).
 *
 * @param {Object} indice
 * @param {*} codigo Lo tipeado.
 * @returns {Number|null}
 */
export function id_por_sku_en_indice(indice, codigo) {
	let sku = normalizar_sku(codigo)
	if (sku === '' || !indice) {
		return null
	}
	let id = indice[sku]
	if (typeof id == 'undefined' || id === AMBIGUO) {
		return null
	}
	return id
}

let indice_de_skus = null
let indice_en_armado = null
let version_del_indice = 0

/**
 * Tira el índice de SKU: el próximo Enter que lo necesite lo rearma leyendo la cache.
 *
 * @returns {void}
 */
export function invalidar_indice_de_skus_en_cache() {
	indice_de_skus = null
	indice_en_armado = null
	version_del_indice++
}

/**
 * El índice de SKU de la cache, armado una sola vez (o el que ya está armándose).
 *
 * @returns {Promise<Object>}
 */
function indice() {
	if (indice_de_skus) {
		return Promise.resolve(indice_de_skus)
	}
	if (indice_en_armado) {
		return indice_en_armado
	}
	let version_al_empezar = version_del_indice
	// Sin prototipo: un SKU como "constructor" no tiene que encontrar nada
	let nuevo_indice = Object.create(null)
	indice_en_armado = db.table('articles')
	.each(article => {
		sumar_al_indice_de_skus(nuevo_indice, article)
	})
	.then(() => {
		if (version_al_empezar === version_del_indice) {
			indice_de_skus = nuevo_indice
			indice_en_armado = null
		}
		return nuevo_indice
	})
	.catch(err => {
		if (version_al_empezar === version_del_indice) {
			indice_en_armado = null
		}
		throw err
	})
	return indice_en_armado
}

/**
 * El artículo de la cache cuyo SKU es exactamente `codigo` (y es el único), o null.
 *
 * @param {*} codigo Lo tipeado en «Cod barras».
 * @returns {Promise<Object|null>}
 */
export function articulo_por_sku_en_cache(codigo) {
	if (normalizar_sku(codigo) === '') {
		return Promise.resolve(null)
	}
	return indice()
	.then(indice_armado => {
		let id = id_por_sku_en_indice(indice_armado, codigo)
		if (id === null) {
			return null
		}
		return db.table('articles').get(id)
		.then(article => {
			// Pudo cambiar o borrarse desde que se armó el índice: se vuelve a mirar
			if (!article || !articulo_activo(article) || normalizar_sku(article.sku) !== normalizar_sku(codigo)) {
				return null
			}
			return article
		})
	})
}
