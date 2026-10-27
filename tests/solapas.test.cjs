// Sub-solapas de Alertas → Catálogo (components/alertas/solapas.js), con la sub-solapa Medidas que
// suma la misión medidas-masivas-catalogo (27/10/2026).
//
// Ejecutar con: node --test tests/solapas.test.cjs
// No levanta servidores ni usa la suite de Playwright: es un helper puro.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const solapas = cargar('components/alertas/solapas.js')

/** Una ruta de vue-router como la arma Alertas: `{name, params}`. */
function ruta(view, sub_view) {
	return { name: 'alertas', params: { view: view, sub_view: sub_view } }
}

test('las sub-solapas del Catálogo, en orden, con Medidas al final', () => {
	// Cambio de contrato INTENCIONAL (misión medidas-masivas-catalogo): se suma «Medidas» después de
	// Descripciones. Imágenes sigue siendo la primera, que es la que se abre por defecto.
	const valores = solapas.SUBSOLAPAS_DEL_CATALOGO.map(s => s.valor)
	assert.deepEqual(valores, ['imagenes', 'categorias', 'descripciones', 'medidas'])
	const medidas = solapas.SUBSOLAPAS_DEL_CATALOGO[3]
	assert.equal(medidas.nombre, 'Medidas')
	assert.equal(medidas.testid, 'medidas')
	assert.equal(solapas.SUBSOLAPA_POR_DEFECTO, 'imagenes')
})

test('Medidas la ven todos: el dueño, el acceso maestro y un empleado', () => {
	assert.deepEqual(solapas.subsolapas_permitidas(true, false), ['imagenes', 'categorias', 'descripciones', 'medidas'])
	assert.deepEqual(solapas.subsolapas_permitidas(false, true), ['imagenes', 'categorias', 'descripciones', 'medidas'])
	// Un empleado no ve Categorías (sigue igual), pero sí Medidas.
	assert.deepEqual(solapas.subsolapas_permitidas(false, false), ['imagenes', 'descripciones', 'medidas'])
})

test('es_subsolapa_del_catalogo reconoce medidas y no se deja engañar por propiedades de Object', () => {
	assert.equal(solapas.es_subsolapa_del_catalogo('medidas'), true)
	assert.equal(solapas.es_subsolapa_del_catalogo('constructor'), false)
	assert.equal(solapas.es_subsolapa_del_catalogo(undefined), false)
	assert.equal(solapas.es_subsolapa_del_catalogo(['medidas']), false)
})

test('ruta_normalizada deja catalogo/medidas como está cuando está permitida', () => {
	const permitidas = solapas.subsolapas_permitidas(false, false)
	assert.deepEqual(solapas.ruta_normalizada('catalogo', 'medidas', permitidas), { view: 'catalogo', sub_view: 'medidas' })
})

test('ruta_normalizada: una sub-solapa inventada o no permitida cae en la primera permitida (no en Medidas)', () => {
	const empleado = solapas.subsolapas_permitidas(false, false)
	assert.deepEqual(solapas.ruta_normalizada('catalogo', 'categorias', empleado), { view: 'catalogo', sub_view: 'imagenes' })
	assert.deepEqual(solapas.ruta_normalizada('catalogo', 'inventada', empleado), { view: 'catalogo', sub_view: 'imagenes' })
	assert.deepEqual(solapas.ruta_normalizada('catalogo', undefined, empleado), { view: 'catalogo', sub_view: 'imagenes' })
})

test('ruta_normalizada: Medidas fuera de la lista de permitidas se lleva a la primera', () => {
	// Si alguien pasara una lista sin 'medidas', no se dibuja.
	assert.deepEqual(solapas.ruta_normalizada('catalogo', 'medidas', ['imagenes']), { view: 'catalogo', sub_view: 'imagenes' })
})

test('el alias viejo /alertas/imagenes sigue llevando a catalogo/imagenes', () => {
	const todas = solapas.subsolapas_permitidas(true, false)
	assert.deepEqual(solapas.ruta_normalizada('imagenes', undefined, todas), { view: 'catalogo', sub_view: 'imagenes' })
	// Aunque arrastre un sub_view de otra solapa (push relativo de HorizontalNav).
	assert.deepEqual(solapas.ruta_normalizada('imagenes', 'medidas', todas), { view: 'catalogo', sub_view: 'imagenes' })
	assert.equal(solapas.es_ruta_de_imagenes(ruta('imagenes', undefined)), true)
})

test('las otras solapas de primer nivel no llevan sub_view, tampoco con medidas', () => {
	const todas = solapas.subsolapas_permitidas(true, false)
	assert.deepEqual(solapas.ruta_normalizada('cobros', 'medidas', todas), { view: 'cobros', sub_view: null })
	assert.deepEqual(solapas.ruta_normalizada('stock-minimo', undefined, todas), { view: 'stock-minimo', sub_view: null })
	assert.deepEqual(solapas.ruta_normalizada(undefined, undefined, todas), { view: undefined, sub_view: null })
})

test('ruta_normalizada tolera una lista de permitidas que no es un arreglo', () => {
	assert.deepEqual(solapas.ruta_normalizada('catalogo', 'medidas', null), { view: 'catalogo', sub_view: 'imagenes' })
	assert.deepEqual(solapas.ruta_normalizada('catalogo', 'medidas', []), { view: 'catalogo', sub_view: 'imagenes' })
})

test('es_ruta_de_medidas: la canónica sí; las otras sub-solapas, el alias viejo y las entradas absurdas no', () => {
	assert.equal(solapas.es_ruta_de_medidas(ruta('catalogo', 'medidas')), true)
	assert.equal(solapas.es_ruta_de_medidas(ruta('catalogo', 'imagenes')), false)
	assert.equal(solapas.es_ruta_de_medidas(ruta('catalogo', 'descripciones')), false)
	// /alertas/catalogo a secas se normaliza a Imágenes, no a Medidas.
	assert.equal(solapas.es_ruta_de_medidas(ruta('catalogo', undefined)), false)
	assert.equal(solapas.es_ruta_de_medidas(ruta('imagenes', undefined)), false)
	assert.equal(solapas.es_ruta_de_medidas(ruta('cobros', 'medidas')), false)
	assert.equal(solapas.es_ruta_de_medidas({ name: 'otra', params: { view: 'catalogo', sub_view: 'medidas' } }), false)
	assert.equal(solapas.es_ruta_de_medidas(null), false)
	assert.equal(solapas.es_ruta_de_medidas(undefined), false)
	assert.equal(solapas.es_ruta_de_medidas('catalogo'), false)
	assert.equal(solapas.es_ruta_de_medidas({ name: 'alertas' }), false)
})

test('las otras es_ruta_de_* no se contagian de Medidas', () => {
	assert.equal(solapas.es_ruta_de_imagenes(ruta('catalogo', 'medidas')), false)
	assert.equal(solapas.es_ruta_de_descripciones(ruta('catalogo', 'medidas')), false)
	assert.equal(solapas.es_ruta_de_descripciones(ruta('catalogo', 'descripciones')), true)
})

test('destino_de_medidas arma name y params exactos, con la query pedida', () => {
	assert.deepEqual(solapas.destino_de_medidas({ corrida: '7', solapa: 'a_revisar' }), {
		name: 'alertas',
		params: { view: 'catalogo', sub_view: 'medidas' },
		query: { corrida: '7', solapa: 'a_revisar' },
	})
	// Sin query o con una query que no es un objeto, queda vacía.
	assert.deepEqual(solapas.destino_de_medidas().query, {})
	assert.deepEqual(solapas.destino_de_medidas('x').query, {})
	// Y los destinos existentes no cambiaron.
	assert.deepEqual(solapas.destino_de_imagenes({ asignacion: '7' }).params, { view: 'catalogo', sub_view: 'imagenes' })
	assert.deepEqual(solapas.destino_de_descripciones().params, { view: 'catalogo', sub_view: 'descripciones' })
})

test('sin la extensión agentes_ia solo se ofrece Medidas (y con true o sin el parámetro, todo como antes)', () => {
	assert.deepEqual(solapas.subsolapas_permitidas(true, false, false), ['medidas'])
	assert.deepEqual(solapas.subsolapas_permitidas(false, true, false), ['medidas'])
	assert.deepEqual(solapas.subsolapas_permitidas(false, false, false), ['medidas'])
	assert.deepEqual(solapas.subsolapas_permitidas(true, false, true), ['imagenes', 'categorias', 'descripciones', 'medidas'])
	assert.deepEqual(solapas.subsolapas_permitidas(true, false, undefined), ['imagenes', 'categorias', 'descripciones', 'medidas'])
})

test('sin agentes_ia, cualquier ruta del Catálogo cae en Medidas, incluido el alias viejo /alertas/imagenes', () => {
	const solo_medidas = solapas.subsolapas_permitidas(true, false, false)
	assert.deepEqual(solapas.ruta_normalizada('catalogo', 'medidas', solo_medidas), { view: 'catalogo', sub_view: 'medidas' })
	assert.deepEqual(solapas.ruta_normalizada('catalogo', 'imagenes', solo_medidas), { view: 'catalogo', sub_view: 'medidas' })
	assert.deepEqual(solapas.ruta_normalizada('catalogo', undefined, solo_medidas), { view: 'catalogo', sub_view: 'medidas' })
	assert.deepEqual(solapas.ruta_normalizada('imagenes', undefined, solo_medidas), { view: 'catalogo', sub_view: 'medidas' })
	// Con Imágenes permitida el alias sigue yendo a Imágenes.
	assert.deepEqual(solapas.ruta_normalizada('imagenes', undefined, solapas.subsolapas_permitidas(true, false, true)), { view: 'catalogo', sub_view: 'imagenes' })
})
