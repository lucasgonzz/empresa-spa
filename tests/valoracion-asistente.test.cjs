// Valoración de las respuestas del agente en la ventana del sistema (misión agente-mejoras-uso-real,
// 29/10/2026, contrato C1): el armado del comentario (src/components/asistente-ia/valoracion.js, que
// tiene que dar lo MISMO que ia-spa/src/lib/valoracion.js, con el tope contado por puntos de código),
// la traducción de los códigos de error, la acción `valorarMensaje` del store ai_chat (optimista, en
// fila por mensaje y con vuelta atrás a lo último confirmado si el PUT falla) y el agrupado por fecha
// de la bandeja (ConversationList.vue) con el formato crudo del API. Sin red: `axios` es un falso.
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

// ─── Ronda de arreglos de la revisión independiente ──────────────────────────────────────────

/**
 * Una promesa que el test resuelve o rechaza cuando quiere (para simular un PUT en vuelo).
 */
function diferida() {
	let resolver = null
	let rechazar = null
	const promesa = new Promise((res, rej) => {
		resolver = res
		rechazar = rej
	})
	return { promesa: promesa, resolver: resolver, rechazar: rechazar }
}

/** Deja correr las microtareas pendientes (las cadenas de .then del store). */
function dejar_correr() {
	return new Promise(r => setImmediate(r))
}

/** La respuesta del API para un PUT de valoración. */
function guardado(valor, comentario) {
	return { data: { model: { id: 41, valoracion: valor, valoracion_comentario: comentario || null, valorado_at: valor ? '2026-10-29T22:00:00-03:00' : null } } }
}

test('dos toques seguidos salen en fila: el segundo PUT espera al primero y en pantalla queda el último', () => {
	const vuelos = []
	const { store, pedidos } = store_con(() => {
		const d = diferida()
		vuelos.push(d)
		return d.promesa
	})
	const ctx = contexto(store, [respuesta_del_agente()])
	const primero = store.actions.valorarMensaje(ctx, { message_id: 41, valoracion: 'me_gusta' })
	const segundo = store.actions.valorarMensaje(ctx, { message_id: 41, valoracion: 'no_me_gusta' })
	return dejar_correr()
		.then(() => {
			// Optimista al toque con lo último tocado, pero un solo PUT en vuelo.
			assert.equal(ctx.state.messages[0].valoracion, 'no_me_gusta')
			assert.equal(pedidos.length, 1)
			assert.deepEqual(pedidos[0].cuerpo, { valoracion: 'me_gusta' })
			vuelos[0].resolver(guardado('me_gusta'))
			return primero
		})
		.then(() => dejar_correr())
		.then(() => {
			// Terminó el primero: no pisa la pantalla (detrás viene otro) y recién ahora sale el segundo.
			assert.equal(ctx.state.messages[0].valoracion, 'no_me_gusta')
			assert.equal(pedidos.length, 2)
			assert.deepEqual(pedidos[1].cuerpo, { valoracion: 'no_me_gusta' })
			vuelos[1].resolver(guardado('no_me_gusta'))
			return segundo
		})
		.then(() => {
			assert.equal(ctx.state.messages[0].valoracion, 'no_me_gusta')
		})
})

test('si falla el último pedido, la pantalla vuelve a lo último CONFIRMADO, no a «sin valorar»', () => {
	const vuelos = []
	const { store } = store_con(() => {
		const d = diferida()
		vuelos.push(d)
		return d.promesa
	})
	const ctx = contexto(store, [respuesta_del_agente()])
	const log = console.log
	console.log = () => {}
	const primero = store.actions.valorarMensaje(ctx, { message_id: 41, valoracion: 'me_gusta' })
	const segundo = store.actions.valorarMensaje(ctx, { message_id: 41, valoracion: 'no_me_gusta', comentario: 'Dato incorrecto' })
	return dejar_correr()
		.then(() => {
			vuelos[0].resolver(guardado('me_gusta'))
			return primero
		})
		.then(() => dejar_correr())
		.then(() => {
			const error = new Error('HTTP 500')
			error.response = { status: 500, data: {} }
			vuelos[1].rechazar(error)
			return segundo.then(() => assert.fail('tenía que rechazar'), () => null)
		})
		.then(() => {
			console.log = log
			assert.equal(ctx.state.messages[0].valoracion, 'me_gusta')
			assert.equal(ctx.state.messages[0].valoracion_comentario, null)
		})
})

test('si falla un pedido con otro detrás, la pantalla no se toca hasta que termina el último', () => {
	const vuelos = []
	const { store, pedidos } = store_con(() => {
		const d = diferida()
		vuelos.push(d)
		return d.promesa
	})
	const ctx = contexto(store, [respuesta_del_agente()])
	const log = console.log
	console.log = () => {}
	const primero = store.actions.valorarMensaje(ctx, { message_id: 41, valoracion: 'no_me_gusta' })
	const segundo = store.actions.valorarMensaje(ctx, { message_id: 41, valoracion: 'no_me_gusta', comentario: 'Quedó a medias' })
	return dejar_correr()
		.then(() => {
			vuelos[0].rechazar(new Error('sin red'))
			return primero.then(() => assert.fail('tenía que rechazar'), () => null)
		})
		.then(() => dejar_correr())
		.then(() => {
			// El primero falló pero el comentario ya está en pantalla y su PUT sale igual.
			assert.equal(ctx.state.messages[0].valoracion_comentario, 'Quedó a medias')
			assert.equal(pedidos.length, 2)
			vuelos[1].resolver(guardado('no_me_gusta', 'Quedó a medias'))
			return segundo
		})
		.then(() => {
			console.log = log
			assert.equal(ctx.state.messages[0].valoracion, 'no_me_gusta')
			assert.equal(ctx.state.messages[0].valoracion_comentario, 'Quedó a medias')
		})
})

test('el recorte del comentario es por puntos de código: no parte un emoji y cuenta como el API', () => {
	assert.equal(valoracion.largo('👍👎'), 2)
	assert.equal(valoracion.recortar('ab👍cd', 3), 'ab👍')
	const con_emojis = '😀'.repeat(1200)
	const comentario = valoracion.armar_comentario([], con_emojis)
	assert.equal(valoracion.largo(comentario), 1000)
	// Ningún carácter partido: todo el comentario sigue siendo el mismo emoji repetido.
	assert.equal(comentario, '😀'.repeat(1000))
	// El lugar para el texto se cuenta igual: «No hizo lo que pedí» (19) + « — » (3).
	assert.equal(valoracion.lugar_para_el_texto(['No hizo lo que pedí']), 978)
})

test('los códigos de error del contrato C1 se traducen a un texto claro', () => {
	function con_code(status, code) {
		return { response: { status: status, data: { code: code } } }
	}
	assert.equal(valoracion.mensaje_de_error_de_valoracion(con_code(404, 'mensaje_inexistente'), 'x'), 'Esa respuesta ya no está disponible. Recargá la conversación.')
	assert.equal(valoracion.mensaje_de_error_de_valoracion(con_code(422, 'no_es_del_agente'), 'x'), 'Solo se pueden valorar las respuestas del asistente.')
	assert.equal(valoracion.mensaje_de_error_de_valoracion(con_code(422, 'valoracion_invalida'), 'x'), 'No pudimos guardar tu valoración. Probá de nuevo.')
	assert.equal(valoracion.mensaje_de_error_de_valoracion(con_code(422, 'comentario_invalido'), 'x'), 'No pudimos guardar tu comentario. Probá de nuevo.')
	assert.equal(valoracion.mensaje_de_error_de_valoracion(con_code(422, 'comentario_muy_largo'), 'x'), 'El comentario es demasiado largo: dejalo en 1000 caracteres.')
	assert.equal(valoracion.mensaje_de_error_de_valoracion(new Error('sin red'), 'x'), 'No pudimos conectarnos con el servidor. Revisá tu conexión y volvé a intentar.')
	assert.equal(valoracion.mensaje_de_error_de_valoracion({ response: { status: 422, data: {} } }, 'genérico'), 'genérico')
})

test('la bandeja agrupa por fecha con el «AAAA-MM-DD HH:MM:SS» crudo del API, el ISO y una fecha rota', () => {
	const lista = cargar('components/asistente-ia/ConversationList.vue').default
	const dos = n => String(n).padStart(2, '0')
	const ahora = new Date()
	const crudo = d => d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate()) + ' ' + dos(d.getHours()) + ':' + dos(d.getMinutes()) + ':00'
	const hace_dias = n => new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - n, 12, 0, 0)
	const grupos = lista.computed.grupos.call({
		conversations: [
			{ id: 1, last_message_at: crudo(ahora) },
			{ id: 2, last_message_at: crudo(hace_dias(1)) },
			{ id: 3, last_message_at: null, created_at: hace_dias(3).toISOString() },
			{ id: 4, last_message_at: 'no es una fecha' },
		],
	})
	const por_id = {}
	grupos.forEach(g => g.items.forEach(c => { por_id[c.id] = g.titulo }))
	assert.equal(por_id[1], 'Hoy')
	assert.equal(por_id[2], 'Ayer')
	assert.equal(por_id[3], '7 días anteriores')
	// Una fecha que no se entiende cae en el grupo más viejo (el del 1/1/1970 UTC, que según la
	// zona horaria de la máquina es diciembre de 1969 o enero de 1970), sin romper el agrupado.
	const ultimo = grupos[grupos.length - 1]
	assert.deepEqual(ultimo.items.map(c => c.id), [4])
	assert.match(ultimo.titulo, /de 19(69|70)$/)
})
