// Código propio del dueño (SKU) en «Cod barras» de VENDER sin conexión o con la cache de artículos
// (ronda 5 de la prueba gratuita, 14/11/2026, E9b). Misma regla que la API
// (VenderController::articulo_por_sku_exacto): exacto tras trim, sin distinguir mayúsculas, único
// entre los activos.
//
// Ejecutar con: node --test tests/codigo-propio-sku-en-vender.test.cjs
// No levanta servidores ni usa la suite de Playwright. La cache (Dexie) se reemplaza por una falsa.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

/**
 * Una cache de artículos falsa con la forma que usa sku_en_cache.js: table('articles').each/get.
 *
 * @param {Array} articulos
 * @returns {{db: object, recorridas: function}}
 */
function cache_falsa(articulos) {
	let recorridas = 0
	const tabla = {
		each(cb) {
			recorridas++
			articulos.forEach(cb)
			return Promise.resolve()
		},
		get(id) {
			return Promise.resolve(articulos.find(a => a.id === id))
		},
	}
	return {
		db: { __esModule: true, default: { table: () => tabla } },
		recorridas: () => recorridas,
	}
}

function cargar_con(articulos) {
	const falsa = cache_falsa(articulos)
	const modulo = cargar('utils/sku_en_cache.js', { '@/offline/db': falsa.db })
	return { modulo, falsa }
}

const ARTICULOS = [
	{ id: 1, name: 'Serrucho', sku: '104', status: 'active' },
	{ id: 2, name: 'Martillo', sku: ' F-101 ', status: 'active' },
	{ id: 3, name: 'Uno', sku: '200', status: 'active' },
	{ id: 4, name: 'Otro', sku: '200', status: 'active' },
	{ id: 5, name: 'Dado de baja', sku: '302', status: 'inactive' },
	{ id: 6, name: 'Activo con SKU de uno de baja', sku: '400', status: 'active' },
	{ id: 7, name: 'Viejo', sku: '400', status: 'inactive' },
	{ id: 8, name: 'Sin SKU', sku: null, bar_code: '779', status: 'active' },
	{ id: 9, name: 'Sin status (cache vieja)', sku: 'Z-9' },
]

test('normalizar_sku: trim + minúsculas, y vacío para nada', () => {
	const { modulo } = cargar_con([])
	assert.equal(modulo.normalizar_sku(' F-101 '), 'f-101')
	assert.equal(modulo.normalizar_sku(104), '104')
	assert.equal(modulo.normalizar_sku(undefined), '')
	assert.equal(modulo.normalizar_sku(null), '')
	assert.equal(modulo.normalizar_sku('   '), '')
})

test('un SKU exacto y único devuelve su artículo', () => {
	const { modulo } = cargar_con(ARTICULOS)
	return modulo.articulo_por_sku_en_cache('104').then(articulo => {
		assert.equal(articulo.id, 1)
	})
})

test('sin distinguir mayúsculas y con espacios en las puntas del SKU guardado', () => {
	const { modulo } = cargar_con(ARTICULOS)
	return Promise.all([
		modulo.articulo_por_sku_en_cache('f-101'),
		modulo.articulo_por_sku_en_cache('F-101'),
		modulo.articulo_por_sku_en_cache('z-9'),
	]).then(([a, b, c]) => {
		assert.equal(a.id, 2)
		assert.equal(b.id, 2)
		assert.equal(c.id, 9)
	})
})

test('un SKU repetido no devuelve ninguno', () => {
	const { modulo } = cargar_con(ARTICULOS)
	return modulo.articulo_por_sku_en_cache('200').then(articulo => {
		assert.equal(articulo, null)
	})
})

test('un SKU parcial no devuelve nada', () => {
	const { modulo } = cargar_con(ARTICULOS)
	return Promise.all([
		modulo.articulo_por_sku_en_cache('10'),
		modulo.articulo_por_sku_en_cache('1045'),
		modulo.articulo_por_sku_en_cache('F-10'),
	]).then(resultados => {
		assert.deepEqual(resultados, [null, null, null])
	})
})

test('un dado de baja no se encuentra ni vuelve ambiguo al activo', () => {
	const { modulo } = cargar_con(ARTICULOS)
	return Promise.all([
		modulo.articulo_por_sku_en_cache('302'),
		modulo.articulo_por_sku_en_cache('400'),
	]).then(([baja, activo]) => {
		assert.equal(baja, null)
		assert.equal(activo.id, 6)
	})
})

test('vacío o cache sin artículos: null y sin tirar', () => {
	const { modulo } = cargar_con([])
	return Promise.all([
		modulo.articulo_por_sku_en_cache(''),
		modulo.articulo_por_sku_en_cache(undefined),
		modulo.articulo_por_sku_en_cache('104'),
	]).then(resultados => {
		assert.deepEqual(resultados, [null, null, null])
	})
})

test('la cache se recorre UNA vez y se vuelve a recorrer solo al invalidar', () => {
	const { modulo, falsa } = cargar_con(ARTICULOS)
	return modulo.articulo_por_sku_en_cache('104')
	.then(() => modulo.articulo_por_sku_en_cache('F-101'))
	.then(() => modulo.articulo_por_sku_en_cache('nada'))
	.then(() => {
		assert.equal(falsa.recorridas(), 1)
		modulo.invalidar_indice_de_skus_en_cache()
		return modulo.articulo_por_sku_en_cache('104')
	})
	.then(articulo => {
		assert.equal(articulo.id, 1)
		assert.equal(falsa.recorridas(), 2)
	})
})

test('un SKU como "constructor" no encuentra nada', () => {
	const { modulo } = cargar_con(ARTICULOS)
	return modulo.articulo_por_sku_en_cache('constructor').then(articulo => {
		assert.equal(articulo, null)
	})
})
