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

// ------------------------------------------------- revisión: decisiones, paso exacto y reintento

const { aplicar_decisiones, paso_a_retomar } = borrador_js

function relaciones_de_prueba() {
	const opciones = [{ accion: 'usar', id: 1, nombre: 'Uno' }, { accion: 'crear' }, { accion: 'usar', id: 3, nombre: 'Tres' }]
	return {
		ia_consultada: true,
		items: [
			{ clave: 'marca|Acme', tipo: 'marca', valor: 'Acme', filas: 2, padre: null, motivo: 'parecido', explicacion: '', opciones, sugerida: 0 },
			{ clave: 'marca|Beta', tipo: 'marca', valor: 'Beta', filas: 1, padre: null, motivo: 'parecido', explicacion: '', opciones, sugerida: 0 },
		],
	}
}

test('el borrador lleva las decisiones del paso 3 y la huella cambia cuando cambian', () => {
	const a = armar_borrador(modal_en_paso_2({ step: 3, decisiones_relaciones: { 'marca|Acme': 0 } }))
	const b = armar_borrador(modal_en_paso_2({ step: 3, decisiones_relaciones: { 'marca|Acme': 1 } }))
	assert.deepEqual(a.decisiones_relaciones, { 'marca|Acme': 0 })
	assert.notEqual(huella_del_borrador(a), huella_del_borrador(b))
})

test('aplicar las decisiones guardadas gana sobre las sugeridas y descarta claves o índices inválidos', () => {
	const vm = { relaciones_parecidas: relaciones_de_prueba(), decisiones_relaciones: { 'marca|Acme': 0, 'marca|Beta': 0 } }
	aplicar_decisiones(vm, { decisiones_relaciones: { 'marca|Acme': 2, 'marca|Beta': 99, 'marca|Fantasma': 1 } })
	assert.deepEqual(vm.decisiones_relaciones, { 'marca|Acme': 2, 'marca|Beta': 0 })
})

test('el paso a retomar es exacto cuando se puede mostrar y cae al correcto cuando no', () => {
	const articulo = { model: 'article', relaciones_parecidas: null }
	const cliente_sin_nombres = { model: 'client', relaciones_parecidas: null }
	const cliente_con_nombres = { model: 'client', relaciones_parecidas: relaciones_de_prueba() }
	// Recomendación cargada
	assert.equal(paso_a_retomar(articulo, { paso: 2 }, true, 3), 2)
	assert.equal(paso_a_retomar(articulo, { paso: 3 }, true, 3), 3)
	assert.equal(paso_a_retomar(articulo, { paso: 4 }, true, 3), 4, 'dejado en el 4 no vuelve al 3')
	assert.equal(paso_a_retomar(cliente_con_nombres, { paso: 3 }, true, 3), 3)
	assert.equal(paso_a_retomar(cliente_sin_nombres, { paso: 3 }, true, 4), 4)
	assert.equal(paso_a_retomar(cliente_con_nombres, { paso: 4 }, true, 3), 4)
	// Sin borrador o con un paso inválido: el de siempre
	assert.equal(paso_a_retomar(articulo, null, true, 3), 3)
	assert.equal(paso_a_retomar(articulo, { paso: 9 }, true, 3), 3)
	assert.equal(paso_a_retomar(articulo, { paso: 'x' }, true, 3), 3)
	// Sólo análisis (sin recomendación): artículos al 2; clientes y proveedores pueden estar en el 4 sin lista
	assert.equal(paso_a_retomar(articulo, { paso: 4 }, false, 2), 2)
	assert.equal(paso_a_retomar(articulo, { paso: 3 }, false, 2), 2)
	assert.equal(paso_a_retomar(cliente_sin_nombres, { paso: 4 }, false, 2), 4)
})

function abrir_recomendacion(model, borrador, relaciones) {
	const vm = modal_real({
		model, step: 1, analysis_uuid: null, loading: false,
		$api: {
			get(url) {
				if (url === 'ai-excel-import/analysis/rec-1') {
					return Promise.resolve({ data: {
						uuid: 'rec-1', tipo: 'recomendacion', estado: 'listo',
						contexto: { model, analysis_uuid: 'uuid-pendiente', provider_id: 11 },
						resultado: { relaciones_parecidas: relaciones || null, recomendacion_configuracion: { politica_colision: 'saltear_y_reportar' } },
					} })
				}
				return Promise.resolve({ data: {
					uuid: 'uuid-pendiente', tipo: 'analisis', estado: 'listo',
					contexto: { model, original_filename: 'Lista_Ficticia.xlsx', start_row: 2, finish_row: 50, has_header_row: 1 },
					resultado: { excel_path: 'imported_files/ficticio.xlsx', column_mapping: [], provider_id: 3, provider_confidence: 'alto' },
					borrador,
				} })
			},
		},
	})
	vm.normalize_column_mapping = m => m
	vm.completar_columnas_omitidas = m => m
	vm.abrir_desde_corrida({ uuid: 'rec-1', tipo: 'recomendacion' })
	return vm
}

for (const paso of [2, 3, 4]) {
	test('retomar la recomendación de un artículo dejado en el paso ' + paso + ' vuelve exactamente a ese paso', async () => {
		const vm = abrir_recomendacion('article', { paso, start_row: 8 })
		await new Promise(r => setImmediate(r))
		assert.equal(vm.step, paso)
		assert.equal(vm.start_row, 8)
		assert.equal(vm.analysis_uuid, 'uuid-pendiente')
	})
}

test('retomar en el paso 3 de clientes restaura las decisiones de nombres parecidos', async () => {
	const vm = abrir_recomendacion('client', { paso: 3, decisiones_relaciones: { 'marca|Acme': 2, 'marca|Beta': 1 } }, relaciones_de_prueba())
	await new Promise(r => setImmediate(r))
	assert.equal(vm.step, 3)
	assert.deepEqual(vm.decisiones_relaciones, { 'marca|Acme': 2, 'marca|Beta': 1 })
})

test('retomar en el paso 4 de clientes con nombres parecidos va al 4 y conserva las decisiones', async () => {
	const vm = abrir_recomendacion('provider', { paso: 4, decisiones_relaciones: { 'marca|Acme': 1 } }, relaciones_de_prueba())
	await new Promise(r => setImmediate(r))
	assert.equal(vm.step, 4)
	assert.equal(vm.decisiones_relaciones['marca|Acme'], 1)
	assert.equal(vm.decisiones_relaciones['marca|Beta'], 0, 'lo no guardado queda con la sugerida')
})

function modal_con_respuestas(respuestas) {
	// Cada dispatch de guardar_borrador devuelve la promesa que arma el test; se resuelven a mano.
	const vm = modal_real()
	vm._pendientes = []
	vm.$store.dispatch = function(nombre, valor) {
		vm._despachos.push([nombre, valor])
		return new Promise(resolver => vm._pendientes.push(resolver))
	}
	return vm
}

const tick = () => new Promise(r => setImmediate(r))

test('si el autosave falla y se cierra el modal con el mismo estado, el cierre lo reintenta', async () => {
	const vm = modal_con_respuestas()
	vm.guardar_borrador_ahora()
	assert.equal(vm._despachos.length, 1)
	vm._pendientes[0](false)
	await tick()
	assert.equal(vm.borrador_huella, null, 'no se da por guardado si falló')
	assert.equal(vm.borrador_huella_en_vuelo, null)
	vm.on_hide()
	assert.equal(vm._despachos.length, 2, 'el cierre reintenta el mismo contenido')
	assert.equal(vm._despachos[1][1].borrador.start_row, vm._despachos[0][1].borrador.start_row)
	vm._pendientes[1](true)
	await tick()
})

test('el fallo transitorio se reintenta solo con espera y después queda confirmado', async () => {
	mock.timers.enable({ apis: ['setTimeout'] })
	try {
		const vm = modal_con_respuestas()
		vm.guardar_borrador_ahora()
		vm._pendientes[0](false)
		await tick()
		assert.equal(vm._despachos.length, 1)
		mock.timers.tick(5000)
		assert.equal(vm._despachos.length, 2, 'reintento automático')
		vm._pendientes[1](true)
		await tick()
		assert.ok(vm.borrador_huella, 'confirmado recién cuando el servidor respondió bien')
		vm.guardar_borrador_ahora()
		assert.equal(vm._despachos.length, 2, 'ya guardado: no repite')
	} finally {
		mock.timers.reset()
	}
})

test('mientras un envío está en vuelo no se duplica el mismo contenido y no se da por guardado', () => {
	const vm = modal_con_respuestas()
	vm.guardar_borrador_ahora()
	vm.guardar_borrador_ahora()
	assert.equal(vm._despachos.length, 1)
	assert.equal(vm.borrador_huella, null)
})

test('respuestas fuera de orden: la vieja que llega tarde no pisa lo confirmado por la nueva', async () => {
	const vm = modal_con_respuestas()
	vm.guardar_borrador_ahora()               // A
	vm.start_row = 5
	vm.guardar_borrador_ahora()               // B
	assert.equal(vm._despachos.length, 2)
	assert.ok(vm._despachos[1][1].borrador.revision > vm._despachos[0][1].borrador.revision, 'la revisión crece')
	const huella_b = huella_del_borrador(armar_borrador(vm))
	vm._pendientes[1](true)                   // B responde primero
	await tick()
	vm._pendientes[0](true)                   // A responde después
	await tick()
	assert.equal(vm.borrador_huella, huella_b)
})

test('si el envío viejo falla y el nuevo sale bien, no quedan dos estados mezclados', async () => {
	const vm = modal_con_respuestas()
	vm.guardar_borrador_ahora()               // A
	vm.start_row = 5
	vm.guardar_borrador_ahora()               // B
	vm._pendientes[0](false)
	vm._pendientes[1](true)
	await tick()
	assert.equal(vm.borrador_huella, huella_del_borrador(armar_borrador(vm)))
})

test('si el POST falla justo al cerrar el modal, se reintenta una vez con lo que se mandaba', async () => {
	const vm = modal_con_respuestas()
	vm.on_hide()                              // manda y limpia
	assert.equal(vm._despachos.length, 1)
	vm._pendientes[0](false)
	await tick()
	assert.equal(vm._despachos.length, 2)
	assert.equal(vm._despachos[1][1].uuid, 'uuid-analisis-1')
	vm._pendientes[1](false)
	await tick()
	assert.equal(vm._despachos.length, 2, 'un solo reintento')
})

test('el store resuelve true si el servidor guardó y false si falló (sin lanzar)', async () => {
	const ok = cargar_store({ defaults: {}, post() { return Promise.resolve({}) } })
	const mal = cargar_store({ defaults: {}, post() { return Promise.reject(new Error('red')) } })
	assert.equal(await ok.actions.guardar_borrador({}, { uuid: 'u', borrador: { paso: 2 } }), true)
	const log = console.log
	console.log = () => {}
	try {
		assert.equal(await mal.actions.guardar_borrador({}, { uuid: 'u', borrador: { paso: 2 } }), false)
	} finally {
		console.log = log
	}
})

test('Index.vue no usa async/await en el guardado y el retomo del borrador', () => {
	const fuente = fs.readFileSync(path.join(__dirname, '..', 'src/components/listado/modals/ai-excel-import/Index.vue'), 'utf8')
	const bloque = fuente.slice(fuente.indexOf('guardar_borrador_ahora() {'), fuente.indexOf('texto_de_pendiente(item)'))
	assert.doesNotMatch(bloque, /\basync\b|\bawait\b/)
	assert.match(fuente, /paso_a_retomar\(self, res_analisis\.data\.borrador/)
})

// ------------------------------------------------ carrera cierre / reapertura (revisión Fase5(1)v2)

/*
 * Backend ficticio con la regla REAL del servidor (ExcelAnalysisRun::guardar_borrador): se ignora
 * sólo si la revisión guardada es ESTRICTAMENTE mayor que la entrante; con revisión igual el
 * borrador entrante sobrescribe (el reintento idempotente de un mismo envío es inocuo). Con nada
 * guardado (null) siempre se guarda. Cada POST queda pendiente hasta que el test lo resuelve a mano.
 */
function modal_con_backend_ficticio() {
	const vm = modal_real()
	const backend = { revision: null, borrador: null, posts: [] }
	vm.$store.dispatch = function(nombre, valor) {
		if (nombre !== 'excel_analysis/guardar_borrador') {
			return Promise.resolve()
		}
		return new Promise(resolver => {
			backend.posts.push({ valor, resolver })
		})
	}
	backend.llegar = function(i, ok) {
		const p = backend.posts[i]
		const entrante = p.valor.borrador.revision
		if (ok && (backend.revision === null || !(backend.revision > entrante))) {
			backend.revision = entrante
			backend.borrador = p.valor.borrador
		}
		p.resolver(ok)
	}
	vm._backend = backend
	return vm
}

test('cierre y reapertura: el reintento tardío de A conserva su revisión y no pisa a B ni la sesión nueva', async () => {
	const vm = modal_con_backend_ficticio()
	vm.start_row = 3
	vm.guardar_borrador_ahora()                       // A en vuelo (sesión 1)
	const b = vm._backend
	const revision_a = b.posts[0].valor.borrador.revision
	vm.on_hide()                                      // cierre: reintenta lo mismo, sigue en vuelo

	// Reapertura del mismo análisis (sesión 2) y B guarda start_row 9 con revisión nueva.
	vm.analysis_uuid = 'uuid-analisis-1'
	vm.step = 2
	vm.start_row = 9
	vm.guardar_borrador_ahora()                       // B
	const idx_b = b.posts.length - 1
	const revision_b = b.posts[idx_b].valor.borrador.revision
	assert.ok(revision_b > revision_a)
	b.llegar(idx_b, true)                             // B confirmado ANTES del fallo tardío de A
	await tick()
	const huella_b = huella_del_borrador(armar_borrador(vm))
	assert.equal(vm.borrador_huella, huella_b)
	assert.equal(b.borrador.start_row, 9)

	// Falla tardía de A (sesión vieja): dispara su único reintento.
	const antes = {
		seq: vm.borrador_seq, rev: vm.borrador_revision,
		conf: vm.borrador_seq_confirmado, vuelo: vm.borrador_huella_en_vuelo,
	}
	b.llegar(0, false)
	await tick()
	assert.equal(b.posts.length, idx_b + 2, 'se hizo el reintento de A')
	const retry_a = b.posts[idx_b + 1]
	assert.equal(retry_a.valor.borrador.revision, revision_a, 'el reintento lleva la revisión ORIGINAL de A')
	assert.equal(retry_a.valor.borrador.start_row, 3, 'y el contexto ORIGINAL de A')
	assert.equal(vm.borrador_seq, antes.seq, 'el reintento no consume número de envío de la sesión actual')
	assert.equal(vm.borrador_revision, antes.rev, 'ni avanza la revisión de la sesión actual')
	assert.equal(vm.borrador_huella_en_vuelo, antes.vuelo)

	// El reintento de A llega bien: el backend lo ignora por revisión vieja.
	b.llegar(idx_b + 1, true)
	await tick()
	assert.equal(b.borrador.start_row, 9, 'backend final: B')
	assert.equal(b.revision, revision_b)
	assert.equal(vm.borrador_huella, huella_b, 'la huella de la sesión actual sigue siendo la de B')
	assert.equal(vm.borrador_seq_confirmado, antes.conf)

})

test('backend ficticio: revisión igual sobrescribe, menor se ignora, mayor reemplaza (como el PHP real)', async () => {
	const vm = modal_con_backend_ficticio()
	const b = vm._backend
	const post = (rev, start_row) => ({ valor: { borrador: { revision: rev, start_row } }, resolver: () => {} })
	b.posts.push(post(5, 1), post(5, 2), post(4, 3), post(6, 4))
	b.llegar(0, true)
	assert.equal(b.borrador.start_row, 1, 'sin nada guardado se guarda')
	b.llegar(1, true)
	assert.equal(b.revision, 5)
	assert.equal(b.borrador.start_row, 2, 'revisión IGUAL: sobrescribe')
	b.llegar(2, true)
	assert.equal(b.revision, 5)
	assert.equal(b.borrador.start_row, 2, 'revisión menor: se ignora')
	b.llegar(3, true)
	assert.equal(b.revision, 6)
	assert.equal(b.borrador.start_row, 4, 'revisión mayor: reemplaza')
})

test('reintento con la MISMA revisión tras haber llegado el envío original: queda el mismo contenido', async () => {
	const vm = modal_con_backend_ficticio()
	vm.start_row = 3
	vm.guardar_borrador_ahora()
	const b = vm._backend
	const rev = b.posts[0].valor.borrador.revision
	vm.on_hide()                                      // sesión cerrada con A en vuelo
	b.llegar(0, true)                                 // el servidor guarda A pero la respuesta se da por ok
	b.posts.push({ valor: JSON.parse(JSON.stringify(b.posts[0].valor)), resolver: () => {} })
	b.llegar(b.posts.length - 1, true)                // llega de nuevo A con la misma revisión: sobrescribe igual
	assert.equal(b.revision, rev)
	assert.equal(b.borrador.start_row, 3)
})

test('el reintento de una sesión vieja que falla otra vez no reintenta ni toca la sesión actual', async () => {
	const vm = modal_con_backend_ficticio()
	vm.guardar_borrador_ahora()
	const b = vm._backend
	vm.on_hide()
	vm.analysis_uuid = 'uuid-analisis-1'
	vm.step = 2
	vm.start_row = 9
	const huella_antes = vm.borrador_huella
	b.llegar(0, false)                                // falla A en sesión vieja
	await tick()
	const n = b.posts.length
	b.llegar(n - 1, false)                            // falla el reintento
	await tick()
	assert.equal(b.posts.length, n, 'un solo reintento')
	assert.equal(vm.borrador_huella, huella_antes)
	assert.equal(vm.borrador_huella_en_vuelo, null)
})

// ------------------------------------------------ revisión Fase5(3): última edición, cierre de sesión, identidad

/*
 * Tres ediciones distintas del paso 2 que tienen que sobrevivir al "volver al valor confirmado mientras
 * otro envío sigue en vuelo": un campo simple, el mapeo, una política y las decisiones del paso 3.
 */
const EDICIONES = {
	'campo simple (start_row)': { campo: 'start_row', a: 3, b: 9 },
	'mapeo de columnas': {
		campo: 'column_mapping',
		a: [{ excel_column_index: 0, system_property: 'name' }],
		b: [{ excel_column_index: 0, system_property: 'codigo' }],
	},
	'política de colisión': { campo: 'politica_colision', a: null, b: 'actualizar' },
	'decisiones del paso 3': { campo: 'decisiones_relaciones', a: { 'marca|Acme': 0 }, b: { 'marca|Acme': 1 }, step: 3 },
}

for (const [nombre, e] of Object.entries(EDICIONES)) {
	test('volver al valor confirmado con otro envío en vuelo igual manda la última edición: ' + nombre, async () => {
		const vm = modal_con_backend_ficticio()
		if (e.step) { vm.step = e.step }
		const b = vm._backend
		vm[e.campo] = e.a
		vm.guardar_borrador_ahora()                       // envío 1 = valor A
		b.llegar(0, true)
		await tick()
		assert.ok(vm.borrador_huella, 'A quedó confirmado')
		vm[e.campo] = e.b
		vm.guardar_borrador_ahora()                       // envío 2 = valor B, en vuelo
		vm[e.campo] = e.a                                 // el usuario vuelve a A (= lo confirmado)
		vm.guardar_borrador_ahora()                       // envío 3 = A otra vez
		assert.equal(b.posts.length, 3, 'no se omite el regreso al valor confirmado')
		assert.deepEqual(b.posts[2].valor.borrador[e.campo], e.a)
		assert.ok(b.posts[2].valor.borrador.revision > b.posts[1].valor.borrador.revision)
		b.llegar(1, true)
		b.llegar(2, true)
		await tick()
		assert.deepEqual(b.borrador[e.campo], e.a, 'el servidor termina con la última edición')
		assert.equal(vm.borrador_huella_en_vuelo, null)
	})
}

test('la respuesta del primer envío no suelta el en-vuelo del último (misma huella repetida)', async () => {
	const vm = modal_con_backend_ficticio()
	const b = vm._backend
	vm.start_row = 9
	vm.guardar_borrador_ahora()                           // 1: 9
	vm.start_row = 4
	vm.guardar_borrador_ahora()                           // 2: 4
	vm.start_row = 9
	vm.guardar_borrador_ahora()                           // 3: 9
	assert.equal(b.posts.length, 3)
	b.llegar(0, true)                                     // llega la vieja con la misma huella que la última
	await tick()
	assert.ok(vm.borrador_huella_en_vuelo, 'el último envío sigue en vuelo')
	vm.guardar_borrador_ahora()
	assert.equal(b.posts.length, 3, 'y no se duplica')
	b.llegar(1, true)
	b.llegar(2, true)
	await tick()
	assert.equal(b.borrador.start_row, 9)
})

test('el debounce programa el guardado al volver al valor confirmado si hay otro envío en vuelo', async () => {
	mock.timers.enable({ apis: ['setTimeout'] })
	try {
		const vm = modal_con_backend_ficticio()
		const b = vm._backend
		vm.start_row = 3
		vm.guardar_borrador_ahora()
		b.llegar(0, true)
		await tick()
		vm.start_row = 9
		vm.guardar_borrador_ahora()                       // en vuelo: 9
		vm.start_row = 3
		vm.programar_guardado_de_borrador(armar_borrador(vm))
		assert.ok(vm.borrador_timer_id, 'queda un guardado programado: pantalla 3, servidor va a tener 9')
		mock.timers.tick(1500)
		assert.equal(b.posts.length, 3)
		assert.equal(b.posts[2].valor.borrador.start_row, 3)
		b.llegar(1, true)
		b.llegar(2, true)
		await tick()
		assert.equal(b.borrador.start_row, 3)
	} finally {
		mock.timers.reset()
	}
})

test('cerrar el modal con 9 en vuelo y la pantalla de vuelta en el valor confirmado manda el valor de la pantalla', async () => {
	const vm = modal_con_backend_ficticio()
	const b = vm._backend
	vm.start_row = 3
	vm.guardar_borrador_ahora()
	b.llegar(0, true)
	await tick()
	vm.start_row = 9
	vm.guardar_borrador_ahora()
	vm.start_row = 3
	vm.on_hide()
	assert.deepEqual(b.posts.map(p => p.valor.borrador.start_row), [3, 9, 3])
	b.llegar(1, true)
	b.llegar(2, true)
	await tick()
	assert.equal(b.borrador.start_row, 3)
})

// --- cierre de sesión y destrucción

function auth_real(llamadas) {
	const anterior = global.window
	global.window = { localStorage: { setItem() {}, clear() {} } }
	const auth = cargar('store/auth.js', {
		axios: {
			__esModule: true,
			default: {
				defaults: {},
				get(url) { llamadas.push('GET ' + url); return Promise.resolve({}) },
				post(url) { llamadas.push('POST ' + url); return Promise.resolve({}) },
			},
		},
		vue: { __esModule: true, default: {} },
		'@/runtime_config': { env: () => 'https://api.test' },
		'@/utils/canales_en_vivo': { set_canales_en_vivo() {} },
		'@/offline/sesion_sin_conexion': {},
	}).default
	global.window = anterior
	return auth
}

// Un store raíz mínimo que enruta dispatch al módulo excel_analysis real y a auth/logout.
function raiz_con_store(store, llamadas, usuario) {
	const estado = Object.assign({}, store.state, { pendientes: { article: [], client: [], provider: [] }, salteados: [] })
	const raiz = {
		estado,
		auth_estado: { user: usuario || { id: 5, owner_id: 1 } },
		commit(nombre, valor) { store.mutations[nombre](estado, valor) },
		dispatch(nombre, valor) {
			const [modulo, accion] = nombre.split('/')
			if (modulo !== 'excel_analysis') {
				return Promise.resolve()
			}
			return store.actions[accion]({ commit: raiz.commit, state: estado, rootState: { auth: raiz.auth_estado } }, valor)
		},
	}
	return raiz
}

test('cerrar sesión con una edición dentro del debounce la guarda ANTES de llamar a /logout', async () => {
	mock.timers.enable({ apis: ['setTimeout'] })
	try {
		const llamadas = []
		const store = cargar_store({ defaults: {}, post() { return Promise.resolve({}) } })
		const auth = auth_real(llamadas)
		const vm = modal_con_backend_ficticio()
		const raiz = raiz_con_store(store, llamadas)
		const b = vm._backend
		const despacho_modal = vm.$store.dispatch
		// El modal usa su propio dispatch ficticio para guardar_borrador y el real para el registro.
		vm.$store.dispatch = function(nombre, valor) {
			if (nombre === 'excel_analysis/guardar_borrador') {
				llamadas.push('POST borrador start_row=' + valor.borrador.start_row)
				return despacho_modal(nombre, valor)
			}
			return raiz.dispatch(nombre, valor)
		}
		componente.created.call(Object.assign(vm, { addresses: [1], price_types: [1] }))

		vm.start_row = 4
		vm.programar_guardado_de_borrador(armar_borrador(vm))     // dentro de los 1500 ms
		assert.ok(vm.borrador_timer_id)

		let terminado = false
		const salida = auth.actions.logout({ commit() {}, dispatch: (n, v) => raiz.dispatch(n, v) }).then(() => { terminado = true })
		await tick()
		assert.deepEqual(llamadas, ['POST borrador start_row=4'], '/logout todavía no se llamó: espera el guardado')
		assert.equal(terminado, false)
		b.llegar(0, true)
		await salida
		assert.deepEqual(llamadas, ['POST borrador start_row=4', 'GET /sanctum/csrf-cookie', 'POST /logout'])
		assert.equal(b.borrador.start_row, 4)
		assert.equal(vm.borrador_timer_id, null)
		assert.equal(vm._borrador_cortado, true)
	} finally {
		mock.timers.reset()
	}
})

test('si el guardado previo al logout falla se reintenta una vez y el logout sigue igual', async () => {
	const llamadas = []
	const store = cargar_store({ defaults: {}, post() { return Promise.resolve({}) } })
	const auth = auth_real(llamadas)
	const vm = modal_con_backend_ficticio()
	const raiz = raiz_con_store(store, llamadas)
	const despacho_modal = vm.$store.dispatch
	vm.$store.dispatch = (n, v) => n === 'excel_analysis/guardar_borrador' ? despacho_modal(n, v) : raiz.dispatch(n, v)
	componente.created.call(Object.assign(vm, { addresses: [1], price_types: [1] }))
	vm.start_row = 6
	const salida = auth.actions.logout({ commit() {}, dispatch: (n, v) => raiz.dispatch(n, v) })
	vm._backend.llegar(0, false)
	await tick()
	assert.equal(vm._backend.posts.length, 2, 'un reintento inmediato mientras la sesión todavía vale')
	vm._backend.llegar(1, false)
	await salida
	assert.deepEqual(llamadas, ['GET /sanctum/csrf-cookie', 'POST /logout'])
	assert.equal(vm._backend.posts.length, 2, 'sin más reintentos')
})

test('el cierre de sesión no queda colgado si el guardado no responde (tope de espera)', async () => {
	mock.timers.enable({ apis: ['setTimeout'] })
	try {
		const llamadas = []
		const store = cargar_store({ defaults: {}, post() { return Promise.resolve({}) } })
		const auth = auth_real(llamadas)
		const vm = modal_con_backend_ficticio()
		const raiz = raiz_con_store(store, llamadas)
		const despacho_modal = vm.$store.dispatch
		vm.$store.dispatch = (n, v) => n === 'excel_analysis/guardar_borrador' ? despacho_modal(n, v) : raiz.dispatch(n, v)
		componente.created.call(Object.assign(vm, { addresses: [1], price_types: [1] }))
		vm.start_row = 6
		const salida = auth.actions.logout({ commit() {}, dispatch: (n, v) => raiz.dispatch(n, v) })
		await tick()
		mock.timers.tick(4000)
		await salida
		assert.deepEqual(llamadas, ['GET /sanctum/csrf-cookie', 'POST /logout'])
	} finally {
		mock.timers.reset()
	}
})

test('destruir el componente guarda una vez, corta timers y no reintenta ni toca el estado con respuestas tardías', async () => {
	mock.timers.enable({ apis: ['setTimeout'] })
	try {
		const vm = modal_con_backend_ficticio()
		const b = vm._backend
		vm.start_row = 4
		vm.guardar_borrador_ahora()                       // 1 en vuelo
		b.llegar(0, false)                                // falla: queda un reintento automático a 5 s
		await tick()
		assert.ok(vm.borrador_timer_id)
		vm.start_row = 8                                  // edición nueva dentro del debounce
		vm.programar_guardado_de_borrador(armar_borrador(vm))
		const sesion_antes = vm.borrador_sesion
		componente.beforeDestroy.call(vm)
		assert.equal(b.posts.length, 2, 'el último intento al destruir')
		assert.equal(b.posts[1].valor.borrador.start_row, 8)
		assert.equal(vm.borrador_timer_id, null)
		assert.ok(vm.borrador_sesion > sesion_antes, 'la sesión del borrador quedó invalidada')
		b.llegar(1, false)                                // la respuesta llega tarde y falla
		await tick()
		mock.timers.tick(60000)
		assert.equal(b.posts.length, 2, 'sin reintentos sobre un componente destruido')
		assert.equal(vm.borrador_timer_id, null)
		assert.equal(vm.borrador_huella, null, 'no tocó lo confirmado')
	} finally {
		mock.timers.reset()
	}
})

test('destruir el componente se desregistra del store y la respuesta ok tardía no cambia el estado', async () => {
	const vm = modal_con_backend_ficticio()
	const registro = []
	const despacho_modal = vm.$store.dispatch
	vm.$store.dispatch = (n, v) => { if (n.startsWith('excel_analysis/') && n !== 'excel_analysis/guardar_borrador') { registro.push(n) } return despacho_modal(n, v) }
	vm.start_row = 4
	vm.guardar_borrador_ahora()
	componente.beforeDestroy.call(vm)
	assert.ok(registro.includes('excel_analysis/quitar_guardador'))
	vm._backend.llegar(0, true)
	await tick()
	assert.equal(vm.borrador_huella, null, 'la respuesta ok de una sesión invalidada no confirma nada')
})

// --- aislamiento por identidad en el store

const pend = uuid => ({ uuid, model: 'article', original_filename: uuid + '.xlsx', creada_en: '2026-11-01T10:00:00' })

test('cambio de usuario con la recarga fallida no muestra archivos ni fechas del usuario anterior', async () => {
	const registro = mock.method(console, 'log', () => {})
	try {
		let falla = false
		const store = cargar_store({
			defaults: {},
			get() { return falla ? Promise.reject(new Error('sin red')) : Promise.resolve({ data: { pendientes: [pend('de-A')] } }) },
		})
		const raiz = raiz_con_store(store, [], { id: 5, owner_id: 1 })
		await raiz.dispatch('excel_analysis/cargar_pendientes', 'article')
		assert.deepEqual(raiz.estado.pendientes.article.map(p => p.uuid), ['de-A'])

		raiz.auth_estado.user = { id: 6, owner_id: 1 }    // otro usuario del mismo comercio
		falla = true
		const lista = await raiz.dispatch('excel_analysis/cargar_pendientes', 'article')
		assert.deepEqual(lista, [])
		assert.deepEqual(raiz.estado.pendientes.article, [], 'no queda nada de A')
		assert.equal(raiz.estado.identidad, '1:6')
	} finally {
		registro.mock.restore()
	}
})

test('la misma identidad con la recarga fallida conserva su lista', async () => {
	const registro = mock.method(console, 'log', () => {})
	try {
		let falla = false
		const store = cargar_store({
			defaults: {},
			get() { return falla ? Promise.reject(new Error('sin red')) : Promise.resolve({ data: { pendientes: [pend('de-A')] } }) },
		})
		const raiz = raiz_con_store(store, [], { id: 5, owner_id: 1 })
		await raiz.dispatch('excel_analysis/cargar_pendientes', 'article')
		falla = true
		await raiz.dispatch('excel_analysis/cargar_pendientes', 'article')
		assert.deepEqual(raiz.estado.pendientes.article.map(p => p.uuid), ['de-A'])
	} finally {
		registro.mock.restore()
	}
})

test('una respuesta tardía del usuario anterior se descarta tras el cambio de usuario', async () => {
	const respuestas = []
	const store = cargar_store({ defaults: {}, get() { return new Promise(r => respuestas.push(r)) } })
	const raiz = raiz_con_store(store, [], { id: 5, owner_id: 1 })
	const de_a = raiz.dispatch('excel_analysis/cargar_pendientes', 'article')
	raiz.auth_estado.user = { id: 6, owner_id: 1 }
	const de_b = raiz.dispatch('excel_analysis/cargar_pendientes', 'article')
	respuestas[1]({ data: { pendientes: [pend('de-B')] } })
	await de_b
	respuestas[0]({ data: { pendientes: [pend('de-A')] } })      // llega tarde
	assert.deepEqual(await de_a, [])
	assert.deepEqual(raiz.estado.pendientes.article.map(p => p.uuid), ['de-B'])
})

test('el logout limpia pendientes, corrida y órdenes, y descarta respuestas que viajaban', async () => {
	const respuestas = []
	const store = cargar_store({ defaults: {}, get() { return new Promise(r => respuestas.push(r)) } })
	const raiz = raiz_con_store(store, [], { id: 5, owner_id: 1 })
	raiz.estado.corrida = { uuid: 'c1', estado: 'listo' }
	raiz.estado.abrir_en = { uuid: 'c1' }
	raiz.estado.siguiendo_uuid = 'c1'
	raiz.estado.salteados = ['c1']
	raiz.commit('set_pendientes', { model: 'article', lista: [pend('de-A')] })
	raiz.commit('set_identidad', '1:5')

	const en_viaje = raiz.dispatch('excel_analysis/cargar_pendientes', 'article')
	const corrida_en_viaje = raiz.dispatch('excel_analysis/get_en_curso')
	await raiz.dispatch('excel_analysis/limpiar_al_salir')
	assert.deepEqual(raiz.estado.pendientes, { article: [], client: [], provider: [] })
	assert.equal(raiz.estado.corrida, null)
	assert.equal(raiz.estado.abrir_en, null)
	assert.equal(raiz.estado.siguiendo_uuid, null)
	assert.deepEqual(raiz.estado.salteados, [])

	raiz.auth_estado.user = null
	respuestas[0]({ data: { pendientes: [pend('de-A')] } })
	respuestas[1]({ data: { run: { uuid: 'c9', estado: 'listo' } } })
	assert.deepEqual(await en_viaje, [])
	assert.equal(await corrida_en_viaje, null)
	assert.deepEqual(raiz.estado.pendientes.article, [])
	assert.equal(raiz.estado.corrida, null)
})

test('el primer usuario de la sesión no pierde lo ya cargado al asignarle su identidad', async () => {
	const store = cargar_store({ defaults: {}, get() { return Promise.resolve({ data: { pendientes: [] } }) } })
	const raiz = raiz_con_store(store, [], { id: 5, owner_id: 1 })
	raiz.estado.corrida = { uuid: 'c1', estado: 'procesando' }
	await raiz.dispatch('excel_analysis/cargar_pendientes', 'article')
	assert.equal(raiz.estado.corrida.uuid, 'c1')
	assert.equal(raiz.estado.identidad, '1:5')
})

test('no se usa async/await en el cierre de sesión y el aislamiento (Vue 2 sin regenerator)', () => {
	for (const archivo of ['src/store/excel_analysis.js', 'src/store/auth.js']) {
		const fuente = fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8')
		assert.doesNotMatch(fuente.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), /\basync\b|\bawait\b/, archivo)
	}
	const vue = fs.readFileSync(path.join(__dirname, '..', 'src/components/listado/modals/ai-excel-import/Index.vue'), 'utf8')
	const bloque = vue.slice(vue.indexOf('guardar_borrador_para_salir() {'), vue.indexOf('texto_de_pendiente(item)'))
	assert.doesNotMatch(bloque, /\basync\b|\bawait\b/)
})

// ------------------------------------------------ revisión diff-v2: flush de salida cortado en vuelo

test('flush de logout con A en vuelo: si se corta y A resuelve false, no hay POST, timer ni mutación nuevos', async () => {
	mock.timers.enable({ apis: ['setTimeout'] })
	try {
		const vm = modal_con_backend_ficticio()
		const b = vm._backend
		vm.start_row = 4
		const flush = vm.guardar_borrador_para_salir()    // POST A en vuelo
		assert.equal(b.posts.length, 1)
		vm.cortar_guardado_de_borrador()                  // logout cortó durante el vuelo
		const sesion = vm.borrador_sesion
		b.llegar(0, false)                                // A resuelve false, tarde
		assert.equal(await flush, false)
		await tick()
		mock.timers.tick(60000)
		assert.equal(b.posts.length, 1, 'ningún POST nuevo')
		assert.equal(vm.borrador_timer_id, null, 'ningún timer de 5 s')
		assert.equal(vm.borrador_huella, null)
		assert.equal(vm.borrador_huella_en_vuelo, null)
		assert.equal(vm.borrador_seq, 1)
		assert.equal(vm.borrador_sesion, sesion)
	} finally {
		mock.timers.reset()
	}
})

test('flush cortado, timeout de logout (4 s) y destrucción: A falla tarde y no reactiva reintentos ni timers', async () => {
	mock.timers.enable({ apis: ['setTimeout'] })
	try {
		const vm = modal_con_backend_ficticio()
		const b = vm._backend
		vm.start_row = 4
		const flush = vm.guardar_borrador_para_salir()    // A en vuelo
		mock.timers.tick(4000)                            // vence el tope de espera del logout
		vm.cortar_guardado_de_borrador()                  // limpiar_al_salir
		componente.beforeDestroy.call(vm)                 // y la vista se destruye
		const posts = b.posts.length
		b.llegar(0, false)
		await tick()
		assert.equal(await flush, false)
		mock.timers.tick(60000)
		assert.equal(b.posts.length, posts, 'sin POST después del corte')
		assert.equal(vm.borrador_timer_id, null)
		assert.equal(vm.borrador_huella, null)
	} finally {
		mock.timers.reset()
	}
})

test('con el guardado cortado no entran guardar_borrador_ahora ni enviar_borrador', async () => {
	const vm = modal_con_backend_ficticio()
	const b = vm._backend
	vm.cortar_guardado_de_borrador()
	vm.start_row = 7
	assert.equal(await vm.guardar_borrador_ahora(), false)
	assert.equal(await vm.enviar_borrador('uuid-analisis-1', armar_borrador(vm), 'h', 0), false)
	assert.equal(b.posts.length, 0)
	assert.equal(vm.borrador_seq, 0)
	assert.equal(vm.borrador_huella_en_vuelo, null)
})

test('el flush legítimo previo al logout sigue guardando y confirmando', async () => {
	const vm = modal_con_backend_ficticio()
	const b = vm._backend
	vm.start_row = 5
	const flush = vm.guardar_borrador_para_salir()
	b.llegar(0, true)
	assert.equal(await flush, true)
	assert.equal(b.borrador.start_row, 5)
	assert.ok(vm.borrador_huella)
})

test('un fallo del primer envío del flush todavía vigente reintenta una vez de inmediato', async () => {
	const vm = modal_con_backend_ficticio()
	const b = vm._backend
	vm.start_row = 5
	const flush = vm.guardar_borrador_para_salir()
	b.llegar(0, false)
	await tick()
	assert.equal(b.posts.length, 2, 'reintento inmediato legítimo')
	b.llegar(1, true)
	assert.equal(await flush, true)
})
