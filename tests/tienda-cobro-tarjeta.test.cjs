// Misión tienda-cobro-tarjeta (24/11/2026), parte de empresa-spa: criterios CA19 y CA20 del PLAN.
// Ejecutar con: node --test tests/tienda-cobro-tarjeta.test.cjs
// No levanta servidores ni usa Playwright: carga los mixins y los modelos declarativos reales.
//
//  - CA19: la ficha del pedido muestra «Medio de pago elegido» y «N° de pago de Mercado Pago».
//  - CA20: el vínculo con cuenta corriente se ofrece para MercadoPago y Tarjeta Mercado Pago (no para
//    Transferencia) y Configuración Online declara la casilla de la leyenda de descuento.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

// El mixin importa moment, dexie y otros mixins que no hacen falta para estas funciones: se reemplazan
// por vacíos (con mocks el helper carga el módulo de nuevo y sólo ese módulo los ve).
const mixin = cargar('mixins/model_functions.js', {
	'moment': function () {},
	'@/common-vue/mixins/dates': {},
	'@/mixins/vender/select_payment_methods': {},
	'@/offline/db': {},
}).default
const metodos = mixin.methods
const modelo_order = cargar('models/order.js').default
const modelo_payment_method = cargar('models/payment_method.js').default
const modelo_configuracion = cargar('models/online_configuration.js').default

/**
 * Tipos de método de pago de la tienda tal como los trae el store (`payment_method_type`).
 * Los ids son de prueba.
 */
const TIPOS = [
	{ id: 1, name: 'Transferencia' },
	{ id: 2, name: 'MercadoPago' },
	{ id: 3, name: 'Tarjeta Mercado Pago' },
	{ id: 4, name: 'Efectivo' },
]

/**
 * Arma el `this` de un componente real con los métodos del mixin y un store mínimo con los tipos.
 * Sólo se enlazan los métodos que existen: si falta uno nuevo, el test que lo usa falla con un
 * mensaje claro (ver `exigir_metodo`) y no con un TypeError.
 *
 * @returns {object}
 */
function contexto() {
	const ctx = { $store: { state: { payment_method_type: { models: TIPOS } } } }
	Object.keys(metodos).forEach(function (nombre) {
		ctx[nombre] = metodos[nombre]
	})
	return ctx
}

/**
 * Exige que el mixin tenga el método nuevo, con un mensaje que dice qué falta.
 *
 * @param {string} nombre
 * @returns {Function}
 */
function exigir_metodo(nombre) {
	assert.equal(
		typeof metodos[nombre],
		'function',
		'Falta el método ' + nombre + ' en src/mixins/model_functions.js'
	)
	return metodos[nombre]
}

/**
 * La fila declarada en un modelo por su clave (exige que exista una sola).
 *
 * @param {object} modelo
 * @param {string} clave
 * @returns {object}
 */
function fila(modelo, clave) {
	const encontradas = modelo.properties.filter(function (prop) {
		return prop.key === clave
	})
	assert.equal(encontradas.length, 1, 'La clave ' + clave + ' tiene que estar declarada una sola vez en el modelo')
	return encontradas[0]
}

/**
 * Evalúa el `v_if_function` de una fila contra un pedido, como lo hace common-vue/mixins/generals.js.
 *
 * @param {object} prop
 * @param {object} model
 * @returns {boolean}
 */
function se_ve(prop, model) {
	assert.ok(prop.v_if_function, 'La fila ' + prop.key + ' tiene que declarar v_if_function')
	const ctx = contexto()
	assert.equal(typeof ctx[prop.v_if_function], 'function', 'Falta el método ' + prop.v_if_function + ' del v_if_function')
	return Boolean(ctx[prop.v_if_function](prop, model))
}

test('admite cuotas MercadoPago y Tarjeta Mercado Pago, no Transferencia', function () {
	const admite = exigir_metodo('metodo_de_pago_admite_cuotas_en_la_tienda')
	const ctx = contexto()

	assert.equal(admite.call(ctx, {}, { payment_method_type_id: 2 }), true, 'MercadoPago admite el vínculo')
	assert.equal(admite.call(ctx, {}, { payment_method_type_id: 3 }), true, 'Tarjeta Mercado Pago admite el vínculo')
	assert.equal(admite.call(ctx, {}, { payment_method_type_id: 1 }), false, 'Transferencia no admite el vínculo')
	assert.equal(admite.call(ctx, {}, { payment_method_type_id: 4 }), false, 'Efectivo no admite el vínculo')
	assert.equal(admite.call(ctx, {}, { payment_method_type_id: 0 }), false, 'Sin tipo elegido no se muestra')
	assert.equal(admite.call(ctx, {}, null), false, 'Sin modelo no se muestra')

	// El nombre se compara normalizado (sin espacios ni mayúsculas), como `es_metodo_de_pago_de_mercado_pago`.
	const otro = Object.assign(contexto(), {
		$store: { state: { payment_method_type: { models: [{ id: 9, name: 'tarjeta  MERCADO pago' }] } } },
	})
	assert.equal(admite.call(otro, {}, { payment_method_type_id: 9 }), true)

	// `es_metodo_de_pago_de_mercado_pago` sigue existiendo y sigue valiendo sólo para MercadoPago (sus otros usos).
	assert.equal(metodos.es_metodo_de_pago_de_mercado_pago.call(ctx, {}, { payment_method_type_id: 3 }), false)
	assert.equal(metodos.es_metodo_de_pago_de_mercado_pago.call(ctx, {}, { payment_method_type_id: 2 }), true)
})

test('medio de pago elegido y n° de pago', function () {
	const elegido = exigir_metodo('getOrderMetodoDePagoElegido')
	const mostrar_elegido = exigir_metodo('mostrar_order_metodo_de_pago')
	const mostrar_numero = exigir_metodo('mostrar_order_numero_de_pago')
	const ctx = contexto()

	const transferencia = { payment_method: { name: 'Transferencia', payment_method_type: { name: 'Transferencia' } }, payment_id: null }
	const con_tarjeta = { payment_method: { name: 'Tarjeta', payment_method_type: { name: 'Tarjeta Mercado Pago' } }, payment_id: 9001 }
	const con_mercado_pago = { payment_method: { name: 'Mercado Pago', payment_method_type: { name: 'MercadoPago' } }, payment_id: 777 }
	const transferencia_con_id = { payment_method: { name: 'Transferencia', payment_method_type: { name: 'Transferencia' } }, payment_id: 5 }
	const sin_metodo = { payment_method: null, payment_id: 9001 }

	// «Medio de pago elegido»: el nombre del método, también para transferencia o efectivo.
	assert.equal(elegido.call(ctx, transferencia), 'Transferencia')
	assert.equal(elegido.call(ctx, sin_metodo), '')
	assert.equal(elegido.call(ctx, {}), '')
	assert.equal(mostrar_elegido.call(ctx, {}, transferencia), true)
	assert.equal(mostrar_elegido.call(ctx, {}, sin_metodo), false, 'Sin método de pago la fila se oculta')
	assert.equal(mostrar_elegido.call(ctx, {}, { payment_method: { name: '' } }), false)

	// «N° de pago de Mercado Pago»: hay payment_id > 0 y el método es MercadoPago o Tarjeta Mercado Pago.
	assert.equal(mostrar_numero.call(ctx, {}, con_tarjeta), true)
	assert.equal(mostrar_numero.call(ctx, {}, con_mercado_pago), true)
	assert.equal(mostrar_numero.call(ctx, {}, transferencia_con_id), false, 'Una transferencia no tiene n° de pago de Mercado Pago')
	assert.equal(mostrar_numero.call(ctx, {}, { payment_method: con_tarjeta.payment_method, payment_id: null }), false)
	assert.equal(mostrar_numero.call(ctx, {}, { payment_method: con_tarjeta.payment_method, payment_id: 0 }), false)
	assert.equal(mostrar_numero.call(ctx, {}, sin_metodo), false)

	// El medio de pago cobrado de Mercado Pago ya se traducía: no tiene que dejar de hacerlo.
	assert.equal(metodos.getOrderMedioDePagoCobrado.call(ctx, { medio_de_pago_cobrado: 'account_money' }), 'Dinero en cuenta de Mercado Pago')
})

test('order.js declara las filas nuevas', function () {
	const elegido = fila(modelo_order, 'payment_method_id')
	assert.equal(elegido.text, 'Medio de pago elegido')
	assert.equal(elegido.function, 'getOrderMetodoDePagoElegido')
	assert.equal(elegido.v_if_function, 'mostrar_order_metodo_de_pago')
	assert.equal(elegido.only_show, true, 'Es de sólo lectura')
	assert.ok(elegido.description, 'Tiene que explicar qué es')

	const numero = fila(modelo_order, 'payment_id')
	assert.equal(numero.text, 'N° de pago de Mercado Pago')
	assert.equal(numero.v_if_function, 'mostrar_order_numero_de_pago')
	assert.equal(numero.only_show, true, 'Es de sólo lectura')
	assert.ok(numero.description, 'Tiene que explicar qué es')

	// Los dos v_if_function apuntan a métodos que existen en el mixin.
	assert.equal(typeof metodos.mostrar_order_metodo_de_pago, 'function')
	assert.equal(typeof metodos.mostrar_order_numero_de_pago, 'function')
	assert.equal(typeof metodos.getOrderMetodoDePagoElegido, 'function')

	// Con datos reales de pedido las filas se ven / se ocultan como dice el criterio.
	const pedido_transferencia = { payment_method: { name: 'Transferencia', payment_method_type: { name: 'Transferencia' } }, payment_id: null }
	assert.equal(se_ve(elegido, pedido_transferencia), true)
	assert.equal(se_ve(numero, pedido_transferencia), false)

	// «Cuotas cobradas» y «Medio de pago cobrado» ya no dependen de las cuotas (se anotan en todo pago aprobado).
	assert.doesNotMatch(
		fila(modelo_order, 'cuotas_cobradas').description + ' ' + fila(modelo_order, 'medio_de_pago_cobrado').description,
		/en los que el comprador eligió pagar en cuotas/,
		'La descripción de lo cobrado no puede seguir diciendo que depende de las cuotas elegidas'
	)
})

test('el vínculo con cuenta corriente se ofrece para MercadoPago y Tarjeta, no para Transferencia', function () {
	const vinculo = fila(modelo_payment_method, 'current_acount_payment_method_id')
	assert.equal(
		vinculo.v_if_function,
		'metodo_de_pago_admite_cuotas_en_la_tienda',
		'El v_if_function del select tiene que pasar a metodo_de_pago_admite_cuotas_en_la_tienda'
	)

	const ctx = contexto()
	assert.equal(typeof ctx[vinculo.v_if_function], 'function')
	assert.equal(ctx[vinculo.v_if_function](vinculo, { payment_method_type_id: 2 }), true, 'MercadoPago')
	assert.equal(ctx[vinculo.v_if_function](vinculo, { payment_method_type_id: 3 }), true, 'Tarjeta Mercado Pago')
	assert.equal(ctx[vinculo.v_if_function](vinculo, { payment_method_type_id: 1 }), false, 'Transferencia')
})

test('online_configuration declara la casilla de la leyenda de descuento', function () {
	const casilla = fila(modelo_configuracion, 'mostrar_leyenda_de_descuento')
	assert.equal(casilla.type, 'checkbox')
	assert.equal(casilla.text, 'Mostrar en la tienda la leyenda de descuento por medio de pago')
	assert.ok(casilla.description || casilla.descripcion_visible || (casilla.descriptions && casilla.descriptions.length), 'Tiene que traer una ayuda')

	// Vive en el grupo «Precios»: después de su group_title y antes del siguiente.
	let grupo_actual = null
	let grupo_de_la_casilla = null
	modelo_configuracion.properties.forEach(function (prop) {
		if (prop.group_title) {
			grupo_actual = prop.group_title
		}
		if (prop.key === 'mostrar_leyenda_de_descuento') {
			grupo_de_la_casilla = grupo_actual
		}
	})
	assert.equal(grupo_de_la_casilla, 'Precios')
})
