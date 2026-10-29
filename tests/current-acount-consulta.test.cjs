const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

function preparar(responder = () => Promise.resolve({ data: { models: [] } })) {
	const pedidos = []
	const axios = { defaults: {}, get: (url, config) => { pedidos.push({ metodo: 'get', url, config }); return responder('get', url, config) }, put: (url, data, config) => { pedidos.push({ metodo: 'put', url, data, config }); return responder('put', url, data) } }
	const modulo = cargar('store/current_acount.js', {
		axios: { __esModule: true, default: axios },
		'@/runtime_config': { env: () => 'http://api.test' },
		'@/common-vue/mixins/generals': { __esModule: true, default: { methods: { routeString: () => 'current-acount' } } },
	})
	const store = modulo.default
	const state = JSON.parse(JSON.stringify(store.state))
	const auth = { user: null }
	const ctx = { state, commit(nombre, valor) { if (nombre == 'auth/setCurrentAcountConsulta') auth.user.current_acount_consulta = valor; else store.mutations[nombre](state, valor) }, dispatch(nombre, valor) { return store.actions[nombre](ctx, valor) } }
	function ingresar(id, consulta) { auth.user = id ? { id, current_acount_consulta: consulta } : null; store.mutations.restaurar_consulta(state, auth.user) }
	function cuenta(id, titular = id, tipo = 'client') { state.from_model_name = tipo; state.from_model = { id: titular }; store.mutations.set_from_credit_account(state, { id, model_id: titular, model_name: tipo }) }
	return { modulo, store, state, ctx, pedidos, auth, ingresar, cuenta }
}
const ultimos = cantidad => ({ modo: 'ultimos', clave: 'ultimos', cantidad, desde: null, hasta: null })

test('normaliza los dos modos, descarta ids/fechas de atajos y rechaza fechas irreales/cantidades inválidas', () => {
	const { modulo } = preparar()
	assert.deepEqual(modulo.normalizarConsulta({ modo: 'atajo', clave: 'este_mes', cantidad: 17, desde: '2020-01-01', cuenta_id: 44 }), { modo: 'atajo', clave: 'este_mes', cantidad: 17, desde: null, hasta: null })
	for (const n of [0, -1, 2001, 1.2, '', null]) assert.equal(modulo.normalizarConsulta(ultimos(n)), null)
	for (const fecha of ['2026-02-29', '2024-02-30', '1999-12-31', '2100-01-01']) assert.equal(modulo.fechaDeConsultaValida(fecha), false)
	assert.equal(modulo.fechaDeConsultaValida('2024-02-29'), true)
})

test('restaura por persona, conserva filtros entre clientes/proveedores y limpia datos/pagos al abrir otra cuenta', async () => {
	const p = preparar()
	p.ingresar(10, ultimos(37)); p.cuenta(2)
	p.state.models = [{ id: 8 }]; p.state.selected = [{ id: 8 }]; p.state.to_pay = { id: 8 }; p.state.to_pay_list = [{ id: 8 }]
	p.cuenta(3, 5, 'provider')
	assert.equal(p.state.periodo.cantidad, 37)
	for (const key of ['models', 'to_show', 'selected', 'to_pay_list']) assert.deepEqual(p.state[key], [])
	assert.equal(p.state.to_pay, null)
	await p.ctx.dispatch('getModels')
	assert.equal(p.pedidos[0].url, '/api/current-acount/3/37')
	assert.deepEqual(p.pedidos[0].config.params, {})
	p.ingresar(null); p.ingresar(11, null)
	assert.equal(p.state.periodo.modo, 'defecto')
	p.ingresar(null); p.ingresar(10, ultimos(37))
	assert.equal(p.state.periodo.cantidad, 37)
})

test('invalida respuesta vieja al cambiar de cuenta aunque no siga un GET (pago de cuota)', async () => {
	let resolver
	const p = preparar(() => new Promise(r => { resolver = r }))
	p.ingresar(1); p.cuenta(1)
	const viejo = p.ctx.dispatch('getModels')
	p.cuenta(2)
	resolver({ data: { models: [{ id: 1 }] } }); await viejo
	assert.deepEqual(p.state.models, [])
	assert.equal(p.state.from_credit_account.id, 2)
})

test('no consulta la cuenta anterior bajo el nombre de otro titular', async () => {
	const p = preparar()
	p.ingresar(1); p.cuenta(2)
	p.state.from_model = { id: 99 }
	assert.equal(await p.ctx.dispatch('getModels'), false)
	assert.equal(p.pedidos.length, 0)
	assert.equal(p.state.from_credit_account.id, undefined)
})

test('serializa los guardados y la última elección es la que queda persistida y en memoria', async () => {
	const pendientes = []
	const p = preparar(() => new Promise(r => pendientes.push(r)))
	p.ingresar(1); p.cuenta(2)
	const primero = p.ctx.dispatch('aplicarConsulta', ultimos(15))
	const segundo = p.ctx.dispatch('aplicarConsulta', ultimos(39))
	await Promise.resolve()
	assert.equal(p.pedidos.length, 1)
	pendientes.shift()({ data: {} }); await primero; await Promise.resolve()
	assert.equal(p.pedidos.length, 2)
	assert.equal(p.pedidos[1].data.cantidad, 39)
	pendientes.shift()({ data: {} }); await segundo
	assert.equal(p.state.periodo.cantidad, 39)
	assert.equal(p.auth.user.current_acount_consulta.cantidad, 39)
	assert.equal(p.state.guardando_consulta, false)
})

test('API vieja/fallo avisa; reintentar guardado conserva filas y no consulta movimientos', async () => {
	let falla = true
	const p = preparar(() => falla ? Promise.reject({ response: { status: 404 } }) : Promise.resolve({ data: {} }))
	p.ingresar(1); p.cuenta(2)
	assert.equal(await p.ctx.dispatch('aplicarConsulta', ultimos(22)), false)
	assert.equal(p.state.error_guardado_consulta, true)
	p.state.models = [{ id: 50 }]
	falla = false
	assert.equal(await p.ctx.dispatch('guardarConsulta', p.state.periodo), true)
	assert.deepEqual(p.state.models, [{ id: 50 }])
	assert.equal(p.state.error_guardado_consulta, false)
	assert.ok(p.pedidos.every(pedido => pedido.metodo == 'put'))
})

test('los atajos recalculan hoy y el personalizado conserva sus fechas', () => {
	const { modulo } = preparar()
	const OriginalDate = Date
	let hoy = '2026-10-29T12:00:00'
	global.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [hoy])) } }
	try {
		const atajo = { modo: 'atajo', clave: 'ultimos_3_meses', cantidad: 10 }
		assert.equal(modulo.paramsDePeriodo(atajo).hasta, '2026-10-29')
		hoy = '2026-11-30T12:00:00'
		assert.equal(modulo.paramsDePeriodo(atajo).hasta, '2026-11-30')
		assert.equal(modulo.paramsDePeriodo(atajo).desde, '2026-08-30')
		assert.deepEqual(modulo.paramsDePeriodo({ modo: 'personalizado', desde: '2024-02-29', hasta: '2024-03-02' }), { desde: '2024-02-29', hasta: '2024-03-02' })
	} finally { global.Date = OriginalDate }
})

test('un cambio de persona descarta guardados encolados de la sesión anterior', async () => {
	let resolver
	const p = preparar(() => new Promise(r => { resolver = r }))
	p.ingresar(1)
	const primero = p.ctx.dispatch('aplicarConsulta', ultimos(15))
	const segundo = p.ctx.dispatch('aplicarConsulta', ultimos(99))
	await Promise.resolve()
	p.ingresar(null); p.ingresar(2)
	resolver({ data: {} }); await primero; await segundo
	assert.equal(p.pedidos.length, 1)
	assert.equal(p.state.periodo.modo, 'defecto')
	assert.equal(p.state.error_guardado_consulta, false)
})

test('Imprimir conserva el contrato histórico de cantidad y las fechas solo en período', () => {
	const p = preparar()
	const nav = cargar('components/common/current-acounts/Nav.vue', {
		'@/mixins/current_acounts': { __esModule: true, default: {} },
		'@/runtime_config': { env: () => 'http://api.test' },
		'@/store/current_acount': p.modulo,
	}).default
	assert.equal(nav.computed.texto_periodo.call({ periodo: { modo: 'atajo', clave: 'todo' }, periodo_efectivo: null, loading: false }), 'Últimos 10 movimientos', 'Una API vieja no debe aparentar todo el historial si ignoró las fechas.')
	assert.equal(nav.computed.texto_periodo.call({ periodo: ultimos(37) }), 'Últimos 37 movimientos')
	const previo = global.window
	const urls = []
	global.window = { open: url => urls.push(url) }
	try {
		const contexto = { periodo: ultimos(37), from_credit_account: { id: 8 }, current_acounts: [{ id: 1 }], periodo_efectivo: null }
		nav.methods.print.call(contexto, 'details')
		assert.equal(urls[0], 'http://api.test/current-acount/pdf/8/37/details')
		contexto.periodo = { modo: 'personalizado', clave: 'personalizado', desde: '2024-02-29', hasta: '2024-03-02', cantidad: 37 }
		nav.methods.print.call(contexto, 'simple')
		assert.equal(urls[1], 'http://api.test/current-acount/pdf/8/1/simple?desde=2024-02-29&hasta=2024-03-02')
	} finally { global.window = previo }
})
