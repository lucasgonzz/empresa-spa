// Una sola entrada a los agentes (misión agentes-entrada-unica, 10/11/2026): no existe más el botón flotante,
// la conversación de los videos se dibuja como pestaña «Tu guía» del lateral sin dejar de estar montada toda
// la sesión, y la cabecera lleva «Tu tienda». Un cliente sin tienda ni guía queda con la cabecera de siempre.
//
// Ejecutar con: node --test tests/agentes-entrada-unica.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const compiler = require('vue-template-compiler')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const SRC = path.resolve(__dirname, '..', 'src')

const store = cargar('store/ai_chat.js', {
	axios: { defaults: {} },
	moment: () => ({}),
	'@/runtime_config': { env: () => '' },
})
const url_de_tienda = store.url_de_tienda

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
	'@/store/ai_chat': { url_de_tienda },
}).default

const Anfitrion = cargar('components/asistente-ia/Anfitrion.vue', {
	'@/components/asistente-ia/Panel': {},
	'@/components/asistente-ia/FichaArticuloPopover': {},
	'@/components/asistente-ia/CuentaCorrienteDeMencion': {},
	'@/components/asistente-ia/GuiaDeVenta': {},
	'@/mixins/mostrador_acceso': {},
}).default

const DemoChatPanel = cargar('components/demo/DemoChatPanel.vue', {
	'@/components/demo/TarjetaClip': {},
	'@/components/demo/SelectorVideosDemo': {},
	'@/components/demo/DemoGuiaRobot': {},
	'@/tours/habilitados': { tour_habilitado: () => false },
	'@/tours/motor': { iniciar_tour: () => {}, cortar_tour: () => {} },
	'@/tours/guia-vender': { ajustar_guia_a_vender: () => [], pasos_de_guia: () => [] },
}).default

/**
 * @param {string} ruta Relativa a src/.
 * @returns {string} El archivo con saltos de línea normalizados.
 */
function fuente(ruta) {
	return fs.readFileSync(path.join(SRC, ruta), 'utf8').replace(/\r\n/g, '\n')
}

/**
 * @param {string} dir
 * @returns {string[]} Todos los .vue y .js debajo de dir.
 */
function archivos_de(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).reduce((lista, entrada) => {
		const ruta = path.join(dir, entrada.name)
		if (entrada.isDirectory()) return lista.concat(archivos_de(ruta))
		return /\.(vue|js)$/.test(entrada.name) ? lista.concat(ruta) : lista
	}, [])
}

/**
 * Evalúa las computeds de un componente sobre un `this` armado a mano, sin montarlo.
 *
 * @param {object} componente
 * @param {object} valores Lo que el componente lee de afuera.
 * @returns {object}
 */
function instancia(componente, valores) {
	const vm = Object.assign({}, componente.methods, valores)
	Object.keys(componente.computed).forEach(nombre => {
		if (Object.prototype.hasOwnProperty.call(valores, nombre)) return
		Object.defineProperty(vm, nombre, { get: () => componente.computed[nombre].call(vm), enumerable: true })
	})
	return vm
}

/**
 * @param {object} extra
 * @returns {object} El lateral de un cliente real, sin tienda ni guía.
 */
function lateral(extra) {
	return instancia(Panel, Object.assign({
		modo: 'lateral',
		puede_asistente: true,
		puede_soporte: true,
		puede_guia: false,
		viewport_width: 1400,
		canales: { asistente: '5493411234567', soporte: '5493417654321' },
		owner: { online: '' },
		$store: { state: { ai_chat: { agente: 'asistente', guia: null } } },
	}, extra))
}

/**
 * @param {object} extra Estado del chat y props.
 * @returns {object} DemoChatPanel sin montar, con un store y un $root que registran lo que reciben.
 */
function chat_de_guia(extra) {
	const registro = { commits: [], emitidos: [], raiz_on: [], raiz_off: [], raiz_emit: [] }
	const vm = instancia(DemoChatPanel, Object.assign({
		colapsado: true,
		destruido: false,
		$route: { name: 'vender' },
		$refs: {},
		$store: {
			state: { ai_chat: { agente: 'asistente', panel_abierto: false } },
			commit: (mutacion, valor) => registro.commits.push([mutacion, valor]),
		},
		$root: {
			$on: (nombre, funcion) => registro.raiz_on.push([nombre, funcion]),
			$off: (nombre, funcion) => registro.raiz_off.push([nombre, funcion]),
			$emit: nombre => registro.raiz_emit.push(nombre),
		},
		$emit: (nombre, valor) => registro.emitidos.push([nombre, valor]),
	}, extra))
	vm.registro = registro
	return vm
}

/**
 * Un elemento de mentira con lo mínimo de la API del DOM que usa el movimiento del $el.
 *
 * @param {string} id
 * @returns {object}
 */
function nodo(id) {
	const elemento = {
		id: id,
		parentNode: null,
		appendChild(hijo) { hijo.parentNode = elemento },
		removeChild(hijo) { hijo.parentNode = null },
	}
	return elemento
}

test('no queda rastro del botón flotante en src/', () => {
	const prohibidos = ['demo-ai__launcher', 'reserva_launcher', 'demo-launcher-base', 'ubicacion_launcher', 'demo-ai--cerrado']
	archivos_de(SRC).forEach(archivo => {
		const texto = fs.readFileSync(archivo, 'utf8')
		prohibidos.forEach(palabra => {
			assert.equal(texto.indexOf(palabra), -1, palabra + ' sigue en ' + path.relative(SRC, archivo))
		})
	})
})

test('tienda: una dirección http(s) válida pasa tal cual', () => {
	assert.equal(url_de_tienda('https://mitienda.com.ar/'), 'https://mitienda.com.ar/')
	assert.equal(url_de_tienda('http://mitienda.com.ar/ofertas?x=1'), 'http://mitienda.com.ar/ofertas?x=1')
	assert.equal(url_de_tienda('  https://mitienda.com.ar  '), 'https://mitienda.com.ar/')
})

test('tienda: sin esquema, si parece un dominio se le antepone https', () => {
	assert.equal(url_de_tienda('mitienda.com.ar'), 'https://mitienda.com.ar/')
	assert.equal(url_de_tienda('mitienda.com.ar:8080/tienda'), 'https://mitienda.com.ar:8080/tienda')
	assert.equal(url_de_tienda('www.mi-tienda.com'), 'https://www.mi-tienda.com/')
	assert.equal(url_de_tienda(' mitienda.com.ar '), 'https://mitienda.com.ar/')
	assert.equal(url_de_tienda('mitienda.com.ar/'), 'https://mitienda.com.ar/')
})

test('tienda: sin esquema y sin dominio de verdad no da botón', () => {
	;['//evil.com', 'localhost', '192.168.0.1'].forEach(valor => {
		assert.equal(url_de_tienda(valor), null, valor)
	})
})

test('tienda: basura y esquemas peligrosos no dan botón', () => {
	;['basura', 'no es una url.com', 'javascript:alert(1)', 'javascript://sitio.com/%0aalert(1)', 'data:text/html,hola', 'ftp://mitienda.com', 'mailto:hola@mitienda.com', 'http:mitienda.com', '1.5', 'https://'].forEach(valor => {
		assert.equal(url_de_tienda(valor), null, valor)
	})
})

test('tienda: con credenciales no da botón, con o sin esquema', () => {
	assert.equal(url_de_tienda('https://usuario:clave@mitienda.com'), null)
	assert.equal(url_de_tienda('https://usuario@mitienda.com'), null)
	assert.equal(url_de_tienda('usuario:clave@mitienda.com'), null)
	assert.equal(url_de_tienda('usuario@mitienda.com'), null)
})

test('tienda: vacío o de otro tipo no da botón', () => {
	;['', '   ', null, undefined, 0, {}, []].forEach(valor => {
		assert.equal(url_de_tienda(valor), null, JSON.stringify(valor))
	})
})

test('el botón de la tienda sale del owner global, así también lo ve un empleado', () => {
	assert.equal(lateral({ owner: { online: 'mitienda.com.ar' } }).tienda_url, 'https://mitienda.com.ar/')
	assert.equal(lateral({ owner: null }).tienda_url, null)
})

test('cliente sin tienda ni guía: la cabecera queda como siempre', () => {
	;[1400, 900, 500].forEach(viewport_width => {
		const vm = lateral({ viewport_width })
		assert.equal(vm.cabecera_ampliada, false)
		assert.equal(vm.cabecera_en_dos_filas, false)
	})
	const estilos = fuente('components/asistente-ia/Panel.vue')
	assert.match(estilos, /\.agentes-cabecera\n\tdisplay: grid\n\tgrid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\)\n/)
})

test('con tienda o guía: dos filas solo donde no entra en una', () => {
	const con_tienda = extra => lateral(Object.assign({ owner: { online: 'mitienda.com' } }, extra))
	assert.equal(con_tienda({ viewport_width: 1400 }).cabecera_ampliada, true)
	assert.equal(con_tienda({ viewport_width: 1400 }).cabecera_en_dos_filas, false)
	assert.equal(con_tienda({ viewport_width: 999 }).cabecera_en_dos_filas, true)
	assert.equal(con_tienda({ viewport_width: 1000 }).cabecera_en_dos_filas, false)
	assert.equal(con_tienda({ viewport_width: 900, modo: 'modulo' }).cabecera_en_dos_filas, false)
	assert.equal(con_tienda({ viewport_width: 700, modo: 'modulo' }).cabecera_en_dos_filas, true)
	assert.equal(lateral({ puede_guia: true, viewport_width: 800 }).cabecera_en_dos_filas, true)
})

test('agente_activo respeta lo que la cuenta puede usar', () => {
	const con_agente = (agente, extra) => lateral(Object.assign({ $store: { state: { ai_chat: { agente, guia: {} } } } }, extra)).agente_activo
	assert.equal(con_agente('guia', { puede_guia: true }), 'guia')
	assert.equal(con_agente('guia', { puede_guia: false }), 'asistente')
	assert.equal(con_agente('soporte', { puede_guia: true }), 'soporte')
	assert.equal(con_agente('asistente', { puede_guia: true }), 'asistente')
	assert.equal(con_agente('asistente', { puede_asistente: false }), 'soporte')
})

test('en la guía: texto propio, sin teléfono y sin cargar la bandeja personal', () => {
	// Desde la misión prueba-ayuda-unificada-en-soporte (10/11/2026) «Tu guía» es solo de la demo.
	const con_guia = () => lateral({ puede_guia: true, $store: { state: { ai_chat: { agente: 'guia', guia: {} } } } })
	assert.equal(con_guia().texto_canal, 'Tu asistente de la demo: explorá, preguntá y probá.')
	assert.equal(con_guia().telefono, '')

	const vm = con_guia()
	let pedidos = 0
	vm.personal_visitado = false
	vm.cargar_bandeja = () => { pedidos++ }
	vm.preparar_agente('guia')
	assert.equal(vm.personal_visitado, false)
	assert.equal(pedidos, 0)
})

test('un cliente sigue viendo su texto y su teléfono', () => {
	const vm = lateral()
	assert.equal(vm.texto_canal, 'Esta conversación es privada entre vos y tu asistente personal.')
	assert.equal(vm.telefono, '5493411234567')
})

test('el lugar de la guía no tiene hijos de Vue y «Tu tienda» va antes de expandir', () => {
	const sfc = compiler.parseComponent(fuente('components/asistente-ia/Panel.vue'))
	const { ast } = compiler.compile(sfc.template.content, { whitespace: 'condense' })
	const buscar = (nodo_ast, condicion) => {
		if (condicion(nodo_ast)) return nodo_ast
		for (const hijo of nodo_ast.children || []) {
			const encontrado = hijo.type === 1 ? buscar(hijo, condicion) : null
			if (encontrado) return encontrado
		}
		return null
	}
	const lugar = buscar(ast, n => n.attrsMap.id === 'agentes-guia-lugar')
	assert.ok(lugar)
	assert.equal(lugar.children.length, 0)

	const acciones = buscar(ast, n => n.staticClass === '"agentes-cabecera__acciones"')
	assert.equal(acciones.children[0].tag, 'a')
	assert.equal(acciones.children[0].attrsMap.rel, 'noopener noreferrer')
	assert.equal(acciones.children[0].attrsMap.target, '_blank')
	assert.ok('data-demo-tienda' in acciones.children[0].attrsMap)
	assert.equal(acciones.children[0].attrsMap['v-if'], 'tienda_url')
})

test('la barra abre en la guía donde antes estaba el flotante', () => {
	const commits = []
	const vm = Object.assign({}, Anfitrion.methods, {
		should_show: true,
		abierto: false,
		puede_soporte: false,
		puede_entrar_al_mostrador: true,
		puede_guia: true,
		en_modulo: false,
		$store: { commit: (mutacion, valor) => commits.push([mutacion, valor]) },
	})
	vm.abrir_desde_navegacion('lateral')
	assert.deepEqual(commits[0], ['ai_chat/setAgente', 'guia'])

	commits.length = 0
	vm.puede_guia = false
	vm.abrir_desde_navegacion('lateral')
	assert.deepEqual(commits[0], ['ai_chat/setAgente', 'asistente'])
})

test('Anfitrion y Acceso suman la guía sin duplicar la regla', () => {
	assert.equal(Anfitrion.computed.puede_guia.call({ $store: { state: { ai_chat: { guia: {} } } } }), true)
	assert.equal(Anfitrion.computed.puede_guia.call({ $store: { state: { ai_chat: { guia: null } } } }), false)
	assert.match(fuente('components/asistente-ia/Acceso.vue'), /puede_entrar_al_mostrador \|\| puede_soporte \|\| puede_guia/)
})

test('guia_a_la_vista: pestaña elegida y lateral abierto, o módulo', () => {
	const estado = (agente, panel_abierto, ruta) => chat_de_guia({ $route: { name: ruta }, $store: { state: { ai_chat: { agente, panel_abierto } } } }).guia_a_la_vista
	assert.equal(estado('guia', true, 'vender'), true)
	assert.equal(estado('guia', false, 'vender'), false)
	assert.equal(estado('guia', false, 'agentes'), true)
	assert.equal(estado('asistente', true, 'vender'), false)
})

test('el lateral sincroniza a quien sigue teniendo el estado de colapsado', () => {
	const abre = chat_de_guia({ colapsado: true, pausar() {} })
	DemoChatPanel.watch.guia_a_la_vista.call(abre, true)
	assert.deepEqual(abre.registro.emitidos, [['alternar', undefined]])

	let pausas = 0
	const cierra = chat_de_guia({ colapsado: false })
	cierra.pausar = () => { pausas++ }
	DemoChatPanel.watch.guia_a_la_vista.call(cierra, false)
	assert.equal(pausas, 1)
	assert.deepEqual(cierra.registro.emitidos, [['alternar', undefined]])

	const ya_sincronizado = chat_de_guia({ colapsado: false })
	DemoChatPanel.watch.guia_a_la_vista.call(ya_sincronizado, true)
	assert.deepEqual(ya_sincronizado.registro.emitidos, [])
})

test('Probar cierra el lateral para dejar el sistema libre, pero no saca del módulo', () => {
	// El cierre lo dispara `plegada_a_la_vista`: plegada, con el lateral mostrándola y fuera del módulo.
	// `instancia()` ya expone los computed como getters vivos.
	const plegada = (vm) => vm.plegada_a_la_vista
	const en_sistema = chat_de_guia({ $store: { state: { ai_chat: { agente: 'guia', panel_abierto: true } }, commit() {} } })
	const commits = []
	en_sistema.$store.commit = (mutacion, valor) => commits.push([mutacion, valor])
	assert.equal(plegada(en_sistema), true)
	DemoChatPanel.watch.plegada_a_la_vista.call(en_sistema, true)
	assert.deepEqual(commits, [['ai_chat/setPanelAbierto', false]])

	const en_modulo = chat_de_guia({ $route: { name: 'agentes' }, $store: { state: { ai_chat: { agente: 'guia', panel_abierto: false } }, commit() {} } })
	assert.equal(plegada(en_modulo), false)

	// Probar adentro del módulo con el lateral prendido de antes: al salir de /agentes se cierra.
	const saliendo = chat_de_guia({ $route: { name: 'agentes' }, $store: { state: { ai_chat: { agente: 'guia', panel_abierto: true } }, commit() {} } })
	assert.equal(plegada(saliendo), false)
	saliendo.$route = { name: 'listado' }
	assert.equal(plegada(saliendo), true)
})

test('abrir la guía en el módulo no deja prendido el lateral para cuando se salga', () => {
	const vm = chat_de_guia({ $route: { name: 'agentes' } })
	vm.abrir_en_agentes()
	assert.deepEqual(vm.registro.commits, [['ai_chat/setAgente', 'guia']])

	const fuera = chat_de_guia()
	fuera.abrir_en_agentes()
	assert.deepEqual(fuera.registro.commits, [['ai_chat/setAgente', 'guia'], ['ai_chat/setPanelAbierto', true]])
})

test('el $el entra al lugar, vuelve a su origen, y no se mueve por un lateral ajeno', () => {
	const origen = nodo('origen')
	const lugar = nodo('agentes-guia-lugar')
	const el = nodo('chat')
	el.parentNode = origen
	global.document = { getElementById: id => (id === 'agentes-guia-lugar' ? lugar : null) }
	try {
		const vm = chat_de_guia({ $el: el, _origen: origen })
		vm.acomodar_en_agentes()
		assert.equal(el.parentNode, lugar)
		vm.soltar_lugar(nodo('otro-lateral'))
		assert.equal(el.parentNode, lugar)
		vm.soltar_lugar(lugar)
		assert.equal(el.parentNode, origen)
	} finally {
		delete global.document
	}
})

test('si la demo se queda sin chat, el $el vuelve antes de que PanelDemo inserte el respaldo', () => {
	const origen = nodo('origen')
	const lugar = nodo('agentes-guia-lugar')
	const el = nodo('chat')
	el.parentNode = lugar
	const vm = chat_de_guia({ $el: el, _origen: origen })
	vm.avisar_no_disponible()
	assert.equal(el.parentNode, origen)
	assert.deepEqual(vm.registro.emitidos, [['no-disponible', undefined]])
})

test('al destruirse deja todo limpio y no queda huérfano en el lateral', () => {
	const lugar = nodo('agentes-guia-lugar')
	const el = nodo('chat')
	el.parentNode = lugar
	const vm = chat_de_guia({
		$el: el,
		colapsado: false,
		cerrar_guia() {},
		pausar() {},
		$store: { state: { ai_chat: { agente: 'guia', panel_abierto: true } }, commit() {} },
	})
	const commits = []
	vm.$store.commit = (mutacion, valor) => commits.push([mutacion, valor])
	DemoChatPanel.beforeDestroy.call(vm)
	assert.equal(el.parentNode, null)
	assert.deepEqual(commits, [
		['ai_chat/setPanelAbierto', false],
		['ai_chat/setAgente', 'asistente'],
		['ai_chat/setGuia', null],
	])
	assert.deepEqual(vm.registro.raiz_off.map(par => par[0]).sort(), ['agentes:guia-lugar', 'agentes:guia-lugar-sale', 'agentes:guia-pausar'])
})

// El chat propio de la prueba (prueba/PanelAsistente.vue, con su div para el v-show de App.vue) se
// borró en la misión prueba-ayuda-unificada-en-soporte: lo cubre tests/prueba-ayuda-en-soporte.test.cjs.

test('todo $root.$on de la misión tiene su $off', () => {
	;['components/demo/DemoChatPanel.vue', 'components/asistente-ia/Anfitrion.vue'].forEach(ruta => {
		const texto = fuente(ruta)
		const nombres = patron => (texto.match(patron) || []).map(linea => linea.replace(/^.*?\('/, '')).sort()
		assert.deepEqual(nombres(/\$root\.\$on\('[^)]*\)/g), nombres(/\$root\.\$off\('[^)]*\)/g), ruta)
	})
})

test('sin async/await y con SASS solo a tabulaciones en lo que tocó la misión', () => {
	;['components/demo/DemoChatPanel.vue', 'components/asistente-ia/Panel.vue', 'components/asistente-ia/Acceso.vue', 'components/asistente-ia/Anfitrion.vue'].forEach(ruta => {
		const sfc = compiler.parseComponent(fuente(ruta))
		assert.doesNotMatch(sfc.script.content, /\basync\b|\bawait\b/, ruta)
		const con_espacios = sfc.styles.reduce((lineas, estilo) => lineas.concat(estilo.content.split('\n').filter(linea => /^\t* +\S/.test(linea))), [])
		assert.deepEqual(con_espacios, [], ruta)
	})
})
