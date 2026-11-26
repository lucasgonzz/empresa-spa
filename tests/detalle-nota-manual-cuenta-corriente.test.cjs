// Ticket #182: en la cuenta corriente de un proveedor el botón «Detalle» de una nota de débito
// manual no hacía nada (showDetails sólo conocía venta, presupuesto y pedido a proveedor).
// Ahora abre un modal con el texto completo de la descripción.
//
// Ejecutar con: node --test tests/detalle-nota-manual-cuenta-corriente.test.cjs
// No levanta servidores ni usa la suite de Playwright.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { detalle_de_movimiento_manual, abre_detalle_propio } = cargar('utils/detalle_movimiento_manual.js')

// Movimiento base: una nota de débito manual de proveedor.
function nota(extra) {
	return Object.assign({
		id: 1, detalle: 'Nota de débito', status: 'sin_pagar', debe: 1500, haber: null,
		created_at: '2026-11-20T10:00:00.000000Z', description: 'Ajuste por flete',
		sale_id: null, budget_id: null, provider_order_id: null,
	}, extra)
}

test('nota sin pagar, pagandose y pagado: abre el modal propio con el texto', () => {
	;['sin_pagar', 'pagandose', 'pagado'].forEach((status) => {
		const mov = nota({ status })
		assert.equal(abre_detalle_propio(mov), true, status)
		const d = detalle_de_movimiento_manual(mov)
		assert.equal(d.titulo, 'Nota de débito')
		assert.equal(d.texto, 'Ajuste por flete')
		assert.equal(d.tiene_texto, true)
	})
})

test('sin descripción (null, vacía, espacios): tiene_texto false, igual abre el modal', () => {
	;[null, undefined, '', '   ', '\n \t'].forEach((description) => {
		const mov = nota({ description })
		assert.equal(abre_detalle_propio(mov), true)
		const d = detalle_de_movimiento_manual(mov)
		assert.equal(d.tiene_texto, false)
		assert.equal(d.texto, '')
	})
})

test('descripción larga y multilínea: se conserva completa y con los saltos de línea', () => {
	const larga = 'Línea 1: flete\nLínea 2: seguro\n\n' + 'x'.repeat(2000) + '\nÚltima línea'
	const d = detalle_de_movimiento_manual(nota({ description: '  ' + larga + '  \n' }))
	assert.equal(d.texto, larga)
	assert.equal(d.texto.split('\n').length, 5)
	assert.equal(d.tiene_texto, true)
})

test('título: sin detalle cae a «Nota de débito»', () => {
	assert.equal(detalle_de_movimiento_manual(nota({ detalle: '' })).titulo, 'Nota de débito')
	assert.equal(detalle_de_movimiento_manual(nota({ detalle: 'Recargo' })).titulo, 'Recargo')
})

test('devuelve fecha e importe (debe) para mostrar en el modal', () => {
	const d = detalle_de_movimiento_manual(nota())
	assert.equal(d.fecha, '20/11/2026')
	assert.equal(d.importe, 1500)
})

test('movimientos con compra, venta o presupuesto NO usan el modal', () => {
	assert.equal(abre_detalle_propio(nota({ provider_order_id: 7 })), false)
	assert.equal(abre_detalle_propio(nota({ sale_id: 3 })), false)
	assert.equal(abre_detalle_propio(nota({ budget_id: 9 })), false)
})

test('pagos y notas de crédito NO usan el modal (van a printPago)', () => {
	assert.equal(abre_detalle_propio(nota({ status: 'pago_from_client' })), false)
	assert.equal(abre_detalle_propio(nota({ status: 'nota_credito' })), false)
})

test('abre_detalle_propio tolera null', () => {
	assert.equal(abre_detalle_propio(null), false)
})

test('List.vue: showDetails conserva printPago y show_model y tiene la rama del modal', () => {
	const fuente = fs.readFileSync(path.join(__dirname, '..', 'src/components/common/current-acounts/List.vue'), 'utf8')
	const m = fuente.match(/showDetails\(current_acount\) \{[\s\S]*?\n        \},\n/)
	assert.ok(m, 'no se encontró showDetails')
	const cuerpo = m[0]
	assert.match(cuerpo, /this\.printPago\(current_acount\)/)
	assert.match(cuerpo, /this\.show_model\(model_name, model_id\)/)
	assert.match(cuerpo, /abre_detalle_propio/)
	assert.match(cuerpo, /detalle-movimiento-manual/)
	assert.match(fuente, /id="detalle-movimiento-manual"/)
	assert.match(fuente, /white-space:\s*pre-wrap/)
	assert.match(fuente, /Esta nota no tiene descripción cargada\./)
})
