// Ronda 2 de tienda-cobro-tarjeta: el editor «Cuotas» (payment_method_installments) era de Payway y
// se mostraba con `v_if: ['payment_method_type_id', '=', 2]`, por ID. En instalaciones nuevas Payway ya
// no se siembra y el id 2 pasa a ser «Tarjeta Mercado Pago»: tiene que depender del NOMBRE del tipo.
// Ejecutar con: node --test tests/tienda-cobro-tarjeta-cuotas-payway.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const modelo = cargar('models/payment_method.js').default
const mixin = cargar('mixins/model_functions.js', {
	'moment': function () {},
	'@/common-vue/mixins/dates': {},
	'@/mixins/vender/select_payment_methods': {},
	'@/offline/db': {},
}).default

/**
 * `this` con los métodos reales del mixin y un store con los tipos dados.
 *
 * @param {Array<{id: number, name: string}>} tipos
 * @returns {object}
 */
function contexto(tipos) {
	const ctx = { $store: { state: { payment_method_type: { models: tipos } } } }
	return Object.assign(ctx, mixin.methods)
}

/**
 * ¿Se muestra el editor de cuotas para un método del tipo dado? Evalúa el v_if_function declarado.
 *
 * @param {Array} tipos Tipos del store.
 * @param {number} tipo_id Tipo del método.
 * @returns {boolean}
 */
function se_muestra(tipos, tipo_id) {
	const fila = modelo.properties.filter(function (prop) {
		return prop.key === 'payment_method_installments'
	})[0]
	assert.ok(fila, 'La fila payment_method_installments tiene que existir')
	assert.ok(fila.v_if_function, 'El editor de cuotas tiene que decidir por v_if_function (por nombre), no por id')
	const ctx = contexto(tipos)
	assert.equal(typeof ctx[fila.v_if_function], 'function', 'Falta el método ' + fila.v_if_function)
	return Boolean(ctx[fila.v_if_function](fila, { payment_method_type_id: tipo_id }))
}

test('tipo con id 2 llamado Tarjeta Mercado Pago: no se muestra el editor de cuotas de Payway', function () {
	const tipos = [{ id: 1, name: 'MercadoPago' }, { id: 2, name: 'Tarjeta Mercado Pago' }]
	assert.equal(se_muestra(tipos, 2), false)
	assert.equal(se_muestra(tipos, 1), false)
})

test('tipo Payway, con cualquier id: se muestra el editor de cuotas', function () {
	assert.equal(se_muestra([{ id: 2, name: 'Payway' }], 2), true)
	assert.equal(se_muestra([{ id: 17, name: ' payway ' }], 17), true)
})

test('sin tipo elegido no se muestra', function () {
	assert.equal(se_muestra([{ id: 2, name: 'Payway' }], 0), false)
})
