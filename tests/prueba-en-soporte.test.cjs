// La prueba gratuita vive en Soporte (misión prueba-e2e-campana-imperio, 11/11/2026).
//
//  J. Con la prueba vigente (tiene vencimiento y no venció) y la pestaña Soporte, Agentes abre en Soporte: desde
//     la barra, al cambiar la sesión y entrando directo a /agentes. Prueba vencida, negocio que contrató
//     (`vence_at` null con `activa` true), cliente común y demo: como hasta hoy. La apertura explícita del
//     asistente (abrir_chat_ia) sigue yendo al asistente, y el selector sigue dejando cambiar de agente.
//  K. En la prueba, Soporte abre sola la conversación de la prueba en vez de la pantalla vacía, una vez por
//     apertura del panel y sin pisar nada que la persona ya tenga a la vista o a medio escribir.
//
// Ejecutar con: node --test tests/prueba-en-soporte.test.cjs
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

const prueba = cargar('components/asistente-ia/prueba_en_soporte.js')

const Anfitrion = cargar('components/asistente-ia/Anfitrion.vue', {
	'@/components/asistente-ia/Panel': {},
	'@/components/asistente-ia/FichaArticuloPopover': {},
	'@/components/asistente-ia/CuentaCorrienteDeMencion': {},
	'@/components/asistente-ia/GuiaDeVenta': {},
	'@/mixins/mostrador_acceso': {},
}).default

const Panel = cargar('components/asistente-ia/Panel.vue', {
	'@/components/asistente-ia/ConversationList': {},
	'@/components/asistente-ia/Conversation': {},
	'@/components/asistente-ia/Composer': {},
	'@/components/asistente-ia/Soporte': {},
	'@/components/asistente-ia/ReportesDiarios': {},
	'@/components/asistente-ia/traspaso': {},
	'@/components/asistente-ia/PantallaVacia': {},
	'@/components/asistente-ia/Icono': {},
	'@/components/vender/components/VenderResizer': {},
	'@/store/ai_chat': { url_de_tienda: () => null },
}).default

const Soporte = cargar('components/asistente-ia/Soporte.vue', {
	'@/common-vue/components/support-chat/Conversation': {},
	'@/common-vue/components/support-chat/MessageInput': {},
	'@/components/asistente-ia/Icono': {},
	'@/components/asistente-ia/traspaso': { confirmar_traspaso: () => Promise.resolve(true) },
}).default

// Las cinco cuentas que la misión distingue. `prueba` es lo que la API cuelga del usuario (user.prueba).
const VIGENTE = { id: 7, prueba: { activa: true, vence_at: '2026-11-18T10:00:00-03:00', vencida: false } }
const VENCIDA = { id: 7, prueba: { activa: true, vence_at: '2026-11-04T10:00:00-03:00', vencida: true } }
// 🔴 El negocio contrató: el vencimiento se va (null) y `activa` SIGUE en true hasta que importe sus datos.
const CONTRATO = { id: 7, prueba: { activa: true, vence_at: null, vencida: false } }
const CLIENTE = { id: 7, prueba: null }
const DEMO = { id: 7 }

/**
 * Un Anfitrion sin montar: sus métodos y sus computed propias sobre un `this` armado a mano, con un store
 * que registra los commits.
 *
 * @param {object} valores Lo que el componente lee de afuera (user, puede_soporte, puede_guia…).
 * @returns {object}
 */
function anfitrion(valores) {
	const commits = []
	const vm = Object.assign({}, Anfitrion.methods, {
		should_show: true,
		abierto: false,
		en_modulo: false,
		puede_soporte: true,
		puede_entrar_al_mostrador: true,
		puede_guia: false,
		user: CLIENTE,
		$store: {
			state: { ai_chat: { agente: 'asistente' } },
			commit: (mutacion, valor) => {
				commits.push([mutacion, valor])
				if (mutacion === 'ai_chat/setAgente') vm.$store.state.ai_chat.agente = valor
			},
			dispatch: () => Promise.resolve(),
		},
		suscribir_canal_del_chat() {},
	}, valores)
	Object.defineProperty(vm, 'abre_en_soporte', { get: () => Anfitrion.computed.abre_en_soporte.call(vm), enumerable: true })
	vm.commits = commits
	vm.agentes = () => commits.filter(par => par[0] === 'ai_chat/setAgente').map(par => par[1])
	return vm
}

/** La guía de Robotito no está en pantalla: abrir_desde_navegacion() le pregunta al DOM. */
function sin_guia_de_robotito(funcion) {
	const previo = global.document
	global.document = { querySelector: () => null }
	try {
		return funcion()
	} finally {
		if (previo === undefined) delete global.document
		else global.document = previo
	}
}

/**
 * Un Soporte sin montar, con una lista de conversaciones y un store que registra lo que se le pide.
 *
 * @param {object} valores
 * @returns {object}
 */
function soporte(valores) {
	const dispatches = []
	const estado = {
		auth: { user: VIGENTE },
		support_ticket: { models: [], loading: false },
		support_message: { active_ticket_id: null, models: [], messages_loading: false, sending: false },
	}
	const vm = Object.assign({}, Soporte.methods, Soporte.data(), {
		activo: true,
		$refs: {},
		$emit() {},
		$store: {
			state: estado,
			dispatch: (accion, valor) => {
				dispatches.push([accion, valor])
				if (accion === 'support_message/loadTicketMessages') estado.support_message.active_ticket_id = valor.id
				return Promise.resolve(true)
			},
		},
	})
	Object.keys(Soporte.computed).forEach(nombre => {
		Object.defineProperty(vm, nombre, { get: () => Soporte.computed[nombre].call(vm), enumerable: true, configurable: true })
	})
	Object.assign(estado.auth, valores && valores.auth)
	Object.assign(estado.support_ticket, valores && valores.support_ticket)
	Object.assign(estado.support_message, valores && valores.support_message)
	if (valores && valores.vm) Object.assign(vm, valores.vm)
	vm.dispatches = dispatches
	vm.abiertas = () => dispatches.filter(par => par[0] === 'support_message/loadTicketMessages').map(par => par[1])
	return vm
}

const DE_LA_PRUEBA = { id: 40, status: 'open', origen: 'whatsapp', name: 'Prueba gratuita', unread_messages_count: 0 }

// ---------------------------------------------------------------------------------------------------------
// J. Agentes abre en Soporte durante la prueba vigente
// ---------------------------------------------------------------------------------------------------------

test('J: prueba vigente es «tiene vencimiento y no venció», no `activa`', () => {
	assert.equal(prueba.prueba_vigente(VIGENTE), true)
	assert.equal(prueba.prueba_vigente(VENCIDA), false)
	assert.equal(prueba.prueba_vigente(CONTRATO), false, 'Contrató: `activa` sigue en true pero ya no hay vencimiento.')
	assert.equal(prueba.prueba_vigente(CLIENTE), false)
	assert.equal(prueba.prueba_vigente(DEMO), false)
	assert.equal(prueba.prueba_vigente(null), false)
	assert.equal(prueba.prueba_vigente(undefined), false)
})

test('J: abrir en Soporte exige además tener la pestaña Soporte', () => {
	assert.equal(prueba.abre_en_soporte(VIGENTE, true), true)
	assert.equal(prueba.abre_en_soporte(VIGENTE, false), false)
	assert.equal(prueba.abre_en_soporte(VIGENTE, undefined), false, 'Mientras las extensiones no cargaron, no.')
	assert.equal(prueba.abre_en_soporte(CONTRATO, true), false)
})

test('J: desde la barra, la prueba vigente abre en Soporte', () => {
	const vm = anfitrion({ user: VIGENTE })
	sin_guia_de_robotito(() => vm.abrir_desde_navegacion('lateral'))
	assert.deepEqual(vm.commits[0], ['ai_chat/setAgente', 'soporte'])
	assert.deepEqual(vm.commits[vm.commits.length - 1], ['ai_chat/setPanelAbierto', true])
})

test('J: prueba vencida, negocio que contrató y cliente común abren en el Asistente personal, como hoy', () => {
	;[VENCIDA, CONTRATO, CLIENTE, DEMO].forEach(user => {
		const vm = anfitrion({ user })
		sin_guia_de_robotito(() => vm.abrir_desde_navegacion('lateral'))
		assert.deepEqual(vm.commits[0], ['ai_chat/setAgente', 'asistente'], JSON.stringify(user))
	})
})

test('J: la demo sigue abriendo en «Tu guía», y sin asistente todo sigue cayendo en Soporte', () => {
	const demo = anfitrion({ user: DEMO, puede_guia: true, puede_soporte: false })
	sin_guia_de_robotito(() => demo.abrir_desde_navegacion('lateral'))
	assert.deepEqual(demo.commits[0], ['ai_chat/setAgente', 'guia'])

	const empleado = anfitrion({ user: CLIENTE, puede_entrar_al_mostrador: false })
	sin_guia_de_robotito(() => empleado.abrir_desde_navegacion('lateral'))
	assert.deepEqual(empleado.commits[0], ['ai_chat/setAgente', 'soporte'])
})

test('J: sin la pestaña Soporte, la prueba vigente no cambia nada', () => {
	const vm = anfitrion({ user: VIGENTE, puede_soporte: false })
	sin_guia_de_robotito(() => vm.abrir_desde_navegacion('lateral'))
	assert.deepEqual(vm.commits[0], ['ai_chat/setAgente', 'asistente'])
})

test('J: con el panel ya abierto, la barra no pisa el agente que la persona eligió', () => {
	const vm = anfitrion({ user: VIGENTE, abierto: true })
	sin_guia_de_robotito(() => vm.abrir_desde_navegacion('lateral'))
	assert.deepEqual(vm.agentes(), [])
})

test('J: al cambiar la sesión, el agente se reinicia en Soporte solo si la nueva está en prueba vigente', () => {
	const en_prueba = anfitrion({ user: VIGENTE })
	Anfitrion.watch.identidad_de_sesion.call(en_prueba, '8:false:false:false', '7:false:false:false')
	assert.deepEqual(en_prueba.agentes(), ['soporte'])

	;[VENCIDA, CONTRATO, CLIENTE].forEach(user => {
		const comun = anfitrion({ user })
		Anfitrion.watch.identidad_de_sesion.call(comun, '8:false:false:false', '7:false:false:false')
		assert.deepEqual(comun.agentes(), ['asistente'], JSON.stringify(user))
	})
})

test('J: el ingreso directo a /agentes (sin pasar por la barra) también arranca en Soporte', () => {
	// El watcher corre al montar (immediate) y cuando llegan el usuario y sus extensiones.
	assert.equal(Anfitrion.watch.abre_en_soporte.immediate, true)

	const vm = anfitrion({ user: VIGENTE })
	Anfitrion.watch.abre_en_soporte.handler.call(vm, vm.abre_en_soporte)
	assert.deepEqual(vm.agentes(), ['soporte'])

	;[VENCIDA, CONTRATO, CLIENTE, DEMO].forEach(user => {
		const comun = anfitrion({ user })
		Anfitrion.watch.abre_en_soporte.handler.call(comun, comun.abre_en_soporte)
		assert.deepEqual(comun.agentes(), [], JSON.stringify(user))
	})
})

test('J: ese arranque no saca a nadie de «Tu guía» ni vuelve a pisar Soporte', () => {
	;['guia', 'soporte'].forEach(agente => {
		const vm = anfitrion({ user: VIGENTE })
		vm.$store.state.ai_chat.agente = agente
		Anfitrion.watch.abre_en_soporte.handler.call(vm, true)
		assert.deepEqual(vm.agentes(), [], agente)
	})
})

test('J: la apertura explícita del asistente (una notificación) sigue yendo al asistente', () => {
	const rutas = cargar('mixins/route_functions.js').default
	const commits = []
	const vm = { user: VIGENTE, $store: { commit: (mutacion, valor) => commits.push([mutacion, valor]) } }
	rutas.methods.abrir_chat_ia.call(vm, 15)
	assert.deepEqual(commits, [
		['ai_chat/setAgente', 'asistente'],
		['ai_chat/setSelectedConversationId', 15],
		['ai_chat/setPanelAbierto', true],
	])
})

test('J: en la prueba el selector sigue dejando pasar al Asistente personal (agente_activo no cambió)', () => {
	const con_agente = agente => Panel.computed.agente_activo.call({
		puede_asistente: true, puede_soporte: true, puede_guia: false,
		$store: { state: { ai_chat: { agente } } },
	})
	assert.equal(con_agente('soporte'), 'soporte')
	assert.equal(con_agente('asistente'), 'asistente')

	const commits = []
	Panel.methods.cambiar_agente.call({ $store: { commit: (mutacion, valor) => commits.push([mutacion, valor]) } }, 'asistente')
	assert.deepEqual(commits, [['ai_chat/setAgente', 'asistente']])

	// El store sigue naciendo en 'asistente' y nadie guarda el agente en el navegador.
	const store = fuente('store/ai_chat.js')
	assert.match(store, /\n\t\tagente: 'asistente',\n/)
	assert.doesNotMatch(fuente('components/asistente-ia/Anfitrion.vue'), /localStorage/)
})

// ---------------------------------------------------------------------------------------------------------
// K. Soporte abre sola la conversación de la prueba
// ---------------------------------------------------------------------------------------------------------

test('K: con una sola conversación abierta, es esa (aunque sea de WhatsApp y esté leída)', () => {
	const cerrada = { id: 50, status: 'closed', origen: 'sistema', name: 'Vieja', unread_messages_count: 0 }
	assert.equal(prueba.conversacion_de_la_prueba([cerrada, DE_LA_PRUEBA]), DE_LA_PRUEBA)
	const del_sistema = { id: 41, status: 'open', origen: 'sistema', name: 'Bienvenida a tu prueba', unread_messages_count: 1 }
	assert.equal(prueba.conversacion_de_la_prueba([del_sistema]), del_sistema)
})

test('K: con varias abiertas gana la que tiene mensajes sin leer; si ninguna, la de la prueba', () => {
	const otra = { id: 60, status: 'open', origen: 'sistema', name: 'Consulta por stock', unread_messages_count: 0 }
	const con_novedad = { id: 61, status: 'open', origen: 'sistema', name: 'Otra consulta', unread_messages_count: 2 }
	// La lista llega ordenada por último mensaje: `otra` es la más reciente.
	assert.equal(prueba.conversacion_de_la_prueba([otra, DE_LA_PRUEBA, con_novedad]), con_novedad)
	assert.equal(prueba.conversacion_de_la_prueba([otra, DE_LA_PRUEBA]), DE_LA_PRUEBA)
	assert.equal(prueba.conversacion_de_la_prueba([otra, { id: 62, status: 'open', name: 'PRUEBA  GRATUITA: El Tornillo' }]).id, 62)
	// Sin ninguna reconocible, la de actividad más reciente.
	const sin_nombre = { id: 63, status: 'open', origen: 'sistema', name: null, unread_messages_count: 0 }
	assert.equal(prueba.conversacion_de_la_prueba([otra, sin_nombre]), otra)
})

test('K: sin conversaciones abiertas no hay nada que abrir', () => {
	assert.equal(prueba.conversacion_de_la_prueba([]), null)
	assert.equal(prueba.conversacion_de_la_prueba(undefined), null)
	assert.equal(prueba.conversacion_de_la_prueba([{ id: 1, status: 'closed', name: 'Prueba gratuita', unread_messages_count: 3 }]), null)
	assert.equal(prueba.conversacion_de_la_prueba([null, { status: 'open' }]), null, 'Una fila sin id no se puede abrir.')
})

test('K: al abrir Soporte en la prueba se abre sola esa conversación, una sola vez', () => {
	const vm = soporte({ support_ticket: { models: [DE_LA_PRUEBA] } })
	vm.abrir_conversacion_de_la_prueba()
	assert.deepEqual(vm.abiertas(), [{ id: 40, agentes: true }])
	assert.equal(vm.prueba_resuelta, true)

	// «Nueva conversación» después: la pantalla vacía ya no se vuelve a pisar.
	vm.$store.state.support_message.active_ticket_id = null
	vm.abrir_conversacion_de_la_prueba()
	assert.equal(vm.abiertas().length, 1)
})

test('K: la pestaña pide la lista como siempre y decide recién cuando terminó de llegar', () => {
	const vm = soporte({ support_ticket: { models: [DE_LA_PRUEBA], loading: true } })
	Soporte.watch.activo.handler.call(vm, true)
	assert.deepEqual(vm.dispatches, [['support_ticket/getAgentes', undefined]])
	Soporte.watch.activo.handler.call(vm, false)
	assert.equal(vm.dispatches.length, 1)

	// Mientras la lista está en viaje (o hay una descarga más nueva en camino) no se decide nada.
	Soporte.watch.loading.call(vm, true)
	Soporte.watch.tickets.call(vm)
	assert.deepEqual(vm.abiertas(), [])
	assert.equal(vm.prueba_resuelta, false)

	vm.$store.state.support_ticket.loading = false
	Soporte.watch.loading.call(vm, false)
	assert.deepEqual(vm.abiertas(), [{ id: 40, agentes: true }])
})

test('K: si la bienvenida llega después, se abre cuando aparece en la lista', () => {
	const vm = soporte({ support_ticket: { models: [] } })
	Soporte.watch.loading.call(vm, false)
	assert.deepEqual(vm.abiertas(), [])
	assert.equal(vm.prueba_resuelta, false, 'Sin ninguna abierta todavía no se dio por decidido.')

	vm.$store.state.support_ticket.models = [DE_LA_PRUEBA]
	Soporte.watch.tickets.call(vm)
	assert.deepEqual(vm.abiertas(), [{ id: 40, agentes: true }])
})

test('K: fuera de la prueba vigente Soporte arranca en la pantalla vacía, como hoy', () => {
	;[VENCIDA, CONTRATO, CLIENTE, DEMO].forEach(user => {
		const vm = soporte({ auth: { user }, support_ticket: { models: [DE_LA_PRUEBA] } })
		vm.abrir_conversacion_de_la_prueba()
		Soporte.watch.loading.call(vm, false)
		Soporte.watch.tickets.call(vm)
		assert.deepEqual(vm.abiertas(), [], JSON.stringify(user))
		assert.equal(vm.esperando_la_prueba, false)
	})
})

test('K: no pisa una conversación elegida, mensajes a la vista, un envío en curso ni algo a medio escribir', () => {
	const casos = [
		{ support_message: { active_ticket_id: 9 } },
		{ support_message: { models: [{ id: 1 }] } },
		{ support_message: { sending: true } },
		{ support_message: { messages_loading: true } },
		{ vm: { $refs: { compositor: { tiene_borrador_en_curso: true } } } },
	]
	casos.forEach(caso => {
		const vm = soporte(Object.assign({ support_ticket: { models: [DE_LA_PRUEBA] } }, caso))
		vm.abrir_conversacion_de_la_prueba()
		assert.deepEqual(vm.abiertas(), [], JSON.stringify(caso))
		assert.equal(vm.prueba_resuelta, true, 'La persona ya está en otra cosa: no se la mueve más tarde.')
	})

	// Con la pestaña Soporte a la sombra de otro agente no se abre nada, y queda para cuando vuelva.
	const oculta = soporte({ support_ticket: { models: [DE_LA_PRUEBA] }, vm: { activo: false } })
	oculta.abrir_conversacion_de_la_prueba()
	assert.deepEqual(oculta.abiertas(), [])
	assert.equal(oculta.prueba_resuelta, false)
})

test('K: con una guía de Robotito señalando Soporte no se le cambia la pantalla', () => {
	const previo = global.document
	global.document = { querySelector: selector => (selector === '.driver-popover.tour-soporte' ? {} : null) }
	try {
		const vm = soporte({ support_ticket: { models: [DE_LA_PRUEBA] } })
		vm.abrir_conversacion_de_la_prueba()
		assert.deepEqual(vm.abiertas(), [])
	} finally {
		if (previo === undefined) delete global.document
		else global.document = previo
	}
})

test('K: mientras llega la lista se avisa que se están cargando las conversaciones, solo en la prueba', () => {
	const cargando = soporte({ support_ticket: { loading: true } })
	assert.equal(cargando.esperando_la_prueba, true)
	cargando.prueba_resuelta = true
	assert.equal(cargando.esperando_la_prueba, false)
	assert.equal(soporte({ auth: { user: CLIENTE }, support_ticket: { loading: true } }).esperando_la_prueba, false)

	const sfc = compiler.parseComponent(fuente('components/asistente-ia/Soporte.vue'))
	assert.match(sfc.template.content, /<p v-if="esperando_la_prueba" role="status">Cargando tus conversaciones…<\/p>/)
	assert.match(sfc.template.content, /<h2>¿En qué te podemos ayudar\?<\/h2>/, 'La pantalla vacía de siempre sigue estando.')
})

test('K: abrir la conversación de WhatsApp no la traslada: escribirle sigue pidiendo la confirmación', () => {
	// Abrir es solo leer. El traspaso de canal sigue siendo una decisión de la persona al enviar.
	const metodo = Soporte.methods.abrir_conversacion_de_la_prueba.toString()
	assert.doesNotMatch(metodo, /traspas|sendMessage/)

	let confirmaciones = 0
	const SoporteConTraspaso = cargar('components/asistente-ia/Soporte.vue', {
		'@/common-vue/components/support-chat/Conversation': {},
		'@/common-vue/components/support-chat/MessageInput': {},
		'@/components/asistente-ia/Icono': {},
		'@/components/asistente-ia/traspaso': { confirmar_traspaso: () => { confirmaciones++; return Promise.resolve(true) } },
	}).default
	const vm = { activo: true, seleccionado: DE_LA_PRUEBA, seleccionado_id: 40 }
	return SoporteConTraspaso.methods.preparar_envio.call(vm).then(opciones => {
		assert.equal(confirmaciones, 1)
		assert.deepEqual(opciones, { agentes_version: 1, traspasar_a_sistema: 1 })
	})
})

test('K: en una sesión de soporte firmado o de acceso maestro no se abre nada sola (no se marca nada como leído)', () => {
	const de_soporte = Object.assign({}, VIGENTE, { es_sesion_soporte: true })
	const maestro = Object.assign({}, VIGENTE, { es_acceso_maestro: true })

	assert.equal(prueba.abre_sola_la_conversacion(VIGENTE), true)
	assert.equal(prueba.abre_sola_la_conversacion(de_soporte), false)
	assert.equal(prueba.abre_sola_la_conversacion(maestro), false)
	;[VENCIDA, CONTRATO, CLIENTE, DEMO, null, undefined].forEach(user => {
		assert.equal(prueba.abre_sola_la_conversacion(user), false, JSON.stringify(user))
	})
	// Agentes sigue abriendo en Soporte para esas sesiones: lo que no hacen es abrir (y leer) la conversación.
	assert.equal(prueba.abre_en_soporte(de_soporte, true), true)

	;[de_soporte, maestro].forEach(user => {
		const vm = soporte({ auth: { user }, support_ticket: { models: [Object.assign({}, DE_LA_PRUEBA, { unread_messages_count: 2 })] } })
		vm.abrir_conversacion_de_la_prueba()
		Soporte.watch.loading.call(vm, false)
		Soporte.watch.tickets.call(vm)
		assert.deepEqual(vm.abiertas(), [], JSON.stringify(user))
		assert.equal(vm.seleccionado_id, null, 'Queda la lista, con la pantalla vacía de siempre.')

		const cargando = soporte({ auth: { user }, support_ticket: { loading: true } })
		assert.equal(cargando.esperando_la_prueba, false)
	})
})

test('K: el aviso de traspaso de Soporte dice qué pasa con las respuestas; el del Asistente personal no cambió', () => {
	const traspaso = cargar('components/asistente-ia/traspaso.js')
	const pedidos = []
	const componente = { $bvModal: { msgBoxConfirm: (cuerpo, opciones) => { pedidos.push([cuerpo, opciones]); return Promise.resolve(true) } } }

	traspaso.confirmar_traspaso(componente, 'soporte')
	traspaso.confirmar_traspaso(componente)

	assert.deepEqual(pedidos[0], [
		'Vas a seguir hablando con Soporte desde tu sistema. Las respuestas te van a llegar acá, no por WhatsApp. Lo que ya hablaron queda guardado.',
		{ id: 'agentes-confirmar-traspaso', title: '¿Seguimos por acá?', okTitle: 'Sí, enviar', cancelTitle: 'Cancelar', centered: true },
	])
	assert.deepEqual(pedidos[1], [
		'Al enviar, esta conversación seguirá únicamente en el sistema, incluso si cerrás sesión. Tu historial queda acá.',
		{ id: 'agentes-confirmar-traspaso', title: '¿Seguir esta conversación en el sistema?', okTitle: 'Continuar y enviar', cancelTitle: 'Cancelar', centered: true },
	])

	// Soporte pide el suyo; el panel del Asistente personal sigue pidiendo el de siempre.
	assert.match(fuente('components/asistente-ia/Soporte.vue'), /confirmar_traspaso\(this, 'soporte'\)/)
	assert.match(fuente('components/asistente-ia/Panel.vue'), /confirmar_traspaso\(this\)/)
})

// ---------------------------------------------------------------------------------------------------------

test('sin async/await y con SASS solo a tabulaciones en lo que tocó la misión', () => {
	;['components/asistente-ia/Anfitrion.vue', 'components/asistente-ia/Soporte.vue'].forEach(ruta => {
		const sfc = compiler.parseComponent(fuente(ruta))
		assert.doesNotMatch(sfc.script.content, /\basync\b|\bawait\b/, ruta)
		const sass = sfc.styles.filter(estilo => estilo.lang === 'sass')
		const con_espacios = sass.reduce((lineas, estilo) => lineas.concat(estilo.content.split('\n').filter(linea => /^\t* +\S/.test(linea))), [])
		assert.deepEqual(con_espacios, [], ruta)
	})
	assert.doesNotMatch(fuente('components/asistente-ia/prueba_en_soporte.js'), /\basync\b|\bawait\b/)
})
