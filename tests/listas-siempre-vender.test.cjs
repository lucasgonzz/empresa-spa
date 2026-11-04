// Vender con la lista «Precio final» (misión prueba-listas-siempre, 3/11/2026, corrección C5): con una sola
// lista, el caso 2R (`ventas_en_dolares` + costo en dólares + `cotizar_precios_en_dolares` apagado) precia
// EXACTAMENTE como hoy: `final_price` en dólares, convertido con la cotización de la VENTA. Se prueba el
// mixin real de precios (aplicar_tipos_de_precio y check_moneda), sin navegador.
//
// Ejecutar con: node --test tests/listas-siempre-vender.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { es_solo_lista_precio_final, se_ven_las_listas, trae_precios_propios_por_moneda } = cargar('utils/lista_precio_final.js')
const generals = cargar('mixins/generals.js', { moment: () => ({}) }).default

const LISTA = 9

/**
 * Un artículo del caso 2R: USD 15 de precio final, y las filas por moneda de «Precio final» que dejó el
 * último recálculo con `users.dollar` = 1000.
 */
function articulo_2r() {
	return {
		is_article: true,
		name: 'zz 2R',
		cost_in_dollars: 1,
		final_price: 15,
		price_types: [{ id: LISTA, pivot: { final_price: 15 } }],
		price_type_monedas: [
			{ price_type_id: LISTA, moneda_id: 1, final_price: 15000 },
			{ price_type_id: LISTA, moneda_id: 2, final_price: 15 },
		],
	}
}

/** El `this` del mixin: la venta en pesos con cotización 1200 (el dólar de la cuenta es 1000). */
function contexto(solo_precio_final, moneda_id = 1) {
	const vender = { moneda_id, valor_dolar: 1200, cotizacion_por_articulo_disponible: false }
	return {
		...generals.methods,
		$store: { state: { vender } },
		owner: { cotizar_precios_en_dolares: 0 },
		solo_lista_precio_final: solo_precio_final,
		price_type_vender: { id: LISTA },
		hasExtencion: slug => slug === 'ventas_en_dolares',
	}
}

/** El tramo de getPriceVender que importa: la lista y después la moneda. */
function precio_de_vender(ctx, item) {
	return ctx.check_moneda(item, ctx.aplicar_tipos_de_precio(item, item.final_price), false, false)
}

test('una sola lista «Precio final» es esa y ninguna otra', () => {
	assert.equal(es_solo_lista_precio_final([{ id: 1, es_precio_final: 1 }]), true)
	assert.equal(es_solo_lista_precio_final([{ id: 1, es_precio_final: '1' }]), true)
	assert.equal(es_solo_lista_precio_final([{ id: 1, es_precio_final: 0 }]), false, 'Una sola lista propia no entra.')
	assert.equal(es_solo_lista_precio_final([{ id: 1, es_precio_final: 1 }, { id: 2 }]), false, 'Con dos ya se ven las listas.')
	assert.equal(es_solo_lista_precio_final([]), false)
})

test('las filas por moneda solo mandan si no es la «Precio final» sola', () => {
	assert.equal(trae_precios_propios_por_moneda(articulo_2r(), true), false)
	assert.equal(trae_precios_propios_por_moneda(articulo_2r(), false), true)
	assert.equal(trae_precios_propios_por_moneda({ price_type_monedas: [] }, false), false)
	assert.equal(trae_precios_propios_por_moneda({}, false), false)
})

test('2R con una sola lista: en pesos se convierte con la cotización de la venta, no con users.dollar', () => {
	assert.equal(precio_de_vender(contexto(true), articulo_2r()), 18000, 'USD 15 × 1200, no la fila fija de 15000.')
})

test('2R con una sola lista: en dólares es el final_price tal cual', () => {
	assert.equal(precio_de_vender(contexto(true, 2), articulo_2r()), 15)
})

test('con otra lista, las filas por moneda siguen mandando como hasta hoy', () => {
	assert.equal(precio_de_vender(contexto(false), articulo_2r()), 15000)
})

/**
 * Los getters reales del store, sin red: `__base_store` es un falso que devuelve la configuración.
 */
function getters_de(listas, flag) {
	const config = cargar('store/price_type.js', { '@/store/__base_store': configuracion => configuracion }).default
	const rootState = { auth: { authenticated: true, user: { listas_de_precio: flag } } }
	const state = { models: listas }
	const getters = { listas: config.getters.listas(state) }
	return {
		muestra_listas: config.getters.muestra_listas(state, getters, rootState),
		solo_precio_final: config.getters.solo_precio_final(state, getters, rootState),
		visibles: config.getters.visibles(state, getters),
	}
}

const PRECIO_FINAL = { id: 1, es_precio_final: 1 }
const PROPIA = { id: 2, es_precio_final: 0 }
const OTRA = { id: 3, es_precio_final: null }

test('cuenta por categoría, con el flag apagado y varias listas: ve sus listas y no trabaja con el flag', () => {
	const g = getters_de([PROPIA, OTRA], 0)
	assert.equal(g.muestra_listas, false, 'Lo que leía el flag sigue en false: el artículo muestra margen y precio.')
	assert.deepEqual(g.visibles, [PROPIA, OTRA], 'Lo que leía price_types.length sigue viéndolas: sin esto, celdas vacías en el Listado.')
	assert.equal(g.solo_precio_final, false)
})

test('flag prendido y cero listas: como en la base, esconde margen y precio y no dibuja nada', () => {
	const g = getters_de([], 1)
	assert.equal(g.muestra_listas, true)
	assert.deepEqual(g.visibles, [])
	assert.equal(g.solo_precio_final, false)
})

test('la «Precio final» sola: se ve como un negocio sin listas', () => {
	const g = getters_de([PRECIO_FINAL], 1)
	assert.equal(g.muestra_listas, false)
	assert.deepEqual(g.visibles, [])
	assert.equal(g.solo_precio_final, true)
})

test('una sola lista propia: con el flag o sin él, como en la base', () => {
	assert.equal(getters_de([PROPIA], 1).muestra_listas, true)
	assert.deepEqual(getters_de([PROPIA], 1).visibles, [PROPIA])
	assert.equal(getters_de([PROPIA], 0).muestra_listas, false)
	assert.deepEqual(getters_de([PROPIA], 0).visibles, [PROPIA])
})

test('«Precio final» y otra lista: se ve todo', () => {
	const g = getters_de([PRECIO_FINAL, PROPIA], 1)
	assert.equal(g.muestra_listas, true)
	assert.deepEqual(g.visibles, [PRECIO_FINAL, PROPIA])
	assert.equal(g.solo_precio_final, false)
})

test('las listas se dibujan salvo que la única sea la «Precio final»', () => {
	const precio_final = { id: 1, es_precio_final: 1 }
	const propia = { id: 2, es_precio_final: 0 }

	assert.equal(se_ven_las_listas([]), false)
	assert.equal(se_ven_las_listas([precio_final]), false)
	// Una cuenta que ya trabajaba con una sola lista propia sigue viendo sus tarjetas.
	assert.equal(se_ven_las_listas([propia]), true)
	assert.equal(se_ven_las_listas([precio_final, propia]), true)
})
