// Store dimension_search (src/store/dimension_search.js) de la misión medidas-masivas-catalogo
// (27/10/2026): tolerancia a una API sin las rutas (404) o sin la extensión (403), forma de las
// respuestas y de los pedidos. Sin red: `axios` es un falso que registra lo que se le pide.
//
// Ejecutar con: node --test tests/medidas-store.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

/**
 * Carga el store con un axios falso.
 *
 * @param {Function} responder (metodo, url, ...args) -> Promise con la respuesta del falso.
 * @returns {{store: object, pedidos: Array}}
 */
function store_con(responder) {
	const pedidos = []
	const axios = {
		defaults: {},
		isCancel: valor => !!valor && valor.__cancelado === true,
		get: (url, config) => {
			pedidos.push({ metodo: 'get', url: url, config: config })
			return responder('get', url, config)
		},
		post: (url, cuerpo, config) => {
			pedidos.push({ metodo: 'post', url: url, cuerpo: cuerpo, config: config })
			return responder('post', url, config, cuerpo)
		},
	}
	const modulo = cargar('store/dimension_search.js', {
		'axios': { __esModule: true, default: axios },
		'@/runtime_config': { env: () => 'http://api.test' },
	})
	return { store: modulo.default, modulo: modulo, pedidos: pedidos }
}

/** Un contexto de Vuex de mentira: commit registra, dispatch ejecuta la acción del mismo store. */
function contexto(store, estado) {
	const commits = []
	const ctx = {
		state: estado || store.state,
		commit: (nombre, valor) => {
			commits.push([nombre, valor])
			if (store.mutations[nombre]) {
				store.mutations[nombre](ctx.state, valor)
			}
		},
		dispatch: (nombre, valor) => store.actions[nombre](ctx, valor),
		rootState: {},
	}
	return { ctx: ctx, commits: commits }
}

function nuevo_estado(store) {
	return JSON.parse(JSON.stringify(store.state))
}

function error_http(status, mensaje) {
	const e = new Error('HTTP ' + status)
	e.response = { status: status, data: { message: mensaje } }
	return e
}

test('el resumen se pide en silencio y el badge sale del `badge` de la API', async () => {
	const { store, pedidos } = store_con(() => Promise.resolve({ data: { a_revisar: 3, sin_ver: 1, badge: 4, en_proceso: 0 } }))
	const estado = nuevo_estado(store)
	const { ctx } = contexto(store, estado)
	await store.actions.get_resumen(ctx)
	assert.equal(pedidos[0].url, '/api/dimension-search-runs/resumen')
	assert.equal(pedidos[0].config.skip_global_error_event, true)
	assert.equal(pedidos[0].config.skip_navigation_cancel, true)
	assert.equal(store.getters.badge(estado), 4)
})

test('resumen: un 404 o un 403 (API sin rutas o sin la extensión) deja el badge en cero, sin ruido', async () => {
	for (const status of [404, 403]) {
		const { store } = store_con(() => Promise.reject(error_http(status, 'x')))
		const estado = nuevo_estado(store)
		estado.resumen = { a_revisar: 5, sin_ver: 2, badge: 7, en_proceso: 1 }
		const { ctx } = contexto(store, estado)
		await store.actions.get_resumen(ctx)
		assert.equal(store.getters.badge(estado), 0, 'status ' + status)
	}
})

test('resumen: un 500 no toca el badge que ya estaba', async () => {
	const { store } = store_con(() => Promise.reject(error_http(500, 'x')))
	const estado = nuevo_estado(store)
	estado.resumen = { a_revisar: 5, sin_ver: 2, badge: 7, en_proceso: 1 }
	const { ctx } = contexto(store, estado)
	const log = console.log
	console.log = () => {}
	try {
		await store.actions.get_resumen(ctx)
	} finally {
		console.log = log
	}
	assert.equal(store.getters.badge(estado), 7)
})

test('corridas: la lista se pide en silencio, con la página y 25 por página, y se normaliza', async () => {
	const cuerpo = {
		data: [{ id: 7, status: 'en_proceso', total: 100, procesados: 10, conteos: { a_revisar: 2 } }, null],
		total: 1, last_page: 1, current_page: 1,
		models: { data: [{ id: 7, status: 'en_proceso', total: 100, procesados: 10, conteos: { a_revisar: 2 } }], total: 1, last_page: 1, current_page: 1 },
		resumen: { a_revisar: 2, sin_ver: 0, badge: 2, en_proceso: 1 },
	}
	const { store, pedidos } = store_con(() => Promise.resolve({ data: cuerpo }))
	const estado = nuevo_estado(store)
	const { ctx } = contexto(store, estado)
	await store.actions.get_corridas(ctx)
	assert.equal(pedidos[0].url, '/api/dimension-search-runs')
	assert.deepEqual(pedidos[0].config.params, { page: 1, per_page: 25 })
	assert.equal(pedidos[0].config.skip_global_error_event, true)
	assert.equal(estado.models.length, 1)
	assert.equal(estado.models[0].id, 7)
	assert.equal(estado.models[0].conteos.a_revisar, 2)
	assert.equal(estado.total, 1)
	assert.equal(estado.cargado, true)
	assert.equal(estado.error, false)
	assert.equal(estado.no_disponible, false)
	assert.equal(store.getters.badge(estado), 2)
	assert.equal(store.getters.hay_activas(estado), true)
})

test('corridas: acepta el contrato literal {data, total} sin `models`', async () => {
	const { store } = store_con(() => Promise.resolve({ data: { data: [{ id: 9, status: 'terminada' }], total: 1, last_page: 1, current_page: 1 } }))
	const estado = nuevo_estado(store)
	await store.actions.get_corridas(contexto(store, estado).ctx)
	assert.equal(estado.models[0].id, 9)
	assert.equal(store.getters.hay_activas(estado), false)
})

test('corridas: un 404 es «no disponible», sin error, sin tabla y sin toast (el pedido es silencioso)', async () => {
	for (const status of [404, 403]) {
		const { store, pedidos } = store_con(() => Promise.reject(error_http(status, 'Extensión requerida: agentes_ia')))
		const estado = nuevo_estado(store)
		estado.models = [{ id: 1 }]
		await store.actions.get_corridas(contexto(store, estado).ctx)
		assert.equal(estado.no_disponible, true, 'status ' + status)
		assert.equal(estado.error, false)
		assert.deepEqual(estado.models, [])
		assert.equal(estado.cargado, true)
		assert.equal(estado.loading, false)
		assert.equal(pedidos[0].config.skip_global_error_event, true)
	}
})

test('corridas: un 500 es un error con Reintentar; el refresco silencioso no borra la tabla', async () => {
	const { store } = store_con(() => Promise.reject(error_http(500, 'x')))
	const log = console.log
	console.log = () => {}
	try {
		const estado = nuevo_estado(store)
		await store.actions.get_corridas(contexto(store, estado).ctx)
		assert.equal(estado.error, true)
		assert.equal(estado.no_disponible, false)

		const con_tabla = nuevo_estado(store)
		con_tabla.models = [{ id: 1, status: 'en_proceso' }]
		await store.actions.get_corridas(contexto(store, con_tabla).ctx, { silencioso: true })
		assert.equal(con_tabla.error, false)
		assert.equal(con_tabla.models.length, 1)
	} finally {
		console.log = log
	}
})

test('corridas: una página fuera de rango pide la última que existe', async () => {
	let llamadas = 0
	const { store, pedidos } = store_con(() => {
		llamadas++
		if (llamadas === 1) {
			return Promise.resolve({ data: { models: { data: [], total: 30, last_page: 2, current_page: 3 } } })
		}
		return Promise.resolve({ data: { models: { data: [{ id: 1, status: 'terminada' }], total: 30, last_page: 2, current_page: 2 } } })
	})
	const estado = nuevo_estado(store)
	estado.page = 3
	await store.actions.get_corridas(contexto(store, estado).ctx)
	assert.equal(pedidos.length, 2)
	assert.equal(pedidos[1].config.params.page, 2)
	assert.equal(estado.models.length, 1)
})

test('items: pide la solapa, la página y el buscador, y devuelve items normalizados con conteos', async () => {
	const { store, pedidos } = store_con(() => Promise.resolve({ data: {
		models: { data: [{ id: 5, status: 'a_revisar', propuesta: { peso: 0.5 } }], total: 61, last_page: 3, current_page: 2 },
		conteos: { asignadas: 10, a_revisar: 61, sin_datos: 4 },
	} }))
	const datos = await store.actions.get_items({}, { corrida_id: 7, solapa: 'a_revisar', page: 2, per_page: 25, buscar: 'espada' })
	assert.equal(pedidos[0].url, '/api/dimension-search-runs/7/items')
	assert.deepEqual(pedidos[0].config.params, { solapa: 'a_revisar', page: 2, per_page: 25, buscar: 'espada' })
	assert.equal(datos.total, 61)
	assert.equal(datos.ultima_pagina, 3)
	assert.equal(datos.items[0].id, 5)
	assert.equal(datos.items[0].campos[0].valor, 0.5)
	assert.equal(datos.conteos.a_revisar, 61)
})

test('items: sin buscador el parámetro no viaja', async () => {
	const { store, pedidos } = store_con(() => Promise.resolve({ data: { models: { data: [], total: 0, last_page: 1 } } }))
	await store.actions.get_items({}, { corrida_id: 7, solapa: 'asignadas' })
	assert.deepEqual(pedidos[0].config.params, { solapa: 'asignadas', page: 1, per_page: 25 })
})

test('aprobar: sin valores no manda cuerpo; con valores manda {valores}', async () => {
	const { store, pedidos } = store_con(() => Promise.resolve({ data: { id: 5, status: 'aprobada', model: { id: 5, status: 'aprobada' } } }))
	const sin = await store.actions.aprobar({}, 5)
	assert.equal(pedidos[0].url, '/api/dimension-search-items/5/aprobar')
	assert.deepEqual(pedidos[0].cuerpo, {})
	assert.equal(sin.status, 'aprobada')
	await store.actions.aprobar({}, { id: 6, valores: { alto: 35.5, ancho: 7 } })
	assert.equal(pedidos[1].url, '/api/dimension-search-items/6/aprobar')
	assert.deepEqual(pedidos[1].cuerpo, { valores: { alto: 35.5, ancho: 7 } })
	// Un {id} sin valores tampoco manda cuerpo.
	await store.actions.aprobar({}, { id: 7 })
	assert.deepEqual(pedidos[2].cuerpo, {})
})

test('rechazar, quitar y los lotes pegan en las rutas del contrato', async () => {
	const { store, pedidos } = store_con(() => Promise.resolve({ data: { model: { id: 5, status: 'rechazada' }, aprobados: 2, rechazados: 3, fallidos: [] } }))
	await store.actions.rechazar({}, 5)
	await store.actions.quitar({}, 6)
	const aprobados = await store.actions.aprobar_varios({}, [1, 2])
	const rechazados = await store.actions.rechazar_varios({}, [3, 4, 5])
	assert.deepEqual(pedidos.map(p => p.url), [
		'/api/dimension-search-items/5/rechazar',
		'/api/dimension-search-items/6/quitar',
		'/api/dimension-search-items/aprobar-varios',
		'/api/dimension-search-items/rechazar-varios',
	])
	assert.deepEqual(pedidos[2].cuerpo, { ids: [1, 2] })
	assert.deepEqual(pedidos[3].cuerpo, { ids: [3, 4, 5] })
	assert.equal(aprobados.aprobados, 2)
	assert.equal(rechazados.rechazados, 3)
})

test('previa: pide con solo_con_stock=1/0 y devuelve la previa normalizada; una respuesta vieja se ignora', async () => {
	const resolvedores = []
	const { store, pedidos } = store_con(() => new Promise(resolver => resolvedores.push(resolver)))
	const primera = store.actions.get_previa_catalogo({}, { solo_con_stock: true })
	const segunda = store.actions.get_previa_catalogo({}, { solo_con_stock: false })
	assert.equal(pedidos[0].url, '/api/dimension-search-runs/catalogo/previa')
	assert.deepEqual(pedidos[0].config.params, { solo_con_stock: 1 })
	assert.deepEqual(pedidos[1].config.params, { solo_con_stock: 0 })
	// La segunda contesta primero; después llega la primera, que ya es vieja.
	resolvedores[1]({ data: { a_buscar: 50, proveedor_configurado: true, ia_configurada: true } })
	resolvedores[0]({ data: { a_buscar: 10 } })
	const previa_segunda = await segunda
	const previa_primera = await primera
	assert.equal(previa_segunda.a_buscar, 50)
	assert.equal(previa_segunda.proveedor_configurado, true)
	assert.equal(previa_primera, undefined)
})

test('lanzar catálogo: manda solo_con_stock (y el límite solo si hay) y devuelve la corrida', async () => {
	const { store, pedidos } = store_con(() => Promise.resolve({ data: { id: 12, model: { id: 12, status: 'pendiente', total: 4159 } } }))
	const corrida = await store.actions.lanzar_catalogo({}, { solo_con_stock: true })
	assert.equal(pedidos[0].url, '/api/dimension-search-runs/catalogo')
	assert.deepEqual(pedidos[0].cuerpo, { solo_con_stock: true })
	assert.equal(corrida.id, 12)
	assert.equal(corrida.total, 4159)
	await store.actions.lanzar_catalogo({}, { solo_con_stock: false, limite: 100 })
	assert.deepEqual(pedidos[1].cuerpo, { solo_con_stock: false, limite: 100 })
})

test('detener y reanudar actualizan la fila de la tabla', async () => {
	const { store, pedidos } = store_con(() => Promise.resolve({ data: { id: 12, model: { id: 12, status: 'detenida', puede_reanudar: true } } }))
	const estado = nuevo_estado(store)
	estado.models = [{ id: 12, status: 'en_proceso' }, { id: 13, status: 'terminada' }]
	const { ctx } = contexto(store, estado)
	const corrida = await store.actions.detener(ctx, 12)
	assert.equal(pedidos[0].url, '/api/dimension-search-runs/12/detener')
	assert.equal(corrida.status, 'detenida')
	assert.equal(estado.models[0].status, 'detenida')
	assert.equal(estado.models[1].status, 'terminada')
	await store.actions.reanudar(ctx, 12)
	assert.equal(pedidos[1].url, '/api/dimension-search-runs/12/reanudar')
})

test('una cancelación sale marcada y no como un error', async () => {
	const cancelacion = { __cancelado: true }
	const { store, modulo } = store_con(() => Promise.reject(cancelacion))
	let rechazo = null
	try {
		await store.actions.get_corrida({ commit() {} }, 7)
	} catch (err) {
		rechazo = err
	}
	assert.ok(rechazo)
	assert.equal(modulo.es_cancelacion(rechazo), true)
	assert.equal(modulo.es_cancelacion(error_http(500, 'x')), false)
})
