import * as XLSX from 'xlsx/xlsx.mjs'

function nombreMoneda(id) {
	if (id === 1) return 'ARS'
	if (id === 2) return 'USD'
	return 'Moneda #' + id
}

function nombre(id, etiqueta, tipo) {
	if (!id) return 'Sin ' + tipo.toLowerCase()
	return etiqueta || tipo + ' #' + id
}

function sumar(resumen, ids, columnas, importe) {
	const clave = JSON.stringify(ids)
	const fila = resumen.get(clave) || [...columnas, 0]
	// Los importes de gastos y pagos se guardan con dos decimales.
	fila[columnas.length] += Math.round(Number(importe) * 100)
	resumen.set(clave, fila)
}

export function libroDeGastos(gastos) {
	const detalle = []
	const porCategoria = new Map()
	const porSubcategoria = new Map()
	const porMetodo = new Map()
	const porMoneda = new Map()

	gastos.forEach(gasto => {
		const categoriaId = Number(gasto.categoria_id) || 0
		const subcategoriaId = Number(gasto.expense_concept_id) || 0
		const monedaId = Number(gasto.moneda_id) || 1
		const categoria = nombre(categoriaId, gasto.categoria, 'Categoría')
		const subcategoria = nombre(subcategoriaId, gasto.concepto, 'Subcategoría')
		const moneda = nombreMoneda(monedaId)
		const importe = Number(gasto.amount)
		const pagos = gasto.pagos_exportacion.length ? gasto.pagos_exportacion : [{
			current_acount_payment_method_id: gasto.current_acount_payment_method_id,
			name: gasto.metodo_legacy,
			moneda_id: monedaId,
			amount: importe,
		}]

		sumar(porCategoria, [categoriaId, monedaId], [categoria, moneda], importe)
		sumar(porSubcategoria, [categoriaId, subcategoriaId, monedaId], [categoria, subcategoria, moneda], importe)
		sumar(porMoneda, [monedaId], [moneda], importe)
		const detallePagos = pagos.map(pago => {
			const metodoId = Number(pago.current_acount_payment_method_id) || 0
			const monedaPagoId = Number(pago.moneda_id) || monedaId
			const metodo = nombre(metodoId, pago.name, 'Método de pago')
			const monedaPago = nombreMoneda(monedaPagoId)
			const importePago = Number(pago.amount)
			sumar(porMetodo, [metodoId, monedaPagoId], [metodo, monedaPago], importePago)
			return metodo + ': ' + monedaPago + ' ' + importePago.toFixed(2)
		})

		detalle.push([
			gasto.num == null ? gasto.id : gasto.num,
			gasto.fecha_gasto,
			categoria,
			subcategoria,
			moneda,
			importe,
			gasto.importe_iva == null ? null : Number(gasto.importe_iva),
			detallePagos.join(' · '),
			gasto.observations || '',
		])
	})

	const libro = XLSX.utils.book_new()
	const agregarHoja = (titulo, encabezados, filas) => {
		XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([encabezados, ...filas]), titulo)
	}
	const agregarResumen = (titulo, encabezados, resumen) => {
		const filas = Array.from(resumen.values(), fila => [
			...fila.slice(0, -1),
			fila[fila.length - 1] / 100,
		])
		agregarHoja(titulo, [...encabezados, 'Moneda', 'Total'], filas)
	}

	agregarHoja('Gastos', ['N°', 'Fecha', 'Categoría', 'Subcategoría', 'Moneda', 'Monto', 'IVA (ARS)', 'Métodos de pago', 'Observaciones'], detalle)
	agregarResumen('Por categoría', ['Categoría'], porCategoria)
	agregarResumen('Por subcategoría', ['Categoría', 'Subcategoría'], porSubcategoria)
	agregarResumen('Por método de pago', ['Método de pago'], porMetodo)
	agregarResumen('Por moneda', [], porMoneda)
	return libro
}

export function descargarGastos(gastos, archivo) {
	XLSX.writeFile(libroDeGastos(gastos), archivo)
}
