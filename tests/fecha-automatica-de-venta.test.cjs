// Ejecuta el store, la vista y el guardado reales, con el reloj controlado y sin servidor.
const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const moment = require('moment')
const raiz = path.resolve(__dirname, '..')
const now_original = moment.now
let reloj = Date.parse('2026-11-15T23:55:00-03:00')
moment.now = () => reloj
after(() => { moment.now = now_original })

function cargar(ruta, axios) {
	let fuente = fs.readFileSync(path.join(raiz, 'src', ruta), 'utf8')
	if (ruta.endsWith('.vue')) fuente = compiler.parseComponent(fuente).script.content
	const ast = babel.parseSync(fuente, { babelrc: false, configFile: false, sourceType: 'module' })
	const mocks = { moment, axios: axios || { defaults: {} } }
	for (const nodo of ast.program.body) {
		if (nodo.type !== 'ImportDeclaration' || mocks[nodo.source.value]) continue
		if (nodo.source.value === '@/utils/fecha_automatica_de_venta') {
			mocks[nodo.source.value] = cargar('utils/fecha_automatica_de_venta.js')
			continue
		}
		mocks[nodo.source.value] = {}
		for (const spec of nodo.specifiers) {
			if (spec.imported) mocks[nodo.source.value][spec.imported.name] = () => ({})
		}
	}
	const codigo = babel.transformFromAstSync(ast, fuente, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
	const exports = {}
	vm.runInThisContext('(function(exports, require){' + codigo + '\n})')(exports, n => mocks[n])
	return exports
}

function escenario() {
	reloj = Date.parse('2026-11-15T23:55:00-03:00')
	let enviado
	let rechazar_post
	const axios = { defaults: {}, post(url, datos) { enviado = datos; return new Promise((resolve, reject) => { rechazar_post = reject }) } }
	const modulo = cargar('store/vender/vender.js', axios).default
	const state = modulo.state
	state.previus_sales = { previus_sale: {}, abriendo_venta_previa: false }
	state.venta_en_curso_inicializada = true
	const store = {
		state: { vender: state }, getters: {}, dispatch() {},
		commit(nombre, valor) {
			const mutation = modulo.mutations[nombre.replace('vender/', '')]
			if (mutation) mutation(state, valor)
		},
	}
	const guardar = cargar('mixins/vender/guardar_venta/index.js').default
	const errores = []
	let captura
	const vista = {
		$store: store, budget: null,
		$toast: { error: mensaje => errores.push(mensaje), warning() {} },
		setTotal() {}, get_models_by_id: () => [],
		adjuntos_para_guardar_en_el_equipo: () => [],
		save_sale_offline(datos) { captura = datos; return Promise.resolve() },
		resetear_vender() {}, sonido_error() {},
	}
	Object.assign(vista, guardar.methods)
	vista.resetear_vender = () => {}
	const dia_siguiente = () => { reloj = Date.parse('2026-11-16T10:27:13-03:00') }
	const enviar = () => modulo.actions.vender({ state, getters: {}, commit: (n, v) => store.commit(n, v) }, { discounts: [], surchages: [] })
	return { modulo, state, store, vista, errores, dia_siguiente, enviar, payload: () => enviado, captura: () => captura, fallar_post: () => rechazar_post({ isAxiosError: true }) }
}

test('venta inicializada cruza medianoche sin limpiar: el POST usa el día actual', () => {
	const caso = escenario()
	assert.equal(caso.state.created_at, '2026-11-15')
	caso.dia_siguiente()
	caso.enviar()
	assert.equal(caso.state.created_at, '2026-11-16')
	assert.equal(caso.payload().created_at, '2026-11-16')
})

test('salir y volver conserva el contenido y actualiza sólo el default', () => {
	const caso = escenario()
	caso.state.items = [{ id: 17, amount: 3 }]
	caso.dia_siguiente()
	cargar('views/Vender.vue').default.created.call(caso.vista)
	const mixin = cargar('mixins/vender/fecha_automatica.js').default
	mixin.methods.refrescar_fecha_de_venta.call(caso.vista)
	assert.equal(caso.state.created_at, '2026-11-16')
	assert.deepEqual(caso.state.items, [{ id: 17, amount: 3 }])
})

test('pestaña visible, suspendida y restaurada: eventos e intervalo consultan el mismo store y se limpian', () => {
	const caso = escenario()
	const mixin = cargar('mixins/vender/fecha_automatica.js').default
	const eventos = new Map()
	let intervalo
	let eliminado
	global.window = {
		addEventListener(n, f) { eventos.set(n, f) }, removeEventListener(n) { eventos.delete(n) },
		setInterval(f) { intervalo = f; return 134 }, clearInterval(id) { eliminado = id },
	}
	global.document = { addEventListener(n, f) { eventos.set(n, f) }, removeEventListener(n) { eventos.delete(n) } }
	caso.vista.refrescar_fecha_de_venta = mixin.methods.refrescar_fecha_de_venta.bind(caso.vista)
	try {
		mixin.mounted.call(caso.vista)
		for (const evento of ['focus', 'pageshow', 'visibilitychange', 'intervalo']) {
			caso.state.created_at = '2026-11-15'
			caso.dia_siguiente()
			;(evento === 'intervalo' ? intervalo : eventos.get(evento))()
			assert.equal(caso.state.created_at, '2026-11-16', evento)
		}
		mixin.beforeDestroy.call(caso.vista)
		assert.equal(eventos.size, 0)
		assert.equal(eliminado, 134)
	} finally {
		delete global.window
		delete global.document
	}
})

for (const fecha of ['2026-10-04', '2026-11-15']) {
	test('elección explícita ' + fecha + ' se conserva aunque coincida con hoy al elegirla', () => {
		const caso = escenario()
		const fecha_componente = cargar('components/vender/components/stage-1/FechaVenta.vue').default
		fecha_componente.computed.created_at.set.call(caso.vista, fecha)
		caso.dia_siguiente()
		caso.enviar()
		assert.equal(caso.payload().created_at, fecha)
		assert.equal(caso.state.fecha_automatica, false)
		caso.store.commit('vender/iniciar_fecha_automatica')
		assert.equal(caso.state.fecha_automatica, true)
		assert.equal(caso.state.created_at, '2026-11-16')
	})
}

for (const modo of ['venta', 'abriendo', 'presupuesto', 'nuevo_presupuesto']) {
	test('el refresco no modifica fechas de ' + modo, () => {
		const caso = escenario()
		if (modo === 'venta') caso.state.previus_sales.previus_sale = { id: 13 }
		if (modo === 'abriendo') caso.state.previus_sales.abriendo_venta_previa = true
		if (modo === 'presupuesto') caso.state.budget = { id: 12 }
		if (modo === 'nuevo_presupuesto') caso.state.guardar_como_presupuesto = true
		caso.dia_siguiente()
		caso.store.commit('vender/refrescar_fecha_automatica')
		assert.equal(caso.state.created_at, '2026-11-15')
	})
}

test('captura offline nueva actualiza el default; la copia guardada no sigue al reloj', async () => {
	const caso = escenario()
	caso.dia_siguiente()
	await caso.vista.guardar_venta_offline('uuid-fecha')
	assert.equal(caso.captura().created_at_elegido, '2026-11-16')
	reloj = Date.parse('2026-11-19T10:00:00-03:00')
	caso.store.commit('vender/refrescar_fecha_automatica')
	assert.equal(caso.captura().created_at_elegido, '2026-11-16')
})

for (const valor of ['', '2026-02-30', 'no-es-fecha']) {
	test('fecha manual inválida ' + JSON.stringify(valor) + ' frena online y offline sin perder la venta', async () => {
		const caso = escenario()
		caso.store.commit('vender/set_created_at', valor)
		caso.state.items = [{ id: 17, amount: 3 }]
		await assert.rejects(caso.enviar(), error => error.response.status === 422 && error.response.data.message.includes('Elegí una fecha válida'))
		caso.vista.guardar_venta()
		caso.vista.guardar_venta_online('uuid')
		await caso.vista.guardar_venta_offline('uuid')
		assert.equal(caso.payload(), undefined)
		assert.equal(caso.captura(), undefined)
		assert.equal(caso.errores.length, 3)
		assert.match(caso.errores[0], /la venta sigue en pantalla/)
		assert.deepEqual(caso.state.items, [{ id: 17, amount: 3 }])
		assert.equal(caso.state.created_at, valor)
	})
}


test('POST antes de medianoche sin respuesta: el fallback conserva el día y el instante del intento', async () => {
	const caso = escenario()
	const DateReal = global.Date
	reloj = DateReal.parse('2026-11-15T23:59:50-03:00')
	global.Date = class extends DateReal {
		constructor(...args) { super(...(args.length ? args : [reloj])) }
		static now() { return reloj }
	}
	caso.store.dispatch = (accion, info) => caso.modulo.actions.vender({
		state: caso.state, getters: {}, commit: (n, v) => caso.store.commit(n, v),
	}, info)
	try {
		caso.vista.guardar_venta_online('uuid-frontera')
		assert.equal(caso.payload().created_at, '2026-11-15')
		caso.dia_siguiente()
		caso.store.commit('vender/refrescar_fecha_automatica')
		assert.equal(caso.state.created_at, '2026-11-16')
		caso.fallar_post()
		await new Promise(resolve => setImmediate(resolve))
		assert.equal(caso.captura().offline_uuid, 'uuid-frontera')
		assert.equal(caso.captura().created_at_elegido, '2026-11-15')
		assert.equal(caso.captura().capturada_at, '2026-11-16T02:59:50.000Z')
	} finally {
		global.Date = DateReal
	}
})

test('guardar en IndexedDB y sincronizar días después conserva fecha y hora originales', async () => {
	const { cargar: cargar_real } = require('./helpers/cargar_modulo_esm.cjs')
	let guardada
	const posts = []
	const db = { sales: {
		add: datos => { guardada = { ...datos, id: 1 }; return Promise.resolve(1) },
		toArray: () => Promise.resolve(guardada ? [{ ...guardada }] : []),
		delete: () => { guardada = null; return Promise.resolve() },
		update: () => Promise.resolve(),
	} }
	const mixin = cargar_real('offline/sync_sales.js', {
		'./db': { __esModule: true, default: db },
		'moment': moment,
	}).default
	const contexto = Object.assign({}, mixin.methods, {
		owner_id: 17, is_owner: true, $store: { commit() {} },
		$toast: { success() {}, warning() {}, error() {} }, price: String,
		$api: { post(url, datos) { posts.push(datos); return Promise.resolve({ status: 201, data: { model: { id: 91 } } }) } },
	})
	reloj = Date.parse('2026-11-16T10:27:13-03:00')
	await contexto.save_sale_offline({
		offline_uuid: 'uuid-historico', total: 100, created_at_elegido: '2026-11-15',
		capturada_at: '2026-11-16T02:59:50.000Z', employee_id: 0,
	})
	assert.equal(guardada.created_at, '2026-11-16T02:59:50.000Z')
	assert.equal(guardada.capturada_at, '2026-11-16T02:59:50.000Z')
	reloj = Date.parse('2026-11-19T10:27:13-03:00')
	await contexto.subir_ventas_del_equipo({ omitir_rechazadas: true })
	assert.equal(posts.length, 1)
	assert.equal(posts[0].created_at, '2026-11-15')
	assert.equal(posts[0].capturada_at, '2026-11-16T02:59:50.000Z')
	assert.equal(posts[0].venta_offline, 1) // Contrato existente: flag numérico del POST.
})
