// Aviso de actualización del sistema, ronda 3 (misión aviso-actualizacion-sistema, 25/11/2026): la última
// computadora que acepta recibe 200 con `estado: 'actualizando'` en la respuesta de `responder`. Antes no
// pasaba nada hasta el siguiente poll (hasta 60 s con el sistema ya cerrado para el resto); ahora se
// consulta el estado enseguida para recibir la marca 503, que cierra el front y lleva al login.
//
// Ejecutar con: node --test tests/actualizacion-del-sistema-ronda3.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const Vue = require('vue')
const Vuex = require('vuex')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

Vue.use(Vuex)
Vue.config.productionTip = false

const MARCA = { error: 'sistema_actualizando', message: 'Estamos actualizando el sistema.', reintentar_en_segundos: 30 }

function error_http(status, data) {
	const e = new Error('HTTP ' + status)
	e.isAxiosError = true
	e.response = { status: status, data: data }
	return e
}

/** Vuex real con el store nuevo; `pedidos` registra cada llamada al axios falso. */
function entorno(respuesta_post) {
	const pedidos = []
	const axios = {
		defaults: {},
		get: (url) => {
			pedidos.push('GET ' + url)
			return Promise.reject(error_http(503, MARCA))
		},
		post: (url) => {
			pedidos.push('POST ' + url)
			return Promise.resolve({ data: respuesta_post })
		},
	}
	const modulo = cargar('store/actualizacion_del_sistema.js', { 'axios': { __esModule: true, default: axios } })
	const auth = {
		namespaced: true,
		state: { authenticated: true, user: { id: 1 } },
		mutations: { setAuthenticated() {}, setUser() {}, setLoading() {}, setMessage() {} },
	}
	return { store: new Vuex.Store({ modules: { auth: auth, actualizacion_del_sistema: modulo.default } }), pedidos: pedidos }
}

test('si la respuesta de responder trae estado=actualizando se consulta el estado enseguida', async () => {
	const { store, pedidos } = entorno({ estado: 'actualizando', mi_respuesta: 'acepto', total: 3, aceptaron: 3, faltan: 0, segundos_para_responder: 0 })
	const salio_bien = await store.dispatch('actualizacion_del_sistema/responder', 'acepto')
	assert.equal(salio_bien, true)
	assert.deepEqual(pedidos, ['POST /api/actualizacion-del-sistema/respuesta', 'GET /api/actualizacion-del-sistema/estado'])
	// La consulta recibió la marca 503.
	assert.equal(store.state.actualizacion_del_sistema.bloqueado, true)
})

test('si el pedido sigue abierto, responder no hace ninguna consulta extra', async () => {
	const { store, pedidos } = entorno({ estado: 'pidiendo_ok', mi_respuesta: 'acepto', total: 3, aceptaron: 1, faltan: 2, segundos_para_responder: 590 })
	await store.dispatch('actualizacion_del_sistema/responder', 'acepto')
	assert.deepEqual(pedidos, ['POST /api/actualizacion-del-sistema/respuesta'])
	assert.equal(store.state.actualizacion_del_sistema.bloqueado, false)
})
