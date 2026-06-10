/**
 * Configuración compartida de atajos de teclado del módulo Vender.
 * Usada por VenderTopbar, keyboard_shortcuts.js y el store vender.
 */

/** Teclas F1-F10 disponibles para asignar a cada acción */
export const VENDER_KEYBOARD_SHORTCUT_KEYS = [
	'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10',
]

/** Mapa por defecto action => tecla (configuración inicial del módulo) */
export const VENDER_KEYBOARD_SHORTCUT_DEFAULTS = {
	barcode: 'F1',
	search_article: 'F2',
	payment_method: 'F3',
	client: 'F4',
	save: 'F5',
	print: 'F6',
}

/**
 * Definición de acciones mostradas en la barra superior con su etiqueta en español.
 *
 * @type {Array<{action: string, label: string}>}
 */
export const VENDER_KEYBOARD_SHORTCUT_ACTIONS = [
	{ action: 'barcode', label: 'Código de barras' },
	{ action: 'search_article', label: 'Buscar artículo' },
	{ action: 'payment_method', label: 'Método de pago' },
	{ action: 'client', label: 'Cliente' },
	{ action: 'save', label: 'Guardar' },
	{ action: 'print', label: 'Imprimir' },
]

/**
 * Normaliza un mapa de atajos recibido desde la API fusionándolo con los defaults.
 *
 * @param {Object|null|undefined} shortcuts
 * @returns {Object<string, string>}
 */
export function normalize_vender_keyboard_shortcuts(shortcuts) {
	/* Copia base con valores por defecto */
	const normalized = Object.assign({}, VENDER_KEYBOARD_SHORTCUT_DEFAULTS)

	if (!shortcuts || typeof shortcuts !== 'object') {
		return normalized
	}

	VENDER_KEYBOARD_SHORTCUT_ACTIONS.forEach(function (item) {
		const action = item.action
		const key = shortcuts[action]

		if (key && VENDER_KEYBOARD_SHORTCUT_KEYS.indexOf(key) !== -1) {
			normalized[action] = key
		}
	})

	return normalized
}

/**
 * Indica si hay teclas repetidas entre acciones.
 *
 * @param {Object<string, string>} shortcuts
 * @returns {boolean}
 */
export function vender_keyboard_shortcuts_have_duplicates(shortcuts) {
	const keys = []

	VENDER_KEYBOARD_SHORTCUT_ACTIONS.forEach(function (item) {
		keys.push(shortcuts[item.action])
	})

	const unique_keys = keys.filter(function (key, index) {
		return keys.indexOf(key) === index
	})

	return unique_keys.length !== keys.length
}

/**
 * Opciones para b-form-select (value/text).
 *
 * @returns {Array<{value: string, text: string}>}
 */
export function get_vender_keyboard_shortcut_key_options() {
	const options = []

	VENDER_KEYBOARD_SHORTCUT_KEYS.forEach(function (key) {
		options.push({
			value: key,
			text: key,
		})
	})

	return options
}
