const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const componente = cargar('common-vue/components/login/VinculacionNavegadorMaestro.vue').default
const ruta = '/asistente-maestro/vinculacion'

function contexto(axios) {
	const vm = Object.assign({ $axios: axios }, componente.data())
	for (const nombre in componente.methods) vm[nombre] = componente.methods[nombre].bind(vm)
	return vm
}

test('pide un código y canjea la aprobación en la sesión, sin reenviar el código', async () => {
	const pedidos = []
	const vm = contexto({
		get(url) {
			pedidos.push(url)
			return Promise.resolve({})
		},
		post(url, cuerpo) {
			pedidos.push(url)
			assert.deepEqual(cuerpo, {})
			if (url === ruta) return Promise.resolve({ data: { codigo: 'CODIGO-DE-PRUEBA' } })
			return Promise.resolve({ data: { vinculado: true } })
		},
	})

	await vm.solicitar()
	assert.equal(vm.codigo, 'CODIGO-DE-PRUEBA')
	await vm.canjear()
	assert.equal(vm.vinculado, true)
	assert.equal(vm.codigo, '')
	assert.deepEqual(pedidos, ['/sanctum/csrf-cookie', ruta, ruta + '/canjear'])
})

test('si falta aprobar, conserva el código y lo limpia cuando vence', async () => {
	let status = 409
	const vm = contexto({
		post() { return Promise.reject({ response: { status } }) },
	})
	vm.codigo = 'CODIGO-DE-PRUEBA'

	await vm.canjear()
	assert.equal(vm.codigo, 'CODIGO-DE-PRUEBA')
	assert.match(vm.aviso, /falta aprobar/)
	assert.equal(vm.ocupado, false)

	status = 410
	await vm.canjear()
	assert.equal(vm.codigo, '')
	assert.match(vm.aviso, /Generá uno nuevo/)
	assert.equal(vm.vinculado, false)
})

test('con una API anterior informa que falta la vinculación y no marca el navegador como vinculado', async () => {
	const vm = contexto({
		get() { return Promise.resolve({}) },
		post() { return Promise.reject({ response: { status: 404 } }) },
	})

	await vm.solicitar()
	assert.equal(vm.no_disponible, true)
	assert.equal(vm.vinculado, false)
	assert.equal(vm.ocupado, false)
})
