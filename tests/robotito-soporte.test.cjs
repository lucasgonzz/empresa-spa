const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { pasos_de_soporte } = cargar('tours/soporte.js')

test('solo interpreta guiones conocidos y mantiene el número de pasos del contrato', () => {
	assert.equal(pasos_de_soporte({ tema: 'crear_ticket' }).length, 3)
	assert.equal(pasos_de_soporte({ tema: 'buscar_articulo_nombre' }).length, 3)
	assert.equal(pasos_de_soporte({ tema: 'buscar_articulo_codigo' }).length, 1)
	assert.equal(pasos_de_soporte({ tema: 'centro_recursos' }).length, 2)
	assert.equal(pasos_de_soporte({ tema: 'constructor' }).length, 0)
})

test('el texto personalizado no controla el ancla, el gancho ni la navegación', () => {
	const [paso] = pasos_de_soporte({
		tema: 'buscar_articulo_nombre',
		selector: 'body',
		antes: 'guardar_venta',
		ruta: { name: 'caja' },
		textos: ['Abrí el buscador para encontrar el artículo'],
	})
	assert.equal(paso.selector, '#search-article')
	assert.equal(paso.antes, 'abrir_buscador_articulos')
	assert.equal(paso.ruta.name, 'vender')
	assert.equal(paso.texto, 'Abrí el buscador para encontrar el artículo')
})

test('con el chat abierto el primer paso señala el encabezado sin perder la cuenta', () => {
	const guia = { tema: 'crear_ticket', textos: ['Abrí Soporte', 'Revisá tus tickets', 'Mandá un mensaje'] }
	const pasos = pasos_de_soporte(guia, true)
	assert.equal(pasos[0].ancla, 'soporte.encabezado')
	assert.equal(pasos[1].texto, guia.textos[1])
	assert.equal(pasos[2].texto, guia.textos[2])
	assert.equal(pasos_de_soporte(guia, false)[0].ancla, 'soporte.abrir')
})
