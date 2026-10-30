// Valoración de las respuestas del agente en la ventana del sistema (misión agente-mejoras-uso-real,
// 29/10/2026, contrato C1): el armado del comentario (src/components/asistente-ia/valoracion.js, que
// tiene que dar lo MISMO que ia-spa/src/lib/valoracion.js) y la acción `valorarMensaje` del store
// ai_chat (optimista, con vuelta atrás si el PUT falla). Sin red: `axios` es un falso.
//
// Ejecutar con: node --test tests/valoracion-asistente.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const valoracion = cargar('components/asistente-ia/valoracion.js')

/**
 * Carga el store ai_chat con un axios falso que contesta lo que diga `responder`.
 *
 * @param {Function} responder (url, cuerpo, config) -> Promise
 * @returns {{store: object, pedidos: Array}}
 */
function store_con(responder) {
	const pedidos = []
	const axios = {
		defaults: {},
		put: (url, cuerpo, config) => {
			pedidos.push({ url: url, cuerpo: cuerpo, config: config })
			return responder(url, cuerpo, config)
		},
	}
	const modulo = cargar('store/ai_chat.js', {
		'axios': { __esModule: true, default: axios },
		'moment': { __esModule: true, default: () => ({}) },
		'@/runtime_config': { env: () => 'http://api.test' },
	})
	return { store: modulo.default, pedidos: pedidos }
}

/**
 * Un contexto de Vuex de mentira con la conversación en pantalla: commit aplica la mutación real.
 *
 * @param {object} store
 * @param {Array} mensajes
 */
function contexto(store, mensajes) {
	const estado = JSON.parse(JSON.stringify(store.state))
	estado.messages = mensajes
	const ctx = {
		state: estado,
		commit: (nombre, valor) => store.mutations[nombre](estado, valor),
		dispatch: () => Promise.resolve(),
	}
	return ctx
}

function respuesta_del_agente(extra) {
	return Object.assign({ id: 41, rol: 'assistant', estado: 'listo', contenido: 'Hay 2 clavos.', ai_conversation_id: 7 }, extra || {})
}

test('el comentario lleva las opciones en el orden de la lista, « · » entre ellas y « — » antes del texto', () => {
	assert.equal(valoracion.armar_comentario(['Quedó a medias', 'No hizo lo que pedí'], '  faltaron 7 clavos '), 'No hizo lo que pedí · Quedó a medias — faltaron 7 clavos')
	assert.equal(valoracion.armar_comentario(['Dato incorrecto'], 'había dos, no uno'), 'Dato incorrecto — había dos, no uno')
	assert.equal(valoracion.armar_comentario(['Otra cosa'], ''), 'Otra cosa')
	assert.equal(valoracion.armar_comentario([], 'solo texto'), 'solo texto')
	assert.equal(valoracion.armar_comentario([], '   '), '')
})

test('el comentario no pasa de 1000 caracteres y el textarea deja el lugar justo', () => {
	const largo = 'x'.repeat(1200)
	assert.equal(valoracion.armar_comentario(['Dato incorrecto'], largo).length, 1000)
	// 'Dato incorrecto' (15) + ' — ' (3) = 18
	assert.equal(valoracion.lugar_para_el_texto(['Dato incorrecto']), 982)
	assert.equal(valoracion.lugar_para_el_texto([]), 1000)
})

test('una valoración desconocida o ausente (API viejo) es «sin valorar»', () => {
	assert.equal(valoracion.valoracion_de({}), null)
	assert.equal(valoracion.valoracion_de({ valoracion: 'otra' }), null)
	assert.equal(valoracion.valoracion_de({ valoracion: 'no_me_gusta' }), 'no_me_gusta')
})

test('valorarMensaje manda el PUT del contrato C1 y deja en pantalla lo que devuelve el API', () => {
	const { store, pedidos } = store_con(() => Promise.resolve({
		data: { model: { id: 41, valoracion: 'no_me_gusta', valoracion_comentario: 'Dato incorrecto — había dos', valorado_at: '2026-10-29T22:00:00-03:00' } },
	}))
	const ctx = contexto(store, [respuesta_del_agente()])
	const promesa = store.actions.valorarMensaje(ctx, { message_id: 41, valoracion: 'no_me_gusta', comentario: ' Dato incorrecto — había dos ' })
	// Optimista: ya está en pantalla antes de que vuelva el PUT.
	assert.equal(ctx.state.messages[0].valoracion, 'no_me_gusta')
	assert.equal(ctx.state.messages[0].valoracion_comentario, 'Dato incorrecto — había dos')
	return promesa.then(() => {
		assert.equal(pedidos.length, 1)
		assert.equal(pedidos[0].url, '/api/ai-mensajes/41/valoracion')
		assert.deepEqual(pedidos[0].cuerpo, { valoracion: 'no_me_gusta', comentario: 'Dato incorrecto — había dos' })
		assert.equal(pedidos[0].config.skip_global_error_event, true)
		assert.equal(pedidos[0].config.skip_navigation_cancel, true)
		assert.equal(ctx.state.messages[0].valorado_at, '2026-10-29T22:00:00-03:00')
		// El resto del mensaje no se toca.
		assert.equal(ctx.state.messages[0].contenido, 'Hay 2 clavos.')
	})
})

test('con me gusta o sin valoración no viaja comentario y el de antes se borra en pantalla', () => {
	const { store, pedidos } = store_con((url, cuerpo) => Promise.resolve({ data: { model: { id: 41, valoracion: cuerpo.valoracion, valoracion_comentario: null, valorado_at: null } } }))
	const ctx = contexto(store, [respuesta_del_agente({ valoracion: 'no_me_gusta', valoracion_comentario: 'Quedó a medias' })])
	return store.actions.valorarMensaje(ctx, { message_id: 41, valoracion: 'me_gusta', comentario: 'no tiene que viajar' })
		.then(() => {
			assert.deepEqual(pedidos[0].cuerpo, { valoracion: 'me_gusta' })
			assert.equal(ctx.state.messages[0].valoracion, 'me_gusta')
			assert.equal(ctx.state.messages[0].valoracion_comentario, null)
			return store.actions.valorarMensaje(ctx, { message_id: 41, valoracion: null })
		})
		.then(() => {
			assert.deepEqual(pedidos[1].cuerpo, { valoracion: null })
			assert.equal(ctx.state.messages[0].valoracion, null)
		})
})

test('si el PUT falla, el mensaje vuelve a como estaba y la promesa rechaza', () => {
	const error = new Error('HTTP 422')
	error.response = { status: 422, data: { code: 'comentario_muy_largo' } }
	const { store } = store_con(() => Promise.reject(error))
	const ctx = contexto(store, [respuesta_del_agente({ valoracion: 'me_gusta' })])
	const log = console.log
	console.log = () => {}
	return store.actions.valorarMensaje(ctx, { message_id: 41, valoracion: 'no_me_gusta', comentario: 'algo' })
		.then(
			() => {
				console.log = log
				assert.fail('tenía que rechazar')
			},
			(rechazo) => {
				console.log = log
				assert.equal(rechazo, error)
				assert.equal(ctx.state.messages[0].valoracion, 'me_gusta')
				assert.equal(ctx.state.messages[0].valoracion_comentario, null)
			},
		)
})

test('un mensaje sin los campos (API viejo) vuelve atrás a null, no a undefined', () => {
	const { store } = store_con(() => Promise.reject(new Error('sin red')))
	const ctx = contexto(store, [respuesta_del_agente()])
	const log = console.log
	console.log = () => {}
	return store.actions.valorarMensaje(ctx, { message_id: 41, valoracion: 'me_gusta' })
		.catch(() => {
			console.log = log
			assert.equal(ctx.state.messages[0].valoracion, null)
			assert.equal(ctx.state.messages[0].valoracion_comentario, null)
		})
})
