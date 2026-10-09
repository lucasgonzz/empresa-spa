/**
 * Lo que cambia en un diseño de PDF de venta cuando pasa de HOJA a TICKET de comandera o al revés,
 * o cuando cambia el ancho del rollo de un ticket (misión diseno-ticket-comandera, 9/10/2026).
 * Funciones puras: el selector "Hoja o comandera" las usa sobre el `model` del formulario, y se
 * pueden probar sin montar nada.
 *
 * Por qué hace falta tocar más que `sheet_type_id`: el formulario del ABM manda el modelo ENTERO
 * (getModelToSend() hace un spread de `model`), y la API decide el cambio de clase mirando lo que
 * viene en el pedido (contrato 3.2):
 * - de ticket a hoja, si vienen el ancho y el margen, los respeta: una hoja de 80 mm sin margen;
 * - si vienen las columnas de la tabla y entran en el ancho útil nuevo, las guarda tal cual: si se
 *   mandaran los milímetros de la clase vieja, una A4 que pasa a 80 mm quedaba con la tabla en
 *   34 mm, y un ticket que pasa a A4 con "Cant" en 1 mm.
 * Por eso al cambiar de clase el selector deja en el modelo lo mismo que haría la API con un pedido
 * limpio (sin diseño con cajas, la hoja en 210/210/5 y el ticket con el ancho del rollo y margen 0)
 * y lleva las columnas al ancho útil nuevo con la MISMA regla que el diseñador y la API (D9).
 */
import { es_tipo_de_hoja_ticket } from '@/constants/vender_print_shortcut_options'
import {
	HOJA_DE_SIEMPRE,
	MARGEN_POR_DEFECTO,
	tiene_diseno,
} from '../disenador-pdf/estado_del_disenador'
import {
	COLUMNAS_DE_LA_TABLA,
	COLUMNAS_SUGERIDAS_POR_MODELO,
	MEDIAS_SUGERIDAS_EN_TICKET,
	mm_a_columnas,
	columnas_a_mm,
	mm_de_las_columnas,
	pivot_es_visible,
	encajar_en_la_grilla,
	llenar_la_fila,
} from '../disenador-pdf/tabla_del_disenador'

/**
 * Campos del modelo que dependen de la clase (hoja o ticket). Al salir de una clase se guardan
 * en una foto, y si el operador vuelve a esa clase sin guardar, se restauran: elegir un ticket
 * por error y volver a A4 no le borra el diseño con cajas, los predeterminados de WhatsApp ni el
 * "por defecto".
 */
export const CAMPOS_DE_LA_CLASE = [
	'page_layout',
	'paper_width_mm',
	'printable_width_mm',
	'margin_mm',
	'paper_height_mm',
	'is_default',
	'is_default_whatsapp',
	'is_default_whatsapp_afip',
	'is_default_tienda',
	'show_totals_on_each_page',
]

/**
 * Los campos que un ticket no puede tener prendidos (la API los fuerza en false, D4 del plan):
 * un ticket nunca se manda por WhatsApp ni por la tienda como PDF, y no tiene "hojas".
 */
export const CAMPOS_APAGADOS_EN_TICKET = [
	'is_default_whatsapp',
	'is_default_whatsapp_afip',
	'is_default_tienda',
	'show_totals_on_each_page',
]

/**
 * Hoja con la que queda un ticket que pasa a hoja: A4 vertical (alto null = 297), 200 mm útiles.
 * Es lo mismo que la API pone cuando el pedido no trae datos de hoja (contrato 3.2).
 */
export const HOJA_POR_DEFECTO = {
	paper_width_mm: 210,
	printable_width_mm: 210,
	margin_mm: 5,
	paper_height_mm: null,
}

/**
 * Copia profunda simple (JSON): los valores de estos campos son números, booleanos, null o el
 * JSON del diseño con cajas.
 *
 * @param {*} valor
 * @returns {*}
 */
function copiar(valor) {
	if (valor === null || typeof valor === 'undefined') {
		return valor
	}
	return JSON.parse(JSON.stringify(valor))
}

/**
 * Ancho útil en mm sobre el que se miden las columnas de la tabla (D9), con la regla del diseñador
 * (hoja_del_perfil() / ancho_util() de disenador-pdf/estado_del_disenador.js) y de la API
 * (PdfColumnProfileTicketHelper::ancho_util_de_columnas):
 *
 * - un TICKET: el ancho del rollo (su tipo de hoja);
 * - una HOJA sin diseño con cajas: la hoja de siempre (HOJA_DE_SIEMPRE: A4 de 210 con 5 de margen,
 *   200 mm), SIN importar los 297/277 que algunos perfiles viejos tienen guardados: es lo que su PDF
 *   imprime de verdad;
 * - una HOJA con diseño: ancho imprimible menos los dos márgenes (margen vacío = el por defecto).
 *
 * @param {Object} model el perfil (con la hoja y el page_layout que tiene en ESE momento).
 * @param {Object|null} tipo su tipo de hoja ({width, height}); null = hoja sin tipo.
 * @returns {number} 0 si no se puede calcular.
 */
export function ancho_util_de_la_clase(model, tipo) {
	if (es_tipo_de_hoja_ticket(tipo)) {
		let rollo = Number(tipo.width)
		return rollo > 0 ? rollo : 0
	}

	if (!model || !tiene_diseno(model.page_layout)) {
		return HOJA_DE_SIEMPRE.ancho - (2 * HOJA_DE_SIEMPRE.margen)
	}

	let imprimible = Number(model.printable_width_mm || model.paper_width_mm || 0)
	let margen_vacio = model.margin_mm === null || typeof model.margin_mm === 'undefined' || model.margin_mm === ''
	let margen = margen_vacio ? MARGEN_POR_DEFECTO : Number(model.margin_mm)
	let util = imprimible - (2 * margen)

	return util > 0 ? util : 0
}

/**
 * Foto de los campos de la clase actual del modelo, para poder volver a ella. Guarda también el
 * ancho útil en el que están medidas sus columnas, para reescalarlas si se vuelve a la clase con
 * otro ancho (un ticket de 55 al que se vuelve eligiendo uno de 80).
 *
 * @param {Object} model
 * @param {number} util ancho útil de la clase que se deja (ancho_util_de_la_clase()).
 * @returns {Object} {campos: {...}, pdf_column_options: Array|null, util: number}
 */
export function foto_de_la_clase(model, util) {
	const campos = {}
	CAMPOS_DE_LA_CLASE.forEach(function (campo) {
		campos[campo] = copiar(model[campo])
	})
	const trae_columnas = Array.isArray(model.pdf_column_options) && model.pdf_column_options.length > 0
	return {
		campos: campos,
		/*
			Sin columnas (un diseño nuevo al que el editor todavía no le puso las sugeridas) la foto no
			las guarda: al volver, se quedan las que haya en ese momento, reescaladas desde la clase en
			que están (ver elegir_tipo() del selector). Restaurar una lista vacía las borraba.
		*/
		pdf_column_options: trae_columnas ? copiar(model.pdf_column_options) : null,
		util: util,
	}
}

/**
 * Las opciones visibles de la tabla, en el orden del array (el editor escribe `order` = posición).
 *
 * @param {Array} pdf_column_options
 * @returns {Array}
 */
function opciones_visibles(pdf_column_options) {
	const visibles = []
	;(Array.isArray(pdf_column_options) ? pdf_column_options : []).forEach(function (option) {
		if (option && option.pivot && pivot_es_visible(option.pivot)) {
			visibles.push(option)
		}
	})
	return visibles
}

/**
 * Booleano de un pivot (true/1/'1').
 *
 * @param {*} valor
 * @returns {boolean}
 */
function verdadero(valor) {
	return valor === true || valor === 1 || valor === '1'
}

/**
 * Las medias columnas con que el editor del formulario pone las columnas SUGERIDAS de una venta
 * (PdfColumnProfileEditor::mark_suggested_columns, con poner_sugeridas() del diseñador):
 *
 * - en un TICKET, las de los tickets por defecto de la API: MEDIAS_SUGERIDAS_EN_TICKET (9/3/6/6);
 * - en una HOJA, el ancho por defecto de cada opción sobre el ancho útil y lo que sobra de las 24
 *   medias a la de salto de línea (llenar_la_fila()): en una A4, 16/2/3/3.
 *
 * @param {Array} visibles las opciones visibles (con `value_resolver`, `default_width` y `pivot`).
 * @param {number} util ancho útil de la clase.
 * @param {boolean} es_ticket
 * @returns {Array<number>|null} null si no se puede calcular (falta un dato).
 */
export function medias_de_las_sugeridas(visibles, util, es_ticket) {
	const total = COLUMNAS_DE_LA_TABLA
	let se_puede = true

	if (es_ticket) {
		const medias = []
		visibles.forEach(function (option) {
			const fija = parseInt(MEDIAS_SUGERIDAS_EN_TICKET[option.value_resolver], 10)
			if (!(fija > 0)) {
				se_puede = false
			}
			medias.push(fija)
		})
		return se_puede ? medias : null
	}

	const columnas = []
	visibles.forEach(function (option) {
		const por_defecto = Number(option.default_width)
		if (!(por_defecto > 0)) {
			se_puede = false
		}
		columnas.push({
			cols: mm_a_columnas(por_defecto, util, total),
			salto: verdadero(option.pivot.wrap_content),
		})
	})

	if (!se_puede || !(util > 0)) {
		return null
	}

	encajar_en_la_grilla(columnas, total)
	llenar_la_fila(columnas, total)

	return columnas.map(function (columna) {
		return columna.cols
	})
}

/**
 * Si un diseño de venta NUEVO (sin id) tiene en la tabla exactamente las columnas sugeridas que le
 * puso el editor, sin tocar: las cuatro de COLUMNAS_SUGERIDAS_POR_MODELO.sale, en ese orden, con las
 * medias columnas de su clase (medias_de_las_sugeridas()).
 *
 * En ese caso puntual, al cambiar de clase no se conservan las medias (la regla general, D9) sino
 * que se ponen las sugeridas de la clase nueva: las de una A4 (16/2/3/3) en un rollo de 80 mm dejan
 * el Precio y la Cant angostos, y las de un ticket (9/3/6/6) en una A4 dejan el nombre corto. Un
 * diseño guardado, o con la tabla tocada, sigue con la regla general.
 *
 * @param {Object} model
 * @param {number} util ancho útil en que están medidas las columnas.
 * @param {boolean} es_ticket la clase en que están medidas.
 * @returns {boolean}
 */
export function son_las_sugeridas_sin_tocar(model, util, es_ticket) {
	if (!model || model.id || model.model_name !== 'sale' || !(util > 0)) {
		return false
	}

	const visibles = opciones_visibles(model.pdf_column_options)
	const esperadas = COLUMNAS_SUGERIDAS_POR_MODELO.sale

	if (visibles.length !== esperadas.length) {
		return false
	}

	let mismas = true
	visibles.forEach(function (option, indice) {
		if (option.value_resolver !== esperadas[indice]) {
			mismas = false
		}
	})
	if (!mismas) {
		return false
	}

	const sugeridas = medias_de_las_sugeridas(visibles, util, es_ticket)
	if (!sugeridas) {
		return false
	}

	visibles.forEach(function (option, indice) {
		if (mm_a_columnas(option.pivot.width, util, COLUMNAS_DE_LA_TABLA) !== sugeridas[indice]) {
			mismas = false
		}
	})

	return mismas
}

/**
 * Las medias de las sugeridas para la clase NUEVA, en el orden de las visibles (para
 * columnas_reescaladas()).
 *
 * @param {Object} model
 * @param {number} util_nuevo
 * @param {boolean} sera_ticket
 * @returns {Array<number>|null}
 */
export function medias_sugeridas_de_la_clase_nueva(model, util_nuevo, sera_ticket) {
	return medias_de_las_sugeridas(opciones_visibles(model.pdf_column_options), util_nuevo, sera_ticket)
}

/**
 * Las columnas de la tabla llevadas de un ancho útil a otro conservando sus medias columnas (D9),
 * en objetos NUEVOS (el editor del formulario mira `model.pdf_column_options` y se entera).
 *
 * La regla es la del diseñador (tabla_del_disenador.js) y la de la API
 * (PdfColumnProfileTicketHelper::reescalar_columnas), para que lo que manda el formulario sea lo
 * mismo que dejaría cualquiera de los dos:
 *
 * - medias de cada columna: mm_a_columnas(mm, útil viejo, 24);
 * - las VISIBLES: mm_de_las_columnas(medias, útil nuevo, 24), el reparto con tope del diseñador (la
 *   suma nunca pasa del útil nuevo: la API rechaza con 422 una suma mayor);
 * - las OCULTAS, cada una por su lado: columnas_a_mm(medias, útil nuevo, 24). No suman, pero guardan
 *   sus medias para cuando se muestren.
 *
 * Una opción sin pivot o sin ancho guardado queda como está (la API tampoco la toca).
 *
 * `medias_de_las_visibles` (opcional) reemplaza las medias de las visibles, en su orden: es el caso
 * de las sugeridas sin tocar de un diseño nuevo (son_las_sugeridas_sin_tocar()).
 *
 * @param {Array} pdf_column_options opciones con su `pivot` ({width, visible, order, ...}).
 * @param {number} util_viejo
 * @param {number} util_nuevo
 * @param {Array<number>} [medias_de_las_visibles]
 * @returns {Array}
 */
export function columnas_reescaladas(pdf_column_options, util_viejo, util_nuevo, medias_de_las_visibles) {
	const total = COLUMNAS_DE_LA_TABLA

	if (!Array.isArray(pdf_column_options)) {
		return []
	}

	const resultado = pdf_column_options.map(function (option) {
		if (!option || !option.pivot) {
			return option
		}
		return Object.assign({}, option, { pivot: Object.assign({}, option.pivot) })
	})

	if (!(util_viejo > 0) || !(util_nuevo > 0)) {
		return resultado
	}

	const indices_visibles = []
	const medias_visibles = []

	resultado.forEach(function (option, indice) {
		if (!option || !option.pivot) {
			return
		}
		const ancho = option.pivot.width
		if (ancho === null || typeof ancho === 'undefined' || ancho === '') {
			return
		}

		const medias = mm_a_columnas(ancho, util_viejo, total)

		if (pivot_es_visible(option.pivot)) {
			indices_visibles.push(indice)
			medias_visibles.push(medias)
		} else {
			option.pivot.width = columnas_a_mm(medias, util_nuevo, total)
		}
	})

	const medias_finales = Array.isArray(medias_de_las_visibles) && medias_de_las_visibles.length === medias_visibles.length
		? medias_de_las_visibles
		: medias_visibles
	const milimetros = mm_de_las_columnas(medias_finales, util_nuevo, total)

	indices_visibles.forEach(function (indice, posicion) {
		resultado[indice].pivot.width = milimetros[posicion]
	})

	return resultado
}

/**
 * Caracteres por renglón de un rollo, con la misma cuenta que el Ticket 2.0 de siempre y que el
 * motor de la API: 48 caracteres en 80 mm.
 *
 * @param {number} ancho_mm
 * @returns {number}
 */
export function caracteres_por_renglon(ancho_mm) {
	return Math.floor((Number(ancho_mm) * 48) / 80)
}
