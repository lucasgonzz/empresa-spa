// CA36 (misión embudo-juan-pipeline, E4): durante la prueba gratuita no se dibuja el cartel de pago ni el
// modal "aviso-vencido". La regla vive en una función pura (payment_expire_reglas.js) y se prueba sola.
const test = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

// Fecha fija de "hoy" para que los tests no dependan del reloj (lunes 23/11/2026, mediodía local).
const hoy = new Date(2026, 10, 23, 12, 0, 0)

// Prueba vigente: tiene vencimiento y no venció.
const usuario_en_prueba = { prueba: { activa: true, vence_at: '2027-11-23', vencida: false } }
// Prueba contratada: vence_at pasa a null (corresponde cobrar).
const usuario_prueba_contratada = { prueba: { activa: true, vence_at: null, vencida: false } }
// Cliente real: no trae `prueba`.
const cliente_real = { id: 1 }

test('en prueba vigente no muestra el cartel aunque el pago esté vencido ayer', () => {
	const { debe_mostrar_cartel_de_pago } = cargar('components/nav/payment_expire_reglas.js')
	assert.equal(debe_mostrar_cartel_de_pago(usuario_en_prueba, { payment_expired_at: '2026-11-22' }, hoy), false)
})

test('cliente real con vencimiento dentro de 2 días muestra el cartel', () => {
	const { debe_mostrar_cartel_de_pago } = cargar('components/nav/payment_expire_reglas.js')
	assert.equal(debe_mostrar_cartel_de_pago(cliente_real, { payment_expired_at: '2026-11-25' }, hoy), true)
})

test('prueba contratada (vence_at null) vencida de pago muestra el cartel', () => {
	const { debe_mostrar_cartel_de_pago } = cargar('components/nav/payment_expire_reglas.js')
	assert.equal(debe_mostrar_cartel_de_pago(usuario_prueba_contratada, { payment_expired_at: '2026-11-22' }, hoy), true)
})

test('sin payment_expired_at no muestra el cartel', () => {
	const { debe_mostrar_cartel_de_pago } = cargar('components/nav/payment_expire_reglas.js')
	assert.equal(debe_mostrar_cartel_de_pago(cliente_real, {}, hoy), false)
	assert.equal(debe_mostrar_cartel_de_pago(cliente_real, null, hoy), false)
})

test('el aviso vencido no se abre en prueba vigente pero sí en un cliente real vencido en día hábil', () => {
	const { debe_abrir_aviso_vencido } = cargar('components/nav/payment_expire_reglas.js')
	const owner_vencido = { payment_expired_at: '2026-11-20' }
	assert.equal(debe_abrir_aviso_vencido(usuario_en_prueba, owner_vencido, hoy), false)
	assert.equal(debe_abrir_aviso_vencido(cliente_real, owner_vencido, hoy), true)
})

test('el aviso vencido no se abre sábado ni domingo', () => {
	const { debe_abrir_aviso_vencido } = cargar('components/nav/payment_expire_reglas.js')
	const owner_vencido = { payment_expired_at: '2026-11-20' }
	assert.equal(debe_abrir_aviso_vencido(cliente_real, owner_vencido, new Date(2026, 10, 21, 12)), false)
	assert.equal(debe_abrir_aviso_vencido(cliente_real, owner_vencido, new Date(2026, 10, 22, 12)), false)
})
