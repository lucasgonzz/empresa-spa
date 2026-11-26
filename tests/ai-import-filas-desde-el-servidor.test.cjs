// Misión excel-ultima-fila-servidor: cuando SheetJS no puede leer un .xlsx (zip64 innecesario, como el
// Excel de Plazoleta de 55.521 filas), el paso 1 del modal "Importar con IA" le pide las hojas y la última
// fila con contenido al servidor (POST ai-excel-import/inspeccionar-filas) en vez de dejar el rango vacío.
// Un test() por criterio de aceptación CA6..CA12 de .mision/PLAN.md. El buffer zip64 se arma acá mismo:
// no hay archivos binarios ni del cliente en el repo.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const zlib = require('node:zlib')
const XLSX = require('xlsx')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const componente = cargar('components/listado/modals/ai-excel-import/Index.vue', {
	'xlsx/xlsx.mjs': XLSX,
	'@/common-vue/components/model/Index': {},
	'./RelacionesParecidas': {},
	'@/mixins/prueba': {},
}).default

// Mensaje que hoy ve el usuario cuando no se pudo detectar la última fila.
const MENSAJE_SIN_FILAS = 'No se pudo leer el archivo para detectar filas. Podés analizar igual; el servidor ajustará el rango.'

/**
 * Reescribe un .xlsx válido como lo hace Excel con la hoja de Plazoleta: en el local header de cada
 * entrada los tamaños valen 0xFFFFFFFF y van en un extra zip64 (id 0x0001); el central directory
 * conserva los tamaños reales. SheetJS 0.18.5 lo rechaza con "Bad compressed size".
 *
 * @param {Buffer} buffer_original Un .xlsx común.
 * @returns {Buffer} El mismo libro con marcas zip64 en los local headers.
 */
function forzar_zip64(buffer_original) {
	// Se busca el fin del central directory (EOCD, firma 0x06054b50) desde el final.
	let eocd = buffer_original.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
	let cantidad = buffer_original.readUInt16LE(eocd + 10)
	let cursor = buffer_original.readUInt32LE(eocd + 16)
	// Entradas leídas del central directory original.
	let entradas = []
	for (let i = 0; i < cantidad; i++) {
		let largo_nombre = buffer_original.readUInt16LE(cursor + 28)
		let largo_extra = buffer_original.readUInt16LE(cursor + 30)
		let largo_comentario = buffer_original.readUInt16LE(cursor + 32)
		let offset_local = buffer_original.readUInt32LE(cursor + 42)
		let nombre = buffer_original.subarray(cursor + 46, cursor + 46 + largo_nombre)
		let metodo = buffer_original.readUInt16LE(cursor + 10)
		let crc = buffer_original.readUInt32LE(cursor + 16)
		let comprimido = buffer_original.readUInt32LE(cursor + 20)
		let real = buffer_original.readUInt32LE(cursor + 24)
		// Los datos comprimidos están después del local header original.
		let inicio_datos = offset_local + 30 + buffer_original.readUInt16LE(offset_local + 26) + buffer_original.readUInt16LE(offset_local + 28)
		entradas.push({ nombre, metodo, crc, comprimido, real, datos: buffer_original.subarray(inicio_datos, inicio_datos + comprimido) })
		cursor += 46 + largo_nombre + largo_extra + largo_comentario
	}
	let partes = []
	let central = []
	let posicion = 0
	entradas.forEach(entrada => {
		// Extra zip64: id 0x0001, 16 bytes (tamaño sin comprimir y comprimido de 64 bits).
		let extra = Buffer.alloc(20)
		extra.writeUInt16LE(0x0001, 0)
		extra.writeUInt16LE(16, 2)
		extra.writeBigUInt64LE(BigInt(entrada.real), 4)
		extra.writeBigUInt64LE(BigInt(entrada.comprimido), 12)
		let local = Buffer.alloc(30)
		local.writeUInt32LE(0x04034b50, 0)
		local.writeUInt16LE(45, 4)
		local.writeUInt16LE(0, 6)
		local.writeUInt16LE(entrada.metodo, 8)
		local.writeUInt32LE(0, 10)
		local.writeUInt32LE(entrada.crc, 14)
		local.writeUInt32LE(0xFFFFFFFF, 18)
		local.writeUInt32LE(0xFFFFFFFF, 22)
		local.writeUInt16LE(entrada.nombre.length, 26)
		local.writeUInt16LE(extra.length, 28)
		// Entrada del central directory con los tamaños reales de 32 bits.
		let cd = Buffer.alloc(46)
		cd.writeUInt32LE(0x02014b50, 0)
		cd.writeUInt16LE(45, 4)
		cd.writeUInt16LE(45, 6)
		cd.writeUInt16LE(entrada.metodo, 10)
		cd.writeUInt32LE(entrada.crc, 16)
		cd.writeUInt32LE(entrada.comprimido, 20)
		cd.writeUInt32LE(entrada.real, 24)
		cd.writeUInt16LE(entrada.nombre.length, 28)
		cd.writeUInt32LE(posicion, 42)
		central.push(Buffer.concat([cd, entrada.nombre]))
		let bloque = Buffer.concat([local, entrada.nombre, extra, entrada.datos])
		partes.push(bloque)
		posicion += bloque.length
	})
	let directorio = Buffer.concat(central)
	let fin = Buffer.alloc(22)
	fin.writeUInt32LE(0x06054b50, 0)
	fin.writeUInt16LE(entradas.length, 8)
	fin.writeUInt16LE(entradas.length, 10)
	fin.writeUInt32LE(directorio.length, 12)
	fin.writeUInt32LE(posicion, 16)
	return Buffer.concat(partes.concat([directorio, fin]))
}

/**
 * Arma un .xlsx zip64 de una hoja "Lista" (5 filas con datos) y el File que el usuario "elige".
 *
 * @param {string} nombre_archivo Nombre del archivo ('lista.xlsx').
 * @returns {{file: File, buffer: Buffer}}
 */
function archivo_zip64(nombre_archivo) {
	let libro = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Nombre', 'Precio'], ['a', 1], ['b', 2], ['c', 3], ['d', 4]]), 'Lista')
	let buffer = forzar_zip64(XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }))
	return { file: new File([buffer], nombre_archivo), buffer }
}

/**
 * Reemplaza FileReader (no existe en Node) por uno que entrega el contenido del File de forma asíncrona.
 */
function instalar_file_reader() {
	global.FileReader = function() {
		this.readAsArrayBuffer = file => {
			file.arrayBuffer().then(contenido => this.onload({ target: { result: contenido } }))
		}
	}
}

/**
 * Contexto de componente con los métodos reales, el estado inicial del paso 1 y un servidor falso.
 *
 * @param {File} file Archivo elegido.
 * @param {Function} post Respuesta de $api.post (recibe url, form_data, config y devuelve una promesa).
 * @returns {object} Contexto con `llamadas` (posts) y `commits` (store).
 */
function armar_contexto(file, post) {
	let contexto = {
		file, hojas: [], workbook_cache: null, hoja_seleccionada: null, hoja_leida: null, encabezado_fila: null,
		encabezado_confianza: 'alta', finish_row: '', finish_row_original: '', excel_rows_read_error: '',
		file_processing: false, start_row: 2, has_header_row: true, filas_desde_el_servidor: false,
		llamadas: [], commits: [],
	}
	Object.assign(contexto, componente.methods)
	contexto.$api = { post(...args) { contexto.llamadas.push(args); return post(...args) } }
	contexto.$store = { commit(...args) { contexto.commits.push(args) } }
	return contexto
}

// Respuesta del servidor para el caso de una hoja.
const RESPUESTA_UNA_HOJA = { data: { hojas: [{ indice: 0, nombre: 'Lista', filas: 8, ultima_fila_con_contenido: 5 }] } }

test('CA6 un xlsx zip64 que SheetJS no lee pide la última fila al servidor', async () => {
	instalar_file_reader()
	let { file, buffer } = archivo_zip64('lista.xlsx')
	// El fixture tiene que ser realmente ilegible para SheetJS: si no, el test no probaría nada.
	assert.throws(() => XLSX.read(new Uint8Array(buffer), { type: 'array' }), /Bad compressed size/)

	let contexto = armar_contexto(file, () => Promise.resolve(RESPUESTA_UNA_HOJA))
	let resultado = await contexto.process_excel_file(file)

	assert.equal(contexto.llamadas.length, 1)
	assert.equal(contexto.llamadas[0][0], 'ai-excel-import/inspeccionar-filas')
	assert.equal(contexto.llamadas[0][1].get('excel_file'), file)
	assert.equal(resultado, 5)
	assert.equal(contexto.finish_row, 5)
	assert.equal(contexto.finish_row_original, 5)
	assert.equal(contexto.hojas.length, 1)
	assert.equal(contexto.hoja_seleccionada, 0)
	assert.equal(contexto.excel_rows_read_error, '')
	assert.equal(contexto.file_processing, false)
	assert.equal(contexto.filas_desde_el_servidor, true)
	assert.equal(contexto.start_row, 2)
	assert.equal(contexto.encabezado_fila, null)
	// Indicador global de carga: se prende y se apaga.
	let cargas = contexto.commits.filter(c => c[0] === 'auth/setLoading').map(c => c[1])
	assert.deepEqual(cargas, [true, false])
})

test('CA7 varias hojas sin SheetJS: hay que elegir hoja y cada hoja trae su última fila', async () => {
	instalar_file_reader()
	let { file } = archivo_zip64('libro.xlsx')
	let respuesta = { data: { hojas: [
		{ indice: 0, nombre: 'Datos', filas: 130, ultima_fila_con_contenido: 120 },
		{ indice: 1, nombre: 'Otra', filas: 30, ultima_fila_con_contenido: 30 },
		{ indice: 2, nombre: 'Vacía', filas: 0, ultima_fila_con_contenido: 0 },
	] } }
	let contexto = armar_contexto(file, () => Promise.resolve(respuesta))
	await contexto.process_excel_file(file)

	assert.equal(contexto.hoja_seleccionada, null)
	assert.equal(componente.computed.falta_elegir_hoja.call({ hay_varias_hojas: componente.computed.hay_varias_hojas.call(contexto), hoja_seleccionada: contexto.hoja_seleccionada }), true)
	assert.equal(contexto.finish_row, 120)

	// El usuario elige la hoja 1: el watcher usa lo que dijo el servidor (no hay workbook de SheetJS).
	contexto.hoja_seleccionada = 1
	componente.watch.hoja_seleccionada.call(contexto, 1)
	assert.equal(contexto.finish_row, 30)
	assert.equal(contexto.finish_row_original, 30)
	assert.equal(contexto.hoja_leida, 1)

	// Hoja sin contenido: rango vacío y el mensaje de siempre para esa hoja.
	contexto.hoja_seleccionada = 2
	componente.watch.hoja_seleccionada.call(contexto, 2)
	assert.equal(contexto.finish_row, '')
	assert.equal(contexto.excel_rows_read_error, 'No se pudo leer esa hoja para detectar filas. Probá con otra hoja.')
})

test('CA8 si el servidor también falla queda el mensaje de siempre y se apaga la carga', async () => {
	instalar_file_reader()
	let { file } = archivo_zip64('lista.xlsx')
	let contexto = armar_contexto(file, () => Promise.reject(new Error('422')))
	let original_error = console.error
	console.error = () => {}
	try {
		await assert.rejects(contexto.process_excel_file(file))
	} finally {
		console.error = original_error
	}

	// Primero tiene que haber intentado con el servidor; si no, este test pasaría sin fallback.
	assert.equal(contexto.llamadas.length, 1)
	assert.equal(contexto.finish_row, '')
	assert.equal(contexto.excel_rows_read_error, MENSAJE_SIN_FILAS)
	assert.equal(contexto.file_processing, false)
	let cargas = contexto.commits.filter(c => c[0] === 'auth/setLoading').map(c => c[1])
	assert.equal(cargas[cargas.length - 1], false)
	assert.ok(cargas.length >= 2)
})

test('CA9 si el usuario cambió de archivo, la respuesta tardía del servidor no escribe nada', async () => {
	instalar_file_reader()
	let { file } = archivo_zip64('lista.xlsx')
	let responder
	let contexto = armar_contexto(file, () => new Promise(resolve => { responder = resolve }))
	let promesa = contexto.process_excel_file(file)
	// Esperar a que el pedido salga hacia el servidor.
	await new Promise(resolve => setTimeout(resolve, 50))
	assert.equal(contexto.llamadas.length, 1)

	// El usuario reemplaza el archivo y recién entonces contesta el servidor.
	contexto.file = new File(['otro'], 'otro.xlsx')
	contexto.finish_row = ''
	contexto.hojas = []
	responder(RESPUESTA_UNA_HOJA)
	await promesa

	assert.equal(contexto.finish_row, '')
	assert.deepEqual(contexto.hojas, [])
	assert.equal(contexto.excel_rows_read_error, '')
})

test('CA10 un .xls que SheetJS no lee no se manda al servidor', async () => {
	instalar_file_reader()
	// Contenido zip64 ilegible para SheetJS pero con extensión .xls: el servidor sólo lee .xlsx.
	let file = new File([archivo_zip64('base.xlsx').buffer], 'lista.xls')
	let contexto = armar_contexto(file, () => Promise.resolve(RESPUESTA_UNA_HOJA))
	let original_error = console.error
	console.error = () => {}
	try {
		await assert.rejects(contexto.process_excel_file(file))
	} finally {
		console.error = original_error
	}

	assert.equal(contexto.llamadas.length, 0)
	assert.equal(contexto.excel_rows_read_error, MENSAJE_SIN_FILAS)
	assert.equal(contexto.finish_row, '')
	assert.equal(contexto.file_processing, false)
	// Y el contrato nuevo existe: el método que decide si el archivo es .xlsx.
	assert.equal(typeof componente.methods.es_archivo_xlsx, 'function')
	assert.equal(componente.methods.es_archivo_xlsx({ name: 'LISTA.XLSX' }), true)
	assert.equal(componente.methods.es_archivo_xlsx({ name: 'lista.xls' }), false)
})

test('CA11 el encabezado que detecta el backend corrige start_row sólo si las filas vinieron del servidor', () => {
	let base = { excel_path: 'x.xlsx', column_mapping: [], preview_rows: [], hojas: [], start_row: 2, has_header_row: false, encabezado_fila: null }
	let resultado = { excel_path: 'x.xlsx', column_mapping: [], encabezado_detectado: { fila: 4, confianza: 'alta' } }
	// Se prueba el método real con los helpers internos neutralizados: sólo interesa start_row.
	function aplicar(flag) {
		let contexto = Object.assign({}, componente.methods, base, {
			filas_desde_el_servidor: flag,
			completar_columnas_omitidas: () => [], normalize_column_mapping: () => [],
		})
		try { componente.methods.aplicar_resultado_analisis.call(contexto, resultado) } catch (e) { /* lo que sigue al encabezado no importa acá */ }
		return contexto
	}
	let con_flag = aplicar(true)
	assert.equal(con_flag.start_row, 5)
	assert.equal(con_flag.has_header_row, true)
	let sin_flag = aplicar(false)
	assert.equal(sin_flag.start_row, 2)

	// Rehidratación (F5): sin workbook_cache y hojas del backend sin ultima_fila_con_contenido: no se toca finish_row.
	let rehidratado = { workbook_cache: null, hoja_leida: null, finish_row: 77, finish_row_original: 77, excel_rows_read_error: '', hojas: [{ indice: 0, nombre: 'A', filas: 90 }, { indice: 1, nombre: 'B', filas: 10 }] }
	componente.watch.hoja_seleccionada.call(rehidratado, 1)
	assert.equal(rehidratado.finish_row, 77)
	assert.equal(rehidratado.finish_row_original, 77)
})

test('CA12 un xlsx normal se lee en el navegador y no llama al servidor', async () => {
	instalar_file_reader()
	let libro = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Nombre', 'Precio'], ['a', 1], ['b', 2], ['c', 3]]), 'Lista')
	let file = new File([XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' })], 'normal.xlsx')
	let contexto = armar_contexto(file, () => Promise.resolve(RESPUESTA_UNA_HOJA))
	// La detección del encabezado tiene sus propios tests: acá sólo se mira la última fila.
	contexto.detect_header_row = function() {}
	let resultado = await contexto.process_excel_file(file)

	assert.equal(resultado, 4)
	assert.equal(contexto.finish_row, 4)
	assert.equal(contexto.llamadas.length, 0)
	assert.equal(contexto.filas_desde_el_servidor, false)
})
