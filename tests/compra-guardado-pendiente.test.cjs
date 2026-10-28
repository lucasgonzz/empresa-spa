const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')

const archivo = process.env.MODEL_INDEX_SOURCE || path.join(__dirname, '../src/common-vue/components/model/Index.vue')
const fuente = fs.readFileSync(archivo, 'utf8')
const codigo = babel.transformSync(compiler.parseComponent(fuente).script.content, {
	babelrc: false, configFile: false,
	plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code

function promesa_manual() {
	let resolve, reject
	const promise = new Promise((ok, error) => { resolve = ok; reject = error })
	return { promise, resolve, reject }
}

function escenario() {
	const temporizadores = new Map()
	let ultimo_timer = 0
	const exports = {}
	vm.runInNewContext(codigo, {
		exports, require: () => ({}),
		console: { log() {} },
		setTimeout(fn, plazo) { const id = ++ultimo_timer; temporizadores.set(id, { fn, plazo }); return id },
		clearTimeout(id) { temporizadores.delete(id) },
	})
	const componente = exports.default
	const pedido = promesa_manual()
	const llamadas = []
	const auth = { loading: false, message: '' }
	const contexto = Object.assign(componente.data(), componente.methods, {
		model_name: 'provider_order', model: {}, has_many_parent_model: null,
		skip_global_error_event: false, emit_on_saved_instead_continue: false,
		check: () => Promise.resolve(true), getModelToSend: () => ({ articles: [] }),
		route_model_name: () => 'provider-order', replaceGuion: valor => valor,
		clearSaveCheckAlert() { this.save_check_alert_message = '' },
		setSaveCheckAlert(mensaje, variante) { this.save_check_alert_message = mensaje; this.save_check_alert_variant = variante },
		setSaveErrorFromApi() { this.setSaveCheckAlert('No se pudo guardar. Intente nuevamente.') },
		closeModal() {}, callActions() {}, clearModel() {},
		$set(objeto, clave, valor) { objeto[clave] = valor },
		$root: { $emit() {} }, $toast: { success() {} },
		$store: { state: { auth }, commit(clave, valor) {
			if (clave === 'auth/setLoading') auth.loading = valor
			if (clave === 'auth/setMessage') auth.message = valor
		} },
		$api: {
			post(...args) { llamadas.push(['post', ...args]); return pedido.promise },
			put(...args) { llamadas.push(['put', ...args]); return pedido.promise },
		},
	})
	Object.defineProperty(contexto, 'loading', {
		get: () => auth.loading, set: valor => { auth.loading = valor },
	})
	return { contexto, pedido, llamadas, auth, temporizadores, componente }
}

const tick = () => new Promise(resolve => setImmediate(resolve))

test('una compra pendiente libera la pantalla al minuto y conserva candado y datos', async () => {
	const e = escenario()
	e.contexto.save({ close: true })
	await tick()
	assert.equal(e.auth.loading, true)
	assert.equal(e.llamadas.length, 1)
	const timer = [...e.temporizadores.values()][0]
	assert.equal(timer.plazo, 60000)
	timer.fn()
	assert.equal(e.auth.loading, false)
	assert.equal(e.contexto.compra_guardado_en_curso, true)
	assert.match(e.contexto.save_check_alert_message, /todavía puede guardarse/)
	assert.equal(e.llamadas[0][3].skip_navigation_cancel, true)
	assert.equal(e.llamadas[0][3].skip_global_error_event, true)
	assert.equal(e.contexto.model.id, undefined)
})

test('doble clic y error accesorio que apaga loading no disparan un segundo POST', async () => {
	const e = escenario()
	e.contexto.save({ close: true })
	e.contexto.save({ close: true })
	await tick()
	e.auth.loading = false
	await e.contexto.save({ close: true })
	assert.equal(e.llamadas.length, 1)
})

test('éxito tardío termina la espera y conserva el id confirmado', async () => {
	const e = escenario()
	const guardado = e.contexto.save({ close: true })
	await tick()
	;[...e.temporizadores.values()][0].fn()
	e.pedido.resolve({ data: { model: { id: 27 } } })
	await guardado
	assert.equal(e.contexto.compra_guardado_en_curso, false)
	assert.equal(e.contexto.model.id, 27)
	assert.equal(e.contexto.save_check_alert_message, '')
	assert.equal(e.temporizadores.size, 0)
	assert.equal(e.auth.loading, false)
})

test('422 confirmado libera el candado sin borrar formulario', async () => {
	const e = escenario()
	const guardado = e.contexto.save({ close: true })
	await tick()
	e.pedido.reject({ response: { status: 422, data: { message: 'Falta depósito' } } })
	await guardado
	assert.equal(e.contexto.compra_guardado_en_curso, false)
	assert.equal(e.auth.loading, false)
	assert.equal(e.temporizadores.size, 0)
	assert.equal(e.contexto.model.id, undefined)
})

for (const [nombre, error] of [
	['corte de red', new Error('Network Error')],
	['timeout', { code: 'ECONNABORTED' }],
	['cancelación', { code: 'ERR_CANCELED' }],
	['500 posterior al commit', { response: { status: 500 } }],
	['408', { response: { status: 408 } }],
]) test(nombre + ' no habilita repetir un alta sin confirmación', async () => {
	const e = escenario()
	const guardado = e.contexto.save({ close: true })
	await tick()
	e.pedido.reject(error)
	await guardado
	assert.equal(e.auth.loading, false)
	assert.equal(e.contexto.compra_guardado_en_curso, true)
	assert.match(e.contexto.save_check_alert_message, /No pudimos confirmar/)
	await e.contexto.save({ close: true })
	assert.equal(e.llamadas.length, 1)
	assert.equal(e.temporizadores.size, 0)
})

test('2xx ilegible no prueba que falló el alta y no habilita repetirla', async () => {
	const e = escenario()
	const guardado = e.contexto.save({ close: true })
	await tick()
	e.pedido.resolve({ data: '<html>Proxy</html>' })
	await guardado
	assert.equal(e.contexto.compra_guardado_en_curso, true)
	assert.match(e.contexto.save_check_alert_message, /No pudimos confirmar/)
	await e.contexto.save({ close: true })
	assert.equal(e.llamadas.length, 1)
})

test('excepción de preparación previa al POST libera overlay y permite corregir', async () => {
	const e = escenario()
	e.contexto.getModelToSend = () => { throw new Error('Preparación falló') }
	await e.contexto.save({ close: true })
	assert.equal(e.auth.loading, false)
	assert.equal(e.contexto.compra_guardado_en_curso, false)
	assert.equal(e.llamadas.length, 0)
	assert.match(e.contexto.save_check_alert_message, /No se pudo guardar/)
})

test('un error de interfaz después del éxito no puede repetir el POST confirmado', async () => {
	const e = escenario()
	e.contexto.closeModal = () => { throw new Error('Interfaz falló') }
	const guardado = e.contexto.save({ close: true })
	await tick()
	e.pedido.resolve({ data: { model: { id: 27 } } })
	await guardado
	assert.equal(e.contexto.model.id, 27)
	await e.contexto.save({ close: true })
	assert.deepEqual(e.llamadas.map(c => c[0]), ['post', 'put'])
})

test('un formulario de otro modelo conserva el guardado anterior sin temporizador de compras', async () => {
	const e = escenario()
	e.contexto.model_name = 'provider'
	const guardado = e.contexto.save({ close: true })
	await tick()
	assert.equal(e.temporizadores.size, 0)
	assert.equal(e.llamadas[0][3].skip_navigation_cancel, false)
	assert.equal(e.llamadas[0][3].skip_global_error_event, false)
	e.pedido.resolve({ data: { model: { id: 4 } } })
	await guardado
	assert.equal(e.auth.loading, false)
})

test('cerrar y reabrir no libera otro POST ni borra el aviso de confirmación pendiente', async () => {
	const e = escenario()
	const guardado = e.contexto.save({ close: true })
	await tick()
	const original = e.contexto.model
	;[...e.temporizadores.values()][0].fn()
	e.contexto.onModalClosed()
	e.contexto.model = {}
	let efectos_sobre_otro = 0
	e.contexto.closeModal = e.contexto.clearModel = e.contexto.callActions = () => { efectos_sobre_otro++ }
	await e.contexto.save({ close: true })
	assert.equal(e.llamadas.length, 1)
	assert.match(e.contexto.save_check_alert_message, /todavía puede guardarse/)
	e.pedido.resolve({ data: { model: { id: 27 } } })
	await guardado
	assert.equal(original.id, 27)
	assert.equal(e.contexto.model.id, undefined)
	assert.equal(efectos_sobre_otro, 0)
	assert.equal(e.contexto.save_check_alert_message, '')
})

test('el botón queda deshabilitado por el candado aunque no haya overlay', () => {
	const plantilla = compiler.parseComponent(fuente).template.content
	assert.match(plantilla, /:disabled="model_name == 'provider_order' && compra_guardado_en_curso"/)
	const resultado = compiler.compile(plantilla)
	assert.deepEqual(resultado.errors, [])
})

test('cambiar formulario antes del plazo no deja overlay ni props de reintento al confirmar', async () => {
	const e = escenario()
	e.contexto.extra_props_del_proximo_guardado = { opcion_puntual: true }
	const guardado = e.contexto.save({ close: true })
	await tick()
	e.contexto.model = {}
	e.contexto.closeModal = e.contexto.clearModel = () => { throw new Error('Tocó el formulario nuevo') }
	e.pedido.resolve({ data: { model: { id: 27 } } })
	await guardado
	assert.equal(e.auth.loading, false)
	assert.equal(Object.keys(e.contexto.extra_props_del_proximo_guardado).length, 0)
	assert.equal(e.contexto.compra_guardado_en_curso, false)
	assert.equal(e.contexto.model.id, undefined)
})
