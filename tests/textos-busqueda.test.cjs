// Textos de ayuda de los buscadores que buscan con Enter (ronda 6 de la prueba gratuita,
// 15/11/2026): «Apretá Enter para buscar «martillo»» con texto sin buscar, «Escribí qué querés
// buscar» con el campo vacío, y el contador «1 resultado» en singular.
//
// Ejecutar con: node --test tests/textos-busqueda.test.cjs
// No levanta servidores ni usa la suite de Playwright.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const {
	TEXTO_BUSCADOR_VACIO,
	recortar_criterio,
	hay_busqueda_pendiente,
	aviso_busqueda_pendiente,
	palabra_resultados,
	cantidad_de_resultados,
} = cargar('utils/textos_busqueda.js')

test('campo vacío: no hay aviso de Enter y el texto vacío lleva acentos', () => {
	assert.equal(aviso_busqueda_pendiente('', ''), null)
	assert.equal(aviso_busqueda_pendiente('   ', ''), null)
	assert.equal(aviso_busqueda_pendiente(null, undefined), null)
	assert.equal(TEXTO_BUSCADOR_VACIO, 'Escribí qué querés buscar')
})

test('texto escrito que todavía no se buscó: pide Enter con ese texto', () => {
	assert.equal(aviso_busqueda_pendiente('martillo', ''), 'Apretá Enter para buscar «martillo»')
	assert.equal(aviso_busqueda_pendiente('  martillo  ', null), 'Apretá Enter para buscar «martillo»')
	// Cambió el texto después de buscar otra cosa: vuelve a pedir Enter.
	assert.equal(aviso_busqueda_pendiente('pinza', 'martillo'), 'Apretá Enter para buscar «pinza»')
})

test('texto ya buscado: no hay aviso', () => {
	assert.equal(hay_busqueda_pendiente('martillo', 'martillo'), false)
	assert.equal(hay_busqueda_pendiente('martillo ', ' martillo'), false)
	assert.equal(aviso_busqueda_pendiente('martillo', 'martillo'), null)
})

test('un criterio largo se recorta con «…» y no pasa del máximo', () => {
	const largo = 'martillo de carpintero con mango de fibra de vidrio 500 gramos'
	const recortado = recortar_criterio(largo)
	assert.ok(recortado.length <= 30)
	assert.ok(recortado.endsWith('…'))
	assert.ok(largo.startsWith(recortado.slice(0, -1)))
	assert.equal(recortar_criterio('martillo'), 'martillo')
	// No deja un espacio colgando antes de los puntos suspensivos.
	assert.equal(recortar_criterio('abcd efgh', 6), 'abcd…')
})

test('el recorte no parte un emoji: cuenta caracteres, no unidades UTF-16', () => {
	// 29 letras y después un emoji: el corte cae justo donde un slice UTF-16 lo partiría.
	const con_emoji = 'a'.repeat(28) + '🔨🔨 martillo'
	const recortado = recortar_criterio(con_emoji)
	assert.equal(Array.from(recortado).length, 30)
	assert.equal(recortado, 'a'.repeat(28) + '🔨…')
	// Ningún surrogate suelto en el resultado.
	assert.equal(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/.test(recortado), false)
	// Si entra entero, se devuelve tal cual aunque tenga emojis.
	assert.equal(recortar_criterio('🔨 martillo'), '🔨 martillo')
})

test('contador: 1 en singular, el resto en plural', () => {
	assert.equal(palabra_resultados(1), 'resultado')
	assert.equal(palabra_resultados('1'), 'resultado')
	assert.equal(palabra_resultados(0), 'resultados')
	assert.equal(palabra_resultados(2), 'resultados')
	assert.equal(cantidad_de_resultados(1), '1 resultado')
	assert.equal(cantidad_de_resultados(1234, n => '1.234'), '1.234 resultados')
})
