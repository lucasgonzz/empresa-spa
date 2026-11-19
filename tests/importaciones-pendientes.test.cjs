// Importaciones pendientes recuperables del modal de importación con IA: el borrador del paso 2, la lista
// de pendientes y el retomo sin volver a subir el archivo. Fixtures 100% ficticias, sin red ni navegador.
const { test, mock } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const XLSX = require('xlsx')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const borrador_js = cargar('components/listado/modals/ai-excel-import/borrador.js')
const { armar_borrador, aplicar_borrador, huella_del_borrador, corrida_a_retomar, CAMPOS_DEL_BORRADOR } = borrador_js

const componente = cargar('components/listado/modals/ai-excel-import/Index.vue', {
	'xlsx/xlsx.mjs': XLSX,
	'@/common-vue/components/model/Index': {},
	'./RelacionesParecidas': {},
	'@/mixins/prueba': {},
}).default

function cargar_store(axios_falso) {
	return cargar('store/excel_analysis.js', {
		axios: axios_falso,
		'@/runtime_config': { env: () => 'http://api.ficticia.test' },
	}).default
}

function modal_en_paso_2(cambios) {
	return Object.assign({
		analysis_uuid: 'uuid-analisis-1',
		importacion_lanzada: false,
		step: 2,
		column_mapping: [{ excel_column_index: 0, system_property: 'name' }, { excel_column_index: 1, system_property: 'precio' }],
		selected_provider_id: 7,
		provider_code_column_index: null,
		start_row: 3,
		finish_row: 90,
		has_header_row: true,
		hoja_seleccionada: 1,
		precios_incluyen_iva: 1,
		vaciar_valores_en_blanco: 0,
		actualizar_articulos_de_otro_proveedor: 1,
		permitir_provider_code_repetido: 0,
		permitir_provider_code_repetido_en_multi_providers: 0,
		actualizar_por_provider_code: 1,
		actualizar_proveedor: 1,
		create_and_edit: null,
		interpretacion_punto: 'miles',
		politica_colision: null,
		politica_otro_proveedor: null,
		politica_intra_archivo: 'primera_gana',
		desempatar_por_nombre: false,
	}, cambios || {})
}

// ---------------------------------------------------------------- borrador.js

test('no hay borrador en el paso 1, sin análisis o con la importación ya lanzada', () => {
	assert.equal(armar_borrador(modal_en_paso_2({ step: 1 })), null)
	assert.equal(armar_borrador(modal_en_paso_2({ analysis_uuid: null })), null)
	assert.equal(armar_borrador(modal_en_paso_2({ importacion_lanzada: true })), null)
	assert.equal(armar_borrador(null), null)
})

test('el borrador del paso 2 lleva el paso y cada campo editable, como copia profunda', () => {
	const vm = modal_en_paso_2()
	const borrador = armar_borrador(vm)
	assert.equal(borrador.paso, 2)
	for (const campo of CAMPOS_DEL_BORRADOR) {
		assert.deepEqual(borrador[campo], vm[campo], campo)
	}
	vm.column_mapping[0].system_property = 'codigo'
	assert.equal(borrador.column_mapping[0].system_property, 'name', 'editar el modal después no cambia lo ya armado')
})

test('el paso del borrador se acota entre 2 y 4', () => {
	assert.equal(armar_borrador(modal_en_paso_2({ step: 3 })).paso, 3)
	assert.equal(armar_borrador(modal_en_paso_2({ step: 9 })).paso, 4)
})

test('la huella cambia cuando cambia una edición y es null sin borrador', () => {
	const a = huella_del_borrador(armar_borrador(modal_en_paso_2()))
	const b = huella_del_borrador(armar_borrador(modal_en_paso_2({ start_row: 4 })))
	assert.notEqual(a, b)
	assert.equal(a, huella_del_borrador(armar_borrador(modal_en_paso_2())))
	assert.equal(huella_del_borrador(null), null)
})

test('aplicar el borrador devuelve lo editado y no toca el paso', () => {
	const origen = modal_en_paso_2()
	const borrador = armar_borrador(origen)
	const cola = []
	const vm = {
		step: 2,
		column_mapping: [],
		selected_provider_id: null,
		start_row: 2,
		hoja_seleccionada: 0,
		interpretacion_punto: 'auto',
		normalize_column_mapping(m) { return m.map(c => Object.assign({ normalizada: true }, c)) },
		$nextTick(f) { cola.push(f) },
	}
	aplicar_borrador(vm, borrador)
	assert.equal(vm.step, 2)
	assert.equal(vm.selected_provider_id, 7)
	assert.equal(vm.start_row, 3)
	assert.equal(vm.finish_row, 90)
	assert.equal(vm.hoja_seleccionada, 1)
	assert.equal(vm.politica_intra_archivo, 'primera_gana')
	assert.equal(vm.column_mapping.length, 2)
	assert.equal(vm.column_mapping[0].normalizada, true, 'el mapeo pasa por normalize_column_mapping')
})

test('los campos que los watchers del modal pisan se vuelven a poner en el tick siguiente', () => {
	const borrador = armar_borrador(modal_en_paso_2())
	const cola = []
	const vm = { column_mapping: [], $nextTick(f) { cola.push(f) } }
	aplicar_borrador(vm, borrador)
	// Simula a los watchers: el mapeo cambió y el proveedor se leyó, así que reinician estos campos.
	vm.interpretacion_punto = 'auto'
	vm.actualizar_articulos_de_otro_proveedor = 0
	vm.actualizar_proveedor = 0
	assert.equal(cola.length, 1)
	cola[0]()
	assert.equal(vm.interpretacion_punto, 'miles')
	assert.equal(vm.actualizar_articulos_de_otro_proveedor, 1)
	assert.equal(vm.actualizar_proveedor, 1)
})

test('un borrador vacío, ausente o con otra forma no cambia nada', () => {
	for (const invalido of [null, undefined, {}, [], 'texto', 5]) {
		const vm = { start_row: 2, column_mapping: [{ a: 1 }], $nextTick() {} }
		aplicar_borrador(vm, invalido)
		assert.equal(vm.start_row, 2)
		assert.deepEqual(vm.column_mapping, [{ a: 1 }])
	}
	const vm = { column_mapping: [{ a: 1 }], hoja_seleccionada: 4, $nextTick() {} }
	aplicar_borrador(vm, { column_mapping: [], hoja_seleccionada: null })
	assert.deepEqual(vm.column_mapping, [{ a: 1 }], 'un mapeo vacío no borra el que dejó el análisis')
	assert.equal(vm.hoja_seleccionada, 4)
})

test('se retoma la recomendación sólo si el usuario había llegado al paso 3 o 4', () => {
	assert.deepEqual(corrida_a_retomar({ uuid: 'a', paso: 3, recomendacion_uuid: 'r' }), { uuid: 'r', tipo: 'recomendacion' })
	assert.deepEqual(corrida_a_retomar({ uuid: 'a', paso: 4, recomendacion_uuid: 'r' }), { uuid: 'r', tipo: 'recomendacion' })
	assert.deepEqual(corrida_a_retomar({ uuid: 'a', paso: 2, recomendacion_uuid: 'r' }), { uuid: 'a', tipo: 'analisis' })
	assert.deepEqual(corrida_a_retomar({ uuid: 'a', paso: 3, recomendacion_uuid: null }), { uuid: 'a', tipo: 'analisis' })
	assert.deepEqual(corrida_a_retomar(null), { uuid: null, tipo: 'analisis' })
})

test('los campos del borrador coinciden con los que acepta la API', t => {
	// Sólo corre con el worktree hermano de la API de la misión; en otro lado se saltea, no pasa en falso.
	const ruta = path.join(__dirname, '..', '..', 'empresa-api-importaciones-pendientes-recuperables-20261119', 'app/Models/ExcelAnalysisRun.php')
	if (!fs.existsSync(ruta)) {
		t.skip('no está el worktree de la API')
		return
	}
	const modelo = fs.readFileSync(ruta, 'utf8')
	const bloque = modelo.split('const BORRADOR_CLAVES = [')[1].split('];')[0]
	const claves_api = [...bloque.matchAll(/'([a-z_]+)'/g)].map(m => m[1]).filter(c => c !== 'paso').sort()
	assert.deepEqual([...CAMPOS_DEL_BORRADOR].sort(), claves_api)
})

// ---------------------------------------------------------------- store

test('el store trae, reemplaza y quita pendientes sin mezclar módulos', async () => {
	const pedidos = []
	const store = cargar_store({
		defaults: {},
		get(url, opciones) {
			pedidos.push({ url, opciones })
			return Promise.resolve({ data: { pendientes: [{ uuid: 'u1', model: 'client' }] } })
		},
	})
	const estado = { pendientes: { article: [{ uuid: 'a1' }], client: [], provider: [{ uuid: 'p1' }] } }
	const commit = (nombre, valor) => store.mutations[nombre](estado, valor)

	const lista = await store.actions.cargar_pendientes({ commit }, 'client')
	assert.equal(pedidos[0].url, '/api/ai-excel-import/pendientes')
	assert.deepEqual(pedidos[0].opciones, { params: { model: 'client' } })
	assert.deepEqual(lista, [{ uuid: 'u1', model: 'client' }])
	assert.deepEqual(estado.pendientes.client, [{ uuid: 'u1', model: 'client' }])
	assert.deepEqual(estado.pendientes.article, [{ uuid: 'a1' }], 'los otros módulos no se tocan')

	store.mutations.quitar_pendiente(estado, 'p1')
	assert.deepEqual(estado.pendientes.provider, [])
	assert.deepEqual(estado.pendientes.article, [{ uuid: 'a1' }])
})

test('si falla pedir los pendientes, no se rompe y la lista queda como estaba', async () => {
	const registro = mock.method(console, 'log', () => {})
	const store = cargar_store({ defaults: {}, get() { return Promise.reject(new Error('sin red')) } })
	const llamadas = []
	const resultado = await store.actions.cargar_pendientes({ commit: (...a) => llamadas.push(a) }, 'article')
	registro.mock.restore()
	assert.deepEqual(resultado, [])
	assert.deepEqual(llamadas, [])
})

test('guardar el borrador hace POST al uuid, y sin uuid o sin borrador no pide nada', async () => {
	const posts = []
	const store = cargar_store({ defaults: {}, post(url, cuerpo) { posts.push({ url, cuerpo }); return Promise.resolve({}) } })
	await store.actions.guardar_borrador({}, { uuid: 'u9', borrador: { paso: 2 } })
	await store.actions.guardar_borrador({}, { uuid: null, borrador: { paso: 2 } })
	await store.actions.guardar_borrador({}, { uuid: 'u9', borrador: null })
	assert.deepEqual(posts, [{ url: '/api/ai-excel-import/analysis/u9/borrador', cuerpo: { borrador: { paso: 2 } } }])
})

test('descartar saca primero de la lista y después avisa al servidor', async () => {
	const orden = []
	const store = cargar_store({ defaults: {}, post(url) { orden.push('POST ' + url); return Promise.resolve({}) } })
	await store.actions.descartar_pendiente({ commit: nombre => orden.push('commit ' + nombre) }, 'u5')
	assert.deepEqual(orden, ['commit quitar_pendiente', 'POST /api/ai-excel-import/analysis/u5/descartar'])
})

// ---------------------------------------------------------------- componente

function modal_real(extra) {
	const despachos = []
	const confirmados = []
	const vm = Object.assign({}, componente.data.call({}), componente.methods, {
		model: 'article',
		modal_id: 'ai-excel-import-modal',
		$store: {
			state: { excel_analysis: { pendientes: { article: [], client: [], provider: [] }, siguiendo_uuid: null } },
			getters: {},
			commit(nombre, valor) { confirmados.push([nombre, valor]) },
			dispatch(nombre, valor) { despachos.push([nombre, valor]); return Promise.resolve() },
		},
		$nextTick(f) { f() },
	}, modal_en_paso_2(), extra || {})
	vm._despachos = despachos
	vm._confirmados = confirmados
	return vm
}

test('cerrar el modal en el paso 2 guarda el borrador antes de limpiar y no obliga a re-subir', () => {
	const vm = modal_real()
	vm.on_hide()
	assert.equal(vm._despachos.length, 1)
	assert.equal(vm._despachos[0][0], 'excel_analysis/guardar_borrador')
	assert.equal(vm._despachos[0][1].uuid, 'uuid-analisis-1')
	assert.equal(vm._despachos[0][1].borrador.start_row, 3)
	assert.equal(vm._despachos[0][1].borrador.selected_provider_id, 7)
	// Y después se limpia la pantalla, como siempre.
	assert.equal(vm.step, 1)
	assert.equal(vm.analysis_uuid, null)
	assert.equal(vm.importacion_lanzada, false)
})

test('cerrar el modal en el paso 1, o con la importación ya lanzada, no guarda nada', () => {
	const en_paso_1 = modal_real({ step: 1, analysis_uuid: null })
	en_paso_1.on_hide()
	assert.equal(en_paso_1._despachos.length, 0)

	const lanzada = modal_real({ importacion_lanzada: true })
	lanzada.on_hide()
	assert.equal(lanzada._despachos.length, 0)
})

test('el mismo borrador no se manda dos veces', () => {
	const vm = modal_real()
	vm.guardar_borrador_ahora()
	vm.guardar_borrador_ahora()
	assert.equal(vm._despachos.length, 1)
	vm.start_row = 5
	vm.guardar_borrador_ahora()
	assert.equal(vm._despachos.length, 2)
})

test('las ediciones se guardan con espera: una ráfaga manda un solo borrador, el último', () => {
	mock.timers.enable({ apis: ['setTimeout'] })
	try {
		const vm = modal_real()
		vm.programar_guardado_de_borrador(armar_borrador(vm))
		vm.start_row = 4
		vm.programar_guardado_de_borrador(armar_borrador(vm))
		vm.start_row = 6
		vm.programar_guardado_de_borrador(armar_borrador(vm))
		mock.timers.tick(1400)
		assert.equal(vm._despachos.length, 0, 'todavía no pasó la espera')
		mock.timers.tick(200)
		assert.equal(vm._despachos.length, 1)
		assert.equal(vm._despachos[0][1].borrador.start_row, 6)
		vm.programar_guardado_de_borrador(null)
		mock.timers.tick(5000)
		assert.equal(vm._despachos.length, 1, 'sin borrador no se programa nada')
	} finally {
		mock.timers.reset()
	}
})

test('retomar una pendiente abre la corrida correcta sin pedir el archivo', () => {
	const vm = modal_real({ step: 1, analysis_uuid: null })
	const abiertas = []
	vm.abrir_desde_corrida = corrida => abiertas.push(corrida)
	vm.retomar_pendiente({ uuid: 'a1', paso: 2, recomendacion_uuid: 'r1' })
	vm.retomar_pendiente({ uuid: 'a1', paso: 3, recomendacion_uuid: 'r1' })
	vm.retomar_pendiente({ uuid: null })
	assert.deepEqual(abiertas, [{ uuid: 'a1', tipo: 'analisis' }, { uuid: 'r1', tipo: 'recomendacion' }])
})

test('descartar una pendiente la saca de la lista por el store', () => {
	const vm = modal_real({ step: 1, analysis_uuid: null })
	vm.descartar_pendiente({ uuid: 'a1' })
	assert.deepEqual(vm._despachos, [['excel_analysis/descartar_pendiente', 'a1']])
})

test('al abrir el modal se recarga la lista de pendientes de su módulo', () => {
	const vm = modal_real({ step: 1, analysis_uuid: null, loading: true })
	vm.on_show()
	assert.deepEqual(vm._despachos[0], ['excel_analysis/cargar_pendientes', 'article'])
})

test('la lista sólo muestra las pendientes de su módulo', () => {
	const vm = modal_real({ model: 'client' })
	vm.$store.state.excel_analysis.pendientes = { article: [{ uuid: 'a' }], client: [{ uuid: 'c' }], provider: [{ uuid: 'p' }] }
	assert.deepEqual(componente.computed.pendientes_de_este_modal.call(vm), [{ uuid: 'c' }])
})

test('retomar el análisis aplica lo que el usuario había editado y deja el paso 2, sin volver a analizar', async () => {
	const pedidos = []
	const resultado = {
		excel_path: 'imported_files/ficticio.xlsx',
		column_mapping: [{ excel_column_index: 0, system_property: 'name' }],
		provider_id: 3,
		provider_confidence: 'alto',
	}
	const vm = modal_real({
		step: 1, analysis_uuid: null, loading: false,
		$api: {
			get(url) {
				pedidos.push(url)
				return Promise.resolve({ data: {
					uuid: 'uuid-pendiente', tipo: 'analisis', estado: 'listo',
					contexto: { model: 'article', original_filename: 'Lista_Ficticia.xlsx', start_row: 2, finish_row: 50, has_header_row: 1 },
					resultado,
					borrador: { paso: 2, selected_provider_id: 11, start_row: 8, politica_intra_archivo: 'primera_gana' },
				} })
			},
			post() { throw new Error('retomar no tiene que analizar ni subir nada') },
		},
	})
	vm.normalize_column_mapping = m => m
	vm.completar_columnas_omitidas = m => m
	vm.abrir_desde_corrida({ uuid: 'uuid-pendiente', tipo: 'analisis' })
	await new Promise(r => setImmediate(r))
	assert.deepEqual(pedidos, ['ai-excel-import/analysis/uuid-pendiente'])
	assert.equal(vm.step, 2)
	assert.equal(vm.analysis_uuid, 'uuid-pendiente')
	assert.equal(vm.excel_path, 'imported_files/ficticio.xlsx', 'usa el archivo que ya está en el servidor')
	assert.equal(vm.selected_provider_id, 11, 'gana el proveedor que eligió el usuario, no el que dedujo la IA')
	assert.equal(vm.start_row, 8)
	assert.equal(vm.politica_intra_archivo, 'primera_gana')
	assert.equal(vm.loading, false)
})

test('retomar un análisis sin borrador (versión anterior) queda en el paso 2 con el resultado de la IA', async () => {
	const vm = modal_real({
		step: 1, analysis_uuid: null, loading: false,
		$api: { get() {
			return Promise.resolve({ data: {
				uuid: 'u', tipo: 'analisis', estado: 'listo', contexto: { model: 'article', start_row: 2 },
				resultado: { excel_path: 'imported_files/ficticio.xlsx', column_mapping: [], provider_id: 3, provider_confidence: 'bajo' },
			} })
		} },
	})
	vm.normalize_column_mapping = m => m
	vm.completar_columnas_omitidas = m => m
	vm.abrir_desde_corrida({ uuid: 'u', tipo: 'analisis' })
	await new Promise(r => setImmediate(r))
	assert.equal(vm.step, 2)
	assert.equal(vm.selected_provider_id, 3)
})

test('cualquier cambio del borrador dispara el guardado con espera', () => {
	const vm = modal_real()
	const programados = []
	vm.programar_guardado_de_borrador = b => programados.push(b)
	componente.watch.borrador_actual.call(vm, { paso: 2 })
	assert.deepEqual(programados, [{ paso: 2 }])
})

// ---------------------------------------------------------------- plantilla

test('el modal muestra la lista de pendientes arriba del paso 1 y guarda al cerrar', () => {
	const fuente = fs.readFileSync(path.join(__dirname, '..', 'src/components/listado/modals/ai-excel-import/Index.vue'), 'utf8')
	assert.match(fuente, /@hide="on_hide"/)
	const paso1 = fuente.indexOf('<div v-if="step === 1">')
	const lista = fuente.indexOf('data-testid="ai-import-pendientes"')
	const archivo = fuente.indexOf('data-testid="ai-import-archivo"')
	assert.ok(paso1 > 0 && lista > paso1 && lista < archivo, 'la lista va dentro del paso 1 y antes del selector de archivo')
	assert.match(fuente, /data-testid="ai-import-pendiente-retomar"/)
	assert.match(fuente, /data-testid="ai-import-pendiente-descartar"/)
})

test('no se usa async/await en el código nuevo (Vue 2 sin regenerator en src/)', () => {
	for (const archivo of ['src/components/listado/modals/ai-excel-import/borrador.js', 'src/store/excel_analysis.js']) {
		const fuente = fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8')
		assert.doesNotMatch(fuente, /\basync\b|\bawait\b/, archivo)
	}
})
