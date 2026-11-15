// Vender: aviso de que la venta va a la cuenta corriente del cliente (ronda 6 de la prueba
// gratuita, 15/11/2026). Los campos de pago y caja quedaban grisados sin explicación.
//
// Ejecutar con: node --test tests/aviso-cuenta-corriente.test.cjs
// No levanta servidores ni usa la suite de Playwright.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { aviso_venta_a_cuenta_corriente } = cargar('utils/aviso_cuenta_corriente.js')

test('con cliente: dice a qué cuenta corriente va, con su nombre', () => {
	assert.equal(
		aviso_venta_a_cuenta_corriente({ name: 'Ferretería Don Pepe' }),
		'Va a la cuenta corriente de «Ferretería Don Pepe»: no se cobra ahora.'
	)
	assert.equal(
		aviso_venta_a_cuenta_corriente({ name: '  Juan  ' }),
		'Va a la cuenta corriente de «Juan»: no se cobra ahora.'
	)
})

test('cliente sin nombre: aviso genérico, nunca «»', () => {
	assert.equal(aviso_venta_a_cuenta_corriente({ name: '' }), 'Va a la cuenta corriente del cliente: no se cobra ahora.')
	assert.equal(aviso_venta_a_cuenta_corriente({}), 'Va a la cuenta corriente del cliente: no se cobra ahora.')
})

test('sin cliente: no hay aviso', () => {
	assert.equal(aviso_venta_a_cuenta_corriente(null), null)
	assert.equal(aviso_venta_a_cuenta_corriente(undefined), null)
})
