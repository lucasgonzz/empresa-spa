const { test } = require('node:test')
const assert = require('node:assert/strict')
const { webcrypto } = require('node:crypto')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

function soporte_con(axios) {
	axios.defaults = {}
	const store = cargar('store/support_message.js', {
		axios: { __esModule: true, default: axios },
		'@/runtime_config': { env: () => 'http://api.test' },
	}).default
	const state = JSON.parse(JSON.stringify(store.state))
	const contexto = {
		state: state,
		rootState: { auth: { user: { id: 12 } } },
		commit(nombre, valor) {
			if (!nombre.includes('/')) store.mutations[nombre](state, valor)
		},
		dispatch(nombre, valor) {
			if (nombre.includes('/')) return Promise.resolve()
			return store.actions[nombre](contexto, valor)
		},
	}
	return contexto
}

test('al perder la respuesta, reintenta una consulta nueva con el mismo UUID y sin redirigirla a otro hilo', async t => {
	const ventana_previa = global.window
	global.window = { crypto: webcrypto }
	t.after(() => { global.window = ventana_previa })
	t.mock.method(console, 'log', () => {})
	const envios = []
	const ctx = soporte_con({
		post(url, datos) {
			envios.push(Object.fromEntries(datos.entries()))
			if (envios.length === 1) return Promise.reject(new Error('Se cortó la respuesta'))
			return Promise.resolve({ data: { model: { id: 77, support_ticket_id: 41 } } })
		},
	})
	await ctx.dispatch('sendMessage', { agentes_version: 1, body: '¿Cómo funciona?' })
	const pendiente = ctx.state.models[0]
	ctx.commit('setActiveTicketId', 22)
	ctx.commit('setModels', [])
	await ctx.dispatch('retrySendMessage', pendiente)
	assert.match(envios[0].mensaje_uuid, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/)
	assert.equal(envios[0].nueva_conversacion, '1')
	assert.equal(envios[0].support_ticket_id, undefined)
	assert.deepEqual(envios[0], envios[1])
	assert.equal(ctx.state.active_ticket_id, 22)
	assert.deepEqual(ctx.state.models, [])
})

test('la apertura de otro hilo ignora una respuesta vieja y los mensajes en vivo de otros tickets', async () => {
	const aperturas = {}
	const ctx = soporte_con({
		get(url, opciones) {
			assert.equal(opciones.params.agentes, 1)
			return new Promise(resolve => { aperturas[url] = resolve })
		},
	})
	const primero = ctx.dispatch('loadTicketMessages', { id: 10, agentes: true })
	const segundo = ctx.dispatch('loadTicketMessages', { id: 11, agentes: true })
	const mensaje_actual = { id: 27, support_ticket_id: 11, sender_type: 'user' }
	aperturas['/api/support-ticket/11']({ data: { model: { messages: [mensaje_actual] } } })
	await segundo
	aperturas['/api/support-ticket/10']({ data: { model: { messages: [{ id: 18 }] } } })
	await primero
	ctx.commit('addModel', { id: 21, support_ticket_id: 10, sender_type: 'admin' })
	assert.deepEqual(ctx.state.models, [mensaje_actual])
})
