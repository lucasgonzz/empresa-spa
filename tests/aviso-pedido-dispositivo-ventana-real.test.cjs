// Corrección visual C1 (D3 y D4): el aviso de pedidos con la forma REAL de `window` y la notificación al instante.
// Los tests existentes inyectan un navegador falso con `userAgent` arriba; en el navegador real el agente sólo vive
// en `window.navigator.userAgent`, así que la detección por plataforma nunca se activaba y las marcas guardaban 'sin_agente'.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')
const { crear_avisador, avisador_pedidos } = cargar('utils/aviso_pedido_dispositivo.js')

const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const CHROME_ESCRITORIO = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const MARCA_VERIFICADO = 'cc:aviso-pedido:v1:dispositivo:verificado'

// Forma de `window` del navegador real: el agente SOLO en navigator.userAgent (nunca en window.userAgent).
function ventana_real(agente, valores) {
	const eventos = new Map()
	function Notification(titulo, parametros) {
		this.titulo = titulo
		this.opciones = parametros
		this.close = () => {}
	}
	Notification.permission = 'granted'
	Notification.requestPermission = () => Promise.resolve('granted')
	return {
		isSecureContext: true,
		navigator: { userAgent: agente },
		Notification,
		valores,
		localStorage: { getItem: k => valores.get(k) || null, setItem: (k, v) => valores.set(k, v) },
		addEventListener: (k, v) => eventos.set(k, v),
		removeEventListener: (k, v) => { if (eventos.get(k) === v) eventos.delete(k) },
	}
}

test('la instancia exportada lee el agente de window.navigator', () => {
	const anterior = global.window
	try {
		global.window = ventana_real(CHROME_ANDROID, new Map())
		assert.equal(global.window.userAgent, undefined)
		avisador_pedidos.contexto(1, 1)
		avisador_pedidos.conexion(true)
		assert.equal(avisador_pedidos.estado().codigo, 'sin_soporte')
		assert.equal(avisador_pedidos.estado().motivo, 'constructor')

		// Chrome de escritorio sigue igual que antes: no es incapaz y, sin opt-in, queda a la espera.
		const valores = new Map()
		global.window = ventana_real(CHROME_ESCRITORIO, valores)
		assert.equal(avisador_pedidos.estado().codigo, 'desactivado')
		assert.equal(avisador_pedidos.estado().motivo, 'navegador')

		// Una marca escrita guarda el agente real, nunca 'sin_agente'.
		valores.set('cc:aviso-pedido:v1:1:1:optin', '1')
		assert.equal(avisador_pedidos.estado().codigo, 'habilitado')
		assert.equal(avisador_pedidos.recibir({ order_id: 7 }), true)
		assert.equal(valores.get(MARCA_VERIFICADO), CHROME_ESCRITORIO)
	} finally {
		avisador_pedidos.conexion(false)
		if (anterior === undefined) delete global.window
		else global.window = anterior
	}
})

test('un aviso exitoso publica verificado al instante', () => {
	const valores = new Map([['cc:aviso-pedido:v1:2:3:optin', '1']])
	const nav = ventana_real(CHROME_ESCRITORIO, valores)
	const servicio = crear_avisador(() => nav)
	servicio.contexto(2, 3)
	servicio.conexion(true)
	const recibidos = []
	servicio.suscribir(estado => recibidos.push(estado))
	assert.equal(recibidos[recibidos.length - 1].verificado, false)
	assert.equal(servicio.recibir({ order_id: 9 }), true)
	// Sin disparar `focus` ni `storage`: el observador se entera en el acto.
	assert.equal(recibidos[recibidos.length - 1].verificado, true)
})
