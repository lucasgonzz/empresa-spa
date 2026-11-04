// Código de barras de VENDER (misión prueba-defectos-asistente-y-vender, 4/11/2026): Enter en "Cod barras"
// cuando el campo no tiene valor (el artículo pendiente de cantidad reemplaza al item de la cabecera y le
// saca la clave `codigo`) tiraba «TypeError: Cannot read properties of undefined (reading 'replace')» en
// getBarCode, y no avisaba nada.
//
// Ejecutar con: node --test tests/codigo-de-barras-en-vender.test.cjs
// No levanta servidores ni usa la suite de Playwright.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { codigo_escaneado } = cargar('utils/codigo_de_barras.js')

test('un código tipeado se limpia de espacios, como siempre', () => {
	assert.equal(codigo_escaneado('2001000000050'), '2001000000050')
	assert.equal(codigo_escaneado(' 2001 0000 00050 '), '2001000000050')
})

test('un código que llega como número se busca igual', () => {
	assert.equal(codigo_escaneado(2001000000050), '2001000000050')
})

test('sin valor (undefined, null, vacío o solo espacios) da cadena vacía y no tira', () => {
	assert.equal(codigo_escaneado(undefined), '')
	assert.equal(codigo_escaneado(null), '')
	assert.equal(codigo_escaneado(''), '')
	assert.equal(codigo_escaneado('   '), '')
})
