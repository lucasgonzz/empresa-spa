// Compatibilidad con formularios y ventas offline anteriores al contrato de ausencia explícita.
export function incoterms_opcional(valor) {
	return valor === 0 || valor === '0' || valor === '' || typeof valor === 'undefined' ? null : valor
}

export function mensaje_error_facturacion(error) {
	let respuesta = error && error.response
	if (respuesta && respuesta.status === 422 && respuesta.data && typeof respuesta.data.message === 'string') {
		return respuesta.data.message
	}
	return 'No se pudo confirmar la facturación. Revisá los comprobantes de la venta antes de volver a emitir para evitar duplicados.'
}

export function aviso_resultado_fiscal(datos) {
	let estado = datos && datos.estado
	if (!estado) {
		// Una API anterior sólo devuelve la venta. El último intento decide, incluso
		// si una porción anterior de esa venta ya tiene CAE.
		let venta = datos && datos.sale
		let tickets = venta && venta.afip_tickets ? venta.afip_tickets : []
		let ultimo = tickets.reduce((actual, ticket) => !actual || ticket.id > actual.id ? ticket : actual, null)
		estado = ultimo && ultimo.cae ? 'emitida' : (ultimo && ultimo.resultado === 'R' ? 'rechazada' : 'pendiente_verificacion')
	}
	if (estado !== 'emitida' && estado !== 'rechazada') {
		return 'El comprobante está pendiente de verificación. Consultá el comprobante de la venta antes de volver a emitir; todavía no se confirmó su autorización.'
	}
	if (estado === 'rechazada') {
		return 'El comprobante fue rechazado. Revisá los errores del comprobante de la venta y corregí los datos antes de volver a emitir.'
	}
	return null
}
