const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { pasos_de_soporte } = cargar('tours/soporte.js')
const anfitrion = cargar('components/robotito-soporte/Anfitrion.vue', {
	'./Pregunta': {},
	'./Valoracion': {},
}).default
const historial = cargar('common-vue/components/import/ImportHistory.vue', {
	moment: {},
	'@/runtime_config': {},
}).default

test('solo interpreta guiones conocidos y mantiene el número de pasos del contrato', () => {
	assert.equal(pasos_de_soporte({ tema: 'crear_ticket' }).length, 3)
	assert.equal(pasos_de_soporte({ tema: 'buscar_articulo_nombre' }).length, 3)
	assert.equal(pasos_de_soporte({ tema: 'buscar_articulo_codigo' }).length, 1)
	assert.equal(pasos_de_soporte({ tema: 'centro_recursos' }).length, 2)
	assert.equal(pasos_de_soporte({ tema: 'aplicar_recargo_venta' }).length, 2)
	assert.equal(pasos_de_soporte({ tema: 'constructor' }).length, 0)
})

test('la guía de recargos requiere los interruptores y señala después el total de la venta', () => {
	const [recargos, total] = pasos_de_soporte({ tema: 'aplicar_recargo_venta' })
	assert.equal(recargos.ancla, 'vender.interruptores_recargos')
	assert.equal(recargos.antes, 'abrir_recargos_de_venta')
	assert.equal(recargos.requerido, true)
	assert.notEqual(recargos.avanza, 'clic')
	assert.deepEqual(recargos.ruta, { name: 'vender' })
	assert.equal(total.ancla, 'vender.total')
	assert.equal(total.antes, 'mostrar_total_de_venta')
	assert.deepEqual(total.ruta, recargos.ruta)
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

test('la guía de importación señala solo el botón del ID verificado', () => {
	const guia = {
		tema: 'revertir_importacion_articulos',
		import_history_id: 1059,
		textos: ['Flechita de Crear', 'Historial', 'Importación que consultaste'],
	}
	const pasos = pasos_de_soporte(guia)
	assert.equal(pasos.length, 3)
	assert.equal(pasos[0].ruta.name, 'article')
	assert.equal(pasos[1].ancla, 'listado.opcion_historial_importaciones')
	assert.equal(pasos[2].ancla, 'listado.revertir_importacion.1059')
	assert.equal(pasos[2].texto, guia.textos[2])
	for (const id of [null, 0, 1.5, '1059', '1"] [data-tour="otro', Number.MAX_SAFE_INTEGER + 1]) {
		assert.deepEqual(pasos_de_soporte({ ...guia, import_history_id: id }), [])
	}
})

test('el botón se vuelve ancla solo cuando la página confirma esa importación y sigue siendo reversible', () => {
	const ancla = historial.methods.ancla_del_tour.bind({ importacion_del_tour_cargada: 1059 })
	assert.equal(ancla({ id: 1059, can_revert: true }), 'listado.revertir_importacion.1059')
	assert.equal(ancla({ id: 1060, can_revert: true }), null)
	assert.equal(ancla({ id: 1059, can_revert: false }), null)
	assert.equal(ancla({ id: 1059 }), null)
})

test('avanzar desde la viñeta también abre el historial y pide el ID exacto', () => {
	const llamadas = []
	const vm = Object.assign({}, historial.methods, {
		$bvModal: { show: id => llamadas.push(['abrir', id]) },
		getModels: id => llamadas.push(['buscar', id]),
	})
	vm.buscar_importacion_del_tour(1059)
	vm.historial_abierto()
	assert.deepEqual(llamadas, [['abrir', 'import-history'], ['buscar', 1059]])
	assert.equal(vm._importacion_a_buscar_al_abrir, null)
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
		response: { status: 502, data: { ok: false, code: 'question_saved' } },
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
