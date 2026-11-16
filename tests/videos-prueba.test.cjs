// Prueba de siete días: consumo aditivo y reproducción local, sin red ni acciones del negocio.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const Vue = require('vue')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')
Vue.config.silent = true
const { catalogo_de_prueba, adjuntos_de_prueba } = cargar('components/prueba/videos.js')
const Videos = cargar('components/prueba/VideosPrueba.vue').default
const URLS = {
	"04": "https://videos.comerciocity.store/landing-prueba/20261111/04-bienvenida-y-recorrido-claude-v2-d77600fcb3c9f595.mp4",
	"05": "https://videos.comerciocity.store/landing-prueba/20261111/05-importa-tu-catalogo-claude-v1-7e315f5c9f377c3c.mp4",
	"06": "https://videos.comerciocity.store/landing-prueba/20261111/06-revisa-y-cambia-un-precio-claude-v1-53fdff8d1ebbabba.mp4",
	"07": "https://videos.comerciocity.store/landing-prueba/20261111/07-carga-una-compra-con-una-foto-claude-v1-35e86755dfa2c7e2.mp4",
	"08": "https://videos.comerciocity.store/landing-prueba/20261111/08-hace-tu-primera-venta-claude-v1-0348d9fe2f116f4a.mp4",
	"09": "https://videos.comerciocity.store/landing-prueba/20261111/09-proba-al-agente-con-tu-catalogo-claude-v1-81faa2a7b4e798a7.mp4"
}
function video(codigo, extra) { return Object.assign({ clave: 'prueba:' + codigo, origen: 'prueba', titulo: 'Video ' + codigo, url: URLS[codigo] || URLS['04'] }, extra) }
function instanciar(opciones, props) { return new Vue(Object.assign({}, opciones, { propsData: props })) }
function nodos(nodo, condicion) {
	if (!nodo) return []
	return (condicion(nodo) ? [nodo] : []).concat(...(nodo.children || (nodo.componentOptions && nodo.componentOptions.children) || []).map(hijo => nodos(hijo, condicion)))
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
test('sin sesión, permiso de prueba o con prueba vencida no consulta ni muestra videos', async () => {
	for (const cambiar of [s => { s.auth.authenticated = false }, s => { s.auth.version_bloqueada = {} }, s => { s.auth.user = null }, s => { s.auth.user.puede_usar_chat_prueba = false }, s => { s.auth.user.prueba.activa = false }, s => { s.prueba.vencida = true }]) {
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
	for (const url of [URLS['05'], correcta + '?v=1', correcta + '#video', correcta.replace('videos.comerciocity.store', 'ajeno.com'), correcta.replace('/20261111/', '/20261001/'), correcta.replace('claude-v2-', 'claude-v1-'), correcta.replace('https://', 'https://usuario:clave@')]) {
		assert.deepEqual(catalogo_de_prueba([video('04', { url })]), [], url)
	}
})

test('rechaza la tanda anterior aunque la clave siga vigente', () => {
	const anteriores = {
		'04': '04-bienvenida-y-recorrido-v8-904bf6fb63ed71ec.mp4',
		'05': '05-importa-tu-catalogo-v4-5c3ff8667f590302.mp4',
		'06': '06-revisa-y-cambia-un-precio-v4-0f33edc6012184fc.mp4',
		'07': '07-carga-una-compra-con-una-foto-v4-b7ab810b35ab2a1d.mp4',
		'08': '08-hace-tu-primera-venta-v4-6bf28a33ad57bee8.mp4',
		'09': '09-proba-al-agente-con-tu-catalogo-v4-afa99edf54562d4f.mp4',
	}
	for (const codigo of Object.keys(anteriores)) {
		const url = 'https://videos.comerciocity.store/landing-prueba/20261107/' + anteriores[codigo]
		assert.deepEqual(catalogo_de_prueba([video(codigo, { url })]), [], codigo)
		assert.equal(catalogo_de_prueba([video(codigo)]).length, 1, codigo)
	}
})

// develop retiró el panel legado de prueba: el acceso actual es Agentes.
// Estas regresiones verifican el catálogo real, sin reactivar props ni mutaciones de la demo.
test('retirar catálogo elimina el seleccionado y cierra el selector al quedar vacío', () => {
	const vm = instanciar(Videos, { catalogo: [video('04')] })
	let cierres = 0
	vm.$refs.modal = { hide() { cierres++ } }
	vm.elegida = 'prueba:04'
	vm.catalogo = []
	Videos.watch.videos.call(vm)
	assert.equal(vm.elegida, null)
	assert.equal(vm.actual, null)
	assert.equal(cierres, 1)
})

test('una denegación posterior retira los videos cargados y cierra reproducción', async () => {
	for (const status of [401, 403, 404, 405]) {
		let denegar = false, cierres = 0
		const { vm } = catalogo_unificado(() => denegar ? Promise.reject({ response: { status } }) : Promise.resolve({ data: { disponible: true, catalogo: [video('04')] } }))
		vm.$refs.videos = { cerrar() { cierres++ } }
		await vm.cargar()
		assert.equal(vm.catalogo.length, 1)
		denegar = true
		await vm.cargar()
		assert.deepEqual(vm.catalogo, [])
		assert.equal(vm.error, false)
		assert.equal(cierres, 2)
	}
})

test('perder permiso cierra reproducción y descarta una respuesta tardía', async () => {
	let resolver, cierres = 0
	const { vm, estado } = catalogo_unificado(() => new Promise(resolve => { resolver = resolve }))
	vm.$refs.videos = { cerrar() { cierres++ } }
	const pendiente = vm.cargar()
	estado.auth.user.puede_usar_chat_prueba = false
	await vm.cargar()
	resolver({ data: { disponible: true, catalogo: [video('04')] } })
	await pendiente
	assert.equal(vm.identidad, null)
	assert.deepEqual(vm.catalogo, [])
	assert.equal(cierres, 2)
})

test('Soporte permite consultar videos con permiso de prueba aunque el chat personal no esté disponible', async () => {
	for (const capacidad of [false, undefined]) {
		const { vm, pedidos } = catalogo_unificado(() => Promise.resolve({ data: { disponible: true, catalogo: [video('04')] } }), estado => { estado.auth.user.puede_unificar_chat_prueba = capacidad })
		await vm.cargar()
		assert.equal(vm.identidad, 7)
		assert.equal(vm.catalogo.length, 1)
		assert.equal(pedidos.length, 1)
		assert.equal(pedidos[0].ruta, '/api/prueba/chat')
	}
})

test('abrir el selector y cambiar de pieza detienen el audio o video que ya estaba sonando', () => {
	const anterior = global.document
	const medios = [{ pausas: 0, pause() { this.pausas++ } }, { pausas: 0, pause() { this.pausas++ } }]
	const consultas = []
	try {
		global.document = { querySelectorAll(selector) { consultas.push(selector); return medios } }
		const vm = instanciar(Videos, { catalogo: [video('04')] })
		vm.$refs.modal = { show() {} }
		vm.abrir()
		assert.deepEqual(medios.map(medio => medio.pausas), [1, 1])
		vm.seleccionar(video('04'))
		assert.deepEqual(medios.map(medio => medio.pausas), [2, 2])
		assert.deepEqual(consultas, ['video, audio', 'video, audio'])
	} finally {
		if (anterior === undefined) delete global.document
		else global.document = anterior
	}
})
