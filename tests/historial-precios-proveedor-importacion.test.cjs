// Misión historial-precios-proveedor, importador de 4 pasos (CA14 y CA15 del PLAN): las dos preguntas
// nuevas del paso 3 ("¿actualizamos los artículos que ya están con otro proveedor?" y "¿pasan a ser de este
// proveedor?"), los flags que el modal le manda a la API según las respuestas y el borrador que las repone.
// Sin red ni navegador: se carga el componente real, se arma un "modal" con sus computed, data y métodos, y la
// visibilidad de las preguntas se lee del template compilado (sin depender de cómo se llamen los computed).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const XLSX = require('xlsx')
const compiler = require('vue-template-compiler')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const RUTA_MODAL = 'components/listado/modals/ai-excel-import/Index.vue'
const componente = cargar(RUTA_MODAL, {
	'xlsx/xlsx.mjs': XLSX,
	'@/common-vue/components/model/Index': {},
	'./RelacionesParecidas': {},
	'@/mixins/prueba': {},
}).default
const borrador_js = cargar('components/listado/modals/ai-excel-import/borrador.js')
const { armar_borrador, aplicar_borrador, CAMPOS_DEL_BORRADOR } = borrador_js

// ---------------------------------------------------------------- utilidades

/**
 * Arma un "modal" con el componente real: data() con sus defaults, cada computed como getter (sin cache,
 * así lee siempre el estado de ahora) y los métodos. Con `reales` sólo esos métodos son los de verdad y
 * el resto quedan vacíos (para ejercitar un método sin arrastrar todo lo que llama).
 *
 * @param {Object} estado Campos que pisan los defaults del modal.
 * @param {Array|null} reales Nombres de métodos reales; null = todos.
 * @returns {Object} El modal armado.
 */
function armar_modal(estado, reales) {
	const vm = {}
	Object.keys(componente.computed).forEach(nombre => {
		const definicion = componente.computed[nombre]
		const lector = typeof definicion === 'function' ? definicion : definicion.get
		Object.defineProperty(vm, nombre, { get: () => lector.call(vm), configurable: true, enumerable: true })
	})
	Object.assign(vm, componente.data.call(vm))
	Object.keys(componente.methods).forEach(nombre => {
		const real = reales === undefined || reales === null || reales.includes(nombre)
		vm[nombre] = real ? componente.methods[nombre].bind(vm) : function() {}
	})
	vm.model = 'article'
	vm.$nextTick = function(f) { vm.__cola.push(f) }
	vm.__cola = []
	vm.$store = { commit() {}, state: {}, getters: {} }
	vm.$toast = { error() {}, success() {} }
	vm.$bvModal = { hide() {}, show() {} }
	return Object.assign(vm, estado || {})
}

/** Lo que el análisis devuelve cuando hay artículos del Excel ya cargados con otro proveedor. */
function otros_proveedores(articulos) {
	return {
		articles: articulos,
		rows: articulos,
		by_provider: [{ provider_id: 3, name: 'BA', articles: articulos }],
		examples: [{ row: 2, name: 'Taladro', current_provider: 'BA' }],
	}
}

/** Estado del paso 3 con el bloque nuevo a la vista y las respuestas por defecto. */
function paso_3(cambios) {
	return Object.assign({
		step: 3,
		selected_provider_id: 7,
		duplicate_stats: { provider_codes_duplicados_intra_archivo: 0, provider_codes_existentes_otros_proveedores: 0 },
		other_provider_articles: otros_proveedores(1),
		other_provider_articles_policy: 'ignorar',
		actualizar_proveedor: 0,
		politica_otro_proveedor: null,
		politica_colision: null,
	}, cambios || {})
}

/** Estado con códigos de proveedor repetidos que ya existen en otro proveedor (la pregunta vieja a la vista). */
function con_codigos_repetidos(cambios) {
	return paso_3(Object.assign({
		duplicate_stats: { provider_codes_duplicados_intra_archivo: 3, provider_codes_existentes_otros_proveedores: 2 },
		politica_colision: 'actualizar_todos',
	}, cambios || {}))
}

/** [otro, por_codigo, proveedor] de lo que decide derive_flags_from_choice. */
function triple(estado) {
	const flags = armar_modal(estado).derive_flags_from_choice()
	assert.notEqual(typeof flags.update_other_provider_by_provider_code, 'undefined', 'derive_flags_from_choice tiene que devolver update_other_provider_by_provider_code')
	return [
		Number(flags.actualizar_articulos_de_otro_proveedor),
		Number(flags.update_other_provider_by_provider_code),
		Number(flags.actualizar_proveedor),
	]
}

// Template compilado: se camina el árbol para saber cuándo se ve cada pregunta, sin atarse a nombres internos.
const ast = compiler.compile(compiler.parseComponent(fs.readFileSync(path.join(__dirname, '..', 'src', RUTA_MODAL), 'utf8')).template.content, { whitespace: 'condense' }).ast

/** Todos los nodos elemento del template. */
function nodos(raiz, acumulado) {
	acumulado = acumulado || []
	if (raiz && raiz.type === 1) {
		acumulado.push(raiz)
		;(raiz.children || []).forEach(hijo => nodos(hijo, acumulado))
		;(raiz.ifConditions || []).forEach(condicion => { if (condicion.block !== raiz) nodos(condicion.block, acumulado) })
	}
	return acumulado
}
const TODOS = nodos(ast)

/** Los v-if del nodo y de todos sus ancestros (para verlo en pantalla tienen que cumplirse todos). */
function condiciones(nodo) {
	const lista = []
	for (let actual = nodo; actual; actual = actual.parent) {
		if (actual.if) lista.push(actual.if)
	}
	return lista
}

/** True si el nodo se ve con el estado dado: se evalúan sus v-if contra el modal armado. */
function se_ve(nodo, vm) {
	return condiciones(nodo).every(expresion => !!new Function('vm', 'with (vm) { return (' + expresion + ') }')(vm))
}

/** Radios (o cualquier control) atados por v-model a un campo del modal. */
function controles_de(campo) {
	return TODOS.filter(nodo => nodo.attrsMap && nodo.attrsMap['v-model'] === campo)
}

/** Texto de un nodo y todo lo que tiene adentro. */
function texto_de(nodo) {
	let texto = ''
	;(function recorrer(actual) {
		if (actual.type === 3 || actual.type === 2) texto += ' ' + actual.text
		;(actual.children || []).forEach(recorrer)
	})(nodo)
	return texto.replace(/\s+/g, ' ')
}

/** Si el control (cualquiera de sus radios) está a la vista. */
function pregunta_visible(campo, vm) {
	const controles = controles_de(campo)
	assert.ok(controles.length > 0, 'el template no tiene ningún control con v-model="' + campo + '"')
	return controles.some(nodo => se_ve(nodo, vm))
}

// ---------------------------------------------------------------- CA14: flags según las respuestas

test('matriz de flags: sin bloque nuevo ni códigos repetidos no se actualiza nada de otro proveedor', () => {
	// Sin la detección (API vieja), con la pregunta en "actualizar" escondida y el proveedor en 1: todo en 0.
	assert.deepEqual(triple(paso_3({ other_provider_articles: null })), [0, 0, 0])
	assert.deepEqual(triple(paso_3({ other_provider_articles: null, other_provider_articles_policy: 'actualizar', actualizar_proveedor: 1 })), [0, 0, 0])
})

test('matriz de flags: bloque nuevo en Sí y proveedor en No actualiza el costo pero el artículo sigue siendo del otro', () => {
	assert.deepEqual(triple(paso_3({ other_provider_articles_policy: 'actualizar', actualizar_proveedor: 0 })), [1, 0, 0])
})

test('matriz de flags: bloque nuevo en Sí y proveedor en Sí cambia también el proveedor, sin cruzar por código de proveedor', () => {
	assert.deepEqual(triple(paso_3({ other_provider_articles_policy: 'actualizar', actualizar_proveedor: 1 })), [1, 0, 1])
})

test('matriz de flags: la pregunta vieja en actualizar prende el cruce por código de proveedor aunque el bloque nuevo diga No', () => {
	assert.deepEqual(triple(con_codigos_repetidos({ politica_otro_proveedor: 'actualizar', actualizar_proveedor: 1 })), [1, 1, 1])
	assert.deepEqual(triple(con_codigos_repetidos({ politica_otro_proveedor: 'actualizar', actualizar_proveedor: 0 })), [1, 1, 0])
	// Con "ignorar" en la vieja, nada.
	assert.deepEqual(triple(con_codigos_repetidos({ politica_otro_proveedor: 'ignorar', actualizar_proveedor: 1 })), [0, 0, 0])
})

test('matriz de flags: las dos preguntas en Sí cruzan por identificación y por código de proveedor', () => {
	assert.deepEqual(triple(con_codigos_repetidos({ politica_otro_proveedor: 'actualizar', other_provider_articles_policy: 'actualizar', actualizar_proveedor: 1 })), [1, 1, 1])
})

test('matriz de flags: una respuesta vieja de una pregunta que no se ve no viaja escondida', () => {
	// El bloque nuevo se oculta con 0 artículos, sin proveedor elegido o sin la detección: la política vieja en "actualizar" no cuenta.
	assert.deepEqual(triple(paso_3({ other_provider_articles: otros_proveedores(0), other_provider_articles_policy: 'actualizar', actualizar_proveedor: 1 })), [0, 0, 0])
	assert.deepEqual(triple(paso_3({ selected_provider_id: null, other_provider_articles_policy: 'actualizar', actualizar_proveedor: 1 })), [0, 0, 0])
	// La pregunta vieja sin códigos repetidos (no se muestra) tampoco cuenta.
	assert.deepEqual(triple(paso_3({ other_provider_articles: null, politica_otro_proveedor: 'actualizar', actualizar_proveedor: 1 })), [0, 0, 0])
	// Con códigos repetidos pero ninguno que exista en otro proveedor, la vieja tampoco se muestra.
	assert.deepEqual(triple(paso_3({
		other_provider_articles: null,
		duplicate_stats: { provider_codes_duplicados_intra_archivo: 3, provider_codes_existentes_otros_proveedores: 0 },
		politica_otro_proveedor: 'actualizar',
		actualizar_proveedor: 1,
	})), [0, 0, 0])
})

test('matriz de flags: actualizar el proveedor sin actualizar los artículos de otro proveedor queda en 0', () => {
	assert.deepEqual(triple(paso_3({ other_provider_articles_policy: 'ignorar', actualizar_proveedor: 1 })), [0, 0, 0])
	assert.deepEqual(triple(con_codigos_repetidos({ politica_otro_proveedor: 'ignorar', other_provider_articles_policy: 'ignorar', actualizar_proveedor: 1 })), [0, 0, 0])
})

test('los flags viejos de códigos de proveedor siguen igual que hoy', () => {
	const flags = armar_modal(con_codigos_repetidos({ politica_otro_proveedor: 'ignorar' })).derive_flags_from_choice()
	assert.equal(flags.actualizar_por_provider_code, 1)
	assert.equal(flags.permitir_provider_code_repetido, 1)
	assert.equal(flags.permitir_provider_code_repetido_en_multi_providers, 1)
})

test('importar() manda update_other_provider_by_provider_code siempre, también en 0, junto con los demás flags', () => {
	const casos = [
		{ estado: paso_3({ other_provider_articles: null }), esperado: [0, 0, 0] },
		{ estado: paso_3({ other_provider_articles_policy: 'actualizar', actualizar_proveedor: 1 }), esperado: [1, 0, 1] },
		{ estado: con_codigos_repetidos({ politica_otro_proveedor: 'actualizar', actualizar_proveedor: 0 }), esperado: [1, 1, 0] },
	]
	casos.forEach(caso => {
		const pedidos = []
		const vm = armar_modal(Object.assign({ create_and_edit: 1, start_row: 2, finish_row: 10, file_processing: false }, caso.estado), ['importar', 'derive_flags_from_choice'])
		vm.$api = { post(url, payload) { pedidos.push({ url, payload }); return new Promise(function() {}) } }
		vm.importar()
		assert.equal(pedidos.length, 1)
		assert.equal(pedidos[0].url, 'ai-excel-import/import')
		const payload = pedidos[0].payload
		assert.ok('update_other_provider_by_provider_code' in payload, 'la clave tiene que viajar siempre')
		assert.deepEqual([
			Number(payload.actualizar_articulos_de_otro_proveedor),
			Number(payload.update_other_provider_by_provider_code),
			Number(payload.actualizar_proveedor),
		], caso.esperado)
	})
})

// ---------------------------------------------------------------- CA15: preguntas del paso 3

test('la pregunta nueva se ve sólo con modelo artículo, proveedor elegido y artículos de otro proveedor detectados', () => {
	assert.equal(pregunta_visible('other_provider_articles_policy', armar_modal(paso_3())), true)
	// Sin la clave (API vieja o análisis sin la bandera), con 0 artículos, sin proveedor o en otro modelo: no aparece.
	assert.equal(pregunta_visible('other_provider_articles_policy', armar_modal(paso_3({ other_provider_articles: null }))), false)
	assert.equal(pregunta_visible('other_provider_articles_policy', armar_modal(paso_3({ other_provider_articles: otros_proveedores(0) }))), false)
	assert.equal(pregunta_visible('other_provider_articles_policy', armar_modal(paso_3({ selected_provider_id: null }))), false)
	assert.equal(pregunta_visible('other_provider_articles_policy', armar_modal(paso_3({ model: 'client' }))), false)
	assert.equal(pregunta_visible('other_provider_articles_policy', armar_modal(paso_3({ step: 2 }))), false)
})

test('visibilidad y defaults: las dos preguntas arrancan en No y la segunda sólo aparece con la primera en Sí', () => {
	const modal = armar_modal(paso_3())
	assert.equal(armar_modal({}).other_provider_articles_policy, 'ignorar', 'default de data()')
	assert.equal(Number(armar_modal({}).actualizar_proveedor), 0, 'default de data()')
	assert.equal(pregunta_visible('actualizar_proveedor', modal), false, 'con la primera en No no se muestra la segunda')
	modal.other_provider_articles_policy = 'actualizar'
	assert.equal(pregunta_visible('actualizar_proveedor', modal), true)
	// También aparece si lo que está en "actualizar" es la pregunta vieja de códigos de proveedor.
	const con_vieja = armar_modal(con_codigos_repetidos({ politica_otro_proveedor: 'actualizar' }))
	assert.equal(pregunta_visible('actualizar_proveedor', con_vieja), true)
	// Y no aparece cuando ninguna de las dos está en "actualizar".
	const sin_nada = armar_modal(con_codigos_repetidos({ politica_otro_proveedor: 'ignorar' }))
	assert.equal(pregunta_visible('actualizar_proveedor', sin_nada), false)
})

test('visibilidad y defaults: la primera pregunta ofrece No y Sí con la ayuda del registro por proveedor', () => {
	const radios = controles_de('other_provider_articles_policy')
	const valores = radios.map(nodo => nodo.attrsMap.value).sort()
	assert.deepEqual(valores, ['actualizar', 'ignorar'])
	const bloque = radios[0].parent
	const texto = texto_de(bloque)
	assert.match(texto, /otro proveedor/i)
	assert.match(texto, /queda registrado/i, 'la ayuda de "No" dice que el costo del proveedor queda registrado')
	assert.match(texto, /actualizar su costo y precios/i)
	const segunda = controles_de('actualizar_proveedor')
	assert.deepEqual(segunda.map(nodo => String(nodo.attrsMap.value).replace(/['"]/g, '')).sort(), ['0', '1'])
	assert.match(segunda.map(nodo => texto_de(nodo.parent)).join(' '), /pasan a ser de/i)
})

test('Continuar nunca se traba por las preguntas nuevas: con los defaults está habilitado', () => {
	const boton = TODOS.find(nodo => nodo.attrsMap && nodo.attrsMap['data-testid'] === 'ai-import-btn-continuar')
	assert.ok(boton, 'no está el botón Continuar del paso 3')
	const expresion = boton.attrsMap[':disabled']
	assert.ok(expresion, 'Continuar tenía un :disabled')
	assert.doesNotMatch(expresion, /other_provider_articles|actualizar_proveedor/, 'el :disabled no puede mirar las respuestas nuevas')
	const deshabilitado = vm => !!new Function('vm', 'with (vm) { return (' + expresion + ') }')(vm)
	assert.equal(deshabilitado(armar_modal(paso_3())), false)
	assert.equal(deshabilitado(armar_modal(paso_3({ other_provider_articles_policy: 'actualizar' }))), false)
	// Lo de antes no cambia: con códigos repetidos en otro proveedor sin elegir, sigue trabado.
	assert.equal(deshabilitado(armar_modal(con_codigos_repetidos({ politica_otro_proveedor: null }))), true)
})

test('volver a No en la primera pregunta deja la segunda en 0', () => {
	const watcher = componente.watch.other_provider_articles_policy
	assert.ok(watcher, 'tiene que haber un watcher de other_provider_articles_policy')
	const manejador = typeof watcher === 'function' ? watcher : watcher.handler
	const modal = armar_modal(paso_3({ other_provider_articles_policy: 'actualizar', actualizar_proveedor: 1 }))
	modal.other_provider_articles_policy = 'ignorar'
	manejador.call(modal, 'ignorar', 'actualizar')
	assert.equal(Number(modal.actualizar_proveedor), 0)
	// Pasar a "actualizar" no toca la segunda.
	modal.actualizar_proveedor = 1
	modal.other_provider_articles_policy = 'actualizar'
	manejador.call(modal, 'actualizar', 'ignorar')
	assert.equal(Number(modal.actualizar_proveedor), 1)
})

test('el análisis del paso 2 al 3 pide la detección de artículos de otro proveedor', () => {
	const pedidos = []
	const modal = armar_modal({ column_mapping: [], excel_path: 'excel.xlsx', selected_provider_id: 7, analysis_uuid: 'a1' }, ['confirmar_paso_2'])
	modal.$api = { post(url, payload) { pedidos.push({ url, payload }); return new Promise(function() {}) } }
	modal.confirmar_paso_2()
	assert.equal(pedidos.length, 1)
	assert.equal(pedidos[0].url, 'ai-excel-import/get-recomendacion')
	assert.strictEqual(pedidos[0].payload.detect_other_provider_articles, true)
})

test('el resultado de la recomendación guarda other_provider_articles y tolera que no venga', () => {
	const modal = armar_modal({}, ['aplicar_resultado_recomendacion'])
	modal.aplicar_resultado_recomendacion({ other_provider_articles: otros_proveedores(2) })
	assert.equal(modal.other_provider_articles.articles, 2)
	assert.equal(modal.other_provider_articles.by_provider[0].name, 'BA')

	// API vieja: la clave no existe y el bloque no puede quedar a la vista con datos de la corrida anterior.
	modal.aplicar_resultado_recomendacion({})
	assert.ok(!modal.other_provider_articles, 'sin la clave vuelve a null')
})

test('el modal vuelve a No y sin detección al reiniciarse', () => {
	const modal = armar_modal({ other_provider_articles_policy: 'actualizar', actualizar_proveedor: 1, other_provider_articles: otros_proveedores(3) }, ['reset'])
	modal.reset()
	assert.equal(modal.other_provider_articles_policy, 'ignorar')
	assert.equal(modal.other_provider_articles, null)
	assert.equal(Number(modal.actualizar_proveedor), 0)
})

// ---------------------------------------------------------------- CA15: borrador

test('el borrador repone la política: other_provider_articles_policy y actualizar_proveedor van y vuelven', () => {
	assert.ok(CAMPOS_DEL_BORRADOR.includes('other_provider_articles_policy'), 'falta en CAMPOS_DEL_BORRADOR')
	assert.ok(CAMPOS_DEL_BORRADOR.includes('actualizar_proveedor'))

	const origen = armar_modal(paso_3({
		step: 3,
		analysis_uuid: 'uuid-1',
		importacion_lanzada: false,
		other_provider_articles_policy: 'actualizar',
		actualizar_proveedor: 1,
	}))
	const borrador = armar_borrador(origen)
	assert.equal(borrador.other_provider_articles_policy, 'actualizar')
	assert.equal(Number(borrador.actualizar_proveedor), 1)

	// Se retoma sobre un modal nuevo: arranca en los defaults y el borrador los pisa.
	const retomado = armar_modal({ column_mapping: [] })
	assert.equal(retomado.other_provider_articles_policy, 'ignorar')
	retomado.normalize_column_mapping = function(m) { return m }
	aplicar_borrador(retomado, borrador)
	retomado.__cola.forEach(f => f())
	assert.equal(retomado.other_provider_articles_policy, 'actualizar')
	assert.equal(Number(retomado.actualizar_proveedor), 1)
})

test('un borrador de antes de esta versión no rompe y deja las preguntas en No', () => {
	const viejo = { paso: 3, column_mapping: [], actualizar_proveedor: 0, politica_otro_proveedor: 'ignorar' }
	const modal = armar_modal({ column_mapping: [] })
	aplicar_borrador(modal, viejo)
	modal.__cola.forEach(f => f())
	assert.equal(modal.other_provider_articles_policy, 'ignorar')
	assert.equal(Number(modal.actualizar_proveedor), 0)
})

// ---------------------------------------------------------------- ayudas del modal

test('las ayudas del importador cuentan las dos preguntas nuevas y ya no dicen que el proveedor queda siempre en 0', () => {
	const descripciones = cargar('descripciones/importacion.js').default
	const todas = JSON.stringify(descripciones)
	assert.doesNotMatch(todas, /actualizar_proveedor queda SIEMPRE en 0/)
	assert.ok(descripciones['ai-import-otro-proveedor-*'], 'falta la entrada ai-import-otro-proveedor-*')
})
