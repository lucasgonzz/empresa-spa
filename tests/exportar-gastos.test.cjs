const { test } = require('node:test')
const assert = require('node:assert/strict')
const XLSX = require('xlsx')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { libroDeGastos } = cargar('components/expenses/exportar_gastos.js', { 'xlsx/xlsx.mjs': XLSX })
const Expense = cargar('views/Expense.vue', { axios: {}, moment: require('moment') }).default

test('La exportación solo toma un rango válido de Gastos con permiso de lectura', () => {
	const expense = { from_dates: true, from_date: '2026-10-01', until_date: '2026-10-31' }
	const vista = {
		$store: { state: { expense } },
		can: permiso => permiso === 'expense.index',
	}
	const rango = () => Expense.computed.rango_exportable.call(vista)
	assert.deepEqual(rango(), { desde: '2026-10-01', hasta: '2026-10-31' })
	expense.until_date = '2026-09-30'
	assert.equal(rango(), null)
	expense.until_date = ''
	assert.deepEqual(rango(), { desde: '2026-10-01', hasta: '2026-10-01' })
	vista.can = () => false
	assert.equal(rango(), null)
})

test('El XLSX cuenta cada gasto una vez y suma cada pago en su propia moneda', () => {
	const base = {
		fecha_gasto: '2026-10-15',
		categoria_id: 10,
		categoria: 'Servicios',
		expense_concept_id: 20,
		concepto: 'Internet',
	}
	const gastos = [
		{
			...base,
			num: 1,
			amount: '100.00',
			moneda_id: 1,
			observations: '=1+1',
			pagos_exportacion: [
				{ current_acount_payment_method_id: 1, name: 'Efectivo', amount: '30.00', moneda_id: 1 },
				{ current_acount_payment_method_id: 1, name: 'Efectivo', amount: '0.50', moneda_id: 2 },
				{ current_acount_payment_method_id: 8, name: null, amount: '20.00', moneda_id: 1 },
			],
		},
		{
			...base,
			num: 2,
			amount: '6.25',
			moneda_id: 2,
			pagos_exportacion: [{ current_acount_payment_method_id: 1, name: 'Efectivo', amount: '6.25', moneda_id: null }],
		},
		{
			...base,
			num: 3,
			amount: '0.10',
			moneda_id: null,
			current_acount_payment_method_id: 1,
			metodo_legacy: 'Efectivo',
			pagos_exportacion: [],
		},
	]
	const binario = XLSX.write(libroDeGastos(gastos), { type: 'buffer', bookType: 'xlsx' })
	const libro = XLSX.read(binario)
	const filas = hoja => XLSX.utils.sheet_to_json(libro.Sheets[hoja], { header: 1 }).slice(1)

	assert.deepEqual(libro.SheetNames, ['Gastos', 'Por categoría', 'Por subcategoría', 'Por método de pago', 'Por moneda'])
	assert.deepEqual(filas('Gastos').map(fila => [fila[0], fila[1], fila[5]]), [
		[1, '2026-10-15', 100], [2, '2026-10-15', 6.25], [3, '2026-10-15', 0.1],
	])
	assert.equal(libro.Sheets.Gastos.I2.v, '=1+1')
	assert.equal(libro.Sheets.Gastos.I2.f, undefined)
	assert.deepEqual(filas('Por categoría'), [['Servicios', 'ARS', 100.1], ['Servicios', 'USD', 6.25]])
	assert.deepEqual(filas('Por subcategoría'), [['Servicios', 'Internet', 'ARS', 100.1], ['Servicios', 'Internet', 'USD', 6.25]])
	assert.deepEqual(filas('Por método de pago'), [
		['Efectivo', 'ARS', 30.1], ['Efectivo', 'USD', 6.75], ['Método de pago #8', 'ARS', 20],
	])
	assert.deepEqual(filas('Por moneda'), [['ARS', 100.1], ['USD', 6.25]])
})

test('Conserva separados los grupos que tienen el mismo nombre y admite un rango vacío', () => {
	const gasto = {
		amount: 10,
		categoria: 'Servicios',
		concepto: 'Internet',
		pagos_exportacion: [],
	}
	const libro = libroDeGastos([
		{ ...gasto, categoria_id: 1, expense_concept_id: 10 },
		{ ...gasto, categoria_id: 2, expense_concept_id: 20 },
	])
	assert.deepEqual(XLSX.utils.sheet_to_json(libro.Sheets['Por categoría'], { header: 1 }).slice(1), [
		['Servicios', 'ARS', 10], ['Servicios', 'ARS', 10],
	])
	const vacio = libroDeGastos([])
	assert.equal(XLSX.utils.sheet_to_json(vacio.Sheets.Gastos, { header: 1 }).length, 1)
})
