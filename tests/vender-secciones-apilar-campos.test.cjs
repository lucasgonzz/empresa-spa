// Tests de apilar_campos (ronda 2 de vender-secciones-personalizables): poner los campos de una sección
// uno abajo del otro. Ejecutar con: node --test tests/vender-secciones-apilar-campos.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const RUTA_ESTADO = 'components/abm/disenos-de-vender/editor/estado_del_editor.js'
const RUTA_OPERACIONES = 'components/abm/disenos-de-vender/editor/operaciones_de_secciones.js'

/** vm mínimo: sin extensiones ni catálogos del store. */
function vm_minimo() {
	return {
		hasExtencion: function () { return false },
		can: function () { return true },
		user: { ask_amount_in_vender: false },
		owner: {},
		$store: { state: {}, getters: {} },
	}
}

test('apilar_campos pone a 12 todos los campos de la sección y no toca los marcadores ni otras secciones', function () {
	let { armar_estado_de_trabajo } = cargar(RUTA_ESTADO)
	let { apilar_campos } = cargar(RUTA_OPERACIONES)
	let estado = armar_estado_de_trabajo(null, vm_minimo())
	let etapa_3_antes = JSON.stringify(estado.etapas.etapa_3)

	let resultado = apilar_campos(estado, 'etapa_1')
	assert.equal(resultado.ok, true)
	assert.ok(resultado.cambiados > 0)
	estado.etapas.etapa_1.forEach(function (item) {
		assert.equal(item.cols, 12, item.key)
	})
	assert.ok(estado.etapas.etapa_1.some(function (item) { return item.key === 'separador' }), 'el separador sigue')
	assert.equal(JSON.stringify(estado.etapas.etapa_3), etapa_3_antes, 'otras secciones sin cambios')
})

test('apilar_campos cambia la huella del diseño y, repetido, avisa que ya está todo a lo ancho', function () {
	let { armar_estado_de_trabajo, huella_del_diseno } = cargar(RUTA_ESTADO)
	let { apilar_campos } = cargar(RUTA_OPERACIONES)
	let estado = armar_estado_de_trabajo(null, vm_minimo())
	let antes = huella_del_diseno(estado)

	assert.equal(apilar_campos(estado, 'etapa_1').ok, true)
	assert.notEqual(huella_del_diseno(estado), antes)

	let otra_vez = apilar_campos(estado, 'etapa_1')
	assert.equal(otra_vez.ok, false)
	assert.equal(typeof otra_vez.motivo, 'string')
})

test('apilar_campos rechaza una sección que no existe o sin campos', function () {
	let { armar_estado_de_trabajo } = cargar(RUTA_ESTADO)
	let { apilar_campos, agregar_seccion } = cargar(RUTA_OPERACIONES)
	let estado = armar_estado_de_trabajo(null, vm_minimo())

	assert.equal(apilar_campos(estado, 'seccion_9').ok, false)
	let nueva = agregar_seccion(estado, vm_minimo())
	assert.equal(apilar_campos(estado, nueva.id).ok, false)
})

test('puede_apilar_campos sugiere apilar sólo si la columna mide 4 o menos y hay campos angostos', function () {
	let { armar_estado_de_trabajo } = cargar(RUTA_ESTADO)
	let { puede_apilar_campos } = cargar(RUTA_OPERACIONES)
	let vm = vm_minimo()

	let predeterminado = armar_estado_de_trabajo(null, vm)
	let ancha = puede_apilar_campos(predeterminado, 'etapa_1')
	assert.equal(ancha.ok, true)
	assert.equal(ancha.sugerido, false, 'columna de 12: no hace falta')

	/* En el ágil la columna de la izquierda mide 4, pero ya viene con todo a 12: nada que sugerir */
	let agil = armar_estado_de_trabajo({ version: 2, plantilla: 'agil' }, vm)
	assert.equal(puede_apilar_campos(agil, 'etapa_1').ok, false)

	/* Columna angosta con campos de 4/12: se sugiere */
	agil.etapas.etapa_1[0].cols = 4
	let angosta = puede_apilar_campos(agil, 'etapa_1')
	assert.equal(angosta.ok, true)
	assert.equal(angosta.sugerido, true)
})
