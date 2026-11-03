// El footer del panel con un plan de IA medido en plata (misión plan-ia-por-gasto, 2/11/2026): con
// `porcentaje_del_plan` dice «Usaste 42 % de tu plan de este mes», con su aviso de cerca o de límite; sin esa
// clave (plan con tope de tokens, o backend anterior a esta misión) sigue todo como antes. El dueño nunca ve
// plata: el backend ni la manda.
//
// Ejecutar con: node --test tests/plan-ia-por-gasto.test.cjs
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

/**
 * Lo que manda el backend con tope de gasto: `tope_tokens_mensual` en null y el porcentaje.
 *
 * @param {object} extra
 * @returns {object}
 */
function con_gasto(extra) {
	return Object.assign({
		consumo_mes: { tokens: 11300000, interacciones: 3 },
		plan: { nombre: 'Agentes Light', tope_tokens_mensual: null, tope_interacciones_diarias: 100 },
		cerca: false,
		cerca_del_mes: false,
		supero: false,
		supero_tokens: false,
		supero_interacciones: false,
		porcentaje_del_plan: 42,
	}, extra)
}

test('con porcentaje: lo dice, con su barra, y no habla de tokens', () => {
	const vm = footer(con_gasto())
	assert.equal(vm.tiene_tope, true)
	assert.equal(vm.porcentaje, 42)
	assert.equal(vm.texto_uso, 'Usaste 42 % de tu plan de este mes')
	assert.equal(vm.clase_estado, '')
})

test('cero por ciento también es un porcentaje, no «sin tope»', () => {
	const vm = footer(con_gasto({ porcentaje_del_plan: 0 }))
	assert.equal(vm.tiene_tope, true)
	assert.equal(vm.texto_uso, 'Usaste 0 % de tu plan de este mes')
})

test('cerca del tope del mes: avisa con el número', () => {
	const vm = footer(con_gasto({ porcentaje_del_plan: 85, cerca: true, cerca_del_mes: true }))
	assert.equal(vm.texto_uso, 'Usaste 85 % de tu plan de este mes · te estás acercando al límite')
	assert.equal(vm.clase_estado, 'es-cerca')
})

test('cerca solo de las interacciones de hoy: dice que es el de hoy', () => {
	const vm = footer(con_gasto({ porcentaje_del_plan: 12, cerca: true, cerca_del_mes: false }))
	assert.equal(vm.texto_uso, 'Usaste 12 % de tu plan de este mes · te estás acercando al límite de mensajes de hoy')
})

test('llegó al tope del mes: avisa con el número', () => {
	const vm = footer(con_gasto({ porcentaje_del_plan: 100, cerca: true, cerca_del_mes: true, supero: true, supero_tokens: true }))
	assert.equal(vm.texto_uso, 'Usaste 100 % de tu plan de este mes · llegaste al límite')
	assert.equal(vm.clase_estado, 'es-supero')
})

test('se pasó solo el tope de hoy: mañana se renueva, y la barra sigue en el porcentaje del mes', () => {
	const vm = footer(con_gasto({ porcentaje_del_plan: 12, cerca: true, supero: true, supero_interacciones: true }))
	assert.equal(vm.texto_uso, 'Llegaste al límite de mensajes de hoy de tu plan. Mañana se renueva.')
	assert.equal(vm.porcentaje, 12)
})

test('se pasaron los dos: manda el del mes', () => {
	const vm = footer(con_gasto({ porcentaje_del_plan: 100, cerca: true, cerca_del_mes: true, supero: true, supero_tokens: true, supero_interacciones: true }))
	assert.equal(vm.texto_uso, 'Usaste 100 % de tu plan de este mes · llegaste al límite')
})

test('un porcentaje fuera de rango no desborda la barra', () => {
	assert.equal(footer(con_gasto({ porcentaje_del_plan: 130 })).porcentaje, 100)
	assert.equal(footer(con_gasto({ porcentaje_del_plan: -5 })).porcentaje, 0)
})

test('con porcentaje en null, igual que hoy: los tokens contra el tope de tokens', () => {
	const vm = footer({
		consumo_mes: { tokens: 2300000, interacciones: 3 },
		plan: { tope_tokens_mensual: 5000000 },
		cerca: false,
		supero: false,
		porcentaje_del_plan: null,
	})
	assert.equal(vm.tiene_porcentaje_del_plan, false)
	assert.equal(vm.porcentaje, 46)
	assert.equal(vm.texto_uso, 'Usaste 2,3M de 5M')
})

test('backend anterior, sin la clave: igual que hoy', () => {
	const vm = footer({ consumo_mes: { tokens: 2300000 }, plan: { tope_tokens_mensual: 5000000 }, cerca: true, supero: false })
	assert.equal(vm.texto_uso, 'Usaste 2,3M de 5M · te estás acercando al límite')
})

test('sin ningún tope, igual que hoy: sin barra y los tokens del mes', () => {
	const vm = footer({ consumo_mes: { tokens: 320000 }, plan: { tope_tokens_mensual: null }, cerca: false, supero: false })
	assert.equal(vm.tiene_tope, false)
	assert.equal(vm.texto_uso_sin_tope, 'Usaste 320k tokens este mes')
})
