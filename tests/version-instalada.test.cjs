// Versión instalada e historial de actualizaciones (misión version-instalada-historial, 23/11/2026).
// Cubre CA9 del plan (util puro de fechas y textos) y la tolerancia del store a una API sin la ruta.
// Lo de la interfaz real (item bajo "Cambiar contraseña", modal, tres anchos) NO se prueba acá: lo mira el
// Coordinador en la app (CA10). Acá sólo hay chequeos de texto del template porque node no monta Vue.
//
// Ejecutar con: node --test tests/version-instalada.test.cjs
// No levanta servidores ni usa la suite de Playwright.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const raiz = path.resolve(__dirname, '..')

/**
 * Carga el util puro recién cuando el test lo necesita, para que cada test falle por su cuenta
 * (y no todo el archivo de golpe) mientras el módulo no exista.
 *
 * @returns {object} Los exports de src/utils/version_instalada.js.
 */
function util() {
	return cargar('utils/version_instalada.js')
}

// ---------- CA9: días calendario en hora argentina ----------

test('dias_desde_instalacion: pasada la medianoche argentina es 1 día aunque no pasen 24 h', () => {
	assert.equal(util().dias_desde_instalacion('2026-11-22T23:30:00-03:00', '2026-11-23T00:10:00-03:00'), 1)
})

test('dias_desde_instalacion: el mismo día es 0', () => {
	assert.equal(util().dias_desde_instalacion('2026-11-23T03:14:00-03:00', '2026-11-23T10:00:00-03:00'), 0)
})

test('dias_desde_instalacion: 30 días calendario', () => {
	assert.equal(util().dias_desde_instalacion('2026-10-24T12:00:00-03:00', '2026-11-23T10:00:00-03:00'), 30)
})

test('dias_desde_instalacion: un instante en UTC se pasa a la fecha argentina antes de contar', () => {
	// 02:30 UTC del 23/11 = 23:30 del 22/11 en Argentina.
	assert.equal(util().dias_desde_instalacion('2026-11-23T02:30:00Z', '2026-11-23T10:00:00-03:00'), 1)
})

// ---------- CA9: textos ----------

test('texto_hace: Hoy / Ayer / Hace N días', () => {
	const { texto_hace } = util()
	assert.equal(texto_hace(0), 'Hoy')
	assert.equal(texto_hace(1), 'Ayer')
	assert.equal(texto_hace(30), 'Hace 30 días')
})

test('formatear_fecha: dd/mm/aaaa hh:mm en hora argentina', () => {
	assert.equal(util().formatear_fecha('2026-11-23T03:14:00-03:00'), '23/11/2026 03:14')
})

test('fecha_en_argentina: separa las partes en hora argentina', () => {
	assert.deepEqual(util().fecha_en_argentina('2026-11-23T02:30:00Z'), { anio: 2026, mes: 11, dia: 22, hora: 23, minuto: 30 })
})

test('texto_del_item: con versión y sin registro', () => {
	const { texto_del_item } = util()
	assert.equal(texto_del_item({ version: '4.5.0' }), 'Versión 4.5.0')
	assert.equal(texto_del_item(null), 'Versión sin registrar')
})

test('etiqueta_de_fuente: la fecha aproximada del historial previo se distingue de una instalación', () => {
	const { etiqueta_de_fuente } = util()
	assert.equal(etiqueta_de_fuente('historial_previo'), 'Fecha de publicación (aproximada)')
	assert.equal(etiqueta_de_fuente('instalacion'), 'Instalada')
})

// ---------- Store installed_version ----------

/**
 * Carga el store con un axios falso que registra los pedidos.
 *
 * @param {Function} responder (url) -> Promise con la respuesta del falso.
 * @returns {{store: object, pedidos: string[]}}
 */
function store_con(responder) {
	const pedidos = []
	const axios = {
		defaults: {},
		get: url => {
			pedidos.push(url)
			return responder(url)
		},
	}
	const modulo = cargar('store/installed_version.js', {
		'axios': { __esModule: true, default: axios },
		'@/runtime_config': { env: () => 'http://api.test' },
	})
	return { store: modulo.default, pedidos: pedidos }
}

/** Contexto de Vuex de mentira: aplica las mutaciones del mismo store. */
function contexto(store) {
	const ctx = {
		state: store.state,
		commit: (nombre, valor) => store.mutations[nombre](ctx.state, valor),
	}
	return ctx
}

test('store: fetch pide GET /api/installed-version y guarda current e history', () => {
	const respuesta = {
		current: { version: '4.5.0', installed_at: '2026-11-23T03:14:00-03:00', source: 'instalacion', title: null },
		history: [{ id: 7, version: '4.5.0', installed_at: '2026-11-23T03:14:00-03:00', source: 'instalacion', title: null }],
	}
	const { store, pedidos } = store_con(() => Promise.resolve({ data: respuesta }))
	const ctx = contexto(store)
	return store.actions.fetch(ctx).then(() => {
		assert.deepEqual(pedidos, ['/api/installed-version'])
		assert.equal(store.namespaced, true)
		assert.deepEqual(ctx.state.current, respuesta.current)
		assert.deepEqual(ctx.state.history, respuesta.history)
		assert.equal(ctx.state.loaded, true)
	})
})

test('store: una API sin la ruta (404) deja loaded en true y datos vacíos, sin romper', () => {
	const { store } = store_con(() => Promise.reject({ response: { status: 404 } }))
	const ctx = contexto(store)
	return store.actions.fetch(ctx).then(() => {
		assert.equal(ctx.state.loaded, true)
		assert.equal(ctx.state.current, null)
		assert.deepEqual(ctx.state.history, [])
	})
})

// ---------- Menú: chequeos de texto (la interfaz real la mira el Coordinador, CA10) ----------

test('UserInfo: el item de versión va dentro del v-if is_admin, debajo de "Cambiar contraseña"', () => {
	const fuente = fs.readFileSync(path.join(raiz, 'src/common-vue/components/nav-vertical/UserInfo.vue'), 'utf8')
	const plantilla = fuente.split('<script>')[0]
	const pos_password = plantilla.indexOf('Cambiar contraseña')
	const pos_version = plantilla.indexOf('menu-version-instalada')
	const pos_admin = plantilla.indexOf('v-if="is_admin"')
	assert.ok(pos_version > -1, 'falta data-testid="menu-version-instalada"')
	assert.ok(pos_password > -1 && pos_version > pos_password, 'el item tiene que ir después de Cambiar contraseña')
	assert.ok(pos_admin > -1 && pos_admin < pos_password, 'el item tiene que estar dentro del bloque is_admin')
})

test('modal de versión: existe Index.vue con id version-instalada y los dos sub-componentes', () => {
	const carpeta = path.join(raiz, 'src/components/version-instalada')
	assert.ok(fs.existsSync(path.join(carpeta, 'Index.vue')), 'falta version-instalada/Index.vue')
	assert.ok(fs.existsSync(path.join(carpeta, 'ResumenActual.vue')), 'falta ResumenActual.vue')
	assert.ok(fs.existsSync(path.join(carpeta, 'HistorialDeVersiones.vue')), 'falta HistorialDeVersiones.vue')
	assert.match(fs.readFileSync(path.join(carpeta, 'Index.vue'), 'utf8'), /id="version-instalada"/)
})

test('store index: registra el módulo installed_version', () => {
	const fuente = fs.readFileSync(path.join(raiz, 'src/store/index.js'), 'utf8')
	assert.match(fuente, /installed_version/)
})
