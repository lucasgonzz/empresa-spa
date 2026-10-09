/**
 * Lo que cambia en un diseño de PDF de venta cuando pasa de HOJA a TICKET de comandera o al revés
 * (misión diseno-ticket-comandera, 9/10/2026). Funciones puras: el selector "Hoja o comandera" las
 * usa sobre el `model` del formulario, y se pueden probar sin montar nada.
 *
 * Por qué hace falta tocar más que `sheet_type_id`: el formulario del ABM manda el modelo ENTERO
 * (getModelToSend() hace un spread de `model`), y la API decide el cambio de clase mirando lo que
 * viene en el pedido (contrato 3.2):
 * - si viene `page_layout`, lo respeta (no lo pasa a null). Un diseño con cajas de hoja quedaría
 *   puesto en un ticket, y al revés;
 * - de ticket a hoja, si vienen el ancho y el margen, los respeta: una hoja de 80 mm sin margen.
 * Por eso al cambiar de clase el selector deja en el modelo lo mismo que haría la API con un pedido
 * limpio: sin diseño con cajas (vuelve al "de siempre" de la clase nueva), la hoja en 210/210/5 y el
 * ticket con el ancho del rollo y margen 0.
 */

/**
 * Campos del modelo que dependen de la clase (hoja o ticket). Al salir de una clase se guardan
 * en una foto, y si el operador vuelve a esa clase sin guardar, se restauran: elegir un ticket
 * por error y volver a A4 no le borra el diseño con cajas ni los predeterminados de WhatsApp.
 */
export const CAMPOS_DE_LA_CLASE = [
	'page_layout',
	'paper_width_mm',
	'printable_width_mm',
	'margin_mm',
	'paper_height_mm',
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
 * Ancho útil en mm sobre el que se reparten las columnas de la tabla (D9 del plan): el ancho de la
 * hoja menos los dos márgenes; en un ticket, el ancho del rollo.
 *
 * @param {Object} model
 * @returns {number} 0 si no se puede calcular.
 */
export function ancho_util_del_modelo(model) {
	if (!model) {
		return 0
	}
	const ancho = Number(model.paper_width_mm || model.printable_width_mm || 0)
	const margen = Number(model.margin_mm || 0)
	const util = ancho - (margen * 2)
	return util > 0 ? util : 0
}

/**
 * Foto de los campos de la clase actual del modelo, para poder volver a ella.
 *
 * @param {Object} model
 * @returns {Object} {campos: {...}, pdf_column_options: Array|null}
 */
export function foto_de_la_clase(model) {
	const campos = {}
	CAMPOS_DE_LA_CLASE.forEach(function (campo) {
		campos[campo] = copiar(model[campo])
	})
	return {
		campos: campos,
		pdf_column_options: Array.isArray(model.pdf_column_options) ? copiar(model.pdf_column_options) : null,
	}
}

/**
 * Las columnas de la tabla con los anchos multiplicados por `factor`, en objetos NUEVOS.
 *
 * Mantiene las medias columnas de cada una (D9): `cols = round(mm × 24 / útil)` da lo mismo antes
 * y después si los mm se escalan con la misma proporción que el ancho útil. Devuelve objetos nuevos
 * (y no los modifica en el lugar) para que el editor de columnas, que mira
 * `model.pdf_column_options`, se entere del cambio.
 *
 * @param {Array} pdf_column_options opciones con su `pivot` ({width, visible, order, ...}).
 * @param {number} factor ancho útil nuevo / ancho útil anterior.
 * @returns {Array}
 */
export function columnas_reescaladas(pdf_column_options, factor) {
	const resultado = []
	if (!Array.isArray(pdf_column_options)) {
		return resultado
	}
	pdf_column_options.forEach(function (option) {
		if (!option || !option.pivot) {
			resultado.push(option)
			return
		}
		const ancho = Number(option.pivot.width)
		const pivot = Object.assign({}, option.pivot)
		if (ancho > 0 && factor > 0) {
			pivot.width = Math.max(1, Math.round(ancho * factor))
		}
		resultado.push(Object.assign({}, option, { pivot: pivot }))
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
