const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const axios = require('axios')
const babel = require('@babel/core')
const exportsModulo = {}
const codigo = babel.transformSync(fs.readFileSync(path.join(__dirname, '../src/utils/diagnostico_conexion.js'), 'utf8'), {
	babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code
vm.runInNewContext(codigo, { exports: exportsModulo, URL, Uint8Array, Map, Date, console, setTimeout, clearTimeout })
const { iniciar_diagnostico_conexion, endpoint_seguro } = exportsModulo
const tick = () => new Promise(ok => setImmediate(ok))
function manual() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
function escenario(op = {}) {
	let reloj = Date.now(), siguiente = 0, aleatorio = 0, observador, suscriptor
	const timers = new Map(), storage = new Map(), listeners = new Map(), envios = [], configuraciones = []
	const store = {
		state: { auth: { authenticated: true, user: { id: 500 }, online: true, sesion_sin_conexion: null } },
		watch(fn, cb) { observador = cb; cb(fn()); return () => {} },
		subscribe(cb) { suscriptor = cb; return () => {} },
	}
	const entorno = {
		navigator: { onLine: true }, crypto: { getRandomValues(bytes) { bytes.fill(++aleatorio); return bytes } },
		localStorage: { getItem: clave => storage.get(clave), setItem: (clave, valor) => storage.set(clave, valor) },
		addEventListener: (nombre, fn) => listeners.set(nombre, fn), removeEventListener: nombre => listeners.delete(nombre),
	}
	const transporte = axios.create({ adapter: config => {
		if (config.method === 'get') {
			configuraciones.push(config)
			if (op.config404) return Promise.reject(new axios.AxiosError('API vieja', null, config, null, { status: 404 }))
			if (op.falla_config) return Promise.reject(new axios.AxiosError('SECRETO', null, config, null, op.falla_config === 'servidor' ? { status: 503 } : undefined))
			return Promise.resolve({ status: 200, data: { habilitado: op.habilitado !== false, persona: store.state.auth.user.id }, config })
		}
		const envio = { eventos: JSON.parse(config.data).eventos, persona: config.headers['X-Diagnostico-Persona'] }
		envios.push(envio)
		if (op.falla_subida) return Promise.reject(new axios.AxiosError('SECRETO de transporte', null, config))
		if (op.subida) return op.subida.promise.then(() => ({ status: 202, data: { ok: true }, config }))
		if (op.respuesta_ilegible) return Promise.resolve({ status: 200, data: '<html>Proxy</html>', config })
		return Promise.resolve({ status: 202, data: { ok: true }, config })
	} })
	const productos = [0, 1, 2].map(() => axios.create({ baseURL: 'https://api.ejemplo.test', adapter: config => Promise.resolve({ status: 200, data: { secreto: 'contenido comercial' }, config }) }))
	// Mismo orden de main: el cancel token se agrega antes de instalar diagnóstico;
	// Axios ejecuta los request interceptors en orden inverso (LIFO).
	productos.forEach(p => p.interceptors.request.use(config => {
		if (!config.cancelToken && !config.skip_navigation_cancel) config.cancelToken = axios.CancelToken.source().token
		if (control) control.observar_cancelacion(config)
		return config
	}))
	let control
	// Este consumidor equivale al error interceptor de main: el instrumento debe respetarlo.
	let avisos = 0
	productos.forEach(p => p.interceptors.response.use(null, error => {
		if (!(error.config && error.config.skip_global_error_event) && !error.response && !axios.isCancel(error)) { avisos++; control.registrar_aviso(error) }
		return Promise.reject(error)
	}))
	control = iniciar_diagnostico_conexion({
		axios, instancias: productos, store, router: { currentRoute: { name: 'provider', params: { negocio: 'SECRETO' }, query: { clave: 'SECRETO' } } },
		api_url: 'https://api.ejemplo.test', entorno, transporte, ahora: () => reloj,
		temporizar(fn, ms) { const id = ++siguiente; timers.set(id, { fn, at: reloj + ms }); return id }, cancelar(id) { timers.delete(id) },
	})
	async function avanzar(ms) {
		const destino = reloj + ms
		for (;;) {
			const proximo = [...timers].filter(([, t]) => t.at <= destino).sort((a, b) => a[1].at - b[1].at)[0]
			if (!proximo) break
			reloj = proximo[1].at; timers.delete(proximo[0]); proximo[1].fn(); await tick()
		}
		reloj = destino; await tick()
	}
	async function fallar(indice = 0, url = '/api/provider-order/123?token=SECRETO', codigo = 'ERR_NETWORK', configExtra = {}) {
		let original
		await productos[indice].get(url, Object.assign({ adapter: config => {
			original = new axios.AxiosError('SECRETO nombre y URL', codigo, config)
			original.stack = 'SECRETO stack'
			return Promise.reject(original)
		} }, configExtra)).then(() => assert.fail('debía fallar'), error => assert.equal(error, original))
		await tick()
	}
	return { productos, transporte, control, store, entorno, storage, timers, envios, configuraciones, avanzar, fallar,
		avisos: () => avisos,
		cambiar_persona(id) { store.state.auth.user = { id }; observador(id) },
		mutacion(tipo, valor) {
			if (tipo === 'auth/set_online') store.state.auth.online = valor
			if (tipo === 'auth/set_sesion_sin_conexion') store.state.auth.sesion_sin_conexion = valor
			suscriptor({ type: tipo })
		},
		cola() { return [...storage.values()].flatMap(valor => JSON.parse(valor)) },
	}
}

test('endpoint redacta IDs, nombres, query, fragmentos y dominios incluso en rutas desconocidas', () => {
	assert.equal(endpoint_seguro('https://host/ api'), '/:valor')
	assert.equal(endpoint_seguro('https://api.ejemplo.test/api/provider-order/123?clave=SECRETO#Juan'), '/provider-order/:valor')
	assert.equal(endpoint_seguro('/api/article/456/clienteJuan/12'), '/article/:valor/:valor/:valor')
	assert.equal(endpoint_seguro('/api/sanctum/csrf-cookie'), '/sanctum/csrf-cookie')
})

test('apagado por defecto no captura ni agrega headers y conserva el error original', async () => {
	const e = escenario({ habilitado: false }); await tick()
	await e.fallar()
	assert.equal(e.storage.size, 0); assert.equal(e.envios.length, 0); assert.equal(e.avisos(), 1)
	const res = await e.productos[0].get('/api/user')
	assert.equal(res.config.headers['X-Diagnostico-Id'], undefined)
	e.control.destruir()
})

test('API anterior 404 apaga sin reintentos, eventos ni errores de producto extra', async () => {
	const e = escenario({ config404: true }); await tick()
	await e.fallar(); await e.avanzar(600000)
	assert.equal(e.configuraciones.length, 1); assert.equal(e.envios.length, 0)
	assert.equal(e.storage.size, 0); assert.equal(e.avisos(), 1)
	e.control.destruir()
})

test('las tres instancias axios capturan error y correlación sin secretos ni reemplazar el aviso', async () => {
	const e = escenario(); await tick()
	for (let i = 0; i < 3; i++) await e.fallar(i)
	await e.avanzar(21000)
	const eventos = e.envios.flatMap(x => x.eventos)
	assert.equal(eventos.length, 3)
	eventos.forEach(evento => {
		assert.equal(evento.endpoint, '/provider-order/:valor'); assert.equal(evento.tipo, 'sin_respuesta')
		assert.equal(evento.origen, 'toast_conexion'); assert.equal(evento.nav_online, true)
		assert.equal(evento.cancelable, true)
		assert.match(evento.request_id, /^[a-f0-9]{32}$/)
	})
	assert.equal(e.avisos(), 3)
	assert.doesNotMatch(JSON.stringify(e.envios), /SECRETO|123|contenido comercial|stack|headers|token|cookie/)
	assert.equal(e.envios[0].persona, '500')
	e.control.destruir()
})

test('timeout del sondeo se distingue del toast y de los estados offline del sistema', async () => {
	const e = escenario({ falla_subida: true }); await tick()
	await e.fallar(0, '/sanctum/csrf-cookie', 'ECONNABORTED', { timeout: 8000, skip_global_error_event: true, skip_navigation_cancel: true })
	e.mutacion('auth/set_online', false)
	e.mutacion('auth/set_sesion_sin_conexion', 'fecha que nunca debe guardarse')
	const cola = e.cola()
	assert.equal(cola[0].tipo, 'timeout'); assert.equal(cola[0].origen, 'ninguno')
	assert.equal(cola[0].skip_global, true); assert.equal(cola[0].skip_navegacion, true)
	assert.equal(cola[0].cancelable, false)
	assert.equal(cola[1].origen, 'transicion_offline'); assert.equal(cola[1].auth_online, false)
	assert.equal(cola[2].origen, 'aviso_sesion_offline'); assert.equal(cola[2].sesion_offline, true)
	assert.equal(cola[2].nav_online, true); assert.equal(e.avisos(), 0)
	assert.doesNotMatch(JSON.stringify(cola), /fecha que/)
	e.control.destruir()
})

test('pedido prolongado deja registro sin abortar ni repetir y luego registra recuperación', async () => {
	const e = escenario({ falla_subida: true }); await tick()
	const p = manual(); let escrituras = 0
	const operacion = e.productos[0].post('/api/provider-order', { proveedor: 'SECRETO' }, { adapter: config => { escrituras++; return p.promise.then(() => ({ status: 201, config, data: { id: 27 } })) } })
	await tick(); await e.avanzar(30000)
	assert.equal(escrituras, 1); assert.equal(e.cola()[0].tipo, 'pendiente')
	assert.equal(e.cola()[0].pendientes, 1); assert.equal(e.cola()[0].duracion_ms, 30000)
	p.resolve(); await operacion; await tick()
	assert.equal(escrituras, 1); assert.equal(e.cola().at(-1).tipo, 'recuperacion')
	assert.equal(e.cola().at(-1).status, 201)
	assert.equal(e.cola()[0].request_id, e.cola().at(-1).request_id)
	e.control.destruir()
})

test('cancelación y HTTP mantienen su tipo y no inventan aviso de red', async () => {
	const e = escenario({ falla_subida: true }); await tick()
	await e.productos[0].get('/api/article/50', { adapter: config => Promise.reject(new axios.CanceledError('SECRETO', config)) }).catch(() => {})
	await e.productos[0].get('/api/article/51', { adapter: config => Promise.reject(new axios.AxiosError('SECRETO', null, config, null, { status: 503 })) }).catch(() => {})
	await tick()
	assert.deepEqual(e.cola().map(x => x.tipo), ['cancelado', 'http'])
	assert.equal(e.cola()[1].status, 503); assert.equal(e.avisos(), 0)
	e.control.destruir()
})

test('subida tiene cinco intentos acotados sin recursión y conserva cola para recuperación posterior', async () => {
	const e = escenario({ falla_subida: true }); await tick(); await e.fallar()
	await e.avanzar(300000)
	assert.equal(e.envios.length, 5); assert.equal(e.cola().length, 1)
	assert.equal(e.timers.size, 0)
	e.control.destruir()
})

test('cola tiene tope de cien y TTL de un día, sin headers ni secretos del storage manipulado', async () => {
	const e = escenario({ falla_subida: true }); await tick()
	for (let i = 0; i < 110; i++) await e.fallar(0, '/api/article/' + i, 'ERR_NETWORK', { skip_global_error_event: true })
	assert.equal(e.cola().length, 100)
	const ultima_fecha_vieja = e.cola().at(-1).at_ms
	await e.avanzar(86400001)
	await e.productos[0].get('/api/user'); await tick()
	assert.ok(e.cola().every(evento => evento.at_ms > ultima_fecha_vieja + 86400000))
	assert.equal(e.cola()[0].tipo, 'recuperacion')
	e.control.destruir()
})

test('cambio de usuario aísla cola y respuestas en vuelo; terceros no reciben headers de diagnóstico', async () => {
	const e = escenario({ falla_subida: true }); await tick(); await e.fallar()
	const vieja = [...e.storage.keys()][0]
	const p = manual()
	const peticionVieja = e.productos[0].get('/api/user', { adapter: config => p.promise.then(() => ({ status: 200, config })) })
	await tick(); e.cambiar_persona(501); await tick()
	p.resolve(); await peticionVieja
	await e.fallar(1)
	assert.equal(JSON.parse(e.storage.get(vieja)).length, 1)
	assert.equal(e.storage.size, 2)
	assert.equal(e.envios.at(-1).persona, '501')
	const externa = await e.productos[0].get('https://tercero.test/pago/SECRETO')
	assert.equal(externa.config.headers['X-Diagnostico-Id'], undefined)
	e.control.destruir()
})

test('fallas de localStorage no afectan negocio y al recuperar comunicación sube error con éxitos cercanos', async () => {
	const e = escenario({ falla_subida: true }); await tick()
	await e.productos[0].get('/api/user'); await e.fallar()
	assert.equal(e.cola()[0].exitos_cercanos, 1)
	e.entorno.localStorage.setItem = () => { throw new Error('Sin espacio') }
	await e.fallar()
	assert.equal(e.avisos(), 2)
	e.control.destruir()
})

test('la allowlist SPA y servidor coincide para que el log no pierda familias estáticas', t => {
	const archivo = path.join(__dirname, '../../empresa-api/app/Http/Controllers/DiagnosticoConexionController.php')
	if (!fs.existsSync(archivo)) { t.skip('El contrato se verifica desde la raíz con ambos repos; el checkout SPA solo no contiene API.'); return }
	const php = fs.readFileSync(archivo, 'utf8')
	for (const campo of ['FAMILIAS', 'SUFIJOS', 'RUTAS']) assert.ok(php.includes("const " + campo + " = '" + exportsModulo[campo] + "';"))
})

test('al recuperar comunicación sube lo acumulado y vacía sólo los eventos confirmados', async () => {
	const opciones = { falla_subida: true }
	const e = escenario(opciones); await tick(); await e.fallar()
	assert.equal(e.cola().length, 1)
	opciones.falla_subida = false
	await e.productos[0].get('/api/user'); await e.avanzar(5000)
	assert.equal(e.cola().length, 0)
	assert.deepEqual(e.envios.at(-1).eventos.map(evento => evento.tipo), ['sin_respuesta', 'recuperacion'])
	e.control.destruir()
})

test('cap durante subida lenta no descarta eventos nuevos por posición del lote anterior', async () => {
	const subida = manual(), e = escenario({ subida }); await tick(); await e.fallar()
	for (let i = 0; i < 110; i++) await e.fallar(0, '/api/article/' + i, 'ERR_NETWORK', { skip_global_error_event: true })
	assert.equal(e.cola().length, 100)
	const ultimos = e.cola().map(evento => evento.request_id)
	subida.resolve(); await tick()
	assert.deepEqual(e.cola().map(evento => evento.request_id), ultimos)
	e.control.destruir()
})

test('storage alterado no puede agregar payloads ni URLs crudas a la subida posterior', async () => {
	const opciones = { falla_subida: true }, e = escenario(opciones); await tick(); await e.fallar()
	const clave = [...e.storage.keys()][0], evento = e.cola()[0]
	e.storage.set(clave, JSON.stringify([{ ...evento, payload: 'SECRETO', endpoint: '/api/provider-order/clienteJuan?token=SECRETO', ruta: 'SECRETO' }]))
	e.cambiar_persona(501); await tick(); e.cambiar_persona(500); await tick()
	assert.doesNotMatch(e.storage.get(clave), /SECRETO|clienteJuan|payload/)
	e.control.destruir()
})

test('cambio de persona entre planificar subida y ejecutar su microtarea no manda lote A como B', async () => {
	const e = escenario(); await tick()
	const guardar = e.entorno.localStorage.setItem
	let cambio = false
	e.entorno.localStorage.setItem = (clave, valor) => {
		guardar(clave, valor)
		if (!cambio && JSON.parse(valor).length) { cambio = true; queueMicrotask(() => e.cambiar_persona(501)) }
	}
	await e.fallar()
	assert.equal(e.envios.length, 0)
	assert.equal(e.cola().length, 1)
	assert.equal(e.store.state.auth.user.id, 501)
	e.control.destruir()
})

for (const causa of ['red', 'servidor']) test('config que falla por ' + causa + ' se consulta al recuperar, con cooldown y tope de tres', async () => {
	const opciones = { falla_config: causa }, e = escenario(opciones); await tick()
	for (let i = 0; i < 5; i++) await e.productos[0].get('/api/user')
	assert.equal(e.configuraciones.length, 1)
	await e.avanzar(30000); await e.productos[0].get('/api/user'); await tick()
	assert.equal(e.configuraciones.length, 2)
	await e.avanzar(30000); await e.productos[0].get('/api/user'); await tick()
	await e.avanzar(30000); await e.productos[0].get('/api/user'); await tick()
	assert.equal(e.configuraciones.length, 3)
	assert.equal(e.storage.size, 0)
	e.control.destruir()
})

test('config transitoria no pierde cola y luego permite capturar si el servidor confirma optin', async () => {
	const opciones = { falla_config: 'red' }, e = escenario(opciones); await tick()
	opciones.falla_config = false
	await e.avanzar(30000); await e.productos[0].get('/api/user'); await tick()
	await e.fallar()
	assert.equal(e.envios.length, 1); assert.equal(e.envios[0].eventos[0].tipo, 'sin_respuesta')
	e.control.destruir()
})

test('HTML 200 en la recepción no confirma lote: conserva cola y limita reintentos', async () => {
	const e = escenario({ respuesta_ilegible: true }); await tick(); await e.fallar()
	await e.avanzar(300000)
	assert.equal(e.envios.length, 5); assert.equal(e.cola().length, 1)
	assert.equal(e.timers.size, 0)
	e.control.destruir()
})

test('source.cancel real sin config registra cancelado y nunca inventa pedido pendiente', async () => {
	const e = escenario({ falla_subida: true }); await tick()
	const source = axios.CancelToken.source(), p = manual()
	const pedido = e.productos[0].get('/api/article/123', {
		cancelToken: source.token,
		adapter: config => p.promise.then(() => ({ status: 200, config })),
	}).catch(error => error)
	await tick()
	source.cancel('Navegación a otra pantalla')
	await tick()
	assert.equal(source.token.reason.config, undefined)
	assert.equal(e.cola().length, 1); assert.equal(e.cola()[0].tipo, 'cancelado')
	assert.equal(e.cola()[0].cancelable, true); assert.equal(e.cola()[0].pendientes, 0)
	await e.avanzar(30000)
	assert.equal(e.cola().filter(evento => evento.tipo === 'pendiente').length, 0)
	p.resolve(); assert.equal(await pedido, source.token.reason)
	e.control.destruir()
})

test('cambio de usuario y destruir desuscriben tokens activos sin cancelar negocio', async () => {
	const e = escenario(); await tick()
	const pendientes = []
	for (const accion of ['usuario', 'destruir']) {
		const source = axios.CancelToken.source(), pendiente = manual()
		let liberados = 0
		const original = source.token.unsubscribe.bind(source.token)
		source.token.unsubscribe = listener => { liberados++; original(listener) }
		pendientes.push(e.productos[0].get('/api/article/123', { cancelToken: source.token, adapter: config => pendiente.promise.then(() => ({ status: 200, config })) }))
		await tick()
		if (accion === 'usuario') { e.cambiar_persona(501); await tick() } else e.control.destruir()
		assert.equal(liberados, 1)
		assert.equal(source.token.reason, undefined)
		pendiente.resolve()
	}
	await Promise.all(pendientes)
})
