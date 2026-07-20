/**
 * Catálogo compartido del diseñador visual de header del PDF (prompt 441).
 *
 * Centraliza los chips disponibles para cada cuadrante, sus labels legibles, los
 * campos fiscales obligatorios y el layout por defecto. Replica en el frontend lo
 * que ya expone `PdfColumnProfile::default_header_layout()` en el backend
 * (empresa-api, prompt 437) para poder inicializar el diseñador sin ida y vuelta
 * al servidor. Si el catálogo cambia en el backend, actualizar también acá.
 */

/**
 * Diccionario clave -> label legible de los chips del bloque emisor.
 * Mismo catálogo documentado en PdfColumnProfile.php (prompt 437) y usado por
 * AfipPdfHelper::$emisor_field_labels para imprimir el PDF.
 */
export const EMISOR_CHIP_LABELS = {
	razon_social: 'Razón Social',
	domicilio_comercial: 'Domicilio Comercial',
	condicion_iva: 'Condición IVA',
	punto_venta: 'Punto de Venta',
	cuit: 'CUIT',
	ingresos_brutos: 'Ingresos Brutos',
	inicio_actividades: 'Fecha de Inicio de Actividades',
	numero_comprobante: 'N° Comprobante',
	fecha_emision: 'Fecha de Emisión',
	web: 'Web',
	telefono: 'Teléfono',
	email: 'Email',
}

/**
 * Diccionario clave -> label legible de los chips del bloque receptor.
 * Solo tiene sentido en perfiles no fiscales (remito negro).
 */
export const RECEPTOR_CHIP_LABELS = {
	cliente_nombre: 'Cliente',
	cliente_telefono: 'Teléfono',
	cliente_localidad: 'Localidad',
	cliente_direccion: 'Dirección',
	cliente_cuit: 'CUIT',
	cliente_condicion_iva: 'Condición IVA',
	vendedor: 'Vendedor',
	empleado: 'Empleado',
}

/**
 * Chips del emisor obligatorios cuando el perfil es fiscal (is_afip_ticket = true).
 * Se pueden reordenar y mover de cuadrante, pero no se pueden quitar del header.
 * Coincide con `AfipPdfHelper::enforce_fiscal_required_fields()` del backend
 * (required_izquierda + required_derecha combinados).
 */
export const FISCAL_REQUIRED_EMISOR_KEYS = [
	'razon_social',
	'domicilio_comercial',
	'condicion_iva',
	'numero_comprobante',
	'fecha_emision',
	'cuit',
	'ingresos_brutos',
	'inicio_actividades',
	'punto_venta',
]

/**
 * Devuelve las claves de chips de emisor disponibles según el tipo de perfil.
 * 'punto_venta' solo aplica a perfiles fiscales (numeración ARCA).
 *
 * @param {boolean} is_afip Si el perfil es fiscal (is_afip_ticket).
 * @return {Array<string>} Claves de chips habilitadas para el catálogo de emisor.
 */
export function emisor_chip_keys(is_afip) {
	return Object.keys(EMISOR_CHIP_LABELS).filter(function (key) {
		if (key === 'punto_venta') {
			return !!is_afip
		}
		return true
	})
}

/**
 * Label legible de un chip, buscando primero en emisor y después en receptor.
 *
 * @param {string} key Clave del chip (ej. 'razon_social').
 * @return {string} Texto legible a mostrar en la UI.
 */
export function chip_label(key) {
	if (EMISOR_CHIP_LABELS[key]) {
		return EMISOR_CHIP_LABELS[key]
	}
	if (RECEPTOR_CHIP_LABELS[key]) {
		return RECEPTOR_CHIP_LABELS[key]
	}
	return key
}

/**
 * Indica si un chip de emisor es obligatorio (no se puede quitar) para el perfil actual.
 *
 * @param {string} key Clave del chip.
 * @param {boolean} is_afip Si el perfil es fiscal.
 * @return {boolean} true si el chip está bloqueado para remoción.
 */
export function is_emisor_chip_locked(key, is_afip) {
	if (!is_afip) {
		return false
	}
	return FISCAL_REQUIRED_EMISOR_KEYS.indexOf(key) !== -1
}

/**
 * Layout de header por defecto, réplica de `PdfColumnProfile::default_header_layout($is_afip)`
 * del backend (empresa-api). Se usa para inicializar el diseñador cuando el perfil
 * todavía no tiene `header_layout` guardado, y para "Restaurar diseño por defecto".
 *
 * @param {boolean} is_afip Si el perfil es fiscal (agrega 'punto_venta' en emisor.derecha).
 * @return {{emisor: {izquierda: string[], derecha: string[]}, receptor: {izquierda: string[]}}}
 */
export function default_header_layout(is_afip) {
	/* Emisor derecha base; se agrega punto_venta al final solo si el perfil es fiscal */
	const emisor_derecha = [
		'numero_comprobante',
		'fecha_emision',
		'cuit',
		'ingresos_brutos',
		'inicio_actividades',
	]

	if (is_afip) {
		emisor_derecha.push('punto_venta')
	}

	return {
		emisor: {
			izquierda: ['razon_social', 'domicilio_comercial', 'condicion_iva'],
			derecha: emisor_derecha,
		},
		receptor: {
			izquierda: [
				'cliente_nombre',
				'cliente_telefono',
				'cliente_localidad',
				'cliente_direccion',
				'cliente_cuit',
			],
		},
	}
}

/** Tope mínimo (mm) para el tamaño de logo redimensionable con la manija. */
export const LOGO_SIZE_MM_MIN = 10

/** Tope máximo (mm) para el tamaño de logo redimensionable con la manija. */
export const LOGO_SIZE_MM_MAX = 60

/** Tamaño de logo por defecto (mm) cuando el perfil no tiene logo_size_mm configurado. */
export const LOGO_SIZE_MM_DEFAULT = 25

/**
 * Factor de escala px -> mm de la previsualización del diseñador. Se usa tanto para
 * dimensionar el recuadro de la hoja como para convertir el arrastre de la manija
 * del logo (px) a milímetros reales.
 */
export const PREVIEW_PX_PER_MM = 2.5
