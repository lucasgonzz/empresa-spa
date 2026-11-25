// Regresión de la ronda 2 de tienda-cobro-tarjeta: la fila «N° de pago de Mercado Pago» tiene key
// `payment_id`, y como la clave termina en _id el propertyText REAL de common-vue/mixins/generals.js
// la trataría como una relación (busca model.payment) y devolvería vacío si no declara `function`.
// Ejecutar con: node --test tests/tienda-cobro-tarjeta-numero-de-pago.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const raiz = path.resolve(__dirname, '..')
const fuente_generals = fs.readFileSync(path.join(raiz, 'src/common-vue/mixins/generals.js'), 'utf8')

/**
 * Extrae un método del objeto `methods` de generals.js por balanceo de llaves, para ejecutar el
 * código REAL (no una copia) sin cargar todo el mixin y sus dependencias.
 *
 * @param {string} nombre
 * @returns {Function}
 */
function extraer(nombre) {
	const inicio = fuente_generals.search(new RegExp('\\n\\s*' + nombre + '\\s*\\('))
	assert.ok(inicio >= 0, 'No se encontró ' + nombre + ' en generals.js')
	const llave = fuente_generals.indexOf('{', fuente_generals.indexOf(')', inicio))
	let nivel = 0
	let fin = llave
	for (; fin < fuente_generals.length; fin++) {
		if (fuente_generals[fin] === '{') {
			nivel++
		} else if (fuente_generals[fin] === '}') {
			nivel--
			if (nivel === 0) {
				break
			}
		}
	}
	const firma = fuente_generals.slice(inicio, llave).trim()
	const parametros = firma.slice(firma.indexOf('(') + 1, firma.lastIndexOf(')'))
	return eval('(function(' + parametros + ')' + fuente_generals.slice(llave, fin + 1) + ')')
}

const modelo_order = cargar('models/order.js').default
const mixin = cargar('mixins/model_functions.js', {
	'moment': function () {},
	'@/common-vue/mixins/dates': {},
	'@/mixins/vender/select_payment_methods': {},
	'@/offline/db': {},
}).default

/**
 * `this` de un componente con los métodos reales de model_functions y de generals (propertyText,
 * isRelationKey, modelNameFromRelationKey).
 *
 * @returns {object}
 */
function contexto() {
	const ctx = { idiom: 'es', $store: { state: { payment_method_type: { models: [] } } } }
	Object.assign(ctx, mixin.methods)
	ctx.propertyText = extraer('propertyText')
	ctx.isRelationKey = extraer('isRelationKey')
	ctx.modelNameFromRelationKey = extraer('modelNameFromRelationKey')
	ctx.getFunctionValue = function (prop, model) {
		return this[prop.function](model, prop)
	}
	ctx._check_moneda = function (valor) {
		return valor
	}
	return ctx
}

const PEDIDO = {
	id: 1,
	payment_id: 9001,
	payment_method_id: 3,
	payment_method: {
		name: 'Tarjeta de crédito o débito',
		payment_method_type_id: 7,
		payment_method_type: { id: 7, name: 'Tarjeta Mercado Pago' },
	},
}

test('el propertyText real de «N° de pago de Mercado Pago» devuelve 9001', function () {
	const ctx = contexto()
	const fila = modelo_order.properties.filter(function (prop) {
		return prop.key === 'payment_id'
	})[0]
	assert.ok(fila, 'La fila payment_id tiene que estar declarada')
	assert.equal(ctx[fila.v_if_function](fila, PEDIDO), true, 'La fila tiene que verse')
	assert.equal(String(ctx.propertyText(PEDIDO, fila)), '9001')
})

test('el propertyText real de «Medio de pago elegido» devuelve el nombre del método', function () {
	const ctx = contexto()
	const fila = modelo_order.properties.filter(function (prop) {
		return prop.key === 'payment_method_id'
	})[0]
	assert.ok(fila)
	assert.equal(ctx.propertyText(PEDIDO, fila), 'Tarjeta de crédito o débito')
})
