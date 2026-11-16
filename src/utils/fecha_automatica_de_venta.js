import moment from 'moment'

// La fecha elegida o precargada pertenece al comprobante. Sólo el default sigue al reloj.
export function refrescar_fecha_automatica(state, hoy = moment().format('YYYY-MM-DD')) {
	let previa = state.previus_sales || {}
	if (state.fecha_automatica !== true || state.budget || state.guardar_como_presupuesto
		|| previa.abriendo_venta_previa || (previa.previus_sale && previa.previus_sale.id)) {
		return
	}
	state.created_at = hoy
}

export function problema_de_fecha_de_venta(fecha) {
	if (typeof fecha !== 'string' || !moment(fecha, 'YYYY-MM-DD', true).isValid()) {
		return 'La fecha de la venta está vacía o no es válida. Elegí una fecha válida en Fecha y volvé a guardar; la venta sigue en pantalla.'
	}
	return null
}
