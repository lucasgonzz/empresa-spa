// La ayuda de la prueba gratuita pasa a Soporte (misión prueba-ayuda-unificada-en-soporte, 10/11/2026).
//
//  S1. La prueba ya no monta «Tu guía»: App.vue no tiene panel propio y DemoChatPanel quedó solo para la demo.
//  S2. El adjunto `{ tipo: 'soporte', texto }` del asistente es el botón «Seguir con Soporte»: abre Soporte, manda
//      la pregunta una sola vez por el envío del compositor, y pide confirmación solo si sigue en una de WhatsApp.
//      Un adjunto de tipo desconocido no rompe nada.
//  S3. La conversación de Soporte muestra como video los de la prueba, con la regex acotada a su prefijo.
//
// Ejecutar con: node --test tests/prueba-ayuda-en-soporte.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const compiler = require('vue-template-compiler')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const SRC = path.resolve(__dirname, '..', 'src')

function fuente(ruta) {
	return fs.readFileSync(path.join(SRC, ruta), 'utf8').replace(/\r\n/g, '\n')
}

// El almacenamiento del navegador, en memoria (el helper lo usa por window.localStorage).
const guardado = {}
global.window = global.window || {}
global.window.localStorage = {
	getItem: clave => (Object.prototype.hasOwnProperty.call(guardado, clave) ? guardado[clave] : null),
	setItem: (clave, valor) => { guardado[clave] = String(valor) },
}

const soporte = cargar('components/asistente-ia/seguir_con_soporte.js')

/**
 * Un store con los tickets dados que registra commits y dispatches.
 *
 * @param {Array<Object>} tickets
 * @param {Object} [opciones] { modelo: lo que devuelve sendMessage }
 */
function store_con(tickets, opciones) {
	const registro = { commits: [], dispatches: [] }
	const modelo = opciones && Object.prototype.hasOwnProperty.call(opciones, 'modelo') ? opciones.modelo : { id: 99, support_ticket_id: 7 }
	const cargo = opciones && Object.prototype.hasOwnProperty.call(opciones, 'cargo') ? opciones.cargo : true
	return {
		registro,
		state: { support_ticket: { models: tickets }, support_message: { sending: false } },
		commit: (mutacion, valor) => registro.commits.push([mutacion, valor]),
		dispatch: (accion, valor) => {
			registro.dispatches.push([accion, valor])
			if (accion === 'support_message/sendMessage') return Promise.resolve(modelo)
			if (accion === 'support_ticket/getAgentes') return Promise.resolve(cargo)
			return Promise.resolve()
		},
	}
}

/**
 * Una oferta como la guarda empresa-api, con un uuid propio por número.
 *
 * @param {Number} n
 * @param {String} [texto]
 */
function una_oferta(n, texto) {
	return { tipo: 'soporte', url: null, texto: texto || 'Hola', articulo_id: null, uuid: '3f2b8c1e-7d4a-4c6b-9e21-' + ('000000000000' + n).slice(-12) }
}

function envios(store) {
	return store.registro.dispatches.filter(par => par[0] === 'support_message/sendMessage').map(par => par[1])
}

test('S1: App.vue ya no monta un chat propio de la prueba y el archivo se borró', () => {
	const app = fuente('App.vue')
	assert.doesNotMatch(app, /panel-prueba|PanelPrueba|prueba_chat_usuario_id|prueba\/PanelAsistente/)
	assert.match(app, /<panel-demo v-if="\$store\.getters\['demo\/panel_visible'\]"/, 'La demo sigue montando su panel.')
	assert.equal(fs.existsSync(path.join(SRC, 'components/prueba/PanelAsistente.vue')), false)
})

test('S1: DemoChatPanel quedó solo para la demo, con su guía, sus videos y el selector', () => {
	const DemoChatPanel = cargar('components/demo/DemoChatPanel.vue', {
		'@/components/demo/TarjetaClip': {},
		'@/components/demo/SelectorVideosDemo': {},
		'@/components/demo/DemoGuiaRobot': {},
		'@/tours/habilitados': { tour_habilitado: () => false },
		'@/tours/motor': { iniciar_tour: () => {}, cortar_tour: () => {} },
		'@/tours/guia-vender': { ajustar_guia_a_vender: () => [], pasos_de_guia: () => [] },
	}).default
	assert.deepEqual(Object.keys(DemoChatPanel.props), ['colapsado'])
	assert.equal(DemoChatPanel.computed.ruta_chat.call({}), '/api/demo/chat')
	const sfc = compiler.parseComponent(fuente('components/demo/DemoChatPanel.vue'))
	assert.doesNotMatch(sfc.template.content, /\bprueba\b/)
	assert.match(sfc.template.content, /v-for="video in \(mensaje\.videos \|\| \[\]\)"/, 'Los videos de la demo siguen.')
	assert.match(sfc.template.content, /<demo-guia-robot ref="guia"/, 'La guía de Vender sigue.')
	assert.match(sfc.template.content, /<selector-videos-demo ref="selector"/, 'El selector de videos sigue.')
	assert.doesNotMatch(sfc.script.content, /this\.prueba|self\.prueba|_refrescar_prueba_en/)
	assert.doesNotMatch(fuente('components/asistente-ia/Panel.vue'), /Tu asistente de la prueba|guia\.prueba/)
})

test('S2: el uuid del envío es el del adjunto, nunca uno derivado del id del mensaje', () => {
	assert.equal(soporte.uuid_de_la_oferta(una_oferta(1)), '3f2b8c1e-7d4a-4c6b-9e21-000000000001')
	assert.equal(soporte.uuid_de_la_oferta({ uuid: ' 3F2B8C1E-7D4A-4C6B-9E21-000000000001 ' }), '3f2b8c1e-7d4a-4c6b-9e21-000000000001')
	;[null, {}, { uuid: '' }, { uuid: 'no-es-un-uuid' }, { uuid: 501 }].forEach(valor => assert.equal(soporte.uuid_de_la_oferta(valor), null, JSON.stringify(valor)))
	assert.doesNotMatch(fuente('components/asistente-ia/seguir_con_soporte.js'), /5e9a1d00|toString\(16\)/, 'No queda el uuid derivado del id.')
})

test('S2: sin uuid (una API anterior) no hay envío', () => {
	const store = store_con([])
	const sin_uuid = { tipo: 'soporte', texto: 'Hola' }
	return soporte.seguir_con_soporte({ $store: store }, sin_uuid).then(resultado => {
		assert.equal(resultado, 'error')
		assert.equal(store.registro.dispatches.length, 0)
		assert.equal(store.registro.commits.length, 0)
	})
})

test('S2: va a la conversación abierta del sistema, nunca a la de WhatsApp, y ninguna si no hay', () => {
	const sistema = { id: 3, status: 'open', origen: 'sistema' }
	const whatsapp = { id: 9, status: 'open', origen: 'whatsapp' }
	assert.equal(soporte.ticket_para_seguir([whatsapp, sistema, { id: 12, status: 'closed', origen: 'sistema' }]), sistema)
	assert.equal(soporte.ticket_para_seguir([whatsapp, { id: 4, status: 'open', origen: 'whatsapp', sistema_exclusivo_at: '2026-11-10' }]), null)
	assert.equal(soporte.ticket_para_seguir([{ id: 1, status: 'closed' }]), null)
	assert.equal(soporte.ticket_para_seguir(undefined), null)
	assert.equal(soporte.necesita_traspaso, undefined, 'El botón no tiene rama de traspaso.')
	assert.doesNotMatch(fuente('components/asistente-ia/seguir_con_soporte.js'), /confirmar_traspaso\(|traspasar_a_sistema:/)
})

test('S2: abre Soporte y manda la pregunta por el envío del compositor, con el uuid del mensaje', () => {
	const store = store_con([{ id: 3, status: 'open', origen: 'sistema' }])
	const componente = { $store: store }
	const la_oferta = una_oferta(501, '  ¿Cómo cargo una compra?  ')
	return soporte.seguir_con_soporte(componente, la_oferta).then(resultado => {
		assert.equal(resultado, 'enviado')
		assert.deepEqual(store.registro.commits[0], ['ai_chat/setAgente', 'soporte'])
		assert.deepEqual(envios(store), [{ body: '¿Cómo cargo una compra?', kind: 'text', agentes_version: 1, mensaje_uuid: la_oferta.uuid, ticket_id: 3 }])
		assert.equal(soporte.ya_enviado(la_oferta.uuid), true)
		return soporte.seguir_con_soporte(componente, la_oferta)
	}).then(segunda => {
		assert.equal(segunda, 'enviado')
		assert.equal(envios(store).length, 1, 'El segundo clic no manda nada.')
	})
})

test('S2: el mismo mensaje en dos dispositivos (sin la marca local) manda el mismo uuid, porque viene del adjunto', () => {
	const primero = store_con([])
	const segundo = store_con([{ id: 7, status: 'open', origen: 'sistema' }])
	return soporte.seguir_con_soporte({ $store: primero }, una_oferta(510)).then(() => {
		Object.keys(guardado).forEach(clave => { delete guardado[clave] })
		return soporte.seguir_con_soporte({ $store: segundo }, JSON.parse(JSON.stringify(una_oferta(510))))
	}).then(() => {
		assert.equal(envios(primero)[0].mensaje_uuid, envios(segundo)[0].mensaje_uuid)
		assert.equal(envios(primero)[0].mensaje_uuid, una_oferta(510).uuid)
	})
})

test('S2: dos clics seguidos mandan un solo mensaje y, sin conversación abierta, abre una nueva', () => {
	const store = store_con([])
	const componente = { $store: store }
	return Promise.all([
		soporte.seguir_con_soporte(componente, una_oferta(502)),
		soporte.seguir_con_soporte(componente, una_oferta(502)),
	]).then(resultados => {
		assert.deepEqual(resultados.slice().sort(), ['cancelado', 'enviado'])
		assert.equal(envios(store).length, 1)
		assert.equal(envios(store)[0].ticket_id, null)
		assert.deepEqual(store.registro.dispatches[store.registro.dispatches.length - 1], ['support_message/loadTicketMessages', { id: 7, agentes: true }])
	})
})

test('S2: con un ticket de WhatsApp abierto no hay traspaso: abre una conversación del sistema', () => {
	const store = store_con([{ id: 9, status: 'open', origen: 'whatsapp' }])
	return soporte.seguir_con_soporte({ $store: store }, una_oferta(503)).then(resultado => {
		assert.equal(resultado, 'enviado')
		assert.equal(envios(store).length, 1)
		assert.equal(envios(store)[0].ticket_id, null, 'No sigue en el ticket de WhatsApp.')
		assert.equal('traspasar_a_sistema' in envios(store)[0], false)
	})
})

test('S2: si la bandeja no cargó, no manda nada y se puede reintentar', () => {
	const store = store_con([], { cargo: false })
	return soporte.seguir_con_soporte({ $store: store }, una_oferta(505)).then(resultado => {
		assert.equal(resultado, 'error')
		assert.equal(envios(store).length, 0)
		assert.equal(store.registro.dispatches.some(par => par[0] === 'support_message/loadTicketMessages'), false, 'No abre una conversación a ciegas.')
		assert.equal(soporte.ya_enviado(una_oferta(505).uuid), false)
		store.dispatch = (accion, valor) => {
			store.registro.dispatches.push([accion, valor])
			if (accion === 'support_message/sendMessage') return Promise.resolve({ id: 1, support_ticket_id: 7 })
			return Promise.resolve(true)
		}
		return soporte.seguir_con_soporte({ $store: store }, una_oferta(505))
	}).then(resultado => {
		assert.equal(resultado, 'enviado')
		assert.equal(envios(store).length, 1)
	})
})

test('S2: getAgentes resuelve true si llegó la bandeja y false si falló', () => {
	const armar = respuesta => cargar('store/support_ticket.js', {
		'@/store/__base_store': { __esModule: true, default: opciones => opciones },
		'@/runtime_config': { env: () => 'http://api.test' },
		axios: { __esModule: true, default: { defaults: {}, get: () => respuesta } },
	}).default
	const ctx = () => ({ commit: () => {}, state: { descarga_de_models_token: 0 }, rootState: { auth: { user: {} } } })
	const bien = armar(Promise.resolve({ data: { models: [] } }))
	const mal = armar(Promise.reject(new Error('sin red')))
	const log = console.log
	console.log = () => {}
	return Promise.all([bien.actions.getAgentes(ctx()), mal.actions.getAgentes(ctx())]).then(valores => {
		console.log = log
		assert.deepEqual(valores, [true, false])
	})
})

test('S2: si el envío falla, no queda marcado como enviado', () => {
	const store = store_con([], { modelo: null })
	return soporte.seguir_con_soporte({ $store: store }, una_oferta(504)).then(resultado => {
		assert.equal(resultado, 'error')
		assert.equal(soporte.ya_enviado(una_oferta(504).uuid), false)
	})
})

test('S2: el mensaje del agente dibuja el botón solo con un adjunto soporte, y un tipo desconocido no rompe nada', () => {
	const Agente = cargar('components/asistente-ia/mensaje/agente/Index.vue', {
		'@/components/asistente-ia/AccionCard': {},
		'@/components/asistente-ia/AdjuntosDeMensaje': {},
		'@/components/asistente-ia/OfertaDeSoporte': {},
		'@/components/asistente-ia/Icono': {},
		'@/components/asistente-ia/mensaje/agente/ValoracionMensaje': {},
		'@/components/asistente-ia/formato': { segmentar_mensaje: () => [] },
		'@/components/asistente-ia/valoracion': { valoracion_de: () => null },
		'@/components/asistente-ia/identidad': { logo_del_negocio: () => '' },
		'@/components/asistente-ia/portapapeles': { copiar_al_portapapeles: () => Promise.resolve() },
		'@/components/asistente-ia/seguir_con_soporte': soporte,
	}).default
	const oferta = (adjuntos, extra) => {
		const vm = Object.assign({ hasExtencion: slug => slug === 'support_chat', message: { id: 8, adjuntos } }, extra)
		vm.adjuntos_visibles = Agente.computed.adjuntos_visibles.call(vm)
		return Agente.computed.oferta_de_soporte.call(vm)
	}
	const de_soporte = una_oferta(8, '¿Cómo cargo una compra?')
	assert.equal(oferta([{ tipo: 'imagen', url: 'https://fotos.test/a.jpg' }, de_soporte]), de_soporte)
	assert.equal(oferta([{ tipo: 'video_raro', texto: 'x' }, null, { tipo: 'soporte', texto: '  ' }]), null)
	assert.equal(oferta([de_soporte], { hasExtencion: () => false }), null, 'Sin Soporte no hay botón.')
	assert.equal(oferta([{ tipo: 'soporte', url: null, texto: 'Hola', articulo_id: null }]), null, 'Sin uuid (API anterior) no hay botón.')
	assert.equal(oferta([de_soporte], { message: { id: null, adjuntos: [de_soporte] } }), null)
	assert.equal(oferta(undefined), null)

	// Las fotos siguen filtrando por tipo: la oferta (sin url) y un tipo desconocido no se pintan como imagen.
	const Adjuntos = cargar('components/asistente-ia/AdjuntosDeMensaje.vue', {}).default
	const imagenes = Adjuntos.computed.imagenes.call({ adjuntos: [de_soporte, { tipo: 'desconocido', url: 'https://x.test/y.jpg' }], rotas: {}, alt_por_defecto: '' })
	assert.deepEqual(imagenes, [])
})

test('S2: el botón pasa a «Enviado a Soporte» y no se vuelve a tocar', () => {
	const Oferta = cargar('components/asistente-ia/OfertaDeSoporte.vue', {
		'@/components/asistente-ia/seguir_con_soporte': { ya_enviado: () => false, uuid_de_la_oferta: soporte.uuid_de_la_oferta, seguir_con_soporte: () => Promise.resolve('enviado') },
	}).default
	const la_oferta = { tipo: 'soporte', texto: 'Hola', uuid: '3f2b8c1e-7d4a-4c6b-9e21-000000000001' }
	const vm = Object.assign({}, Oferta.methods, Oferta.data.call({ oferta: la_oferta }), { oferta: la_oferta })
	assert.equal(Oferta.computed.etiqueta.call(vm), 'Seguir con Soporte')
	return vm.seguir().then(() => {
		assert.equal(vm.estado, 'enviado')
		assert.equal(Oferta.computed.etiqueta.call(vm), 'Enviado a Soporte')
		assert.equal(vm.seguir(), undefined, 'Ya enviado: el clic no hace nada.')
	})
})

test('S3: los videos de la prueba se embeben y la regex queda acotada a su prefijo', () => {
	const Conversacion = cargar('common-vue/components/support-chat/Conversation.vue', {
		'@/common-vue/components/support-chat/ImageLightbox.vue': {},
		'@/runtime_config': { env: () => '' },
	}).default
	const m = Conversacion.methods
	const video = 'https://videos.comerciocity.store/landing-prueba/05-importar-catalogo.mp4'
	assert.deepEqual(m.partes_del_mensaje('Mirá este video: ' + video + '. Cualquier duda, escribime.'), ['Mirá este video: ', video, '. Cualquier duda, escribime.'])
	assert.equal(m.es_video_de_la_prueba(video), true)
	assert.equal(m.es_video_de_la_prueba('https://videos.comerciocity.store/landing-prueba/v2/04.bienvenida.mp4'), true)

	// El centro de recursos sigue igual: es un enlace, no un video.
	const centro = 'https://recursos.comerciocity.com/?v=vender1.2'
	assert.deepEqual(m.partes_del_mensaje('Ver ' + centro), ['Ver ', centro, ''])
	assert.equal(m.es_video_de_la_prueba(centro), false)

	// Fuera del prefijo exacto, nada se embebe ni se separa.
	;[
		'https://videos.comerciocity.store/otra-carpeta/05.mp4',
		'http://videos.comerciocity.store/landing-prueba/05.mp4',
		'https://videos.comerciocity.store.malo.com/landing-prueba/05.mp4',
		'https://videos.comerciocity.store/landing-prueba/05.mp4?x=1',
		'https://videos.comerciocity.store/landing-prueba/../secreto.mp4',
		'https://videos.comerciocity.store/landing-prueba/05.webm',
	].forEach(url => {
		assert.equal(m.partes_del_mensaje('ver ' + url).length, 1, url)
		assert.equal(m.es_video_de_la_prueba(url), false, url)
	})

	const sfc = compiler.parseComponent(fuente('common-vue/components/support-chat/Conversation.vue'))
	assert.match(sfc.template.content, /<video v-if="i % 2 && es_video_de_la_prueba\(parte\)"[^>]* controls preload="metadata">/)
})

test('sin async/await y con SASS solo a tabulaciones en lo que tocó la misión', () => {
	;['components/asistente-ia/OfertaDeSoporte.vue', 'components/asistente-ia/mensaje/agente/Index.vue', 'components/demo/DemoChatPanel.vue', 'common-vue/components/support-chat/Conversation.vue'].forEach(ruta => {
		const sfc = compiler.parseComponent(fuente(ruta))
		assert.doesNotMatch(sfc.script.content, /\basync\b|\bawait\b/, ruta)
		const sass = sfc.styles.filter(estilo => estilo.lang === 'sass')
		const con_espacios = sass.reduce((lineas, estilo) => lineas.concat(estilo.content.split('\n').filter(linea => /^\t* +\S/.test(linea))), [])
		assert.deepEqual(con_espacios, [], ruta)
	})
	assert.doesNotMatch(fuente('components/asistente-ia/seguir_con_soporte.js'), /\basync\b|\bawait\b/)
})
