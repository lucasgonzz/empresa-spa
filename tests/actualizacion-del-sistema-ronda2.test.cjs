// Aviso de actualización del sistema, ronda 2 de la misión aviso-actualizacion-sistema (25/11/2026).
// Corrige lo que rechazaron las revisiones A y C de la ronda 1, con Vue 2 y Vuex REALES (no a mano):
//
//  1. El toast "La actualización se pasó para la noche." salía cuando el pedido pasaba a `actualizando`
//     (la marca cierra la sesión del front y el reseteo local dejaba el estado en `libre`) y con un logout
//     común con el pedido abierto. Tiene que salir SÓLO si el servidor dice que el pedido se rechazó
//     ("Ahora no") o se canceló (`libre` con la sesión viva), nunca por un reseteo local.
//  2. Pestañas zombi: con 2+ pestañas, la primera recibe la marca y la API invalida la sesión compartida;
//     las otras reciben 401 en la consulta del estado. Con la sesión del front abierta, ese 401 tiene que
//     cerrar el front (el watch de App.vue lleva al login, donde la tarjeta consulta el estado público).
//  3. La marca tiene que limpiar la bandera de sesión sin conexión: el login no puede decir "Sin conexión".
//
// Ejecutar con: node --test tests/actualizacion-del-sistema-ronda2.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Vue = require('vue')
const Vuex = require('vuex')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

Vue.use(Vuex)
Vue.config.productionTip = false
Vue.config.devtools = false

const TEXTO_TOAST = 'La actualización se pasó para la noche.'

/** Una respuesta de `GET estado` con el pedido abierto y esta computadora sin contestar. */
const PIDIENDO_OK = { data: { estado: 'pidiendo_ok', mi_respuesta: 'pendiente', total: 3, aceptaron: 0, faltan: 3, segundos_para_responder: 600 } }

/** Un error de axios con respuesta. */
function error_http(status, data) {
	const e = new Error('HTTP ' + status)
	e.isAxiosError = true
	e.response = { status: status, data: data }
	return e
}

/**
 * Arma un entorno real: un Vuex con el store nuevo y un `auth` mínimo, y un Vue con el mixin nuevo
 * (con `authenticated` y `owner_id` como los da el mixin `generals` en App.vue).
 *
 * @param {Function} responder (metodo, url, cuerpo) -> Promise con la respuesta del axios falso.
 * @returns {{store: Vuex.Store, vm: Vue, toasts: Array}}
 */
function entorno(responder) {
	const axios = {
		defaults: {},
		get: (url) => responder('get', url),
		post: (url, cuerpo) => responder('post', url, cuerpo),
	}
	const modulo = cargar('store/actualizacion_del_sistema.js', { 'axios': { __esModule: true, default: axios } })
	const auth = {
		namespaced: true,
		state: { authenticated: true, user: { id: 1, owner_id: null }, sesion_sin_conexion: null, online: true, loading: false, message: '' },
		mutations: {
			setAuthenticated(state, valor) { state.authenticated = valor },
			setUser(state, valor) { state.user = valor },
			set_sesion_sin_conexion(state, valor) { state.sesion_sin_conexion = valor },
			set_online(state, valor) { state.online = valor },
			setLoading(state, valor) { state.loading = valor },
			setMessage(state, valor) { state.message = valor },
		},
	}
	const store = new Vuex.Store({ modules: { auth: auth, actualizacion_del_sistema: modulo.default } })
	const mixin = cargar('mixins/actualizacion_del_sistema.js').default
	const toasts = []
	const vm = new Vue({
		store: store,
		mixins: [mixin],
		computed: {
			authenticated() { return this.$store.state.auth.authenticated },
			owner_id() { return 1 },
		},
		beforeCreate() {
			this.$toast = { info: texto => toasts.push(texto), error: texto => toasts.push('ERROR ' + texto) }
		},
		render: h => h('div'),
	})
	return { store: store, vm: vm, toasts: toasts }
}

/** Deja correr los watchers de Vue (se ejecutan en el siguiente tick). */
function dejar_correr() {
	return Vue.nextTick().then(() => Vue.nextTick())
}

/**
 * Lo que hace el interceptor de main.js al recibir la marca 503 (lo mismo que su rama, a mano: no se
 * puede cargar main.js sin navegador). Que la rama real lo haga lo fija el test de lectura de abajo.
 */
function llega_la_marca(store) {
	store.commit('actualizacion_del_sistema/set_bloqueado', 'Estamos actualizando el sistema.')
	store.commit('auth/setAuthenticated', false)
	store.commit('auth/setUser', null)
}

test('la marca con el pedido abierto NO muestra "se pasó para la noche"', async () => {
	const { store, vm, toasts } = entorno(() => Promise.resolve(PIDIENDO_OK))
	await store.dispatch('actualizacion_del_sistema/consultar')
	await dejar_correr()
	assert.equal(store.state.actualizacion_del_sistema.estado, 'pidiendo_ok')

	llega_la_marca(store)
	await dejar_correr()

	assert.deepEqual(toasts, [])
	assert.equal(store.state.actualizacion_del_sistema.bloqueado, true)
	vm.$destroy()
})

test('un logout común con el pedido abierto NO muestra "se pasó para la noche"', async () => {
	const { store, vm, toasts } = entorno(() => Promise.resolve(PIDIENDO_OK))
	await store.dispatch('actualizacion_del_sistema/consultar')
	await dejar_correr()

	store.commit('auth/setAuthenticated', false)
	store.commit('auth/setUser', null)
	await dejar_correr()

	assert.deepEqual(toasts, [])
	vm.$destroy()
})

test('"Ahora no" (estado rechazado) sí muestra el aviso, una sola vez', async () => {
	let ronda = 0
	const { store, vm, toasts } = entorno(() => {
		ronda++
		return Promise.resolve(ronda === 1 ? PIDIENDO_OK : { data: { estado: 'rechazado', mi_respuesta: null, total: 3, aceptaron: 0, faltan: 3, segundos_para_responder: 0 } })
	})
	await store.dispatch('actualizacion_del_sistema/consultar')
	await dejar_correr()
	assert.deepEqual(toasts, [])

	await store.dispatch('actualizacion_del_sistema/consultar')
	await dejar_correr()
	assert.deepEqual(toasts, [TEXTO_TOAST])

	// Otra consulta con el mismo estado no repite el aviso.
	await store.dispatch('actualizacion_del_sistema/consultar')
	await dejar_correr()
	assert.deepEqual(toasts, [TEXTO_TOAST])
	vm.$destroy()
})

test('responder("ahora_no") muestra el aviso a quien lo apretó', async () => {
	const { store, vm, toasts } = entorno((metodo) => {
		if (metodo === 'get') {
			return Promise.resolve(PIDIENDO_OK)
		}
		return Promise.resolve({ data: { estado: 'rechazado', mi_respuesta: null, total: 3, aceptaron: 0, faltan: 3, segundos_para_responder: 0 } })
	})
	await store.dispatch('actualizacion_del_sistema/consultar')
	await store.dispatch('actualizacion_del_sistema/responder', 'ahora_no')
	await dejar_correr()
	assert.deepEqual(toasts, [TEXTO_TOAST])
	vm.$destroy()
})

test('que el servidor cancele el pedido (libre con la sesión viva) también muestra el aviso', async () => {
	let ronda = 0
	const { store, vm, toasts } = entorno(() => {
		ronda++
		return Promise.resolve(ronda === 1 ? PIDIENDO_OK : { data: { estado: 'libre', mi_respuesta: null, total: 0, aceptaron: 0, faltan: 0, segundos_para_responder: 0 } })
	})
	await store.dispatch('actualizacion_del_sistema/consultar')
	await store.dispatch('actualizacion_del_sistema/consultar')
	await dejar_correr()
	assert.deepEqual(toasts, [TEXTO_TOAST])
	vm.$destroy()
})

test('libre que sigue libre, o un rechazado sin pedido previo en esta pantalla, no avisan nada', async () => {
	let ronda = 0
	const { store, vm, toasts } = entorno(() => {
		ronda++
		return Promise.resolve({ data: { estado: ronda === 1 ? 'libre' : 'rechazado', mi_respuesta: null, total: 0, aceptaron: 0, faltan: 0, segundos_para_responder: 0 } })
	})
	await store.dispatch('actualizacion_del_sistema/consultar')
	await store.dispatch('actualizacion_del_sistema/consultar')
	await dejar_correr()
	assert.deepEqual(toasts, [])
	vm.$destroy()
})

test('un 401 en consultar con la sesión del front abierta cierra el front (pestaña zombi)', async () => {
	const { store, vm } = entorno(() => Promise.reject(error_http(401, { message: 'Unauthenticated.' })))
	assert.equal(store.state.auth.authenticated, true)
	await store.dispatch('actualizacion_del_sistema/consultar')
	assert.equal(store.state.auth.authenticated, false)
	assert.equal(store.state.auth.user, null)
	// No sabemos si es una actualización: el bloqueo lo decide el estado público del login.
	assert.equal(store.state.actualizacion_del_sistema.bloqueado, false)
	assert.equal(store.state.actualizacion_del_sistema.sin_soporte, false)
	vm.$destroy()
})

test('un 401 en consultar sin sesión de front (logout en curso o ya hecho) no toca nada', async () => {
	const { store, vm } = entorno(() => Promise.reject(error_http(401, { message: 'Unauthenticated.' })))
	store.commit('auth/setAuthenticated', false)
	const usuario = store.state.auth.user
	await store.dispatch('actualizacion_del_sistema/consultar')
	assert.equal(store.state.auth.authenticated, false)
	assert.equal(store.state.auth.user, usuario)
	vm.$destroy()
})

test('otros errores de consultar (500, red cortada) no cierran la sesión del front', async () => {
	for (const fallo of [error_http(500, { message: 'Server Error' }), error_http(403, { message: 'Forbidden' }), new Error('Network Error')]) {
		const { store, vm } = entorno(() => Promise.reject(fallo))
		await store.dispatch('actualizacion_del_sistema/consultar')
		assert.equal(store.state.auth.authenticated, true)
		assert.notEqual(store.state.auth.user, null)
		vm.$destroy()
	}
})

test('la rama de la marca en main.js limpia la sesión sin conexión y avisa que hay conexión', () => {
	const main = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8')
	const inicio = main.indexOf('if (es_respuesta_de_actualizacion(error))')
	assert.ok(inicio !== -1)
	const bloque = main.slice(inicio, main.indexOf('return Promise.reject(error)', inicio))
	assert.match(bloque, /auth\/set_sesion_sin_conexion', null/)
	assert.match(bloque, /auth\/set_online', true/)
})
