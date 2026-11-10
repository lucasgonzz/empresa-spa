const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { pasos_de_soporte } = cargar('tours/soporte.js')

for (const [tipo, modelo, solapa] of [
	['recargo', 'surchage', 'recargos'],
	['descuento', 'discount', 'descuentos'],
]) {
	test('Robotito deja elegir el ' + tipo + ' y señala su porcentaje en ABM', () => {
		const [editar, porcentaje] = pasos_de_soporte({ tema: 'guia_dinamica', pasos: [
			{ clave: 'abm.editar_' + tipo, texto: 'Elegí el registro.' },
			{ clave: 'abm.porcentaje_' + tipo, texto: 'Cambiá Porcentaje.' },
		] })

		assert.deepEqual(editar.ruta, { name: 'abm', params: { view: 'precios', sub_view: solapa } })
		assert.deepEqual(porcentaje.ruta, editar.ruta)
		assert.ok(editar.selector.includes('[data-testid^="' + modelo + '-row-"]'))
		assert.ok(editar.selector.includes('.cont-cards:has(.card-component.apretable)'))
		assert.equal(editar.avanza, 'aparece')
		assert.equal(editar.selector_al_aparecer, porcentaje.selector)
		assert.ok(porcentaje.selector.includes('[data-modelo-en-edicion="' + modelo + '"]'))
		assert.ok(porcentaje.selector.endsWith('#' + modelo + '-percentage:not(:disabled)'))
		assert.equal(porcentaje.avanza, undefined)
		assert.equal(porcentaje.antes, undefined)
	})
}
