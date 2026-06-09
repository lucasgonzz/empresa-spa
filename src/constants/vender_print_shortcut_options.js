/**
 * Opciones configurables del atajo Imprimir en el módulo Vender.
 * Las claves coinciden con los métodos de sale-print-buttons/Index.vue.
 */

/** Ticket 2.0 (remito y facturado) */
export const VENDER_PRINT_OPTION_TICKET_2 = 'ticket_2'

/** Ticket venta PDF (sin AFIP) */
export const VENDER_PRINT_OPTION_TICKET_PDF = 'ticket_pdf'

/** Ticket factura AFIP (primer comprobante con CAE al imprimir) */
export const VENDER_PRINT_OPTION_FACTURA_TICKET_PDF = 'factura_ticket_pdf'

/** Prefijos para perfiles A4 dinámicos */
export const VENDER_PRINT_OPTION_REMITO_A4_PREFIX = 'remito_a4:'
export const VENDER_PRINT_OPTION_FACTURA_A4_PREFIX = 'factura_a4:'

/** Configuración por defecto: Ticket 2.0 para ambos escenarios */
export const VENDER_PRINT_OPTIONS_DEFAULTS = {
	use_ticket_2_for_both: true,
	remito: VENDER_PRINT_OPTION_TICKET_2,
	facturado: VENDER_PRINT_OPTION_TICKET_2,
}

/**
 * Normaliza print_options recibidas desde la API.
 *
 * @param {Object|null|undefined} print_options
 * @returns {Object}
 */
export function normalize_vender_print_options(print_options) {
	const normalized = Object.assign({}, VENDER_PRINT_OPTIONS_DEFAULTS)

	if (!print_options || typeof print_options !== 'object') {
		return normalized
	}

	if (typeof print_options.use_ticket_2_for_both !== 'undefined') {
		normalized.use_ticket_2_for_both = !!print_options.use_ticket_2_for_both
	}

	if (print_options.remito) {
		normalized.remito = sanitize_vender_print_option_key(print_options.remito)
	}

	if (print_options.facturado) {
		normalized.facturado = sanitize_vender_print_option_key(print_options.facturado)
	}

	if (normalized.use_ticket_2_for_both) {
		normalized.remito = VENDER_PRINT_OPTION_TICKET_2
		normalized.facturado = VENDER_PRINT_OPTION_TICKET_2
	}

	return normalized
}

/**
 * Valida una clave de impresión fija o de perfil A4.
 *
 * @param {string} option_key
 * @returns {string}
 */
export function sanitize_vender_print_option_key(option_key) {
	if (!option_key || typeof option_key !== 'string') {
		return VENDER_PRINT_OPTION_TICKET_2
	}

	const fixed_keys = [
		VENDER_PRINT_OPTION_TICKET_2,
		VENDER_PRINT_OPTION_TICKET_PDF,
		VENDER_PRINT_OPTION_FACTURA_TICKET_PDF,
	]

	if (fixed_keys.indexOf(option_key) !== -1) {
		return option_key
	}

	if (/^remito_a4:\d+$/.test(option_key)) {
		return option_key
	}

	if (/^factura_a4:\d+$/.test(option_key)) {
		return option_key
	}

	return VENDER_PRINT_OPTION_TICKET_2
}

/**
 * Indica si un perfil PDF corresponde a hoja A4.
 *
 * @param {Object} profile
 * @returns {boolean}
 */
export function is_vender_print_profile_a4(profile) {
	const sheet_type_name = profile && profile.sheet_type ? profile.sheet_type.name : null
	return sheet_type_name === 'A4'
}

/**
 * Normaliza booleanos de API/pivot.
 *
 * @param {any} value
 * @returns {boolean}
 */
export function normalize_vender_print_boolean(value) {
	if (value === true || value === 1 || value === '1') {
		return true
	}
	return false
}

/**
 * Perfiles A4 de remito (no fiscales) para el modelo sale.
 *
 * @param {Array} profiles
 * @returns {Array}
 */
export function get_vender_remito_a4_profiles(profiles) {
	const result = []

	if (!Array.isArray(profiles)) {
		return result
	}

	profiles.forEach(function (profile) {
		if (profile.model_name !== 'sale') {
			return
		}

		if (!is_vender_print_profile_a4(profile)) {
			return
		}

		if (normalize_vender_print_boolean(profile.is_afip_ticket)) {
			return
		}

		result.push(profile)
	})

	return result
}

/**
 * Perfiles A4 fiscales (facturas) para el modelo sale.
 *
 * @param {Array} profiles
 * @returns {Array}
 */
export function get_vender_factura_a4_profiles(profiles) {
	const result = []

	if (!Array.isArray(profiles)) {
		return result
	}

	profiles.forEach(function (profile) {
		if (profile.model_name !== 'sale') {
			return
		}

		if (!is_vender_print_profile_a4(profile)) {
			return
		}

		if (!normalize_vender_print_boolean(profile.is_afip_ticket)) {
			return
		}

		result.push(profile)
	})

	return result
}

/**
 * Opciones del select para ventas sin ticket AFIP (remitos).
 *
 * @param {Array} profiles
 * @returns {Array<{value: string, text: string}>}
 */
export function build_vender_remito_print_select_options(profiles) {
	const options = [
		{ value: VENDER_PRINT_OPTION_TICKET_PDF, text: 'Ticket venta' },
		{ value: VENDER_PRINT_OPTION_TICKET_2, text: 'Ticket 2.0' },
	]

	get_vender_remito_a4_profiles(profiles).forEach(function (profile) {
		options.push({
			value: VENDER_PRINT_OPTION_REMITO_A4_PREFIX + profile.id,
			text: 'Remito A4: ' + profile.name,
		})
	})

	return options
}

/**
 * Opciones del select para ventas facturadas (con ticket AFIP).
 *
 * @param {Array} profiles
 * @returns {Array<{value: string, text: string}>}
 */
export function build_vender_facturado_print_select_options(profiles) {
	const options = [
		{ value: VENDER_PRINT_OPTION_FACTURA_TICKET_PDF, text: 'Ticket factura AFIP' },
		{ value: VENDER_PRINT_OPTION_TICKET_2, text: 'Ticket 2.0' },
	]

	get_vender_factura_a4_profiles(profiles).forEach(function (profile) {
		options.push({
			value: VENDER_PRINT_OPTION_FACTURA_A4_PREFIX + profile.id,
			text: 'Factura A4: ' + profile.name,
		})
	})

	return options
}

/**
 * Resuelve la clave de impresión según configuración y tipo de venta.
 *
 * @param {Object} print_options
 * @param {boolean} sale_has_afip_ticket_with_cae
 * @returns {string}
 */
export function resolve_vender_print_option_key(print_options, sale_has_afip_ticket_with_cae) {
	const normalized = normalize_vender_print_options(print_options)

	if (normalized.use_ticket_2_for_both) {
		return VENDER_PRINT_OPTION_TICKET_2
	}

	if (sale_has_afip_ticket_with_cae) {
		return normalized.facturado
	}

	return normalized.remito
}

/**
 * Compara dos objetos print_options normalizados.
 *
 * @param {Object} left
 * @param {Object} right
 * @returns {boolean}
 */
export function vender_print_options_are_equal(left, right) {
	const a = normalize_vender_print_options(left)
	const b = normalize_vender_print_options(right)

	return a.use_ticket_2_for_both === b.use_ticket_2_for_both
		&& a.remito === b.remito
		&& a.facturado === b.facturado
}
