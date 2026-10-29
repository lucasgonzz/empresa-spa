// Ticket #29: factory y Vuex reales; se reemplaza solo el transporte HTTP.
// Ejecutar: node --test tests/payment-plan-solapas.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const Vue = require('vue')
const Vuex = require('vuex')
const moment = require('moment')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')
Vue.use(Vuex)
function preparar() {
	const pedidos = []
	const axios = { defaults: {} }
	for (const metodo of ['get', 'post']) {
		axios[metodo] = (url, cuerpo) => new Promise((resolve, reject) => {
			pedidos.push({ metodo, url, cuerpo: JSON.parse(JSON.stringify(cuerpo || {})), resolve, reject })
		})
	}
	const base = cargar('store/__base_store.js', {
		axios: { __esModule: true, default: axios },
		'@/runtime_config': { env: () => 'http://api.test' },
		moment: { __esModule: true, default: moment },
		'@/common-vue/mixins/generals': { __esModule: true, default: { methods: {
			routeString: nombre => nombre.replace(/_/g, '-'), plural: nombre => nombre,
		} } },
	})
	const cuotas = cargar('store/payment_plan_cuota.js', {
		vue: { __esModule: true, default: Vue }, '@/store/__base_store': base,
	}).default
	const store = new Vuex.Store({ modules: {
		payment_plan_cuota: cuotas,
		auth: { namespaced: true, mutations: { setLoading() {}, setMessage() {} } },
	} })
	const estado = store.state.payment_plan_cuota
	Object.assign(estado, { route_prefix: 'pendiente', from_date: '2026-10-28', until_date: '2026-10-28' })
	return { store, estado, pedidos, cambiar: destino => store.dispatch('payment_plan_cuota/cambiarSolapa', destino) }
}
function cliente(estado) {
	estado.filters = [{ key: 'client_id', type: 'search', igual_que: 12, ordenar_de: null }]
	estado.is_filtered = true
	estado.filtered = [{ id: 1, client_id: 12, estado: 'pendiente' }]
}
function responder(pedido, filas, total = filas.length) {
	pedido.resolve({ data: { models: pedido.metodo === 'get' ? filas : { data: filas, last_page: Math.max(1, Math.ceil(total / 50)), total } } })
}
const avanzar = () => new Promise(resolve => setImmediate(resolve))

test('cliente y criterios persisten en ambos sentidos, con página 1 e histórico', async () => {
	const { estado, pedidos, cambiar } = preparar()
	cliente(estado)
	estado.filters.push({ key: 'amount_paid', type: 'number', mayor_que: 5 })
	estado.filter_page = 3
	for (const destino of ['pagado', 'pendiente']) {
		const cambio = cambiar(destino)
		assert.deepEqual(estado.filtered, [])
		await avanzar()
		const pedido = pedidos[pedidos.length - 1]
		assert.equal(pedido.url, '/api/global-search/payment-plan-cuota?page=1')
		assert.equal(pedido.cuerpo.filters[0].igual_que, 12)
		assert.equal(pedido.cuerpo.filters[1].mayor_que, 5)
		assert.deepEqual(pedido.cuerpo.extra_filters, [{ key: 'estado', operator: '=', value: destino }])
		for (const clave of ['from_date', 'until_date', 'page']) assert.equal(clave in pedido.cuerpo, false)
		assert.equal(estado.filter_page, 1)
		responder(pedido, [{ id: 2, client_id: 12, estado: destino }])
		await cambio
		assert.equal(estado.loading, false)
		assert.equal(estado.is_filtered, true)
		assert.equal(estado.filtered[0].estado, destino)
		assert.equal(estado.filters[0].igual_que, 12)
	}
	assert.equal(pedidos.length, 2)
})

test('click y watcher URL sobre el mismo destino hacen un solo pedido; vacío conserva filtro', async () => {
	const { estado, pedidos, cambiar } = preparar()
	cliente(estado)
	const cambio = cambiar('pagado')
	await cambiar('pagado')
	await avanzar()
	assert.equal(pedidos.length, 1)
	responder(pedidos[0], [])
	await cambio
	assert.equal(estado.is_filtered, true)
})

test('sin filtro usa fechas; orden por defecto no activa histórico', async () => {
	const { estado, pedidos, cambiar } = preparar()
	estado.filters = [{ key: 'id', type: 'number', ordenar_de: 'DESC', igual_que: '', mayor_que: '', menor_que: '' }]
	const cambio = cambiar('pagado')
	await avanzar()
	assert.equal(pedidos[0].metodo, 'get')
	assert.equal(pedidos[0].url, '/api/payment-plan-cuota/pagado/from-date/2026-10-28/2026-10-28')
	responder(pedidos[0], [{ id: 2, estado: 'pagado' }])
	await cambio
	assert.equal(estado.is_filtered, false)
	assert.equal(estado.models[0].id, 2)
})

test('conserva texto, extras y orden al cambiar y al paginar', async () => {
	const { store, estado, pedidos, cambiar } = preparar()
	cliente(estado)
	estado.global_search_payload = { props: ['observations'], query_value: 'mayo', extra_filters: [{ key: 'sale_id', operator: '=', value: 30 }], order_by: 'fecha_vencimiento', order_direction: 'ASC' }
	const cambio = cambiar('pagado')
	await avanzar()
	assert.equal(pedidos[0].cuerpo.query_value, 'mayo')
	assert.equal(pedidos[0].cuerpo.order_by, 'fecha_vencimiento')
	responder(pedidos[0], [{ id: 2 }], 80)
	await cambio
	const pagina = store.dispatch('payment_plan_cuota/runGlobalSearch', { page: 2 })
	assert.equal(pedidos[1].url, '/api/global-search/payment-plan-cuota?page=2')
	assert.equal(pedidos[1].cuerpo.filters[0].igual_que, 12)
	assert.deepEqual(pedidos[1].cuerpo.extra_filters, [{ key: 'sale_id', operator: '=', value: 30 }, { key: 'estado', operator: '=', value: 'pagado' }])
	responder(pedidos[1], [{ id: 3 }], 80)
	await pagina
	assert.equal(estado.filter_page, 2)
})

test('la respuesta de búsqueda anterior no pisa la nueva solapa', async () => {
	const { estado, pedidos, cambiar } = preparar()
	cliente(estado)
	const primera = cambiar('pagado')
	await avanzar()
	const segunda = cambiar('pendiente')
	await avanzar()
	responder(pedidos[1], [{ id: 10, estado: 'pendiente' }])
	await segunda
	responder(pedidos[0], [{ id: 20, estado: 'pagado' }])
	await primera
	assert.equal(estado.route_prefix, 'pendiente')
	assert.equal(estado.filtered[0].id, 10)
	assert.equal(estado.loading, false)
})

test('una descarga por fecha vieja no pisa filas de la búsqueda nueva', async () => {
	const { store, estado, pedidos, cambiar } = preparar()
	const descarga = store.dispatch('payment_plan_cuota/getModels')
	cliente(estado)
	const cambio = cambiar('pagado')
	await avanzar()
	responder(pedidos[0], [{ id: 10, estado: 'pendiente' }])
	await descarga
	assert.deepEqual(estado.models, [])
	assert.equal(estado.is_filtered, true)
	responder(pedidos[1], [{ id: 20, estado: 'pagado' }])
	await cambio
	assert.equal(estado.filtered[0].id, 20)
	assert.equal(estado.loading, false)
})

test('quitar filtros vuelve a fechas y siguientes solapas no recuperan el cliente', async () => {
	const { store, estado, pedidos, cambiar } = preparar()
	cliente(estado)
	store.commit('payment_plan_cuota/limpiar_criterios_de_columna')
	const limpiar = store.dispatch('payment_plan_cuota/runListadoPorDefecto')
	responder(pedidos[0], [])
	await limpiar
	const cambio = cambiar('pagado')
	await avanzar()
	assert.equal(pedidos[1].metodo, 'get')
	assert.equal(estado.filters[0].igual_que, 0)
	responder(pedidos[1], [])
	await cambio
	assert.equal(estado.is_filtered, false)
})

test('dos cambios en el mismo tick solo piden el último destino', async () => {
	const { estado, pedidos, cambiar } = preparar()
	cliente(estado)
	const primera = cambiar('pagado')
	const segunda = cambiar('pendiente')
	await avanzar()
	assert.equal(pedidos.length, 1)
	assert.equal(pedidos[0].cuerpo.extra_filters[0].value, 'pendiente')
	responder(pedidos[0], [])
	await Promise.all([primera, segunda])
	assert.equal(estado.loading, false)
})

test('cambiar fechas desactiva la búsqueda y alternar no reactiva el criterio cargado', async () => {
	const { store, estado, pedidos, cambiar } = preparar()
	cliente(estado)
	const fecha = store.dispatch('payment_plan_cuota/getModels')
	responder(pedidos[0], [])
	await fecha
	assert.equal(estado.filters[0].igual_que, 12)
	assert.equal(estado.is_filtered, false)
	const cambio = cambiar('pagado')
	await avanzar()
	assert.equal(pedidos[1].metodo, 'get')
	responder(pedidos[1], [])
	await cambio
	assert.equal(estado.is_filtered, false)
})

test('un criterio agregado pero sin ejecutar sigue siendo borrador al cambiar solapa', async () => {
	const { estado, pedidos, cambiar } = preparar()
	cliente(estado)
	estado.is_filtered = false
	const cambio = cambiar('pagado')
	await avanzar()
	assert.equal(pedidos[0].metodo, 'get')
	responder(pedidos[0], [])
	await cambio
	assert.equal(estado.is_filtered, false)
})

test('la primera búsqueda en vuelo se reaplica al destino aunque is_filtered todavía sea false', async () => {
	const { store, estado, pedidos, cambiar } = preparar()
	cliente(estado)
	estado.is_filtered = false
	const primera = store.dispatch('payment_plan_cuota/runGlobalSearch', { page: 1 })
	assert.equal(estado.loading_filtered, true)
	const cambio = cambiar('pagado')
	await avanzar()
	assert.equal(pedidos[1].metodo, 'post')
	assert.equal(pedidos[1].cuerpo.filters[0].igual_que, 12)
	assert.equal(pedidos[1].cuerpo.extra_filters[0].value, 'pagado')
	responder(pedidos[0], [{ id: 1, estado: 'pendiente' }])
	await primera
	assert.equal(estado.loading_filtered, true, 'una búsqueda vieja no apaga la nueva')
	responder(pedidos[1], [{ id: 2, estado: 'pagado' }])
	await cambio
	assert.equal(estado.loading_filtered, false)
	assert.equal(estado.filtered[0].estado, 'pagado')
})

test('elegir fechas mientras busca cancela la intención histórica pendiente', async () => {
	const { store, estado, pedidos, cambiar } = preparar()
	cliente(estado)
	estado.is_filtered = false
	const busqueda = store.dispatch('payment_plan_cuota/runGlobalSearch', { page: 1 })
	const fecha = store.dispatch('payment_plan_cuota/getModels')
	assert.equal(estado.loading_filtered, false)
	responder(pedidos[1], [])
	await fecha
	const cambio = cambiar('pagado')
	await avanzar()
	assert.equal(pedidos[2].metodo, 'get')
	responder(pedidos[2], [])
	responder(pedidos[0], [{ id: 1, estado: 'pendiente' }])
	await Promise.all([cambio, busqueda])
	assert.equal(estado.is_filtered, false)
})

test('el nombre del cliente sigue visible con resultados vacíos y cambia solo con su id', async () => {
	const { store, estado, pedidos, cambiar } = preparar()
	cliente(estado)
	estado.filtered[0].client = { id: 12, name: 'Ana de prueba' }
	assert.equal(store.getters['payment_plan_cuota/cliente_filtrado'].name, 'Ana de prueba')
	const cambio = cambiar('pagado')
	await avanzar()
	responder(pedidos[0], [])
	await cambio
	assert.equal(store.getters['payment_plan_cuota/cliente_filtrado'].name, 'Ana de prueba')
	assert.equal(estado.cliente_del_filtro.name, 'Ana de prueba')
	store.commit('payment_plan_cuota/addFilter', { key: 'client_id', type: 'search', igual_que: 13 })
	assert.equal(store.getters['payment_plan_cuota/cliente_filtrado'].name, 'N° 13', 'jamás mostrar nombre del cliente anterior')
	store.commit('payment_plan_cuota/limpiar_criterios_de_columna')
	assert.equal(store.getters['payment_plan_cuota/cliente_filtrado'], null)
})

test('elegir fechas oculta y limpia el resumen del cliente inactivo', async () => {
	const { store, estado, pedidos, cambiar } = preparar()
	cliente(estado)
	estado.filtered[0].client = { id: 12, name: 'Ana de prueba' }
	const cambio = cambiar('pagado')
	await avanzar()
	responder(pedidos[0], [])
	await cambio
	const fecha = store.dispatch('payment_plan_cuota/getModels')
	assert.equal(estado.cliente_del_filtro, null)
	assert.equal(store.getters['payment_plan_cuota/cliente_filtrado'], null)
	responder(pedidos[1], [])
	await fecha
})

test('el resumen usa el cliente cargado en el store y la pantalla lo expone accesible', () => {
	const { store, estado } = preparar()
	store.registerModule('client', { state: { models: [{ id: 12, name: 'Ana de caché' }], filtered: [] } })
	cliente(estado)
	assert.equal(store.getters['payment_plan_cuota/cliente_filtrado'].name, 'Ana de caché')
	const pantalla = cargar('components/client/components/payment-plan/Index.vue').default
	assert.equal(pantalla.computed.cliente_filtrado.call({ $store: store }).name, 'Ana de caché')
	const plantilla = require('node:fs').readFileSync(require('node:path').join(__dirname, '../src/components/client/components/payment-plan/Index.vue'), 'utf8')
	assert.match(plantilla, /role="status"/)
	assert.match(plantilla, /aria-live="polite"/)
	assert.match(plantilla, /Cliente: <strong>{{ cliente_filtrado.name }}<\/strong>/)
})
