const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const ruta = 'common-vue/components/model/ModelForm.vue'
const form = cargar(ruta, {
	'@/common-vue/components/model/HasMany': {},
	'@/common-vue/components/model/BelongsToManyCheckbox': {},
	'@/common-vue/components/display/cards/Index': {},
	'@/common-vue/components/model/images/Index': {},
	'@/common-vue/components/BtnLoader': {},
	'@/common-vue/components/model/GroupPorps': {},
	'@/common-vue/components/model/form/FieldCheckboxToggle': {},
	'@/components/expenses/components/PaymentMethodsTable': {},
	'@/common-vue/mixins/model_functions': {},
	'@/common-vue/helpers/column_preferences_helper': {},
}).default
const modal = cargar('common-vue/components/search/Modal.vue', {
	'@/common-vue/components/display/TableComponent': {},
	'@/common-vue/components/view/header/props-to-show/ColumnsPreferencesConfigModal.vue': {},
	'@/common-vue/helpers/column_preferences_helper': {},
}).default
const search = cargar('common-vue/components/search/Index.vue', {
	'@/common-vue/components/search/Modal': modal,
}).default
const movimiento = cargar('models/deposit_movement.js').default
const prop = movimiento.properties.find(prop => prop.key === 'articles')

function armar_formulario(extension) {
	const doc = { activeElement: null }
	const foco = () => ({ focus() { doc.activeElement = this } })
	const buscador = foco()
	const cantidades = []
	const tabla = { querySelectorAll: () => cantidades }
	const commits = []
	let foco_anterior = 0

	const vm = {
		...form.methods,
		model_name: 'deposit_movement',
		model: { articles: [] },
		hasExtencion: slug => slug === 'teclado_nuevo_movimiento_deposito' && extension,
		$el: {
			isConnected: true,
			querySelector: selector => selector.startsWith('input') ? buscador : tabla,
		},
		$nextTick: fn => fn(),
		$store: {
			commit(nombre, payload) {
				commits.push(nombre)
				vm.model = payload.model
				cantidades.push(foco())
			},
		},
		setTableFocus() { foco_anterior++ },
	}
	return { vm, doc, buscador, cantidades, commits, foco_anterior: () => foco_anterior }
}

function seleccionar(vm, articulo, con_enter = true) {
	const buscador = {
		$emit(nombre, payload) {
			assert.equal(nombre, 'setSelected')
			vm.setSelected(payload)
		},
		prop,
		setInputValue() {},
	}
	const resultados = [articulo]
	const modal_vm = {
		...modal.methods,
		modal_visible: true,
		selected_index: 0,
		results: resultados,
		$bvModal: {
			hide() { vm.enfocar_cantidad_agregada(prop) },
		},
		$emit(nombre, item, results, por_enter) {
			if (nombre === 'setSelected') {
				search.methods.setSelected.call(buscador, item, results, por_enter)
			}
		},
	}
	if (con_enter) {
		modal_vm.pulso_enter.call({ ...modal_vm, ya_se_busco: true })
	} else {
		modal_vm.emitSetSelected(articulo)
	}
}

function enter_en_cantidad(vm, type) {
	const llamada = []
	vm.enter_en_cantidad(prop, {
		target: { matches: () => true },
		type,
		preventDefault() { llamada.push('preventDefault') },
		stopPropagation() { llamada.push('stopPropagation') },
	})
	return llamada
}

test('dos artículos con Enter mantienen las cantidades por fila y regresan al buscador', t => {
	const { vm, doc, buscador, cantidades, commits, foco_anterior } = armar_formulario(true)
	t.mock.method(console, 'log', () => {})
	global.document = doc
	t.after(() => { delete global.document })
	buscador.focus()

	seleccionar(vm, { id: 12, article_variants: [] })
	assert.equal(doc.activeElement, cantidades[0])
	vm.model.articles[0].pivot.amount = '3'
	assert.deepEqual(enter_en_cantidad(vm, 'keydown'), ['preventDefault', 'stopPropagation'])
	assert.equal(doc.activeElement, cantidades[0])
	assert.deepEqual(enter_en_cantidad(vm, 'keyup'), ['preventDefault', 'stopPropagation'])
	assert.equal(doc.activeElement, buscador)

	const con_variante = { id: 24, article_variants: [{ id: 6 }, { id: 7 }] }
	seleccionar(vm, con_variante)
	assert.equal(doc.activeElement, cantidades[1])
	assert.equal(vm.model.articles[1].pivot.article_variant_id, 0)
	vm.model.articles[1].pivot.article_variant_id = 6
	vm.model.articles[1].pivot.amount = '8'
	enter_en_cantidad(vm, 'keyup')
	assert.equal(doc.activeElement, buscador)
	assert.deepEqual(vm.model.articles.map(fila => fila.pivot.amount), ['3', '8'])
	assert.deepEqual(commits, ['deposit_movement/setModel', 'deposit_movement/setModel'])

	seleccionar(vm, con_variante)
	assert.equal(doc.activeElement, cantidades[2])
	vm.model.articles[2].pivot.article_variant_id = 7
	vm.model.articles[2].pivot.amount = '2'
	assert.deepEqual(vm.model.articles.map(fila => fila.pivot.amount), ['3', '8', '2'])
	assert.deepEqual(vm.model.articles.map(fila => fila.pivot.article_variant_id), [0, 6, 7])
	assert.equal(foco_anterior(), 0)
})

test('edición, opción apagada, negocio sin la extensión, filtro y otros formularios mantienen el flujo anterior', t => {
	t.mock.method(console, 'log', () => {})
	for (const [extension, contexto] of [
		[false, {}],
		[undefined, {}],
		[true, { model: { id: 10, articles: [] } }],
		[true, { model_name: 'provider_order' }],
		[true, { form_to_filter: true }],
	]) {
		const { vm, foco_anterior } = armar_formulario(extension)
		Object.assign(vm, contexto)
		seleccionar(vm, { id: 12 })
		assert.equal(foco_anterior(), 1)
		assert.deepEqual(enter_en_cantidad(vm, 'keyup'), [])
	}
})

test('seleccionar con clic conserva la ruta de foco anterior aunque la extensión esté activa', t => {
	t.mock.method(console, 'log', () => {})
	const { vm, foco_anterior } = armar_formulario(true)
	seleccionar(vm, { id: 12 }, false)
	assert.equal(foco_anterior(), 1)
})
