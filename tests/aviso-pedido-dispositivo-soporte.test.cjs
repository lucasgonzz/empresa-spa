// Corrección M9 R1: el aviso en el dispositivo no promete "habilitado" en un navegador que no puede mostrarlo.
// Chrome en Android tiene Notification y requestPermission, pero `new Notification()` lanza "Illegal constructor"
// (sólo admite ServiceWorkerRegistration.showNotification, fuera del alcance de esta misión).
// Estos tests no tocan los de aviso-pedido-dispositivo.test.cjs: los complementan.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const Vue = require('vue')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')
const { crear_avisador, avisador_pedidos } = cargar('utils/aviso_pedido_dispositivo.js')

const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const CHROME_ESCRITORIO = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// `ilegal` imita a Chrome Android: la clase existe, pero construirla lanza TypeError.
function navegador(opciones) {
	const config = Object.assign({ userAgent: CHROME_ESCRITORIO, ilegal: false, valores: new Map() }, opciones)
	const eventos = new Map()
	const avisos = []
	let pedidosPermiso = 0
	function Notification(titulo, parametros) {
		if (config.ilegal) {
			throw new TypeError("Failed to construct 'Notification': Illegal constructor. Use ServiceWorkerRegistration.showNotification() instead.")
		}
		this.titulo = titulo
		this.opciones = parametros
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
		isSecureContext: true, userAgent: config.userAgent, Notification, avisos, eventos, valores: config.valores,
		get pedidosPermiso() { return pedidosPermiso },
		localStorage: { getItem: k => config.valores.get(k) || null, setItem: (k, v) => config.valores.set(k, v) },
		addEventListener: (k, v) => eventos.set(k, v),
		removeEventListener: (k, v) => { if (eventos.get(k) === v) eventos.delete(k) },
	}
}
function preparar(opciones, owner, usuario) {
	const nav = navegador(opciones)
	const servicio = crear_avisador(() => nav)
	servicio.contexto(owner || 2, usuario || 3)
	servicio.conexion(true)
	return { nav, servicio }
}

test('Chrome Android: antes del primer pedido ya es sin soporte y no pide permiso ni guarda opt-in', async () => {
	const { nav, servicio } = preparar({ userAgent: CHROME_ANDROID, ilegal: true })
	assert.equal(servicio.estado().codigo, 'sin_soporte')
	assert.equal(servicio.estado().motivo, 'constructor')
	await servicio.habilitar()
	assert.equal(nav.pedidosPermiso, 0)
	assert.equal(servicio.estado().codigo, 'sin_soporte')
	assert.equal(servicio.estado().elegido, false)
	assert.equal(nav.valores.get('cc:aviso-pedido:v1:2:3:optin'), undefined)
})

test('Chrome Android: desconexión o permiso denegado no esconden que el navegador no puede mostrar avisos', () => {
	const { nav, servicio } = preparar({ userAgent: CHROME_ANDROID, ilegal: true })
	servicio.conexion(false)
	assert.equal(servicio.estado().codigo, 'sin_soporte')
	nav.Notification.permission = 'denied'
	assert.equal(servicio.estado().codigo, 'sin_soporte')
})

test('navegador desconocido: si el constructor falla en el primer pedido, la recarga sigue sin soporte', async () => {
	const valores = new Map()
	// El usuario ya activó los avisos (opt-in y permiso otorgado); el navegador resulta incapaz recién al construir.
	valores.set('cc:aviso-pedido:v1:2:3:optin', '1')
	const ilegal = navegador({ ilegal: true, valores })
	ilegal.Notification.permission = 'granted'
	const servicio = crear_avisador(() => ilegal)
	servicio.contexto(2, 3); servicio.conexion(true)
	assert.equal(servicio.estado().codigo, 'habilitado')
	assert.equal(servicio.recibir({ order_id: 1 }), false)
	assert.equal(servicio.estado().codigo, 'sin_soporte')
	// Recarga: instancia nueva, mismo localStorage, mismo navegador; el fallo no se olvida.
	const recargado = crear_avisador(() => ilegal)
	recargado.contexto(2, 3); recargado.conexion(true)
	assert.equal(recargado.estado().codigo, 'sin_soporte')
	await recargado.habilitar()
	assert.equal(ilegal.pedidosPermiso, 0)
	// Es del dispositivo: otro usuario del mismo navegador tampoco queda "habilitado".
	const otro = crear_avisador(() => ilegal)
	otro.contexto(5, 6); otro.conexion(true)
	assert.equal(otro.estado().codigo, 'sin_soporte')
})

test('la marca de constructor roto se descarta si el navegador cambia (otra versión) y no la causa un error ajeno', async () => {
	const valores = new Map()
	const roto = navegador({ ilegal: true, valores })
	roto.Notification.permission = 'granted'
	valores.set('cc:aviso-pedido:v1:2:3:optin', '1')
	const primero = crear_avisador(() => roto)
	primero.contexto(2, 3); primero.conexion(true)
	primero.recibir({ order_id: 1 })
	assert.equal(primero.estado().codigo, 'sin_soporte')
	const actualizado = navegador({ userAgent: CHROME_ESCRITORIO + ' Version/2', valores })
	actualizado.Notification.permission = 'granted'
	const segundo = crear_avisador(() => actualizado)
	segundo.contexto(2, 3); segundo.conexion(true)
	assert.equal(segundo.estado().codigo, 'habilitado')
	// Un error que no es de constructor ilegal (p. ej. un Error genérico) no se persiste para siempre.
	const generico = navegador({ valores: new Map() })
	generico.Notification = function () { throw new Error('falla transitoria') }
	generico.Notification.permission = 'granted'
	generico.Notification.requestPermission = () => Promise.resolve('granted')
	generico.valores.set('cc:aviso-pedido:v1:2:3:optin', '1')
	const a = crear_avisador(() => generico)
	a.contexto(2, 3); a.conexion(true)
	a.recibir({ order_id: 1 })
	assert.equal(a.estado().codigo, 'sin_soporte')
	const b = crear_avisador(() => generico)
	b.contexto(2, 3); b.conexion(true)
	assert.equal(b.estado().codigo, 'habilitado')
})

test('habilitado sin verificar hasta que un aviso real se construye; la verificación sobrevive a la recarga', async () => {
	const valores = new Map()
	const { nav, servicio } = preparar({ valores })
	await servicio.habilitar()
	assert.equal(servicio.estado().codigo, 'habilitado')
	assert.equal(servicio.estado().verificado, false)
	assert.equal(servicio.recibir({ order_id: 10 }), true)
	assert.equal(servicio.estado().verificado, true)
	const recargado = crear_avisador(() => nav)
	recargado.contexto(2, 3); recargado.conexion(true)
	assert.equal(recargado.estado().verificado, true)
})

test('opt-in guardado con permiso en default no se muestra como elegido (botón y texto coherentes)', async () => {
	const { nav, servicio } = preparar()
	nav.valores.set('cc:aviso-pedido:v1:2:3:optin', '1')
	assert.equal(nav.Notification.permission, 'default')
	assert.equal(servicio.estado().codigo, 'desactivado')
	assert.equal(servicio.estado().elegido, false)
	await servicio.habilitar()
	assert.equal(nav.pedidosPermiso, 1)
	assert.equal(servicio.estado().codigo, 'habilitado')
	assert.equal(servicio.estado().elegido, true)
})

test('control Vue2: Chrome Android muestra texto veraz y botón Activar deshabilitado, nunca "habilitados"', async () => {
	const nav = navegador({ userAgent: CHROME_ANDROID, ilegal: true })
	global.window = nav
	avisador_pedidos.contexto(61, 62); avisador_pedidos.conexion(true)
	const componente = cargar('components/online/components/orders/AvisosEnDispositivo.vue').default
	const vm = new Vue(Object.assign({}, componente, {
		components: { 'b-button': { props: ['disabled'], render(h) { return h('button', { attrs: { disabled: this.disabled } }, this.$slots.default) } } },
	}))
	componente.mounted.call(vm)
	assert.doesNotMatch(vm.texto_estado, /habilitados/)
	assert.match(vm.texto_estado, /no (permite|disponibles)/)
	assert.match(vm.texto_estado, /Android/)
	const boton = vm._render().children[2]
	assert.match(boton.componentOptions.children[0].text, /Activar/)
	assert.equal(boton.componentOptions.propsData.disabled, true)
	vm.$destroy()
	avisador_pedidos.contexto(null, null)
	delete global.window
})

test('control Vue2: habilitado sin verificar lo dice, y con opt-in viejo y permiso default ofrece Activar', async () => {
	const nav = navegador()
	global.window = nav
	nav.valores.set('cc:aviso-pedido:v1:71:72:optin', '1')
	avisador_pedidos.contexto(71, 72); avisador_pedidos.conexion(true)
	const componente = cargar('components/online/components/orders/AvisosEnDispositivo.vue').default
	const vm = new Vue(Object.assign({}, componente, {
		components: { 'b-button': { render(h) { return h('button', this.$slots.default) } } },
	}))
	componente.mounted.call(vm)
	assert.match(vm.texto_estado, /desactivados/)
	assert.match(vm._render().children[2].componentOptions.children[0].text, /Activar/)
	await vm._render().children[2].componentOptions.listeners.click()
	await Vue.nextTick()
	assert.match(vm.texto_estado, /habilitados/)
	assert.match(vm.texto_estado, /primer pedido/)
	vm.$destroy()
	avisador_pedidos.contexto(null, null)
	delete global.window
})
