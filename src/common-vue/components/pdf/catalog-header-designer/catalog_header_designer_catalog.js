/**
 * Catálogo compartido del diseñador del encabezado del catálogo de artículos
 * (misión catalogo-pdf-encabezado, 18/9/2026).
 *
 * Centraliza las opciones de hojas, las fuentes de datos del negocio, el armado del
 * estado de trabajo a partir de lo guardado y su serialización al esquema que persiste
 * la API en `pdf_column_profiles.catalog_header_layout`.
 *
 * Esquema persistido (el que normaliza `CatalogHeaderLayoutHelper::normalize()` en
 * empresa-api; claves fijas, nada más):
 *
 *   {
 *     logo:         { show: true, pages: 'all'|'first', size_mm: 25 },
 *     company_name: { show: true },
 *     rows_pages:   'all'|'first',
 *     izquierda:    [ { title, value, source } ],
 *     derecha:      [ { title, value, source } ],
 *   }
 *
 * Las filas llevan además un `uid` LOCAL mientras se editan (para las :key de Vue y el
 * drag & drop); `strip_for_save()` lo saca antes de mandar a la API.
 */

import {
	LOGO_SIZE_MM_MIN,
	LOGO_SIZE_MM_MAX,
	LOGO_SIZE_MM_DEFAULT,
	PREVIEW_PX_PER_MM,
} from '@/common-vue/components/pdf/header-designer/header_designer_catalog'

/**
 * Mismos topes y misma escala que el diseñador de header de ventas: se reexportan para
 * que este diseñador no tenga números propios que puedan quedar desalineados.
 */
export { LOGO_SIZE_MM_MIN, LOGO_SIZE_MM_MAX, LOGO_SIZE_MM_DEFAULT, PREVIEW_PX_PER_MM }

/** Valor de `pages` / `rows_pages`: el elemento sale en todas las hojas. */
export const PAGES_ALL = 'all'

/** Valor de `pages` / `rows_pages`: el elemento sale solo en la primera hoja. */
export const PAGES_FIRST = 'first'

/**
 * Opciones de los selects "Logo e imagen de cabecera" y "Datos del negocio".
 */
export const PAGES_OPTIONS = [
	{ value: PAGES_ALL, text: 'En todas las hojas' },
	{ value: PAGES_FIRST, text: 'Solo en la primera hoja' },
]

/**
 * Fuentes de datos del negocio: clave -> label.
 *
 * Copia exacta de `CatalogHeaderLayoutHelper::SOURCE_LABELS` (empresa-api), que es la
 * ÚNICA fuente de verdad: la API solo persiste un `source` que esté en esa lista, y al
 * imprimir reemplaza el valor guardado por el dato actual del negocio. Si cambia allá,
 * cambia acá. El orden es el orden en que la API devuelve las fuentes.
 */
export const SOURCE_LABELS = {
	telefono: 'Teléfono',
	email: 'Email',
	direccion: 'Dirección',
	cuit: 'CUIT',
	razon_social: 'Razón Social',
	domicilio_comercial: 'Domicilio Comercial',
	condicion_iva: 'Condición IVA',
	ingresos_brutos: 'Ingresos Brutos',
}

/**
 * Máximo de filas por columna que la API conserva (las demás se descartan en silencio
 * al guardar). Mismo valor que `CatalogHeaderLayoutHelper::MAX_ROWS_PER_COLUMN`.
 */
export const MAX_ROWS_PER_COLUMN = 15

/** Contador local para que dos filas creadas en el mismo milisegundo no compartan uid. */
let uid_counter = 0

/**
 * Arma una fila nueva del encabezado, con su `uid` local para las :key de Vue.
 *
 * @param {string}      title  Título del renglón (ej. "Teléfono").
 * @param {string}      value  Valor del renglón (ej. "11 5555-5555").
 * @param {string|null} source Clave de SOURCE_LABELS si el valor sale de los datos del negocio; null si es libre.
 * @return {{uid: string, title: string, value: string, source: string|null}}
 */
export function new_row(title, value, source) {
	uid_counter += 1
	return {
		uid: 'r' + Date.now() + '-' + uid_counter,
		title: title == null ? '' : String(title),
		value: value == null ? '' : String(value),
		source: (source && SOURCE_LABELS[source]) ? source : null,
	}
}

/**
 * Normaliza un valor de páginas al par permitido ('all' | 'first').
 *
 * @param {*} value
 * @return {string}
 */
export function normalize_pages(value) {
	return value === PAGES_FIRST ? PAGES_FIRST : PAGES_ALL
}

/**
 * Acota el tamaño del logo (mm) al rango permitido; sin valor válido, el default.
 *
 * @param {*} value
 * @return {number}
 */
export function clamp_logo_size_mm(value) {
	let size_mm = Math.round(Number(value))
	if (!size_mm || isNaN(size_mm)) {
		return LOGO_SIZE_MM_DEFAULT
	}
	if (size_mm < LOGO_SIZE_MM_MIN) {
		return LOGO_SIZE_MM_MIN
	}
	if (size_mm > LOGO_SIZE_MM_MAX) {
		return LOGO_SIZE_MM_MAX
	}
	return size_mm
}

/**
 * Lee un flag booleano de lo guardado. La API lo persiste como true/false, pero por si
 * llega como 1/0 o '1'/'0' se contempla igual; sin valor, el default.
 *
 * @param {*}       value
 * @param {boolean} default_value
 * @return {boolean}
 */
function as_bool(value, default_value) {
	if (typeof value === 'undefined' || value === null) {
		return default_value
	}
	return value === true || value === 1 || value === '1'
}

/**
 * Diseño por defecto armado localmente, para cuando la API no devolvió `default_layout`
 * (API vieja sin el endpoint, o el GET falló): logo en todas las hojas a 25 mm, nombre
 * del negocio visible, datos en todas las hojas y ninguna fila.
 *
 * @return {Object}
 */
export function default_layout_local() {
	return {
		logo: { show: true, pages: PAGES_ALL, size_mm: LOGO_SIZE_MM_DEFAULT },
		company_name: { show: true },
		rows_pages: PAGES_ALL,
		izquierda: [],
		derecha: [],
	}
}

/**
 * Convierte una lista de filas guardadas en filas de trabajo (con uid), descartando lo
 * que no sea un objeto.
 *
 * @param {*} rows
 * @return {Array}
 */
function rows_from_saved(rows) {
	if (!Array.isArray(rows)) {
		return []
	}
	const result = []
	rows.forEach(function (row) {
		if (!row || typeof row !== 'object') {
			return
		}
		result.push(new_row(row.title, row.value, row.source))
	})
	return result
}

/**
 * Arma el estado de trabajo del diseñador a partir de lo guardado en el perfil
 * (`model.catalog_header_layout`) o, si no hay nada guardado, del diseño por defecto.
 *
 * Devuelve SIEMPRE una copia nueva con todas las claves del esquema y uids en las filas:
 * nunca se muta el objeto del modelo hasta que el usuario guarda.
 *
 * @param {Object|string|null} saved          Lo guardado en el perfil (objeto, JSON como string, o null).
 * @param {Object|null}        default_layout Diseño por defecto de la API; si es null, el local.
 * @return {Object}
 */
export function build_layout_from_saved(saved, default_layout) {
	let base = saved

	/* Si el perfil viene de una respuesta sin cast, puede llegar como JSON en un string */
	if (typeof base === 'string') {
		try {
			base = JSON.parse(base)
		} catch (e) {
			base = null
		}
	}

	if (!base || typeof base !== 'object' || Array.isArray(base)) {
		base = default_layout && typeof default_layout === 'object'
			? default_layout
			: default_layout_local()
	}

	const logo = (base.logo && typeof base.logo === 'object') ? base.logo : {}
	const company_name = (base.company_name && typeof base.company_name === 'object') ? base.company_name : {}

	return {
		logo: {
			show: as_bool(logo.show, true),
			pages: normalize_pages(logo.pages),
			size_mm: clamp_logo_size_mm(logo.size_mm),
		},
		company_name: {
			show: as_bool(company_name.show, true),
		},
		rows_pages: normalize_pages(base.rows_pages),
		izquierda: rows_from_saved(base.izquierda),
		derecha: rows_from_saved(base.derecha),
	}
}

/**
 * Serializa las filas de trabajo al esquema persistido: SOLO title, value y source.
 *
 * @param {Array} rows
 * @return {Array}
 */
function strip_rows(rows) {
	if (!Array.isArray(rows)) {
		return []
	}
	return rows.map(function (row) {
		return {
			title: row.title == null ? '' : String(row.title).trim(),
			value: row.value == null ? '' : String(row.value).trim(),
			source: (row.source && SOURCE_LABELS[row.source]) ? row.source : null,
		}
	})
}

/**
 * Serializa el estado de trabajo al esquema exacto que persiste la API: saca los uids y
 * cualquier otra clave, y deja los valores ya acotados. Lo que devuelve es lo que viaja
 * en `catalog_header_layout` del POST/PUT.
 *
 * @param {Object} layout Estado de trabajo del diseñador.
 * @return {Object}
 */
export function strip_for_save(layout) {
	const safe = layout && typeof layout === 'object' ? layout : default_layout_local()
	const logo = safe.logo || {}
	const company_name = safe.company_name || {}

	return {
		logo: {
			show: as_bool(logo.show, true),
			pages: normalize_pages(logo.pages),
			size_mm: clamp_logo_size_mm(logo.size_mm),
		},
		company_name: {
			show: as_bool(company_name.show, true),
		},
		rows_pages: normalize_pages(safe.rows_pages),
		izquierda: strip_rows(safe.izquierda),
		derecha: strip_rows(safe.derecha),
	}
}

/**
 * Regla de visibilidad por hoja, réplica de
 * `CatalogHeaderLayoutHelper::element_visible_on_page()`: 'first' solo sale en la hoja 1,
 * cualquier otra cosa sale en todas.
 *
 * @param {string} pages   'all' | 'first'
 * @param {number} page_no Número de hoja (1 = primera).
 * @return {boolean}
 */
export function element_visible_on_page(pages, page_no) {
	if (pages === PAGES_FIRST) {
		return Number(page_no) === 1
	}
	return true
}
