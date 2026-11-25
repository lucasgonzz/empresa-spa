// Textos de los permisos de la caja (misión cajas-permisos-claros, CA10): los labels y ayudas del modelo
// `caja` dicen qué lista manda en Vender y cuál en Tesorería, y que «Caja preferida de» no restringe nada.
//
// Ejecutar con: node --test tests/caja-textos-de-permisos.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const fuente = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'models', 'caja.js'), 'utf8')

test('CA10 labels de las tres listas de empleados de la caja', () => {
	assert.ok(fuente.includes("text: 'Quiénes la USAN en Vender'"))
	assert.ok(fuente.includes("text: 'Quiénes la VEN en Tesorería'"))
	assert.ok(fuente.includes("text: 'Caja preferida de'"))
})

test('CA10 ayudas: vacío, herencia y administradores', () => {
	assert.ok(fuente.includes('Pueden elegirla al vender y cobrar. Si la dejás vacía, la pueden usar todos los empleados.'))
	assert.ok(fuente.includes('Ven la caja, su saldo, aperturas y movimientos en Tesorería. Si la dejás vacía, se usa la lista de Vender; si las dos están vacías, la ven todos los empleados que entran a Tesorería. El dueño y los administradores ven todas.'))
	assert.ok(fuente.includes('Se la propone primero a este empleado en Vender. No limita quién la ve ni quién la usa.'))
})

test('CA10 ya no promete exclusividad que no existe', () => {
	assert.ok(!fuente.includes('asignar esta caja a un unico empleado'))
})
