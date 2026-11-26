// Misión truvari-carrito-entrega-pago, CA13 (empresa-spa): envío gratis de las formas de envío propias.
//
// La tienda puede cobrar $0 una forma propia (compra desde un monto, o con combo) y deja la foto en el
// pedido (`orders.envio_zona_precio` + `orders.envio_zona_gratis_motivo`: 'monto' | 'combo' | null).
// Empresa tiene que leer esa foto (y el precio vivo si el pedido no la trae) y ofrecer los dos campos
// nuevos en el ABM de la forma (`delivery_zones.envio_gratis_desde`, `envio_gratis_con_combo`).
//
// (a) `precio_de_forma_propia_del_pedido`      (utils/formas_de_envio.js)
// (b) `texto_costo_forma_propia_del_pedido`    (utils/formas_de_envio.js)
// (c) `mostrar_envio_gratis_de_forma` + props nuevas del modelo delivery_zone.js
// (d) `getDeliveryZoneCostoTexto`              (mixins/model_functions.js)
//
// Ejecutar con: node --test tests/formas-envio-gratis.test.cjs
// Sin servidores ni Playwright: funciones puras con el cargador de módulos ESM.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const formas = cargar('utils/formas_de_envio.js')
const modelo_zona = cargar('models/delivery_zone.js').default

// El mixin importa moment, dexie y otros mixins que estas funciones no usan: se reemplazan por vacíos.
const mixin = cargar('mixins/model_functions.js', {
	'moment': function () {},
	'@/common-vue/mixins/dates': {},
	'@/mixins/vender/select_payment_methods': {},
	'@/offline/db': {},
}).default

/** Formateo de precio como el de la app: "$ 80.000" (punto de miles). */
function formato_precio(valor) {
	return '$ ' + String(Math.round(Number(valor))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Una forma propia de $7.000 que es gratis desde $80.000 y con combos. */
function zona(extra) {
	return Object.assign({
		id: 3, name: 'Envío Truvari', price: '7000.00', costo_a_convenir: 0,
		envio_gratis_desde: '80000.00', envio_gratis_con_combo: 1,
	}, extra || {})
}

/** Un pedido con envío a domicilio por forma propia. */
function pedido(extra) {
	return Object.assign({ id: 10, deliver: 1, delivery_zone: zona() }, extra || {})
}

// --- (a) precio de la forma propia del pedido ----------------------------------------------------

test('(a) con snapshot "0.00" el pedido aporta 0 aunque la forma hoy cueste 7000', () => {
	assert.equal(formas.precio_de_forma_propia_del_pedido(pedido({ envio_zona_precio: '0.00', envio_zona_gratis_motivo: 'monto' })), 0)
})

test('(a) con snapshot "7000.00" aporta 7000 aunque la forma hoy cueste otra cosa', () => {
	assert.equal(formas.precio_de_forma_propia_del_pedido(pedido({ envio_zona_precio: '7000.00', delivery_zone: zona({ price: '9000.00' }) })), 7000)
})

test('(a) sin snapshot (null o ausente) se usa el precio vivo de la forma', () => {
	assert.equal(formas.precio_de_forma_propia_del_pedido(pedido({ envio_zona_precio: null })), 7000)
	assert.equal(formas.precio_de_forma_propia_del_pedido(pedido()), 7000)
})

test('(a) a convenir aporta 0 siempre, con o sin snapshot', () => {
	const a_convenir = zona({ costo_a_convenir: 1 })
	assert.equal(formas.precio_de_forma_propia_del_pedido(pedido({ delivery_zone: a_convenir })), 0)
	assert.equal(formas.precio_de_forma_propia_del_pedido(pedido({ delivery_zone: a_convenir, envio_zona_precio: '7000.00' })), 0)
})

test('(a) sin forma ni snapshot aporta 0', () => {
	assert.equal(formas.precio_de_forma_propia_del_pedido({ id: 1, delivery_zone: null }), 0)
	assert.equal(formas.precio_de_forma_propia_del_pedido(null), 0)
})

// --- (b) texto del costo -------------------------------------------------------------------------

test('(b) gratis por monto: "Gratis (compras desde $ 80.000)"', () => {
	assert.equal(
		formas.texto_costo_forma_propia_del_pedido(pedido({ envio_zona_precio: '0.00', envio_zona_gratis_motivo: 'monto' }), formato_precio),
		'Gratis (compras desde $ 80.000)')
})

test('(b) gratis por combo: "Gratis (con combos)"', () => {
	assert.equal(
		formas.texto_costo_forma_propia_del_pedido(pedido({ envio_zona_precio: '0.00', envio_zona_gratis_motivo: 'combo' }), formato_precio),
		'Gratis (con combos)')
})

test('(b) gratis sin motivo: "Gratis"', () => {
	assert.equal(
		formas.texto_costo_forma_propia_del_pedido(pedido({ envio_zona_precio: '0.00', envio_zona_gratis_motivo: null }), formato_precio),
		'Gratis')
})

test('(b) con importe cobrado muestra el importe del snapshot', () => {
	assert.equal(
		formas.texto_costo_forma_propia_del_pedido(pedido({ envio_zona_precio: '7000.00' }), formato_precio),
		'$ 7.000')
})

test('(b) sin snapshot muestra el precio vivo, o "Sin costo para el comprador" si es 0', () => {
	assert.equal(formas.texto_costo_forma_propia_del_pedido(pedido(), formato_precio), '$ 7.000')
	assert.equal(
		formas.texto_costo_forma_propia_del_pedido(pedido({ delivery_zone: zona({ price: '0.00' }) }), formato_precio),
		'Sin costo para el comprador')
})

test('(b) a convenir dice "A convenir" y nunca "Gratis"', () => {
	assert.equal(
		formas.texto_costo_forma_propia_del_pedido(pedido({ delivery_zone: zona({ costo_a_convenir: 1 }), envio_zona_precio: '0.00', envio_zona_gratis_motivo: 'monto' }), formato_precio),
		'A convenir')
})

// --- (c) campos nuevos del ABM y su visibilidad --------------------------------------------------

test('(c) el modelo declara los dos campos nuevos, escondidos de la tabla y condicionados a la API', () => {
	const desde = modelo_zona.properties.filter(p => p.key === 'envio_gratis_desde')
	const con_combo = modelo_zona.properties.filter(p => p.key === 'envio_gratis_con_combo')
	assert.equal(desde.length, 1, 'falta envio_gratis_desde en delivery_zone.js')
	assert.equal(con_combo.length, 1, 'falta envio_gratis_con_combo en delivery_zone.js')
	assert.equal(desde[0].type, 'number')
	assert.equal(con_combo[0].type, 'checkbox')
	;[desde[0], con_combo[0]].forEach(prop => {
		assert.equal(prop.not_show, true)
		assert.equal(prop.v_if_function, 'mostrar_envio_gratis_de_forma')
		assert.ok(typeof prop.description === 'string' && prop.description.length > 40, prop.key + ' necesita description')
	})
	const claves = modelo_zona.properties.map(p => p.key)
	assert.ok(claves.indexOf('envio_gratis_desde') > claves.indexOf('price'), 'van después del Precio')
})

/** `this` mínimo del mixin: sólo el store con las formas ya cargadas. */
function contexto(formas_en_store) {
	return { $store: { state: { delivery_zone: { models: formas_en_store || [] }, online_configuration: { models: [] } } } }
}

test('(c) mostrar_envio_gratis_de_forma: false si es a convenir', () => {
	const f = mixin.methods.mostrar_envio_gratis_de_forma
	assert.equal(typeof f, 'function', 'falta mostrar_envio_gratis_de_forma en model_functions.js')
	assert.equal(f.call(contexto(), {}, zona({ costo_a_convenir: 1 })), false)
})

test('(c) mostrar_envio_gratis_de_forma: guardada, true sólo si la API manda la clave', () => {
	const f = mixin.methods.mostrar_envio_gratis_de_forma
	assert.equal(f.call(contexto(), {}, zona()), true)
	const vieja = { id: 3, name: 'X', price: '7000.00', costo_a_convenir: 0 }
	assert.equal(f.call(contexto(), {}, vieja), false)
})

test('(c) mostrar_envio_gratis_de_forma: forma nueva mira el store; sin señal es false', () => {
	const f = mixin.methods.mostrar_envio_gratis_de_forma
	const nueva = { name: '', price: '', costo_a_convenir: 0 }
	assert.equal(f.call(contexto([zona()]), {}, nueva), true)
	assert.equal(f.call(contexto([{ id: 1, price: '1.00', costo_a_convenir: 0 }]), {}, nueva), false)
	assert.equal(f.call(contexto(), {}, nueva), false)
})

// --- (d) columna "Costo" de la tabla de formas ---------------------------------------------------

test('(d) la columna Costo agrega " · gratis desde $ 80.000" y " · gratis con combos"', () => {
	const f = mixin.methods.getDeliveryZoneCostoTexto
	const ctx = { price: formato_precio }
	assert.equal(f.call(ctx, zona({ envio_gratis_con_combo: 0 })), '$ 7.000 · gratis desde $ 80.000')
	assert.equal(f.call(ctx, zona({ envio_gratis_desde: null })), '$ 7.000 · gratis con combos')
	assert.equal(f.call(ctx, zona()), '$ 7.000 · gratis desde $ 80.000 · gratis con combos')
})

test('(d) sin regla de gratis queda como hoy; a convenir sigue siendo "A convenir"', () => {
	const f = mixin.methods.getDeliveryZoneCostoTexto
	const ctx = { price: formato_precio }
	assert.equal(f.call(ctx, zona({ envio_gratis_desde: null, envio_gratis_con_combo: 0 })), '$ 7.000')
	assert.equal(f.call(ctx, { id: 1, price: '7000.00' }), '$ 7.000')
	assert.equal(f.call(ctx, zona({ costo_a_convenir: 1 })), 'A convenir')
})
