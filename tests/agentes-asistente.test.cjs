const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

test('el maestro accede al asistente sin autorización adicional y el soporte firmado sigue restringido', () => {
	const { mostrador_es_el_dueno } = cargar('mixins/mostrador_acceso.js').default.computed
	const puede_entrar = (user, is_owner = true) => mostrador_es_el_dueno.call({ user, is_owner })

	assert.equal(puede_entrar({ es_acceso_maestro: true }), true)
	assert.equal(puede_entrar({ es_acceso_maestro: true, asistente_personal_autorizado: 'true' }), true)
	assert.equal(puede_entrar({ es_acceso_maestro: true, asistente_personal_autorizado: true }), true)
	assert.equal(puede_entrar({ es_acceso_maestro: true, asistente_personal_autorizado: true }, false), true)
	assert.equal(puede_entrar({ es_sesion_soporte: true, es_acceso_maestro: true, asistente_personal_autorizado: true }), false)
	assert.equal(puede_entrar({}), true)
	assert.equal(puede_entrar({ admin_access: true }, false), true)
	assert.equal(puede_entrar({}, false), false)
})

function contexto_con(axios) {
	axios.defaults = {}
	const store = cargar('store/ai_chat.js', {
		axios: { __esModule: true, default: axios },
		moment: { __esModule: true, default: () => ({}) },
		'@/runtime_config': { env: () => 'http://api.test' },
	}).default
	const state = JSON.parse(JSON.stringify(store.state))
	const esperas = []
	const contexto = {
		state: state,
		commit(nombre, valor) { store.mutations[nombre](state, valor) },
		dispatch(nombre, valor) {
			if (nombre === 'esperarRespuesta') return esperas.push(valor)
			return store.actions[nombre](contexto, valor)
		},
	}
	return { contexto: contexto, esperas: esperas }
}

test('si el usuario cambia de conversación durante el envío, el 201 solo actualiza la bandeja del hilo original', async () => {
	let responder
	const { contexto: ctx, esperas } = contexto_con({
		post(url, datos) {
			assert.equal(url, '/api/ai-conversations/12/messages')
			assert.equal(datos.traspasar_a_sistema, 1)
			return new Promise(resolve => { responder = resolve })
		},
	})
	ctx.commit('setConversations', [{ id: 12, origen: 'whatsapp' }, { id: 20, origen: 'usuario' }])
	ctx.commit('setSelectedConversationId', 12)
	const envio = ctx.dispatch('sendMessage', { contenido: 'Sigo desde acá', agentes_version: 1, traspasar_a_sistema: 1 })
	await Promise.resolve()
	ctx.commit('setSelectedConversationId', 20)
	ctx.commit('setMessages', [{ id: 201, ai_conversation_id: 20 }])
	responder({ data: {
		user_message: { id: 110, ai_conversation_id: 12 },
		assistant_message: { id: 111, ai_conversation_id: 12 },
		sistema_exclusivo_at: '2026-11-08T21:00:00Z',
	} })
	await envio
	assert.deepEqual(ctx.state.messages, [{ id: 201, ai_conversation_id: 20 }])
	assert.equal(ctx.state.conversations.find(hilo => hilo.id === 12).sistema_exclusivo_at, '2026-11-08T21:00:00Z')
	assert.deepEqual(esperas, [])
})

test('una lectura tardía no apaga el indicador de carga del historial vigente', async () => {
	const respuestas = {}
	const { contexto: ctx } = contexto_con({
		get(url) { return new Promise(resolve => { respuestas[url] = resolve }) },
	})
	ctx.commit('setSelectedConversationId', 12)
	const primera = ctx.dispatch('getMessages', { conversation_id: 12 })
	ctx.commit('setSelectedConversationId', 20)
	const segunda = ctx.dispatch('getMessages', { conversation_id: 20 })
	respuestas['/api/ai-conversations/12/messages']({ data: { models: { data: [{ id: 110 }] } } })
	await primera
	assert.equal(ctx.state.loading_messages, true)
	assert.deepEqual(ctx.state.messages, [])
	respuestas['/api/ai-conversations/20/messages']({ data: { models: { data: [{ id: 201 }] } } })
	await segunda
	assert.deepEqual(ctx.state.messages, [{ id: 201 }])
	assert.equal(ctx.state.loading_messages, false)
})
