// Misión embeddings-lote-cola (CA16 y CA17): la preparación de la búsqueda inteligente de artículos se ve en
// "Procesos en segundo plano" y, cuando hay proceso visible, el toast de "Asistente actualizado" no se duplica.
//
// Qué se mide (todo sin navegador ni servidor, con el mismo cargador que el resto de los tests .cjs):
//  1. tipos.js conoce el tipo `embeddings_articulos` (lupa violeta, etiqueta, detalle genérico) y las
//     etiquetas de resultado `preparados` y `pendientes` (`al_dia` y `con_error` ya existían).
//  2. broadcast.js tiene `debe_avisar_embeddings_generados(payload)`: false sin payload, sin `generados` o con
//     `con_proceso`; true sólo con `generados` y sin proceso.
//  3. El listener del canal `article_embeddings.{owner}` usa esa regla: con `con_proceso` no muestra el toast.
//
// Regla de la misión: sin async/await en el código de la SPA; el test usa funciones planas.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

/** Mixin de broadcast con su única dependencia (online) reemplazada, como hace agentes-soporte.test.cjs. */
function cargar_mixin() {
	return cargar('mixins/broadcast.js', { '@/mixins/online': { __esModule: true, default: {} } }).default
}

test('CA17: el tipo embeddings_articulos tiene lupa violeta, su etiqueta y el detalle genérico', () => {
	const tipos = cargar('components/common/procesos-en-segundo-plano/tipos.js')

	assert.ok(tipos.TIPOS.embeddings_articulos, 'TIPOS.embeddings_articulos tiene que existir (hoy cae en el engranaje gris)')
	assert.deepEqual(
		Object.assign({}, tipos.TIPOS.embeddings_articulos),
		{
			icono: 'bi-search',
			acento: '111, 66, 193',
			etiqueta: 'Búsqueda inteligente de artículos',
			detalle: 'Generico',
		}
	)
	// tipo_de() lo resuelve igual que a los demás: no es el engranaje por defecto.
	assert.notEqual(tipos.tipo_de('embeddings_articulos'), tipos.TIPO_POR_DEFECTO)
	assert.equal(tipos.componente_de_detalle('embeddings_articulos'), tipos.DETALLE_GENERICO)
})

test('CA17: el resultado del proceso se lee con "Preparados", "Al día", "Con error" y "Pendientes"', () => {
	const tipos = cargar('components/common/procesos-en-segundo-plano/tipos.js')

	assert.equal(tipos.ETIQUETAS_DE_RESULTADO.preparados, 'Preparados')
	assert.equal(tipos.ETIQUETAS_DE_RESULTADO.pendientes, 'Pendientes')
	// Las otras dos ya existían y no se pueden romper.
	assert.equal(tipos.ETIQUETAS_DE_RESULTADO.al_dia, 'Al día')
	assert.equal(tipos.ETIQUETAS_DE_RESULTADO.con_error, 'Con error')
	assert.deepEqual(Object.assign({}, tipos.etiqueta_de_resultado('preparados')), { tipo: 'texto', etiqueta: 'Preparados' })
	assert.deepEqual(Object.assign({}, tipos.etiqueta_de_resultado('pendientes')), { tipo: 'texto', etiqueta: 'Pendientes' })
})

test('CA16: debe_avisar_embeddings_generados sólo avisa con generados y sin proceso visible', () => {
	const mixin = cargar_mixin()
	const ctx = Object.assign(mixin.data(), mixin.methods)

	assert.equal(typeof ctx.debe_avisar_embeddings_generados, 'function', 'broadcast.js tiene que definir debe_avisar_embeddings_generados')

	assert.equal(ctx.debe_avisar_embeddings_generados({ generados: 5 }), true)
	assert.equal(ctx.debe_avisar_embeddings_generados({ generados: 5, con_proceso: false }), true)
	assert.equal(ctx.debe_avisar_embeddings_generados({ generados: 5, con_proceso: true }), false)
	assert.equal(ctx.debe_avisar_embeddings_generados({ generados: 0 }), false)
	assert.equal(ctx.debe_avisar_embeddings_generados({ generados: 0, con_proceso: false }), false)
	assert.equal(ctx.debe_avisar_embeddings_generados({}), false)
	assert.equal(ctx.debe_avisar_embeddings_generados(null), false)
	assert.equal(ctx.debe_avisar_embeddings_generados(undefined), false)
})

test('CA16: el listener del canal no muestra el toast cuando el aviso viene con proceso visible', () => {
	const mixin = cargar_mixin()
	const oyentes = {}
	const toasts = []
	const canal = {
		listen(evento, callback) {
			oyentes[evento] = callback
			return this
		},
	}
	const ctx = Object.assign(mixin.data(), mixin.methods, {
		owner_id: 7,
		numero_es: cantidad => String(cantidad),
		Echo: {
			channel() { return canal },
			leave() {},
		},
		$toast: { success(texto) { toasts.push(texto) } },
	})

	ctx.escuchar_embeddings_generados()
	assert.equal(typeof oyentes['.ArticleEmbeddingsBatchGenerated'], 'function', 'el canal tiene que escuchar .ArticleEmbeddingsBatchGenerated')
	const escuchar = oyentes['.ArticleEmbeddingsBatchGenerated']

	// Sin proceso visible el toast sigue saliendo, como hasta hoy.
	escuchar({ generados: 3, origen: 'scheduler', con_proceso: false })
	assert.deepEqual(toasts, ['Asistente actualizado: 3 artículos'])

	// Con proceso visible el aviso lo da la pantalla de procesos: ni un toast más.
	escuchar({ generados: 40, origen: 'importacion', con_proceso: true })
	// Payload viejo (sin `con_proceso`): se comporta como siempre.
	escuchar({ generados: 1, origen: 'manual' })
	// Nada generado o payload vacío: tampoco hay toast.
	escuchar({ generados: 0, origen: 'scheduler' })
	escuchar(null)

	assert.deepEqual(toasts, ['Asistente actualizado: 3 artículos', 'Asistente actualizado: 1 artículo'])
})
