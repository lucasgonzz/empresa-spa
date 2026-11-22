// Vender: demanda no satisfecha, RONDA 2 (misión demanda-sin-stock-vender). Corrige los hallazgos de
// .mision/REVISION-1.md sobre AvisoDemandaSinStock.vue:
//   1. El aviso vive en el store global y el temporizador de 12 s es local: un aviso presente al montar
//      tiene que arrancar su cuenta, y al destruir el componente se limpia el aviso del store.
//   2. El PUT de cancelar viaja con las dos banderas de silencio (sólo sale el toast propio).
//
// Ejecutar con: node --test tests/demanda-sin-stock-aviso-ronda2.test.cjs
// No levanta servidores ni usa la suite de Playwright.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

/**
 * Arma el `this` falso del componente del aviso.
 *
 * @param {object|null} aviso Aviso que ya está en el store al armar el contexto.
 * @returns {object} ctx con `commits`, `puts` (url + config) y los hooks/métodos reales.
 */
function armar_ctx(aviso) {
	const componente = cargar('components/vender/components/AvisoDemandaSinStock.vue').default
	const commits = []
	const puts = []
	const estado = { demanda_sin_stock: { aviso } }
	const ctx = Object.assign(componente.data(), componente.methods, {
		componente,
		commits,
		puts,
		$api: { put(url, datos, config) { puts.push({ url, datos, config }); return Promise.resolve({ data: {} }) } },
		$store: {
			state: estado,
			commit(nombre) {
				commits.push(nombre)
				if (nombre === 'demanda_sin_stock/limpiar_aviso') { estado.demanda_sin_stock.aviso = null }
			},
		},
		$toast: { success() {}, error() {} },
	})
	// El computed `aviso` del componente no existe en el ctx plano: se lo emula leyendo del store falso.
	Object.defineProperty(ctx, 'aviso', { get() { return estado.demanda_sin_stock.aviso } })
	return ctx
}

/** Falsea setTimeout/clearTimeout para disparar el temporizador a mano; devuelve la restauración. */
function instalar_reloj() {
	const original = { setTimeout: global.setTimeout, clearTimeout: global.clearTimeout }
	const reloj = { pendientes: [], esperas: [] }
	global.setTimeout = (fn, ms) => { reloj.pendientes.push(fn); reloj.esperas.push(ms); return reloj.pendientes.length }
	global.clearTimeout = id => { if (id) { reloj.pendientes[id - 1] = null } }
	reloj.restaurar = () => { global.setTimeout = original.setTimeout; global.clearTimeout = original.clearTimeout }
	reloj.disparar = () => { reloj.pendientes.forEach(fn => { if (fn) { fn() } }) }
	return reloj
}

const AVISO = { ids: [91], nombres: ['Mecha 8'], motivo: 'sin_stock', combo_nombre: null }

test('RONDA2: un aviso ya presente al montar arranca el temporizador y se limpia a los 12 s', () => {
	const reloj = instalar_reloj()
	try {
		const ctx = armar_ctx(AVISO)
		assert.equal(typeof ctx.componente.mounted, 'function', 'el componente necesita mounted (o watch immediate)')
		ctx.componente.mounted.call(ctx)
		assert.deepEqual(reloj.esperas, [12000])
		assert.deepEqual(ctx.commits, [])
		reloj.disparar()
		assert.deepEqual(ctx.commits, ['demanda_sin_stock/limpiar_aviso'])
	} finally {
		reloj.restaurar()
	}
})

test('RONDA2: sin aviso al montar no arranca ningún temporizador', () => {
	const reloj = instalar_reloj()
	try {
		const ctx = armar_ctx(null)
		if (ctx.componente.mounted) { ctx.componente.mounted.call(ctx) }
		assert.deepEqual(reloj.esperas, [])
	} finally {
		reloj.restaurar()
	}
})

test('RONDA2: al destruir el componente se limpia el aviso del store', () => {
	const reloj = instalar_reloj()
	try {
		const ctx = armar_ctx(AVISO)
		ctx.componente.beforeDestroy.call(ctx)
		assert.deepEqual(ctx.commits, ['demanda_sin_stock/limpiar_aviso'])
		assert.equal(ctx.$store.state.demanda_sin_stock.aviso, null)
	} finally {
		reloj.restaurar()
	}
})

test('RONDA2: el PUT de cancelar viaja con skip_global_error_event y skip_global_validation_toast', () => {
	const ctx = armar_ctx({ ids: [91, 92], nombres: ['Mecha 8'], motivo: 'sin_stock', combo_nombre: null })
	return ctx.cancelar().then(() => {
		assert.equal(ctx.puts.length, 2)
		ctx.puts.forEach(llamada => {
			assert.deepEqual(llamada.config, { skip_global_error_event: true, skip_global_validation_toast: true })
		})
	})
})
