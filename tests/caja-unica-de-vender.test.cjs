// Caja única de VENDER (misión prueba-primera-venta, 12/11/2026): con UNA sola caja disponible para el
// método de pago, Vender la elige sola, pero NUNCA pisa la caja por defecto de ese método (si la por
// defecto es otra y está cerrada, no elige: el guardado frena y avisa que esa caja está cerrada).
//
// Ejecutar con: node --test tests/caja-unica-de-vender.test.cjs
// No levanta servidores ni usa la suite de Playwright.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { caja_unica_a_elegir } = cargar('utils/caja_unica_de_vender.js')

const EFECTIVO = 3
const TRANSFERENCIA = 4

const efectivo = { id: 10, name: 'Efectivo', abierta: 1, current_acount_payment_methods: [] }
const banco = { id: 20, name: 'Banco', abierta: 0, current_acount_payment_methods: [] }
const solo_efectivo = { id: 30, name: 'Solo efectivo', abierta: 1, current_acount_payment_methods: [{ id: EFECTIVO }] }
const otra = { id: 40, name: 'Otra', abierta: 1, current_acount_payment_methods: [] }

const op = caja => ({ value: caja.id, text: caja.name })
const cajas = [efectivo, banco, solo_efectivo, otra]

test('una sola caja y el método sin caja por defecto: la elige', () => {
	assert.equal(caja_unica_a_elegir([op(efectivo)], cajas, EFECTIVO, null, 0), efectivo.id)
})

test('una sola caja y la por defecto es esa misma: la elige (o no toca nada si ya está)', () => {
	assert.equal(caja_unica_a_elegir([op(efectivo)], cajas, EFECTIVO, efectivo, 0), efectivo.id)
	assert.equal(caja_unica_a_elegir([op(efectivo)], cajas, EFECTIVO, efectivo, efectivo.id), null)
})

test('la por defecto del método es OTRA y está cerrada: no elige la única abierta', () => {
	// «Transferencia → Banco», Banco cerrada, solo Efectivo abierta: la transferencia no va a Efectivo.
	assert.equal(caja_unica_a_elegir([op(efectivo)], cajas, TRANSFERENCIA, banco, banco.id), null)
	assert.equal(caja_unica_a_elegir([op(efectivo)], cajas, TRANSFERENCIA, banco, 0), null)
})

test('dos o más cajas: no adivina', () => {
	assert.equal(caja_unica_a_elegir([op(efectivo), op(otra)], cajas, EFECTIVO, null, 0), null)
})

test('una caja que no acepta el método no cuenta como disponible', () => {
	// Para una transferencia, «Solo efectivo» no sirve: queda Otra como única.
	assert.equal(caja_unica_a_elegir([op(solo_efectivo), op(otra)], cajas, TRANSFERENCIA, null, 0), otra.id)
	// Y si era la única ofrecida, no se elige nada.
	assert.equal(caja_unica_a_elegir([op(solo_efectivo)], cajas, TRANSFERENCIA, null, 0), null)
})

test('al cambiar de método, la caja del método anterior no queda pegada si hay una única distinta', () => {
	assert.equal(caja_unica_a_elegir([op(otra)], cajas, TRANSFERENCIA, null, efectivo.id), otra.id)
})

test('sin opciones, o con solo el «Seleccione caja», no elige', () => {
	assert.equal(caja_unica_a_elegir([], cajas, EFECTIVO, null, 0), null)
	assert.equal(caja_unica_a_elegir([{ value: 0, text: 'Seleccione caja' }], cajas, EFECTIVO, null, 0), null)
})
