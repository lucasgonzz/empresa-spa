// Buscador con modal (misión prueba-e2e-campana-imperio, ronda 3, 12/11/2026): lo que el usuario
// tipea en el campo de afuera mientras el modal se está abriendo pasa completo al input del modal.
// Antes la «S» de «Sierra» quedaba afuera y el modal recibía «ierra».
//
// Ejecutar con: node --test tests/buscador-con-modal-primera-letra.test.cjs
// No levanta servidores ni usa la suite de Playwright.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { criterio_para_el_modal } = cargar('common-vue/components/search/criterio_al_abrir_modal.js')

test('el modal abrió vacío con el clic y la primera letra cayó afuera: pasa al modal', () => {
	assert.equal(criterio_para_el_modal({ valor_afuera: 'S', valor_modal: '', foco_en_modal: false }), 'S')
})

test('el modal abrió con la primera tecla y la segunda cayó afuera: pasa todo', () => {
	assert.equal(criterio_para_el_modal({ valor_afuera: 'Si', valor_modal: 'S', foco_en_modal: false }), 'Si')
})

test('el nombre que se estaba editando más lo tipeado afuera: pasa todo', () => {
	assert.equal(
		criterio_para_el_modal({ valor_afuera: 'Sierra de arco', valor_modal: 'Sierra', foco_en_modal: false }),
		'Sierra de arco'
	)
})

test('el foco ya está en el modal: no se pisa lo que el usuario escribe ahí', () => {
	assert.equal(criterio_para_el_modal({ valor_afuera: 'S', valor_modal: 'Si', foco_en_modal: true }), null)
})

test('nada tipeado afuera desde que abrió: no se toca', () => {
	assert.equal(criterio_para_el_modal({ valor_afuera: 'Sierra', valor_modal: 'Sierra', foco_en_modal: false }), null)
	assert.equal(criterio_para_el_modal({ valor_afuera: '', valor_modal: '', foco_en_modal: false }), null)
})

test('campo de afuera vacío (o null): nunca vacía el modal', () => {
	assert.equal(criterio_para_el_modal({ valor_afuera: '', valor_modal: 'Sierra', foco_en_modal: false }), null)
	assert.equal(criterio_para_el_modal({ valor_afuera: null, valor_modal: 'Sierra', foco_en_modal: false }), null)
})
