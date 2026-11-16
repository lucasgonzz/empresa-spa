const { test } = require('node:test')
const assert = require('node:assert/strict')
const XLSX = require('xlsx')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const componente = cargar('components/listado/modals/ai-excel-import/Index.vue', {
	'xlsx/xlsx.mjs': XLSX,
	'@/common-vue/components/model/Index': {},
	'./RelacionesParecidas': {},
	'@/mixins/prueba': {},
}).default

function lector(libro) {
	const contexto = { workbook_cache: libro, hojas: libro.SheetNames.map(nombre => ({ nombre })), detect_header_row() {} }
	Object.assign(contexto, componente.methods)
	// La detección del encabezado tiene sus propios casos: acá se prueba el final de la hoja.
	contexto.detect_header_row = function() {}
	return contexto
}

test('la última fila ignora formato y espacios, y conserva cero y false en la hoja elegida', () => {
	const hoja = { '!ref': 'A1:D1048576', A1: { t: 's', v: 'Artículo' }, A2: { t: 's', v: 'Tornillo' }, B4: { t: 'n', v: 0 }, C6: { t: 'b', v: false }, A8: { t: 's', v: '  \t ' }, A10: { t: 'z' } }
	const libro = { SheetNames: ['Datos', 'Otra'], Sheets: { Datos: hoja, Otra: XLSX.utils.aoa_to_sheet([['Nombre'], ['Tuerca']]) } }
	const contexto = lector(libro)
	assert.equal(contexto.leer_hoja_y_detectar(0), 6)
	assert.equal(contexto.leer_hoja_y_detectar(1), 2)
	assert.equal(contexto.hoja_leida, 1)
})

for (const bookType of ['xlsx', 'biff8']) {
	test('detecta el final de un archivo ' + bookType + ' real después de leer su buffer', () => {
		const libro = XLSX.utils.book_new()
		const hoja = XLSX.utils.aoa_to_sheet([['Nombre', 'Precio'], ['Tuerca', 0], [], ['Tornillo', 3], ['  ']])
		XLSX.utils.book_append_sheet(libro, hoja, 'Lista')
		const buffer = XLSX.write(libro, { type: 'buffer', bookType })
		const contexto = lector(libro)
		assert.equal(contexto.detect_last_excel_row_from_buffer(buffer), 4)
	})
}

test('el alta queda seleccionada aunque todavía no haya catálogo de proveedores', () => {
	const cerrados = []
	const contexto = { proveedores_creados: [], selected_provider_id: null, modal_id: 'importacion', $bvModal: { hide(id) { cerrados.push(id) } } }
	componente.methods.seleccionar_proveedor_creado.call(contexto, { id: 17, name: 'Proveedor nuevo' }, { es_nuevo: true })
	assert.equal(contexto.selected_provider_id, 17)
	const opciones = componente.computed.provider_options.call({ providers: [], proveedores_creados: contexto.proveedores_creados })
	assert.deepEqual(opciones, [{ value: null, text: 'Sin proveedor' }, { value: 17, text: 'Proveedor nuevo' }])
	assert.deepEqual(cerrados, ['importacion-nuevo-proveedor'])
	const repetidos = componente.computed.provider_options.call({ providers: [{ id: 17, name: 'Proveedor nuevo' }], proveedores_creados: contexto.proveedores_creados })
	assert.equal(repetidos.length, 2)
})

test('editar un proveedor no cambia la selección de la importación', () => {
	const contexto = { selected_provider_id: 4, proveedores_creados: [] }
	componente.methods.seleccionar_proveedor_creado.call(contexto, { id: 17, name: 'Editado' }, { es_nuevo: false })
	assert.equal(contexto.selected_provider_id, 4)
	assert.deepEqual(contexto.proveedores_creados, [])
})

test('un reintento de lectura no analiza el archivo que el usuario reemplazó', async () => {
	let terminar
	let pedidos = 0
	const archivo = { name: 'lista.xlsx' }
	const contexto = { file: archivo, finish_row: '', file_processing: false, es_archivo_pdf: () => false, resolve_selected_excel_file: archivo => archivo, process_excel_file: () => new Promise(resolve => { terminar = resolve }), run_analyze_request() { pedidos++ } }
	componente.methods.analyze.call(contexto)
	contexto.file = { name: 'otra.xlsx' }
	terminar()
	await new Promise(resolve => setImmediate(resolve))
	assert.equal(pedidos, 0)
})
