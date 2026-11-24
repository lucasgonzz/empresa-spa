const { test } = require('node:test')
const assert = require('node:assert/strict')
const Vue = require('vue')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')
const { crear_avisador, avisador_pedidos } = cargar('utils/aviso_pedido_dispositivo.js')

function navegador() {
	const valores = new Map()
	const eventos = new Map()
	const avisos = []
	let pedidosPermiso = 0
	function Notification(titulo, opciones) {
		this.titulo = titulo
		this.opciones = opciones
		this.close = () => { this.cerrado = true; if (this.onclose) this.onclose() }
		avisos.push(this)
	}
	Notification.permission = 'default'
	Notification.requestPermission = () => {
		pedidosPermiso++
		Notification.permission = 'granted'
		return Promise.resolve('granted')
	}
	return {
		isSecureContext: true, Notification, avisos, valores, eventos,
		get pedidosPermiso() { return pedidosPermiso },
		localStorage: { getItem: k => valores.get(k) || null, setItem: (k, v) => valores.set(k, v) },
		addEventListener: (k, v) => eventos.set(k, v),
		removeEventListener: (k, v) => { if (eventos.get(k) === v) eventos.delete(k) },
	}
}
function preparar() {
	const nav = navegador()
	const servicio = crear_avisador(() => nav)
	servicio.contexto(2, 3)
	servicio.conexion(true)
	return { nav, servicio }
}
test('permiso sólo por gesto; estado, privacidad, dedupe numérico/texto y persistencia', async () => {
	const { nav, servicio } = preparar()
	assert.equal(nav.pedidosPermiso, 0)
	assert.equal(servicio.recibir({ order_id: 4 }), false)
	assert.equal(servicio.estado().codigo, 'desactivado')
	await servicio.habilitar()
	assert.equal(nav.pedidosPermiso, 1)
	assert.equal(servicio.estado().codigo, 'habilitado')
	assert.equal(servicio.recibir({ order_id: 4, buyer: { name: 'SECRETO' }, total: 750 }), true)
	assert.equal(servicio.recibir({ order_id: '4' }), false)
	assert.deepEqual([nav.avisos[0].titulo, nav.avisos[0].opciones.body],
		['Nuevo pedido en tu tienda', 'Abrí Pedidos en el sistema para revisarlo.'])
	assert.equal(JSON.stringify(nav.avisos).includes('SECRETO'), false)
	const otro = crear_avisador(() => nav)
	otro.contexto(2, 3); otro.conexion(true)
	assert.equal(otro.recibir({ order_id: 4 }), false)
	assert.equal(otro.estado().codigo, 'habilitado')
})
test('opt-in separado por comercio, usuario y navegador; disable cierra e invalida', async () => {
	const { nav, servicio } = preparar()
	await servicio.habilitar()
	servicio.recibir({ order_id: 8 })
	servicio.contexto(2, 9)
	assert.equal(nav.avisos[0].cerrado, true)
	assert.equal(servicio.recibir({ order_id: 9 }), false)
	servicio.contexto(7, 3)
	assert.equal(servicio.estado().elegido, false)
	servicio.contexto(2, 3)
	assert.equal(servicio.estado().codigo, 'habilitado')
	const nuevo = crear_avisador(navegador)
	nuevo.contexto(2, 3); nuevo.conexion(true)
	assert.equal(nuevo.estado().elegido, false)
	servicio.deshabilitar()
	assert.equal(servicio.estado().codigo, 'desactivado')
})
test('desconexión y reconexión nunca avisan; sólo otro evento nuevo conectado', async () => {
	const { nav, servicio } = preparar()
	await servicio.habilitar()
	servicio.recibir({ order_id: 1 })
	servicio.conexion(false)
	assert.equal(servicio.estado().codigo, 'desconectado')
	assert.equal(nav.avisos[0].cerrado, true)
	assert.equal(servicio.recibir({ order_id: 2 }), false)
	servicio.conexion(true)
	assert.equal(nav.avisos.length, 1)
	assert.equal(servicio.recibir({ order_id: 1 }), false)
	assert.equal(servicio.recibir({ order_id: 3 }), true)
})
test('sin soporte, contexto inseguro, denegado, constructor mobile y storage bloqueado son recuperables', async () => {
	const { nav, servicio } = preparar()
	nav.isSecureContext = false
	assert.equal(servicio.estado().codigo, 'sin_soporte')
	await servicio.habilitar()
	assert.equal(nav.pedidosPermiso, 0)
	nav.isSecureContext = true
	nav.Notification.permission = 'denied'
	assert.equal(servicio.estado().codigo, 'denegado')
	await servicio.habilitar()
	assert.equal(nav.pedidosPermiso, 0)
	nav.Notification.permission = 'granted'
	nav.localStorage.setItem = () => { throw Error('bloqueado') }
	await servicio.habilitar()
	assert.equal(servicio.estado().codigo, 'sin_soporte')
	const segundo = preparar()
	await segundo.servicio.habilitar()
	segundo.nav.Notification = function () { throw Error('constructor no soportado') }
	segundo.nav.Notification.permission = 'granted'
	segundo.nav.Notification.requestPermission = () => Promise.resolve('granted')
	assert.equal(segundo.servicio.recibir({ order_id: 1 }), false)
	assert.equal(segundo.servicio.estado().codigo, 'sin_soporte')
})
test('permiso tardío tras logout/cambio de identidad o desactivar no habilita otra sesión', async () => {
	const { nav, servicio } = preparar()
	let resolver
	nav.Notification.requestPermission = () => new Promise(r => { resolver = r })
	const pendiente = servicio.habilitar()
	assert.equal(servicio.estado().pendiente, true)
	servicio.contexto(2, 9)
	resolver('granted')
	await pendiente
	assert.equal(servicio.estado().elegido, false)
	servicio.contexto(2, 3)
	assert.equal(servicio.estado().elegido, false)
	const otro = servicio.habilitar()
	servicio.deshabilitar()
	resolver('granted')
	await otro
	assert.equal(servicio.estado().elegido, false)
})
test('ids inválidos, datos rotos y permiso revocado no crean avisos', async () => {
	const { nav, servicio } = preparar()
	await servicio.habilitar()
	for (const payload of [null, {}, { order_id: 0 }, { order_id: '../4' }, { order_id: NaN }]) {
		assert.equal(servicio.recibir(payload), false)
	}
	nav.valores.set('cc:aviso-pedido:v1:2:3:vistos', 'roto')
	assert.equal(servicio.recibir({ order_id: 22 }), true)
	nav.Notification.permission = 'denied'
	servicio.refrescar()
	assert.equal(nav.avisos[0].cerrado, true)
	assert.equal(servicio.recibir({ order_id: 23 }), false)
})
test('permiso rechazado no produce rechazo sin manejar ni deja botón esperando', async () => {
	const { nav, servicio } = preparar()
	nav.Notification.requestPermission = () => Promise.reject(Error('no disponible'))
	await servicio.habilitar()
	assert.equal(servicio.estado().pendiente, false)
	assert.equal(servicio.estado().codigo, 'sin_soporte')
})
function echoFalso() {
	const callbacks = new Map()
	const canales = new Map()
	const bajas = []
	const connection = {
		state: 'connected',
		bind(k, v) { callbacks.set(k, v) },
		unbind(k, v) { if (callbacks.get(k) === v) callbacks.delete(k) },
	}
	return {
		connection, callbacks, canales, bajas,
		connector: { pusher: { connection } },
		channel(k) { return { notification(fn) { canales.set(k, fn) } } },
		leave(k) { bajas.push(k) },
	}
}
test('mixin REAL Echo: Laravel notification, store real simulado, watchers Vue, reconexión y cleanup', async () => {
	const nav = navegador()
	global.window = nav
	const mixin = cargar('mixins/broadcast.js', { '@/mixins/online': { __esModule: true, default: {} } }).default
	const Echo = echoFalso()
	const acciones = []
	const vm = new Vue({
		mixins: [mixin],
		data: () => ({ Echo, authenticated: true, user: { id: 3 }, owner: { online: true }, owner_id: 2 }),
	})
	vm.$store = { state: {}, dispatch: k => { acciones.push(k); return Promise.resolve() } }
	// No se altera el código del mixin ni sus callbacks: sólo se aíslan sus canales ajenos a pedidos.
	vm.listenSupportChannel = () => {}
	vm.listenSessionForcedLogoutChannel = () => {}
	vm.escuchar_pedidos_nuevos()
	vm.escuchar_pedidos_nuevos()
	assert.equal(Echo.canales.size, 1)
	assert.equal(Echo.callbacks.size, 2)
	assert.equal(nav.pedidosPermiso, 0)
	await avisador_pedidos.habilitar()
	const vivo = Echo.canales.get('order.created.2')
	vivo({ order_id: 31, order_num: 999 })
	vivo({ order_id: 31 })
	assert.equal(nav.avisos.length, 1)
	assert.deepEqual(acciones, ['order/getUnconfirmedModels', 'order/getUnconfirmedModels'])
	Echo.callbacks.get('state_change')({ current: 'disconnected' })
	vivo({ order_id: 32 })
	assert.equal(nav.avisos.length, 1)
	Echo.callbacks.get('state_change')({ current: 'connected' })
	Echo.callbacks.get('connected')()
	assert.equal(acciones.at(-1), 'order/getUnconfirmedModels')
	assert.equal(nav.avisos.length, 1)
	vm.user = { id: 8 }
	await Vue.nextTick()
	assert.equal(avisador_pedidos.estado().elegido, false)
	vivo({ order_id: 33 })
	assert.equal(nav.avisos.length, 1)
	await avisador_pedidos.habilitar()
	Echo.canales.get('order.created.2')({ order_id: 34 })
	assert.equal(nav.avisos.length, 2)
	vm.owner_id = 9
	await Vue.nextTick()
	assert.ok(Echo.bajas.includes('order.created.2'))
	vm.authenticated = false
	await Vue.nextTick()
	assert.equal(vm.order_created_echo_channel, null)
	assert.equal(Echo.callbacks.size, 0)
	assert.equal(avisador_pedidos.estado().codigo, 'desconectado')
	vm.$destroy()
	assert.equal(Echo.callbacks.size, 0)
	delete global.window
})
test('control REAL Vue2: render del botón ejecuta gesto, estados accesibles y listeners se retiran', async () => {
	const nav = navegador()
	global.window = nav
	avisador_pedidos.contexto(55, 66); avisador_pedidos.conexion(true)
	const componente = cargar('components/online/components/orders/AvisosEnDispositivo.vue').default
	const vm = new Vue(Object.assign({}, componente, {
		components: { 'b-button': { render(h) { return h('button', this.$slots.default) } } },
	}))
	componente.mounted.call(vm)
	assert.equal(nav.pedidosPermiso, 0)
	let arbol = vm._render()
	assert.equal(arbol.children[0].data.attrs.role, 'status')
	assert.match(vm.texto_estado, /desactivados/)
	assert.match(arbol.children[1].children[0].text, /sistema cerrado.*correos/)
	await arbol.children[2].componentOptions.listeners.click()
	await Vue.nextTick()
	assert.equal(nav.pedidosPermiso, 1)
	assert.match(vm.texto_estado, /habilitados/)
	arbol = vm._render()
	arbol.children[2].componentOptions.listeners.click()
	assert.equal(avisador_pedidos.estado().elegido, false)
	avisador_pedidos.conexion(false)
	assert.match(vm.texto_estado, /desconectados/)
	vm.$destroy()
	assert.equal(nav.eventos.size, 0)
	avisador_pedidos.contexto(null, null)
	delete global.window
})
test('listados históricos y actualización real de Index sólo refrescan tabla, no crean avisos', async () => {
	const nav = navegador()
	global.window = nav
	avisador_pedidos.contexto(87, 88); avisador_pedidos.conexion(true)
	await avisador_pedidos.habilitar()
	const index = cargar('components/online/components/orders/Index.vue', {
		'@/components/online/components/vincular-comprador/BadgeSinVincular': { __esModule: true, default: {} },
	}).default
	assert.ok(index.components.AvisosEnDispositivo)
	const acciones = []
	const vm = new Vue(Object.assign({}, index, {
		beforeCreate() {
			this.$store = { state: { order: { unconfirmed_models: [{ id: 50 }], selected: [], from_dates: true } },
				dispatch: k => acciones.push(k) }
		},
		computed: Object.assign({}, index.computed, { view() { return 'pedidos' } }),
	}))
	assert.deepEqual(acciones, ['order/getModels'])
	index.watch.ids_sin_confirmar.call(vm, [50, 51], [50])
	assert.equal(acciones.at(-1), 'order/getModels')
	assert.equal(nav.avisos.length, 0)
	// No se montó Index (sin DOM); se verifica su watcher real sin ejecutar hooks DOM ajenos.
	avisador_pedidos.contexto(null, null)
	delete global.window
})
