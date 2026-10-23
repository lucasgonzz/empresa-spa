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
	sucursal_comprobante: 'Sucursal del comprobante',
	todas_las_sucursales: 'Todas las sucursales',
}

/**
 * Chips de sucursal del emisor (misión pdf-direccion-sucursales, 23/10/2026): la dirección del
 * comprobante sale de las sucursales. Además de los dos fijos de EMISOR_CHIP_LABELS
 * ('sucursal_comprobante' y 'todas_las_sucursales') hay uno por sucursal del negocio,
 * 'sucursal_<id>'. Los resuelve `SucursalesDelEncabezadoPdf` en empresa-api; ninguno es obligatorio.
 */
export const PREFIJO_CHIP_DE_SUCURSAL = 'sucursal_'

/** Patrón de la clave de una sucursal puntual ('sucursal_12'). */
const PATRON_CHIP_DE_SUCURSAL_PUNTUAL = /^sucursal_(\d+)$/

/**
 * Las sucursales del negocio de una lista de `address` del store: sin los domicilios de compradores
 * de la tienda vieja (`buyer_id`), que viven en la misma tabla y no son sucursales.
 *
 * @param {Array<Object>} addresses Modelos `address` (puede venir undefined).
 * @return {Array<Object>}
 */
export function sucursales_del_negocio(addresses) {
	if (!Array.isArray(addresses)) {
		return []
	}
	return addresses.filter(function (address) {
		return address && !address.buyer_id
	})
}

/**
 * Label de un chip de sucursal puntual ('sucursal_<id>'): "Sucursal: <Nombre>" (el Nombre de la
 * sucursal es `street`, así la carga el ABM). Si la sucursal ya no está, lo dice: el chip queda
 * guardado y el PDF no imprime nada.
 *
 * @param {string} key
 * @param {Array<Object>} addresses
 * @return {string|null} null si la clave no es de una sucursal puntual.
 */
function label_de_sucursal_puntual(key, addresses) {
	const partes = PATRON_CHIP_DE_SUCURSAL_PUNTUAL.exec(key)
	if (!partes) {
		return null
	}
	const id = parseInt(partes[1], 10)
	const sucursal = sucursales_del_negocio(addresses).find(function (address) {
		return parseInt(address.id, 10) === id
	})
	if (!sucursal) {
		return 'Sucursal eliminada'
	}
	const nombre = sucursal.street ? String(sucursal.street).trim() : ''
	return 'Sucursal: ' + (nombre !== '' ? nombre : '#' + id)
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
 * Campos del cliente que el PDF del pedido online NUNCA resuelve: el comprador de la tienda no
 * tiene vendedor ni empleado asociado ni condición de IVA. Ofrecerlos en la paleta deja arrastrar
 * un campo que se guarda y no imprime nada (el PDF saltea los valores vacíos).
 */
const RECEPTOR_CHIP_KEYS_SIN_VALOR_EN_PEDIDO = ['vendedor', 'empleado', 'cliente_condicion_iva']

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
 * 'punto_venta' solo aplica a perfiles fiscales (numeración ARCA). Al final, un chip
 * 'sucursal_<id>' por cada sucursal del negocio (fiscal y no fiscal).
 *
 * @param {boolean} is_afip Si el perfil es fiscal (is_afip_ticket).
 * @param {Array<Object>} [addresses] Modelos `address` del store.
 * @return {Array<string>} Claves de chips habilitadas para el catálogo de emisor.
 */
export function emisor_chip_keys(is_afip, addresses) {
	const keys = Object.keys(EMISOR_CHIP_LABELS).filter(function (key) {
		if (key === 'punto_venta') {
			return !!is_afip
		}
		return true
	})
	sucursales_del_negocio(addresses).forEach(function (address) {
		keys.push(PREFIJO_CHIP_DE_SUCURSAL + address.id)
	})
	return keys
}

/**
 * Claves de los chips de receptor (datos del cliente) que se ofrecen según el tipo de perfil.
 * Venta y presupuesto ofrecen todos; el pedido online no ofrece los que nunca tendrían valor.
 *
 * @param {string} model_name Modelo del perfil ('sale' | 'budget' | 'order').
 * @return {Array<string>} Claves de chips habilitadas para el catálogo de receptor.
 */
export function receptor_chip_keys(model_name) {
	return Object.keys(RECEPTOR_CHIP_LABELS).filter(function (key) {
		if (model_name === 'order') {
			return RECEPTOR_CHIP_KEYS_SIN_VALOR_EN_PEDIDO.indexOf(key) === -1
		}
		return true
	})
}

/**
 * Label legible de un chip, buscando primero en emisor y después en receptor.
 *
 * @param {string} key Clave del chip (ej. 'razon_social').
 * @param {Array<Object>} [addresses] Modelos `address` del store, para el nombre de un chip
 *     'sucursal_<id>'.
 * @return {string} Texto legible a mostrar en la UI.
 */
export function chip_label(key, addresses) {
	if (EMISOR_CHIP_LABELS[key]) {
		return EMISOR_CHIP_LABELS[key]
	}
	if (RECEPTOR_CHIP_LABELS[key]) {
		return RECEPTOR_CHIP_LABELS[key]
	}
	const de_sucursal = label_de_sucursal_puntual(key, addresses)
	if (de_sucursal) {
		return de_sucursal
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
 * La sucursal del comprobante va pegada al Domicilio Comercial (misión pdf-direccion-sucursales,
 * D6), en fiscal y no fiscal: un perfil sin diseño guardado la imprime.
 *
 * Para un presupuesto suma además el 'vendedor' al final del bloque del cliente: el PDF de
 * presupuesto de siempre imprimía "Vendedor: <empleado que lo cargó>". Es el mismo criterio que
 * `PdfDocumentSetupHelper::default_header_layout_for()` del backend.
 *
 * @param {boolean} is_afip Si el perfil es fiscal (agrega 'punto_venta' en emisor.derecha).
 * @param {string} [model_name] Modelo del perfil; solo 'budget' cambia el resultado.
 * @return {{emisor: {izquierda: string[], derecha: string[]}, receptor: {izquierda: string[]}}}
 */
export function default_header_layout(is_afip, model_name) {
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

	const receptor_izquierda = [
		'cliente_nombre',
		'cliente_telefono',
		'cliente_localidad',
		'cliente_direccion',
		'cliente_cuit',
	]

	if (model_name === 'budget') {
		receptor_izquierda.push('vendedor')
	}

	return {
		emisor: {
			izquierda: ['razon_social', 'domicilio_comercial', 'sucursal_comprobante', 'condicion_iva'],
			derecha: emisor_derecha,
		},
		receptor: {
			izquierda: receptor_izquierda,
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
