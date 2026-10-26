// El slot es una columna de presentación, no un campo del modelo ni de sus búsquedas.
// Este registro sigue a los consumidores de #table_left_options, incluidos los ABM anidados.
const models_with_left_options = [
	'article', 'sale', 'budget', 'caja', 'employee', 'client', 'provider',
	'provider_order', 'buyer', 'order', 'seller', 'payment_plan_cuota', 'cheque',
	'resumen_caja', 'deposit_movement', 'meli_order', 'stock_suggestion', 'pdf_column_profile',
]

/**
 * Definición de la columna de acciones para los listados que la usan.
 * @param {string} model_name Nombre del módulo.
 * @returns {Object|null} Propiedad de presentación, o null si no hay acciones.
 */
export function left_options_property(model_name) {
	if (models_with_left_options.indexOf(model_name) === -1) {
		return null
	}
	return {
		key: 'table_left_options',
		text: 'Acciones',
		no_usar_en_filtros: true,
		locked_visible: true,
	}
}

/**
 * Limita el contenido al ancho elegido sólo si las acciones pueden pasar de renglón.
 * @param {Object} prop Columna de presentación.
 * @param {number} horizontal_padding_px Padding horizontal total del td del renderizador.
 * @returns {Object|null} Estilo del contenedor interno de las acciones.
 */
export function left_options_content_style(prop, horizontal_padding_px = 30) {
	if (!prop || prop.key !== 'table_left_options' || !Number(prop.table_width)) {
		return null
	}
	let width = left_options_width(prop.table_width, prop.table_wrap_content, horizontal_padding_px) + 'px'
	// El ancho elegido corresponde al td completo. Su padding no puede sumarse otra vez
	// al wrapper: con 100px y 15px por lado los botones sólo disponen de 70px.
	let content_width = 'calc(' + width + ' - ' + horizontal_padding_px + 'px)'
	// Recortar o poner scroll interno escondería botones y menús. Sin salto el ancho
	// es un mínimo: debe crecer hasta que entren todas las acciones accesibles.
	if (!prop.table_wrap_content) {
		return { width: 'max-content', minWidth: content_width, maxWidth: 'none' }
	}
	return { width: content_width, maxWidth: content_width }
}

/**
 * Mínimo físico de un botón de icono (32px) más el padding de la celda.
 * Sólo limita la presentación: nunca cambia el ancho que el usuario guardó.
 * @param {number|null} width Ancho elegido.
 * @param {boolean} wrap_content Si las acciones pueden pasar de renglón.
 * @param {number} horizontal_padding_px Padding horizontal total del td.
 * @returns {number|null} Ancho efectivo de la celda, null si es automático.
 */
export function left_options_width(width, wrap_content, horizontal_padding_px = 30) {
	if (!Number(width)) {
		return null
	}
	return wrap_content ? Math.max(Number(width), horizontal_padding_px + 32) : Number(width)
}
