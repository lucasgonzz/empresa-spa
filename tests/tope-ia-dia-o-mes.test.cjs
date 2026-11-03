// Aviso del tope del plan de IA en el footer del panel (misión tope-ia-dia-o-mes-spa, 2/11/2026):
// dice «hoy» si lo que se pasó es solo el tope diario de interacciones y «este mes» en cualquier otro caso,
// incluido un backend anterior a la 4.3.27 que no manda supero_tokens / supero_interacciones.
//
// Ejecutar con: node --test tests/tope-ia-dia-o-mes.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const Vue = require('vue')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

Vue.config.productionTip = false
Vue.config.devtools = false
Vue.config.silent = true

const PanelFooter = cargar('components/asistente-ia/PanelFooter.vue').default

/**
 * Instancia el footer sin montarlo, con `consumo` fijo en lugar del store.
 *
 * @param {object} consumo Lo que devuelve GET api/mi-consumo-ia.
 * @returns {Vue}
 */
function footer(consumo) {
	const computed = Object.assign({}, PanelFooter.computed, { consumo: () => consumo })
	return new Vue(Object.assign({}, PanelFooter, { computed }))
}

const plan = { tope_tokens_mensual: 5000000, tope_interacciones_diarias: 100 }
const base = { consumo_mes: { tokens: 1000, interacciones: 100 }, plan, cerca: false }

test('se pasó solo el tope diario: dice hoy', () => {
	const vm = footer(Object.assign({}, base, { supero: true, supero_tokens: false, supero_interacciones: true }))
	assert.match(vm.texto_uso, /hoy/)
	assert.doesNotMatch(vm.texto_uso, /este mes/)
})

test('se pasó el tope mensual: dice este mes', () => {
	const vm = footer(Object.assign({}, base, { supero: true, supero_tokens: true, supero_interacciones: false }))
	assert.equal(vm.texto_uso, 'Llegaste al límite de tu plan este mes.')
})

test('se pasaron los dos: manda el mensual, como el backend', () => {
	const vm = footer(Object.assign({}, base, { supero: true, supero_tokens: true, supero_interacciones: true }))
	assert.equal(vm.texto_uso, 'Llegaste al límite de tu plan este mes.')
})

test('backend viejo sin las claves nuevas: cae en el texto de siempre', () => {
	const vm = footer(Object.assign({}, base, { supero: true }))
	assert.equal(vm.texto_uso, 'Llegaste al límite de tu plan este mes.')
})

test('sin superar nada no cambia el texto de uso', () => {
	const vm = footer(Object.assign({}, base, { supero: false, supero_tokens: false, supero_interacciones: false }))
	assert.match(vm.texto_uso, /^Usaste /)
})
