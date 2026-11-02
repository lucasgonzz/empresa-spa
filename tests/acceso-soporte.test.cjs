// Ingreso con acceso de soporte (misión acceso-soporte-firmado, 30/10/2026): la lectura del token
// de la dirección (src/utils/acceso_soporte.js) y el arranque de la vista (src/views/AccesoSoporte.vue).
//
// Ejecutar con: node --test tests/acceso-soporte.test.cjs
// No levanta servidores ni usa la suite de Playwright: son funciones puras y un componente armado a
// mano (sin Vue), con `window`, axios y el store reemplazados por dobles que anotan el orden de los
// llamados.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { leer_token_de_acceso_soporte, direccion_sin_token } = cargar('utils/acceso_soporte.js')

// Los mixins del repo arrastran el store y media aplicación: se reemplazan por objetos vacíos.
// La vista solo usa de ellos `authenticated` y `redirect()`, que acá provee el doble.
const vacio = { __esModule: true, default: {} }
const AccesoSoporte = cargar('views/AccesoSoporte.vue', {
	'@/common-vue/mixins/generals': vacio,
	'@/common-vue/mixins/permissions': vacio,
}).default

const TOKEN = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5z6A7b8C9d0E1f2'

// --- Lectura del token ---------------------------------------------------------------------------

test('lee el token del fragmento (#t=), que es lo que emite el admin', () => {
	assert.equal(leer_token_de_acceso_soporte('#t=' + TOKEN, ''), TOKEN)
})

test('por tolerancia lee el token de la query (?t=)', () => {
	assert.equal(leer_token_de_acceso_soporte('', '?t=' + TOKEN), TOKEN)
})

test('si vienen los dos, manda el fragmento', () => {
	assert.equal(leer_token_de_acceso_soporte('#t=del_fragmento', '?t=de_la_query'), 'del_fragmento')
})

test('un fragmento sin token no tapa al de la query', () => {
	assert.equal(leer_token_de_acceso_soporte('#otra_cosa', '?t=de_la_query'), 'de_la_query')
	assert.equal(leer_token_de_acceso_soporte('#t=', '?t=de_la_query'), 'de_la_query')
})

test('sin token devuelve null: vacío, solo espacios, otro parámetro o nada', () => {
	assert.equal(leer_token_de_acceso_soporte('', ''), null)
	assert.equal(leer_token_de_acceso_soporte(undefined, undefined), null)
	assert.equal(leer_token_de_acceso_soporte('#t=', ''), null)
	assert.equal(leer_token_de_acceso_soporte('#t=%20%20', ''), null)
	assert.equal(leer_token_de_acceso_soporte('#x=1', '?y=2'), null)
})

test('el token se lee junto a otros parámetros del fragmento', () => {
	assert.equal(leer_token_de_acceso_soporte('#a=1&t=' + TOKEN + '&b=2', ''), TOKEN)
})

// --- La dirección que queda en la barra ------------------------------------------------------------

test('la barra queda en la ruta sola: sin fragmento y sin ?t=', () => {
	assert.equal(direccion_sin_token('/acceso-soporte', ''), '/acceso-soporte')
	assert.equal(direccion_sin_token('/acceso-soporte', '?t=' + TOKEN), '/acceso-soporte')
})

test('la barra conserva los demás parámetros de la query (forceStable) y borra solo t', () => {
	assert.equal(direccion_sin_token('/acceso-soporte', '?forceStable&t=' + TOKEN), '/acceso-soporte?forceStable=')
	assert.equal(direccion_sin_token('/acceso-soporte', '?x=1&t=' + TOKEN + '&y=2'), '/acceso-soporte?x=1&y=2')
})

// --- Arranque de la vista --------------------------------------------------------------------------

/**
 * Arma la vista a mano y corre su `created()`, anotando en `eventos`, en orden, todo lo que toca
 * la barra, la red y el store.
 *
 * @param {object} opciones
 * @param {string} [opciones.hash] `window.location.hash`.
 * @param {string} [opciones.search] `window.location.search`.
 * @param {Function} [opciones.canje] Qué hace el POST de canje (por defecto responde 200).
 * @param {boolean} [opciones.autenticado] Qué dice `authenticated` después de `auth/me`.
 * @param {string} [opciones.ruta] Nombre de la ruta actual cuando termina el canje.
 * @param {boolean} [opciones.red_caida] Si el GET de csrf-cookie rechaza (sin conexión con el servidor).
 * @returns {{vista: object, eventos: string[]}}
 */
function montar(opciones) {
	const eventos = []
	globalThis.window = {
		location: { hash: opciones.hash || '', search: opciones.search || '', pathname: '/acceso-soporte' },
		history: { replaceState: (estado, titulo, url) => eventos.push('replaceState ' + JSON.stringify(estado) + ' ' + JSON.stringify(titulo) + ' ' + url) },
	}
	const vista = Object.assign({}, AccesoSoporte.methods, {
		estado: 'cargando',
		authenticated: opciones.autenticado !== false,
		$route: { name: opciones.ruta || 'accesoSoporte' },
		$axios: {
			get: url => {
				eventos.push('GET ' + url)
				return opciones.red_caida ? Promise.reject(new Error('Network Error')) : Promise.resolve({})
			},
			post: (url, cuerpo) => {
				eventos.push('POST ' + url + ' ' + JSON.stringify(cuerpo))
				return opciones.canje ? opciones.canje() : Promise.resolve({ data: { ok: true } })
			},
		},
		$store: {
			commit: (nombre, valor) => eventos.push('commit ' + nombre + ' ' + JSON.stringify(valor)),
			dispatch: nombre => { eventos.push('dispatch ' + nombre); return Promise.resolve() },
		},
		redirect: () => eventos.push('redirect'),
	})
	AccesoSoporte.created.call(vista)
	return { vista, eventos }
}

/** Deja correr toda la cadena de promesas de la vista. */
const esperar = () => new Promise(resolver => setImmediate(resolver))

test('el token sale de la barra ANTES de cualquier pedido de red', async () => {
	const { eventos } = montar({ hash: '#t=' + TOKEN })
	await esperar()

	const barra = eventos.findIndex(e => e.startsWith('replaceState'))
	const red = eventos.findIndex(e => e.startsWith('GET ') || e.startsWith('POST '))
	assert.equal(barra, 0, 'lo primero que pasa es limpiar la barra')
	assert.ok(red > barra, 'la red viene después')
	assert.equal(eventos[barra], 'replaceState null "" /acceso-soporte')
	// El token no queda en ningún lado de lo que se le entrega al navegador.
	assert.ok(!eventos[barra].includes(TOKEN))
})

test('canje exitoso: csrf-cookie, canje con {t}, auth/me y redirect()', async () => {
	const { vista, eventos } = montar({ hash: '#t=' + TOKEN })
	await esperar()

	assert.deepEqual(eventos.slice(1), [
		'commit auth/setMessage "Entrando con acceso de soporte"',
		'commit auth/setLoading true',
		'GET /sanctum/csrf-cookie',
		'POST /api/acceso-soporte/canjear ' + JSON.stringify({ t: TOKEN }),
		'dispatch auth/me',
		'redirect',
		'commit auth/setLoading false',
		'commit auth/setMessage ""',
	])
	assert.equal(vista.estado, 'cargando', 'no hay pantalla de error')
})

test('el token de la query (?t=) también se canjea, y la barra conserva forceStable', async () => {
	const { eventos } = montar({ search: '?forceStable&t=' + TOKEN })
	await esperar()

	assert.equal(eventos[0], 'replaceState null "" /acceso-soporte?forceStable=')
	assert.ok(eventos.includes('POST /api/acceso-soporte/canjear ' + JSON.stringify({ t: TOKEN })))
})

test('si el watcher de App.vue ya navegó, no se hace un redirect duplicado', async () => {
	const { eventos } = montar({ hash: '#t=' + TOKEN, ruta: 'vender' })
	await esperar()

	assert.ok(eventos.includes('dispatch auth/me'))
	assert.ok(!eventos.includes('redirect'))
})

test('sin token: error, sin ningún pedido de red y sin overlay', async () => {
	const { vista, eventos } = montar({})
	await esperar()

	assert.equal(vista.estado, 'error')
	assert.deepEqual(eventos, ['replaceState null "" /acceso-soporte'])
})

test('canje rechazado (401): error, sin auth/me, y el overlay se apaga', async () => {
	const { vista, eventos } = montar({
		hash: '#t=' + TOKEN,
		canje: () => Promise.reject({ response: { status: 401, data: { error: 'token_invalido' } } }),
	})
	await esperar()

	assert.equal(vista.estado, 'error')
	assert.ok(!eventos.includes('dispatch auth/me'))
	assert.ok(!eventos.includes('redirect'))
	assert.equal(eventos[eventos.length - 2], 'commit auth/setLoading false')
	assert.equal(eventos[eventos.length - 1], 'commit auth/setMessage ""')
})

test('canje en 200 pero sin sesión después de auth/me: también es error', async () => {
	const { vista, eventos } = montar({ hash: '#t=' + TOKEN, autenticado: false })
	await esperar()

	assert.equal(vista.estado, 'error')
	assert.ok(!eventos.includes('redirect'))
	assert.equal(eventos[eventos.length - 2], 'commit auth/setLoading false')
})

test('red caída en csrf-cookie: error, sin canje y overlay apagado', async () => {
	const { vista, eventos } = montar({ hash: '#t=' + TOKEN, red_caida: true })
	await esperar()

	assert.equal(vista.estado, 'error')
	assert.ok(!eventos.some(e => e.startsWith('POST ')))
	assert.ok(!eventos.includes('dispatch auth/me'))
	assert.equal(eventos[eventos.length - 2], 'commit auth/setLoading false')
	assert.equal(eventos[eventos.length - 1], 'commit auth/setMessage ""')
})
