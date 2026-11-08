const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { pasos_de_soporte } = cargar('tours/soporte.js')
const anfitrion = cargar('components/robotito-soporte/Anfitrion.vue', {
	'./Pregunta': {},
	'./Valoracion': {},
}).default

test('solo interpreta guiones conocidos y mantiene el número de pasos del contrato', () => {
	assert.equal(pasos_de_soporte({ tema: 'crear_ticket' }).length, 3)
	assert.equal(pasos_de_soporte({ tema: 'buscar_articulo_nombre' }).length, 3)
	assert.equal(pasos_de_soporte({ tema: 'buscar_articulo_codigo' }).length, 1)
	assert.equal(pasos_de_soporte({ tema: 'centro_recursos' }).length, 2)
	assert.equal(pasos_de_soporte({ tema: 'constructor' }).length, 0)
})

test('el texto personalizado no controla el ancla, el gancho ni la navegación', () => {
	const [paso] = pasos_de_soporte({
		tema: 'buscar_articulo_nombre',
		selector: 'body',
		antes: 'guardar_venta',
		ruta: { name: 'caja' },
		textos: ['Abrí el buscador para encontrar el artículo'],
	})
	assert.equal(paso.selector, '#search-article')
	assert.equal(paso.antes, 'abrir_buscador_articulos')
	assert.equal(paso.ruta.name, 'vender')
	assert.equal(paso.texto, 'Abrí el buscador para encontrar el artículo')
})

test('con el chat abierto el primer paso señala el encabezado sin perder la cuenta', () => {
	const guia = { tema: 'crear_ticket', textos: ['Abrí Soporte', 'Revisá tus tickets', 'Mandá un mensaje'] }
	const pasos = pasos_de_soporte(guia, true)
	assert.equal(pasos[0].ancla, 'soporte.encabezado')
	assert.equal(pasos[1].texto, guia.textos[1])
	assert.equal(pasos[2].texto, guia.textos[2])
	assert.equal(pasos_de_soporte(guia, false)[0].ancla, 'soporte.abrir')
})

function pregunta_con_error(error) {
	const corrida = { guia: { uuid: 'guia' }, paso: 2, pregunta_registrada: false, fin_pendiente: null }
	const avisos = []
	const eventos = []
	const vm = Object.assign(anfitrion.data(), anfitrion.methods, {
		activa: corrida,
		pregunta: '¿Cómo abro el ticket?',
		vaciar_eventos: () => Promise.resolve(),
		post: () => Promise.reject(error),
		evento: (...datos) => eventos.push(datos),
		$nextTick: () => {},
		$refs: {},
		$toast: { info: texto => avisos.push(texto) },
	})
	vm._motor = { cortar_tour: () => vm.terminar(corrida, { motivo: 'cortado' }) }
	return { vm, corrida, avisos, eventos }
}

test('si Empresa confirma la pregunta guardada, libera el tour sin reportar abandono', async (t) => {
	const documento = global.document
	global.document = { body: { classList: { remove: () => {} } } }
	t.after(() => { global.document = documento })
	const { vm, corrida, avisos, eventos } = pregunta_con_error({
		response: { status: 502, data: { ok: false, message: 'La pregunta quedó guardada y todavía no llegó a Soporte.' } },
	})
	await vm.enviar_pregunta()
	assert.equal(corrida.pregunta_registrada, true)
	assert.equal(vm.activa, null)
	assert.equal(vm.error_pregunta, '')
	assert.match(avisos[0], /quedó guardada/)
	assert.deepEqual(eventos, [])
})

test('si se pierde la respuesta, conserva la misma repregunta para reintentar', async () => {
	const { vm, corrida, avisos, eventos } = pregunta_con_error({ code: 'ECONNABORTED' })
	await vm.enviar_pregunta()
	assert.equal(vm.activa, corrida)
	assert.equal(corrida.pregunta_registrada, false)
	assert.equal(vm.pregunta, '¿Cómo abro el ticket?')
	assert.equal(vm.pregunta_bloqueada, true)
	assert.match(vm.error_pregunta, /Volvé a intentar/)
	assert.deepEqual(avisos, [])
	assert.deepEqual(eventos, [])
})
