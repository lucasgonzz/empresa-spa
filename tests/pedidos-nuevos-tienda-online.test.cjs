// Pedidos de Tienda Online: un pedido nuevo de la tienda se ve sin tener que cambiar de pestaña
// (ronda 5 de la prueba gratuita, 14/11/2026, E9a). La tabla se pedía una sola vez al crearse y el
// aviso en vivo solo movía el globito del menú.
//
// Ejecutar con: node --test tests/pedidos-nuevos-tienda-online.test.cjs
// No levanta servidores ni usa la suite de Playwright.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { hay_pedido_nuevo, accion_para_refrescar_pedidos } = cargar('utils/pedidos_nuevos.js')

test('aparece un id que no estaba: hay pedido nuevo', () => {
	assert.equal(hay_pedido_nuevo([], [3]), true)
	assert.equal(hay_pedido_nuevo(undefined, [3]), true)
	assert.equal(hay_pedido_nuevo([1, 2], [3, 1, 2]), true)
	// Ids que llegan como texto o número son el mismo pedido.
	assert.equal(hay_pedido_nuevo(['1'], [1]), false)
})

test('el polling con los mismos pedidos, o uno que se confirmó, no vuelve a pedir', () => {
	assert.equal(hay_pedido_nuevo([1, 2], [2, 1]), false)
	assert.equal(hay_pedido_nuevo([1, 2], [1]), false)
	assert.equal(hay_pedido_nuevo([1], []), false)
	assert.equal(hay_pedido_nuevo([], []), false)
	assert.equal(hay_pedido_nuevo([1], undefined), false)
})

test('«Por fecha» sin búsqueda: vuelve a pedir el día (getModels)', () => {
	assert.equal(accion_para_refrescar_pedidos({ from_dates: true, is_filtered: false }), 'getModels')
})

test('«Por fecha» con una búsqueda del usuario: no se la pisa', () => {
	assert.equal(accion_para_refrescar_pedidos({ from_dates: true, is_filtered: true }), null)
})

test('«Historico» en la página 1 del listado por defecto: lo vuelve a pedir', () => {
	assert.equal(accion_para_refrescar_pedidos({ from_dates: false, is_filtered: true, listado_por_defecto: true, filter_page: 1 }), 'runListadoPorDefecto')
})

test('«Historico» en otra página o con una búsqueda: no toca nada', () => {
	assert.equal(accion_para_refrescar_pedidos({ from_dates: false, is_filtered: true, listado_por_defecto: true, filter_page: 3 }), null)
	assert.equal(accion_para_refrescar_pedidos({ from_dates: false, is_filtered: true, listado_por_defecto: false, filter_page: 1 }), null)
	assert.equal(accion_para_refrescar_pedidos(null), null)
})
