/**
 * Opciones configurables del atajo Imprimir en el módulo Vender.
 * Las claves coinciden con los métodos de sale-print-buttons/Index.vue.
 */

/** Ticket 2.0 (remito y facturado) */
export const VENDER_PRINT_OPTION_TICKET_2 = 'ticket_2'

/**
 * Cómo se muestra `ticket_2` en los selects (misión diseno-ticket-comandera, D-L1).
 *
 * Desde esa misión `ticket_2` ya no es "el ESC/POS que arma el navegador" sino "el ticket de
 * comandera por defecto": la API elige el diseño que corresponda (el de factura si la venta tiene
 * CAE, el de remito si no) y, si ese diseño nunca se armó con cajas, sale el Ticket 2.0 de siempre.
 * La clave guardada no cambia, así que las configuraciones viejas siguen andando igual.
 */
export const VENDER_PRINT_OPTION_TICKET_2_TEXT = 'Ticket 2.0 (el ticket por defecto)'

/** Ticket venta PDF (sin AFIP) */
export const VENDER_PRINT_OPTION_TICKET_PDF = 'ticket_pdf'

/** Ticket factura AFIP (primer comprobante con CAE al imprimir) */
export const VENDER_PRINT_OPTION_FACTURA_TICKET_PDF = 'factura_ticket_pdf'

/** Prefijos para perfiles A4 dinámicos */
export const VENDER_PRINT_OPTION_REMITO_A4_PREFIX = 'remito_a4:'
export const VENDER_PRINT_OPTION_FACTURA_A4_PREFIX = 'factura_a4:'

/**
 * Prefijo para los diseños de ticket de comandera (misión diseno-ticket-comandera, 9/10/2026).
 *
 * `ticket:<id>` imprime ESE diseño directo a la comandera (ESC/POS por el agente o por QZ, no PDF).
 * Va en las dos listas: en la de remitos se ofrecen los tickets no fiscales y en la de facturadas
 * los fiscales (que imprimen con el primer comprobante con CAE de la venta).
 *
 * 🔴 La API tiene que aceptar este prefijo al guardar (`VenderKeyboardShortcutHelper` para el
 * atajo y `UserController::resolve_sale_factura_print_option` para la factura ARCA). Una API que
 * no lo conoce lo cambia por `ticket_2` (el atajo) o por null (la factura): no rompe nada, imprime
 * el ticket por defecto.
 */
export const VENDER_PRINT_OPTION_TICKET_PREFIX = 'ticket:'

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
 * Valida una clave de impresión fija, de perfil de hoja (A4) o de ticket de comandera.
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

	// Diseño de ticket de comandera (misión diseno-ticket-comandera).
	if (/^ticket:\d+$/.test(option_key)) {
		return option_key
	}

	return VENDER_PRINT_OPTION_TICKET_2
}

/**
 * Indica si un tipo de hoja es un rollo de comandera (un ticket) y no una hoja.
 *
 * Decisión D2 de la misión diseno-ticket-comandera: lo que hace ticket a un diseño es su tipo de
 * hoja, y un tipo de hoja es ticket cuando no tiene alto (`height` NULL: el rollo es continuo). No
 * hay ninguna columna aparte que diga "es ticket".
 *
 * 🔴 La comparación es ESTRICTA contra null a propósito. Un `sheet_type` que viene recortado (sin la
 * clave `height`, como el de algún perfil viejo guardado offline) se toma como HOJA: confundir una
 * hoja con un ticket la sacaría del menú Imprimir (Remitos A4 / Facturas A4), mientras que el error
 * contrario solo la lista de más, y la API igual se niega a dibujar un ticket como PDF (D4).
 *
 * @param {Object|null} sheet_type {id, name, width, height}
 * @returns {boolean}
 */
export function es_tipo_de_hoja_ticket(sheet_type) {
	return !!sheet_type && typeof sheet_type === 'object' && sheet_type.height === null
}

/**
 * Indica si un perfil de PDF es un diseño de ticket de comandera.
 *
 * Solo una venta puede tener un ticket (la API devuelve 422 si otro modelo lo intenta), así que
 * el model_name se chequea igual: un perfil de presupuesto o de artículo nunca es ticket.
 *
 * @param {Object} profile perfil del store pdf_column_profile (trae `sheet_type`).
 * @returns {boolean}
 */
export function es_perfil_de_ticket(profile) {
	return !!profile && profile.model_name === 'sale' && es_tipo_de_hoja_ticket(profile.sheet_type)
}

/**
 * Indica si un perfil PDF es de HOJA (se imprime como PDF), y no un ticket de comandera.
 *
 * El nombre viejo se conserva porque lo usan las listas del atajo de Vender, pero desde la misión
 * diseno-ticket-comandera (D12) ya no pregunta por el nombre 'A4': es hoja todo perfil SIN tipo de
 * hoja o con un tipo de hoja que tiene alto. Antes filtraba `sheet_type.name == 'A4'`, y como el
 * formulario del ABM nunca mandaba `sheet_type_id`, un diseño de venta creado desde Diseño de PDF
 * quedaba sin tipo de hoja y no aparecía en ningún menú de impresión.
 *
 * @param {Object} profile
 * @returns {boolean}
 */
export function is_vender_print_profile_a4(profile) {
	if (!profile) {
		return false
	}

	return !es_tipo_de_hoja_ticket(profile.sheet_type)
}

/**
 * Diseños de ticket de comandera de la venta, de una clase (fiscal o no fiscal).
 *
 * El orden es el mismo con el que la API elige el ticket "por defecto" cuando no se le pide uno
 * (sección 3.6 del contrato): primero el marcado como por defecto, después el de menor id. Así el
 * primero de la lista es justo el que imprime "Ticket 2.0, el ticket por defecto".
 *
 * @param {Array} profiles perfiles del store pdf_column_profile (de cualquier modelo).
 * @param {boolean} fiscal true = los de factura de ARCA (is_afip_ticket), false = los de remito.
 * @returns {Array}
 */
export function get_vender_ticket_profiles(profiles, fiscal) {
	const result = []

	if (!Array.isArray(profiles)) {
		return result
	}

	profiles.forEach(function (profile) {
		if (!es_perfil_de_ticket(profile)) {
			return
		}

		if (normalize_vender_print_boolean(profile.is_afip_ticket) !== !!fiscal) {
			return
		}

		result.push(profile)
	})

	result.sort(function (a, b) {
		const a_default = normalize_vender_print_boolean(a.is_default) ? 0 : 1
		const b_default = normalize_vender_print_boolean(b.is_default) ? 0 : 1

		if (a_default !== b_default) {
			return a_default - b_default
		}

		return Number(a.id) - Number(b.id)
	})

	return result
}

/**
 * Busca el diseño de ticket al que apunta una clave `ticket:<id>`.
 *
 * @param {string} option_key
 * @param {Array} profiles perfiles del store pdf_column_profile.
 * @returns {{profile_id: number|null, profile: Object|null}} `profile` es null si el id no
 *          existe en la lista o si ya no es un ticket (lo borraron o lo pasaron a hoja).
 */
export function find_vender_ticket_profile(option_key, profiles) {
	const resultado = {
		profile_id: null,
		profile: null,
	}

	if (typeof option_key !== 'string' || option_key.indexOf(VENDER_PRINT_OPTION_TICKET_PREFIX) !== 0) {
		return resultado
	}

	const profile_id = parseInt(option_key.replace(VENDER_PRINT_OPTION_TICKET_PREFIX, ''), 10)

	if (!profile_id) {
		return resultado
	}

	resultado.profile_id = profile_id

	if (!Array.isArray(profiles)) {
		return resultado
	}

	profiles.forEach(function (profile) {
		if (!resultado.profile && profile && Number(profile.id) === profile_id && es_perfil_de_ticket(profile)) {
			resultado.profile = profile
		}
	})

	return resultado
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
 * Perfiles de HOJA de remito (no fiscales) para el modelo sale: los que se imprimen como PDF.
 * Los tickets de comandera quedan afuera (van en su propia opción `ticket:<id>`).
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
 * Perfiles de HOJA fiscales (facturas) para el modelo sale: los que se imprimen como PDF.
 * Los tickets de comandera quedan afuera (van en su propia opción `ticket:<id>`).
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
		{ value: VENDER_PRINT_OPTION_TICKET_2, text: VENDER_PRINT_OPTION_TICKET_2_TEXT },
	]

	// Los diseños de ticket de comandera no fiscales (misión diseno-ticket-comandera).
	get_vender_ticket_profiles(profiles, false).forEach(function (profile) {
		options.push({
			value: VENDER_PRINT_OPTION_TICKET_PREFIX + profile.id,
			text: 'Comandera: ' + profile.name,
		})
	})

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
		{ value: VENDER_PRINT_OPTION_TICKET_2, text: VENDER_PRINT_OPTION_TICKET_2_TEXT },
	]

	// Los diseños de ticket de comandera fiscales: imprimen con el primer comprobante con CAE.
	get_vender_ticket_profiles(profiles, true).forEach(function (profile) {
		options.push({
			value: VENDER_PRINT_OPTION_TICKET_PREFIX + profile.id,
			text: 'Comandera: ' + profile.name,
		})
	})

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
