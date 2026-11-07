// Prueba de siete días: consumo aditivo y reproducción local, sin red ni acciones del negocio.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const Vue = require('vue')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')
Vue.config.silent = true
const { catalogo_de_prueba, adjuntos_de_prueba } = cargar('components/prueba/videos.js')
const Videos = cargar('components/prueba/VideosPrueba.vue').default
const Panel = cargar('components/demo/DemoChatPanel.vue', {
	'@/components/demo/DemoGuiaRobot': { default: {} },
	'@/tours/habilitados': { tour_habilitado: () => true },
	'@/tours/motor': { iniciar_tour: () => { throw new Error('No debe iniciar tours') }, cortar_tour: () => {} },
	'@/tours/guia-vender': { ajustar_guia_a_vender: () => [], pasos_de_guia: () => [] },
}).default
const URLS = {
	"04": "https://videos.comerciocity.store/landing-prueba/20261107/04-bienvenida-y-recorrido-v8-904bf6fb63ed71ec.mp4",
	"05": "https://videos.comerciocity.store/landing-prueba/20261107/05-importa-tu-catalogo-v4-5c3ff8667f590302.mp4",
	"06": "https://videos.comerciocity.store/landing-prueba/20261107/06-revisa-y-cambia-un-precio-v4-0f33edc6012184fc.mp4",
	"07": "https://videos.comerciocity.store/landing-prueba/20261107/07-carga-una-compra-con-una-foto-v4-b7ab810b35ab2a1d.mp4",
	"08": "https://videos.comerciocity.store/landing-prueba/20261107/08-hace-tu-primera-venta-v4-6bf28a33ad57bee8.mp4",
	"09": "https://videos.comerciocity.store/landing-prueba/20261107/09-proba-al-agente-con-tu-catalogo-v4-afa99edf54562d4f.mp4"
}
function video(codigo, extra) { return Object.assign({ clave: 'prueba:' + codigo, origen: 'prueba', titulo: 'Video ' + codigo, url: URLS[codigo] || URLS['04'] }, extra) }
function instanciar(opciones, props) { return new Vue(Object.assign({}, opciones, { propsData: props })) }
function nodos(nodo, condicion) {
	if (!nodo) return []
	return (condicion(nodo) ? [nodo] : []).concat(...(nodo.children || (nodo.componentOptions && nodo.componentOptions.children) || []).map(hijo => nodos(hijo, condicion)))
}
function panel(prueba) {
	const vm = instanciar(Object.assign({}, Panel, { watch: {} }), { prueba, colapsado: false })
	vm.$store = { state: { vender: {}, auth: { user: {} }, whatsapp_chat: {}, demo: { secciones: [], clips_vistos: [], clips_probados: [] } }, dispatch() { throw new Error('No debe despachar acciones') } }
	vm.$route = { name: 'vender', params: { view: 'remito' }, fullPath: '/vender/remito' }
	vm.hasExtencion = () => false
	vm.$axios = { post() { throw new Error('No debe escribir') }, get() { throw new Error('No debe consultar durante reproducción') } }
	return vm
}

test('catálogo vacío o API anterior no muestra recursos', () => {
	for (const valor of [null, undefined, {}, '', []]) assert.deepEqual(catalogo_de_prueba(valor), [])
	const vm = instanciar(Videos, { catalogo: [] })
	assert.equal(nodos(vm._render(), n => n.tag === 'button').length, 0)
})
test('sólo seis claves de prueba, ordenadas, únicas y sin acciones del snapshot', () => {
	const datos = ['09', '08', '07', '06', '05', '04'].map(c => video(c, { practica: true, clip_id: 77, completado: true, guia: { accion: 'iniciar' } }))
	datos.push(video('04'), video('03'), video('10'), video('04', { clave: 'demo:04', origen: 'demo' }), video('05', { origen: 'recurso' }), null)
	const salida = catalogo_de_prueba(datos)
	assert.deepEqual(salida.map(v => v.clave), ['04', '05', '06', '07', '08', '09'].map(c => 'prueba:' + c))
	salida.forEach(v => { assert.equal(v.practica, false); assert.equal(v.clip_id, undefined); assert.equal(v.guia, undefined); assert.equal(v.completado, undefined) })
})
test('URLs vacías, no multimedia, inseguras o privadas no habilitan recursos', () => {
	for (const url of ['', '  ', null, '/04.mp4', 'javascript:alert(1)', 'http://videos.comerciocity.store/04.mp4', 'https://u:p@videos.comerciocity.store/04.mp4', 'https://localhost/04.mp4', 'https://127.0.0.1/04.mp4', 'https://videos.comerciocity.store/04.html']) assert.deepEqual(catalogo_de_prueba([video('04', { url })]), [], String(url))
	assert.equal(catalogo_de_prueba([video('04', { url: ' ' + URLS['04'] + ' ' })]).length, 1)
})
test('adjuntos se resuelven por clave contra configuración vigente, nunca por URL del mensaje', () => {
	const actual = video('04')
	const mensaje = { videos: [video('04', { url: 'https://ajeno.com/roto.mp4' }), video('05'), video('09', { origen: 'demo' }), video('04')] }
	assert.deepEqual(adjuntos_de_prueba(mensaje, [actual]), catalogo_de_prueba([actual]))
	assert.deepEqual(adjuntos_de_prueba(mensaje, []), [])
	assert.deepEqual(adjuntos_de_prueba({ videos: {} }, [actual]), [])
})
test('snapshot compatible con API vieja, conserva texto y no ejecuta guía/hitos', () => {
	const vm = panel(true)
	vm.aplicar({ disponible: true, conversacion: { revision: 1 }, mensajes: [{ id: 1, contenido: 'Hola', videos: [video('04')], guia: { accion: 'iniciar' } }], catalogo: [video('04'), video('03')] })
	assert.equal(vm.mensajes[0].contenido, 'Hola')
	assert.equal(vm.videos_del_mensaje(vm.mensajes[0]).length, 1)
	assert.equal(vm.guia_activa, null)
	vm.aplicar({ disponible: true, conversacion: { revision: 2 }, mensajes: vm.mensajes })
	assert.deepEqual(vm.catalogo, [])
	assert.deepEqual(vm.videos_del_mensaje(vm.mensajes[0]), [])
})
test('snapshot no disponible retira catálogo y cierra reproducción', () => {
	const vm = panel(true)
	let cerrado = 0
	vm.$refs.videos_prueba = { cerrar() { cerrado++ } }
	vm.catalogo = [video('04')]
	vm.aplicar({ disponible: false })
	assert.equal(vm.disponible, false)
	assert.equal(vm.catalogo.length, 0)
	assert.equal(cerrado, 1)
})
test('prueba no llama ninguna mutación demo, tour, progreso ni acción incluso invocando métodos', () => {
	const vm = panel(true)
	const v = video('04')
	vm.abrir_selector(v); vm.seleccionar_video(v); vm.abrir_video({ id: 1 }, v)
	vm.registrar_segundos(v, { segundos_vistos: [1], terminado: true }); vm.enviar_progreso(v.clave); vm.omitir(v); vm.probar(v); vm.iniciar_guia([])
	assert.deepEqual(vm.pendientes_video, {})
	assert.equal(vm.video_abierto, null)
	assert.equal(vm.seleccion_pendiente, null)
})
test('demo conserva catálogo y adjuntos históricos sin aplicar allowlist de prueba', () => {
	const vm = panel(false)
	const v = { clave: 'demo:1', origen: 'demo', clip_id: 1, url: '', titulo: 'Demo' }
	vm.aplicar({ conversacion: { revision: 1 }, catalogo: [v], mensajes: [{ id: 1, videos: [v] }] })
	assert.deepEqual(vm.catalogo, [v])
	assert.deepEqual(vm.videos_del_mensaje(vm.mensajes[0]), [v])
	assert.equal(vm.ruta_chat, '/api/demo/chat')
})
test('selector local pausa antes de cambiar, no duplica el reproductor y no autoavanza', () => {
	const vm = instanciar(Videos, { catalogo: [video('04'), video('05')] })
	let pausas = 0, abiertos = 0, cerrados = 0
	vm.$refs.tarjeta = { pausar() { pausas++ } }
	vm.$refs.modal = { show() { abiertos++ }, hide() { cerrados++ } }
	vm.abrir(video('04'))
	vm.seleccionar(video('05')); vm.seleccionar(video('05'))
	assert.equal(vm.elegida, 'prueba:05')
	assert.equal(pausas, 3)
	assert.equal(abiertos, 1)
	assert.equal(vm.seleccionar(video('03')), false)
	const tarjetas = nodos(vm._render(), n => n.componentOptions && n.componentOptions.tag === 'tarjeta-clip')
	assert.equal(tarjetas.length, 1)
	assert.equal(tarjetas[0].componentOptions.propsData.rastrear_segundos, false)
	assert.equal(tarjetas[0].componentOptions.propsData.con_tour, false)
	assert.equal(tarjetas[0].componentOptions.listeners, undefined)
	vm.cerrar(); assert.equal(vm.elegida, null); assert.equal(cerrados, 1)
	vm.abrir(); assert.equal(vm.actual, null)
})
test('navegación y colapso detienen el video; retirar catálogo elimina el seleccionado', () => {
	const vm = panel(true)
	let cerrados = 0
	vm.$refs.videos_prueba = { cerrar() { cerrados++ } }
	vm.programar_ubicacion_launcher = () => {}
	Panel.watch['$route.fullPath'].call(vm)
	vm.colapsado = true
	Panel.watch.colapsado.call(vm)
	assert.equal(cerrados, 2)
	const reproductor = instanciar(Videos, { catalogo: [video('04')] })
	reproductor.elegida = 'prueba:04'
	reproductor.catalogo = []
	Videos.watch.videos.call(reproductor)
	assert.equal(reproductor.elegida, null)
})

const Catalogo = cargar('components/prueba/CatalogoVideosPrueba.vue').default
function catalogo_unificado(responder, cambios) {
	const pedidos = []
	const estado = Vue.observable({ auth: { authenticated: true, version_bloqueada: null, user: { id: 7, puede_usar_chat_prueba: true, puede_unificar_chat_prueba: true, prueba: { activa: true } } }, prueba: { vencida: false }, ai_chat: { selected_conversation_id: null } })
	if (cambios) cambios(estado)
	const vm = new Vue(Object.assign({}, Catalogo, { watch: {}, beforeCreate() {
		this.$store = { state: estado }
		this.$axios = { get: (ruta, config) => { pedidos.push({ ruta, config }); return responder() } }
	} }))
	return { vm, estado, pedidos }
}
test('selector unificado consulta sólo GET del snapshot y no inicia ni traslada chat', async () => {
	const { vm, pedidos } = catalogo_unificado(() => Promise.resolve({ status: 200, data: { disponible: true, catalogo: [video('04')] } }))
	const promesa = vm.cargar()
	assert.equal(vm.cargando, true)
	await promesa
	assert.equal(vm.cargando, false)
	assert.equal(vm.catalogo.length, 1)
	assert.equal(pedidos.length, 1)
	assert.equal(pedidos[0].ruta, '/api/prueba/chat')
})
test('sin sesión, permisos, capacidad/credenciales o con prueba vencida no consulta ni muestra videos', async () => {
	for (const cambiar of [s => { s.auth.authenticated = false }, s => { s.auth.version_bloqueada = {} }, s => { s.auth.user = null }, s => { s.auth.user.puede_usar_chat_prueba = false }, s => { s.auth.user.puede_unificar_chat_prueba = false }, s => { s.auth.user.prueba.activa = false }, s => { s.prueba.vencida = true }]) {
		const { vm, pedidos } = catalogo_unificado(() => { throw new Error('No debe consultar') }, cambiar)
		await vm.cargar()
		assert.equal(vm.identidad, null)
		assert.equal(pedidos.length, 0)
		assert.deepEqual(vm.catalogo, [])
	}
})
test('API vieja/vacía/204/denegada no habilita catálogo y fallo de red permite reintentar', async () => {
	for (const respuesta of [{ status: 204 }, { data: {} }, { data: { disponible: false, catalogo: [video('04')] } }, { data: { disponible: true } }]) {
		const { vm } = catalogo_unificado(() => Promise.resolve(respuesta))
		await vm.cargar(); assert.deepEqual(vm.catalogo, []); assert.equal(vm.error, false)
	}
	let falla = true
	const { vm } = catalogo_unificado(() => falla ? Promise.reject(new Error('Sin conexión')) : Promise.resolve({ data: { disponible: true, catalogo: [video('04')] } }))
	await vm.cargar(); assert.equal(vm.error, true); assert.equal(vm.cargando, false)
	falla = false
	await vm.cargar(); assert.equal(vm.error, false); assert.equal(vm.catalogo.length, 1)
	for (const status of [401, 403, 404, 405]) {
		const { vm: denegado } = catalogo_unificado(() => Promise.reject({ response: { status } }))
		await denegado.cargar(); assert.equal(denegado.error, false); assert.deepEqual(denegado.catalogo, [])
	}
})
test('respuesta tardía de otra sesión o una consulta anterior no restaura recursos', async () => {
	const pendientes = []
	const { vm, estado } = catalogo_unificado(() => new Promise(resolve => pendientes.push(resolve)))
	const anterior = vm.cargar()
	estado.auth.user.id = 8
	const actual = vm.cargar()
	pendientes[1]({ data: { disponible: true, catalogo: [video('05')] } })
	await actual
	pendientes[0]({ data: { disponible: true, catalogo: [video('04')] } })
	await anterior
	assert.deepEqual(vm.catalogo.map(v => v.clave), ['prueba:05'])
	const pendiente = vm.cargar()
	estado.prueba.vencida = true
	await vm.cargar()
	pendientes[2]({ data: { disponible: true, catalogo: [video('04')] } })
	await pendiente
	assert.deepEqual(vm.catalogo, [])
})
test('desmontar o cambiar de pantalla/conversación cierra sin acciones y descarta respuestas', async () => {
	let resolver, cierres = 0
	const { vm } = catalogo_unificado(() => new Promise(resolve => { resolver = resolve }))
	vm.$refs.videos = { cerrar() { cierres++ } }
	const pendiente = vm.cargar()
	Catalogo.watch['$route.fullPath'].call(vm)
	Catalogo.watch['$store.state.ai_chat.selected_conversation_id'].call(vm)
	Catalogo.beforeDestroy.call(vm)
	resolver({ data: { disponible: true, catalogo: [video('04')] } })
	await pendiente
	assert.equal(cierres, 4)
	assert.deepEqual(vm.catalogo, [])
})

test('valida URL exacta por pieza: rechaza host, versión, archivo, query, fragmento y credenciales ajenos', () => {
	const correcta = URLS['04']
	for (const url of [URLS['05'], correcta + '?v=1', correcta + '#video', correcta.replace('videos.comerciocity.store', 'ajeno.com'), correcta.replace('/20261107/', '/20261001/'), correcta.replace('v8-', 'v7-'), correcta.replace('https://', 'https://usuario:clave@')]) {
		assert.deepEqual(catalogo_de_prueba([video('04', { url })]), [], url)
	}
})

test('legado cierra al perder acceso y una respuesta anterior no restaura el catálogo', () => {
	for (const status of [401, 403, 404, 405]) {
		const vm = panel(true)
		let cierres = 0
		vm.$refs.videos_prueba = { cerrar() { cierres++ } }
		vm.catalogo = [video('04')]
		const acceso = vm.revision_acceso_prueba
		vm.fallar({ response: { status } }, acceso)
		assert.equal(cierres, 1)
		assert.equal(vm.disponible, false)
		assert.deepEqual(vm.catalogo, [])
		assert.equal(vm.aplicar_respuesta({ status: 200, data: { disponible: true, catalogo: [video('04')] } }, acceso), false)
		assert.deepEqual(vm.catalogo, [])
	}
	for (const respuesta of [{ status: 204 }, { status: 200, data: { disponible: false } }]) {
		const vm = panel(true)
		const acceso = vm.revision_acceso_prueba
		vm.aplicar_respuesta(respuesta, acceso)
		assert.equal(vm.aplicar_respuesta({ data: { disponible: true, catalogo: [video('04')] } }, acceso), false)
		assert.deepEqual(vm.catalogo, [])
	}
})
