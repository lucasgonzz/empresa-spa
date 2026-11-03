// Vender con la lista «Precio final» (misión prueba-listas-siempre, 3/11/2026, corrección C5): con una sola
// lista, el caso 2R (`ventas_en_dolares` + costo en dólares + `cotizar_precios_en_dolares` apagado) precia
// EXACTAMENTE como hoy: `final_price` en dólares, convertido con la cotización de la VENTA. Se prueba el
// mixin real de precios (aplicar_tipos_de_precio y check_moneda), sin navegador.
//
// Ejecutar con: node --test tests/listas-siempre-vender.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { es_solo_lista_precio_final, trae_precios_propios_por_moneda } = cargar('utils/lista_precio_final.js')
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
