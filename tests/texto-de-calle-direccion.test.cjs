// Misión envios-andreani, ronda 2 (hallazgo 2, empresa-spa): la dirección de entrega de un pedido online
// (`getAddress` en mixins/online.js y `getOrderAddress` en mixins/model_functions.js) concatenaba
// `street + ' ' + street_number` y mostraba "null"/"undefined" cuando la altura o la calle venían vacías.
// Ahora usan `texto_de_calle` (src/utils/texto_de_calle.js).
//
// Ejecutar con: node --test tests/texto-de-calle-direccion.test.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const babel = require('@babel/core')

const raiz = path.resolve(__dirname, '..')

/**
 * Carga un módulo ES de src/ y lo ejecuta como commonjs.
 *
 * @param {string} relativo Ruta dentro de src.
 * @returns {object} Los exports del módulo.
 */
function cargar(relativo) {
	const fuente = fs.readFileSync(path.join(raiz, 'src', relativo), 'utf8')
	const codigo = babel.transformSync(fuente, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
	const modulo = { exports: {} }
	new Function('require', 'module', 'exports', codigo)(require, modulo, modulo.exports)
	return modulo.exports
}

const { texto_de_calle } = cargar('utils/texto_de_calle.js')

test('calle y número se unen con un espacio', () => {
	assert.equal(texto_de_calle({ street: 'Av. Colón', street_number: '1234' }), 'Av. Colón 1234')
})

test('número null, undefined o vacío: sólo la calle', () => {
	assert.equal(texto_de_calle({ street: 'Av. Colón', street_number: null }), 'Av. Colón')
	assert.equal(texto_de_calle({ street: 'Av. Colón' }), 'Av. Colón')
	assert.equal(texto_de_calle({ street: 'Av. Colón', street_number: '' }), 'Av. Colón')
})

test('calle null, undefined o vacía: sólo el número', () => {
	assert.equal(texto_de_calle({ street: null, street_number: '450' }), '450')
	assert.equal(texto_de_calle({ street_number: 450 }), '450')
	assert.equal(texto_de_calle({ street: '   ', street_number: '450' }), '450')
})

test('todo vacío o sin dirección: texto vacío y no tira', () => {
	assert.equal(texto_de_calle({ street: null, street_number: null }), '')
	assert.equal(texto_de_calle({}), '')
	assert.equal(texto_de_calle(null), '')
	assert.equal(texto_de_calle(undefined), '')
})

test('getAddress y getOrderAddress usan el helper y no concatenan a mano', () => {
	;['mixins/online.js', 'mixins/model_functions.js'].forEach(archivo => {
		const fuente = fs.readFileSync(path.join(raiz, 'src', archivo), 'utf8')
		assert.match(fuente, /texto_de_calle\(/, archivo + ' tiene que usar texto_de_calle')
		assert.doesNotMatch(fuente, /street\s*\+\s*' '\s*\+\s*[\w.]*street_number/, archivo + ' no puede concatenar street + street_number')
		assert.doesNotMatch(fuente, /street\s*\+\s*' '\s*\+/, archivo)
	})
})
