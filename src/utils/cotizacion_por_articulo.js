export const CAMPOS_COTIZACION = ['cotizacion_aplicada', 'cotizacion_origen', 'moneda_base_precio', 'moneda_base_costo']

export function cotizacion_valida(valor) {
	return valor !== '' && valor !== null && Number.isFinite(Number(valor)) && Number(valor) >= 0.000001 && Number(valor) < 100000000000000
}

export function normalizar_cotizacion(valor) {
	return cotizacion_valida(valor) ? Number(Number(valor).toFixed(6)) : null
}

export function moneda_normalizada(valor) {
	return Number(valor) === 2 ? 2 : 1
}

export function copiar_cotizacion(origen, destino) {
	CAMPOS_COTIZACION.forEach(campo => {
		if (Object.prototype.hasOwnProperty.call(origen, campo)) destino[campo] = origen[campo]
	})
	return destino
}

export function inicializar_cotizacion(item, estado, owner, documento = null) {
	if (!item || !item.is_article) return item
	if (item.cotizacion_origen) return item
	if (item.pivot && item.pivot.cotizacion_origen) {
		return copiar_cotizacion(item.pivot, item)
	}
	if (!estado.cotizacion_por_articulo_disponible) return item
	if (item.pivot && documento) {
		item.cotizacion_aplicada = cotizacion_valida(documento.valor_dolar) ? normalizar_cotizacion(documento.valor_dolar) : null
		item.cotizacion_origen = 'historica'
		item.moneda_base_precio = moneda_normalizada(documento.moneda_id)
		item.moneda_base_costo = moneda_normalizada(documento.moneda_id)
	} else {
		let proveedor = item.provider || (item.article && item.article.provider)
		let dolar = proveedor && proveedor.dolar
		item.cotizacion_aplicada = cotizacion_valida(dolar) ? normalizar_cotizacion(dolar) : normalizar_cotizacion(estado.valor_dolar)
		if (cotizacion_valida(item.cotizacion_aplicada)) item.cotizacion_origen = cotizacion_valida(dolar) ? 'proveedor' : 'vender'
		item.moneda_base_precio = Number(item.cost_in_dollars) === 1 && !Number(owner.cotizar_precios_en_dolares) ? 2 : 1
		item.moneda_base_costo = Number(item.cost_in_dollars) === 1 ? 2 : 1
	}
	return item
}

export function convertir_importe(importe, desde, hacia, cotizacion) {
	if (moneda_normalizada(desde) === moneda_normalizada(hacia)) return Number(importe)
	if (!cotizacion_valida(cotizacion)) return Number(importe)
	return moneda_normalizada(hacia) === 2 ? Number(importe) / Number(cotizacion) : Number(importe) * Number(cotizacion)
}

/** Sólo se llama por una decisión explícita. Conserva las fotos, sin leer la ficha actual. */
export function aplicar_cotizacion(item, nueva, origen, moneda, moneda_anterior = moneda) {
	if (!cotizacion_valida(nueva)) return false
	nueva = normalizar_cotizacion(nueva)
	if (item.pivot) item.pivot = Object.assign({}, item.pivot)
	let anterior = Number(item.cotizacion_aplicada)
	if (item.pivot && cotizacion_valida(anterior)) {
		if (!item._foto_cotizacion) {
			Object.defineProperty(item, '_foto_cotizacion', { configurable: true, writable: true, value: {
				cotizacion: anterior, moneda: moneda_normalizada(moneda_anterior), pivot: Object.assign({}, item.pivot), cost: item.cost, price_vender: item.price_vender,
			} })
		}
		let foto = item._foto_cotizacion
		let fp = convertir_importe(convertir_importe(1, foto.moneda, item.moneda_base_precio, foto.cotizacion), item.moneda_base_precio, moneda, nueva)
		let fc = convertir_importe(convertir_importe(1, foto.moneda, item.moneda_base_costo, foto.cotizacion), item.moneda_base_costo, moneda, nueva)
		;['price', 'price_sin_recargos_de_venta', 'price_sin_descuentos_de_venta', 'price_sin_iva'].forEach(campo => {
			if (foto.pivot[campo] !== null && foto.pivot[campo] !== undefined) item.pivot[campo] = Number((Number(foto.pivot[campo]) * fp).toFixed(campo.indexOf('de_venta') >= 0 ? 6 : 2))
		})
		if (foto.pivot.cost !== null && foto.pivot.cost !== undefined) {
			item.pivot.cost = Number((Number(foto.pivot.cost) * fc).toFixed(2))
			item.cost = item.pivot.cost
		}
		if (item.desde_comprobante_guardado) item.price_vender = Number((Number(foto.price_vender) * fp).toFixed(6))
		delete item._origen_moneda
	}
	item.cotizacion_aplicada = Number(nueva)
	item.cotizacion_origen = origen
	if (item.pivot) copiar_cotizacion(item, item.pivot)
	return true
}
