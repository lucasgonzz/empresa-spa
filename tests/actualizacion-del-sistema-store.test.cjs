// Store actualizacion_del_sistema (src/store/actualizacion_del_sistema.js) de la misión
// aviso-actualizacion-sistema (25/11/2026), CA21 del plan: el pedido de OK, "faltan N computadoras",
// la tolerancia a una API sin las rutas (404) y la marca del sistema actualizando. Sin red: `axios`
// es un falso que registra lo que se le pide.
//
// Ejecutar con: node --test tests/actualizacion-del-sistema-store.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const URL_ESTADO = '/api/actualizacion-del-sistema/estado'
const URL_RESPUESTA = '/api/actualizacion-del-sistema/respuesta'
const URL_PUBLICO = '/api/actualizacion-del-sistema/publico'

/** La marca que contesta la API (503 `sistema_actualizando`). */
const MARCA = {
	error: 'sistema_actualizando',
	message: 'Estamos actualizando el sistema. Mientras tanto no se puede usar. Cuando termine vas a poder ingresar de nuevo desde esta pantalla.',
	reintentar_en_segundos: 30,
}

/**
 * Carga el store con un axios falso.
 *
 * @param {Function} responder (metodo, url, config, cuerpo) -> Promise con la respuesta del falso.
 * @returns {{store: object, pedidos: Array}}
 */
function store_con(responder) {
	const pedidos = []
	const axios = {
		defaults: {},
		get: (url, config) => {
			pedidos.push({ metodo: 'get', url: url, config: config })
			return responder('get', url, config)
		},
		post: (url, cuerpo, config) => {
			pedidos.push({ metodo: 'post', url: url, cuerpo: cuerpo, config: config })
			return responder('post', url, config, cuerpo)
		},
	}
	const modulo = cargar('store/actualizacion_del_sistema.js', {
		'axios': { __esModule: true, default: axios },
	})
	return { store: modulo.default, pedidos: pedidos }
}

/** Un contexto de Vuex de mentira: commit aplica la mutación, dispatch ejecuta la acción del mismo store. */
function contexto(store, estado) {
	const commits = []
	const ctx = {
		state: estado,
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

/** Copia del estado inicial: cada test arranca limpio. */
function nuevo_estado(store) {
	return JSON.parse(JSON.stringify(typeof store.state === 'function' ? store.state() : store.state))
}

/** Un error de axios con respuesta. */
function error_http(status, data) {
	const e = new Error('HTTP ' + status)
	e.isAxiosError = true
	e.response = { status: status, data: data }
	return e
}

/** Una respuesta de `GET estado` con el pedido abierto y esta computadora sin contestar. */
function estado_pidiendo_ok(extra) {
	return { data: Object.assign({
		estado: 'pidiendo_ok',
		mi_respuesta: 'pendiente',
		total: 3,
		aceptaron: 0,
		faltan: 3,
		segundos_para_responder: 600,
		mensaje: null,
	}, extra || {}) }
}

test('consultar pide el estado en silencio (sin toast global de error ni cancelación por navegación)', async () => {
	const { store, pedidos } = store_con(() => Promise.resolve({ data: { estado: 'libre', mi_respuesta: null, total: 0, aceptaron: 0, faltan: 0, segundos_para_responder: 0 } }))
	const estado = nuevo_estado(store)
	const { ctx } = contexto(store, estado)
	await store.actions.consultar(ctx)
	assert.equal(pedidos.length, 1)
	assert.equal(pedidos[0].metodo, 'get')
	assert.equal(pedidos[0].url, URL_ESTADO)
	assert.equal(pedidos[0].config.skip_global_error_event, true)
	assert.equal(pedidos[0].config.skip_navigation_cancel, true)
	assert.equal(estado.estado, 'libre')
	assert.equal(store.getters.mostrar_modal(estado), false)
	assert.equal(store.getters.mostrar_faltan(estado), false)
})

test('consultar con 404 deja sin_soporte=true y el polling no vuelve a pedir', async () => {
	const { store, pedidos } = store_con(() => Promise.reject(error_http(404, { message: 'Not Found' })))
	const estado = nuevo_estado(store)
	const { ctx } = contexto(store, estado)
	assert.equal(estado.sin_soporte, false)
	await store.actions.consultar(ctx)
	assert.equal(estado.sin_soporte, true)
	assert.equal(pedidos.length, 1)
	// El mixin vuelve a llamar cada 60 s: con la API sin soporte no sale ningún pedido más.
	await store.actions.consultar(ctx)
	await store.actions.consultar(ctx)
	assert.equal(pedidos.length, 1)
	// Y un 404 no es la marca ni un bloqueo.
	assert.equal(estado.bloqueado, false)
})

test('pidiendo_ok con mi_respuesta=pendiente muestra el modal, y la pastilla no', async () => {
	const { store } = store_con(() => Promise.resolve(estado_pidiendo_ok()))
	const estado = nuevo_estado(store)
	const { ctx } = contexto(store, estado)
	await store.actions.consultar(ctx)
	assert.equal(estado.estado, 'pidiendo_ok')
	assert.equal(estado.mi_respuesta, 'pendiente')
	assert.equal(estado.total, 3)
	assert.equal(estado.segundos_para_responder, 600)
	assert.equal(store.getters.mostrar_modal(estado), true)
	assert.equal(store.getters.mostrar_faltan(estado), false)
})

test('responder("acepto") cierra el modal, muestra la pastilla y dice cuántas faltan', async () => {
	const { store, pedidos } = store_con((metodo, url) => {
		if (metodo === 'get') {
			return Promise.resolve(estado_pidiendo_ok())
		}
		return Promise.resolve({ data: { estado: 'pidiendo_ok', mi_respuesta: 'acepto', total: 3, aceptaron: 1, faltan: 2, segundos_para_responder: 590, mensaje: null } })
	})
	const estado = nuevo_estado(store)
	const { ctx } = contexto(store, estado)
	await store.actions.consultar(ctx)
	assert.equal(store.getters.mostrar_modal(estado), true)

	const salio_bien = await store.actions.responder(ctx, 'acepto')
	const envio = pedidos.filter(p => p.metodo === 'post')[0]
	assert.equal(envio.url, URL_RESPUESTA)
	assert.deepEqual(envio.cuerpo, { respuesta: 'acepto' })
	assert.equal(salio_bien, true)
	assert.equal(estado.mi_respuesta, 'acepto')
	assert.equal(store.getters.mostrar_modal(estado), false)
	assert.equal(store.getters.mostrar_faltan(estado), true)
	assert.equal(store.getters.texto_faltan(estado), 'Faltan 2 computadoras por confirmar')
})

test('con una sola computadora por confirmar el texto va en singular', async () => {
	const { store } = store_con(() => Promise.resolve(estado_pidiendo_ok({ mi_respuesta: 'acepto', aceptaron: 2, faltan: 1 })))
	const estado = nuevo_estado(store)
	const { ctx } = contexto(store, estado)
	await store.actions.consultar(ctx)
	assert.equal(store.getters.texto_faltan(estado), 'Falta 1 computadora por confirmar')
	assert.equal(store.getters.mostrar_faltan(estado), true)
})

test('responder("ahora_no") deja el pedido en rechazado y no queda ni modal ni pastilla', async () => {
	const { store, pedidos } = store_con((metodo) => {
		if (metodo === 'get') {
			return Promise.resolve(estado_pidiendo_ok())
		}
		return Promise.resolve({ data: { estado: 'rechazado', mi_respuesta: null, total: 3, aceptaron: 0, faltan: 3, segundos_para_responder: 0, mensaje: null } })
	})
	const estado = nuevo_estado(store)
	const { ctx } = contexto(store, estado)
	await store.actions.consultar(ctx)
	await store.actions.responder(ctx, 'ahora_no')
	assert.deepEqual(pedidos.filter(p => p.metodo === 'post')[0].cuerpo, { respuesta: 'ahora_no' })
	assert.equal(estado.estado, 'rechazado')
	assert.equal(store.getters.mostrar_modal(estado), false)
	assert.equal(store.getters.mostrar_faltan(estado), false)
})

test('responder prende y apaga el indicador global de carga, también si falla', async () => {
	const { store } = store_con(() => Promise.reject(error_http(500, { message: 'Error' })))
	const estado = nuevo_estado(store)
	const { ctx, commits } = contexto(store, estado)
	const salio_bien = await store.actions.responder(ctx, 'acepto')
	assert.equal(salio_bien, false)
	const cargas = commits.filter(c => c[0] === 'auth/setLoading').map(c => c[1])
	assert.deepEqual(cargas, [true, false])
	const mensajes = commits.filter(c => c[0] === 'auth/setMessage').map(c => c[1])
	assert.equal(mensajes[mensajes.length - 1], '')
})

test('responder con 409 sin_pedido vuelve a consultar el estado para ponerse al día', async () => {
	const { store, pedidos } = store_con((metodo) => {
		if (metodo === 'post') {
			return Promise.reject(error_http(409, { error: 'sin_pedido' }))
		}
		return Promise.resolve({ data: { estado: 'libre', mi_respuesta: null, total: 0, aceptaron: 0, faltan: 0, segundos_para_responder: 0 } })
	})
	const estado = nuevo_estado(store)
	Object.assign(estado, { estado: 'pidiendo_ok', mi_respuesta: 'pendiente', total: 3, faltan: 3 })
	const { ctx } = contexto(store, estado)
	const salio_bien = await store.actions.responder(ctx, 'acepto')
	assert.equal(salio_bien, false)
	assert.equal(pedidos.filter(p => p.metodo === 'get' && p.url === URL_ESTADO).length, 1)
	assert.equal(estado.estado, 'libre')
	assert.equal(store.getters.mostrar_modal(estado), false)
})

test('consultar con la marca 503 deja bloqueado con el mensaje de la API y no rechaza', async () => {
	const { store } = store_con(() => Promise.reject(error_http(503, MARCA)))
	const estado = nuevo_estado(store)
	const { ctx } = contexto(store, estado)
	await store.actions.consultar(ctx)
	assert.equal(estado.bloqueado, true)
	assert.equal(estado.mensaje, MARCA.message)
	assert.equal(estado.sin_soporte, false)
	assert.equal(store.getters.mostrar_modal(estado), false)
})

test('un error cualquiera de consultar no rechaza ni cambia el estado ni apaga el soporte', async () => {
	const { store } = store_con(() => Promise.reject(error_http(500, { message: 'Server Error' })))
	const estado = nuevo_estado(store)
	const { ctx } = contexto(store, estado)
	await store.actions.consultar(ctx)
	assert.equal(estado.sin_soporte, false)
	assert.equal(estado.bloqueado, false)
	assert.equal(estado.estado, 'libre')
})

test('set_bloqueado usa el mensaje por defecto cuando la API no manda uno', () => {
	const { store } = store_con(() => Promise.resolve({ data: {} }))
	const estado = nuevo_estado(store)
	store.mutations.set_bloqueado(estado, undefined)
	assert.equal(estado.bloqueado, true)
	assert.match(estado.mensaje, /actualizando el sistema/)
	store.mutations.set_bloqueado(estado, 'Texto de la API')
	assert.equal(estado.mensaje, 'Texto de la API')
})

test('consultar_publico con la marca bloquea; con libre después de un bloqueo marca que terminó', async () => {
	let respuesta = () => Promise.reject(error_http(503, MARCA))
	const { store, pedidos } = store_con(() => respuesta())
	const estado = nuevo_estado(store)
	const { ctx } = contexto(store, estado)

	await store.actions.consultar_publico(ctx)
	assert.equal(pedidos[0].url, URL_PUBLICO)
	assert.equal(pedidos[0].config.skip_global_error_event, true)
	assert.equal(estado.bloqueado, true)
	assert.equal(estado.terminada, false)

	respuesta = () => Promise.resolve({ data: { estado: 'libre' } })
	await store.actions.consultar_publico(ctx)
	assert.equal(estado.bloqueado, false)
	assert.equal(estado.terminada, true)
})

test('consultar_publico con libre sin bloqueo previo no inventa un "ya terminó"', async () => {
	const { store } = store_con(() => Promise.resolve({ data: { estado: 'libre' } }))
	const estado = nuevo_estado(store)
	const { ctx } = contexto(store, estado)
	await store.actions.consultar_publico(ctx)
	assert.equal(estado.bloqueado, false)
	assert.equal(estado.terminada, false)
})

test('consultar_publico con un 404 (API vieja) o un error no bloquea ni rechaza', async () => {
	const { store } = store_con(() => Promise.reject(error_http(404, { message: 'Not Found' })))
	const estado = nuevo_estado(store)
	const { ctx } = contexto(store, estado)
	await store.actions.consultar_publico(ctx)
	assert.equal(estado.bloqueado, false)
	assert.equal(estado.terminada, false)
})

test('limpiar_pedido apaga el pedido pero conserva el bloqueo (el interceptor lo prende al cerrar la sesión)', () => {
	const { store } = store_con(() => Promise.resolve({ data: {} }))
	const estado = nuevo_estado(store)
	Object.assign(estado, { estado: 'pidiendo_ok', mi_respuesta: 'acepto', total: 3, aceptaron: 1, faltan: 2, bloqueado: true, mensaje: 'x' })
	store.mutations.limpiar_pedido(estado)
	assert.equal(estado.estado, 'libre')
	assert.equal(estado.mi_respuesta, null)
	assert.equal(estado.faltan, 0)
	assert.equal(estado.bloqueado, true)
	assert.equal(estado.mensaje, 'x')
})
