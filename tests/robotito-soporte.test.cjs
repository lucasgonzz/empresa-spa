const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { pasos_de_soporte } = cargar('tours/soporte.js')
const nav = cargar('components/nav/Index.vue', { '@/components/robotito-soporte/Anfitrion': {} }).default
const anfitrion = cargar('components/robotito-soporte/Anfitrion.vue', {
	'./CabeceraTarjeta': {},
	'./Pregunta': {},
	'./Valoracion': {},
}).default
const historial = cargar('common-vue/components/import/ImportHistory.vue', {
	moment: {},
	'@/runtime_config': {},
}).default

test('la navegación confía en la capacidad de sesión propia y conserva los cortes técnicos', () => {
	const usuario = flags => ({ id: 11, ...flags })
	const robotito = (user, es_demo = false, auth = {}) => nav.computed.usuario_robotito.call({
		$store: { state: { auth: { authenticated: true, user, ...auth }, demo: { es_demo } } },
	})
	assert.equal(robotito(usuario({ robotito_soporte_habilitado: true, es_sesion_demo: true }), true), 11)
	assert.equal(robotito(usuario({ robotito_soporte_habilitado: false })), null)
	assert.equal(robotito(usuario({ robotito_soporte_habilitado: true, es_sesion_soporte: true })), null)
	assert.equal(robotito(usuario({ robotito_soporte_habilitado: true, es_acceso_maestro: true })), null)
	assert.equal(robotito(usuario({ robotito_soporte_habilitado: true }), false, { sesion_sin_conexion: {} }), null)
	assert.equal(robotito(usuario({ es_sesion_demo: true }), true), null)
	assert.equal(robotito(usuario({})), 11)
})

test('solo interpreta guiones conocidos y mantiene el número de pasos del contrato', () => {
	assert.equal(pasos_de_soporte({ tema: 'crear_ticket' }).length, 3)
	assert.equal(pasos_de_soporte({ tema: 'buscar_articulo_nombre' }).length, 3)
	assert.equal(pasos_de_soporte({ tema: 'buscar_articulo_codigo' }).length, 1)
	assert.equal(pasos_de_soporte({ tema: 'centro_recursos' }).length, 2)
	assert.equal(pasos_de_soporte({ tema: 'constructor' }).length, 0)
})

test('la guía de recargos requiere los interruptores y señala después el total de la venta', () => {
	const [recargos, total] = pasos_de_soporte({
		tema: 'guia_dinamica',
		pasos: [
			{ clave: 'vender.recargos', texto: 'Prendé el interruptor.' },
			{ clave: 'vender.total', texto: 'Revisá el total.' },
		],
	})
	assert.equal(recargos.ancla, 'vender.interruptores_recargos')
	assert.equal(recargos.antes, 'abrir_recargos_de_venta')
	assert.equal(recargos.requerido, true)
	assert.notEqual(recargos.avanza, 'clic')
	assert.deepEqual(recargos.ruta, { name: 'vender' })
	assert.equal(total.ancla, 'vender.total')
	assert.equal(total.antes, 'mostrar_total_de_venta')
	assert.deepEqual(total.ruta, recargos.ruta)
})

test('las exportaciones de Listado señalan su menú y sus dos controles reales', () => {
	const [menu, nueva, historial] = pasos_de_soporte({ tema: 'guia_dinamica', pasos: [
		{ clave: 'listado.submenu_exportacion', texto: 'Abrí Exportación.' },
		{ clave: 'listado.opcion_nueva_exportacion', texto: 'Tocá Nueva exportación.' },
		{ clave: 'listado.opcion_historial_exportaciones', texto: 'Tocá Historial de exportaciones.' },
	] })
	assert.equal(menu.ancla, 'listado.submenu_exportacion')
	assert.equal(nueva.ancla, 'listado.opcion_nueva_exportacion')
	assert.equal(historial.ancla, 'listado.opcion_historial_exportaciones')
	assert.equal(nueva.antes, 'abrir_menu_exportacion')
	assert.equal(nueva.avanza, 'clic')
})

test('la guía de pagos deja que el usuario abra el reparto y señala el formulario sin guardar', () => {
	const [boton, reparto] = pasos_de_soporte({ tema: 'guia_dinamica', pasos: [
		{ clave: 'vender.metodos_pago', texto: 'Tocá el +.' },
		{ clave: 'vender.reparto_pago', texto: 'Distribuí el importe.' },
	] })
	assert.equal(boton.selector, '[data-tour="vender.boton_cobrar"]:not(:disabled)')
	assert.equal(boton.antes, 'mostrar_boton_de_reparto')
	assert.equal(boton.avanza, 'clic')
	assert.equal(reparto.ancla, 'vender.reparto_pago')
	assert.equal(reparto.antes, undefined)
	assert.equal(reparto.avanza, undefined)
})

test('la guía de caja avanza con el historial elegido y explica cuándo aparece Reabrir', () => {
	const [historial, reabrir] = pasos_de_soporte({ tema: 'guia_dinamica', pasos: [
		{ clave: 'caja.historial_aperturas', texto: 'Elegí Aperturas en tu caja.' },
		{ clave: 'caja.reabrir_apertura', texto: 'Mirá el botón Reabrir.' },
	] })
	assert.deepEqual(historial.ruta, { name: 'caja' })
	assert.match(historial.selector, /^\.cont-table:has/)
	assert.equal(historial.selector_avance, '[data-tour="caja.historial_aperturas"]')
	assert.equal(historial.avanza, 'clic')
	assert.equal(reabrir.selector, '#aperturas-caja [data-tour="caja.reabrir_apertura"]:not(:disabled)')
	assert.equal(reabrir.antes, undefined)
	assert.equal(reabrir.avanza, undefined)
	assert.match(reabrir.si_falta, /caja cerrada/)
})

test('la valoración espera a que la persona salga del historial de exportaciones', () => {
	const vm = anfitrion.data()
	anfitrion.methods.modal_mostrado.call(vm, null, 'export-history')
	anfitrion.methods.modal_cerrado.call(vm, null, 'import-history')
	assert.equal(vm.modal_prioritario, 'export-history')
	anfitrion.methods.modal_cerrado.call(vm, null, 'export-history')
	assert.equal(vm.modal_prioritario, null)
})

test('salir de Listado libera el aviso aunque el historial se desmonte sin hidden', () => {
	const vm = Object.assign(anfitrion.data(), {
		modal_prioritario: 'export-history',
		para_valorar: { uuid: 'terminada' },
		pendientes: [{ uuid: 'nueva' }],
	})
	anfitrion.watch['$route.name'].call(vm, 'sale', 'article')
	assert.equal(vm.modal_prioritario, null)
	assert.equal(vm.para_valorar, null)
	assert.equal(anfitrion.computed.pendiente.call(vm).uuid, 'nueva')
})

test('los pasos dinámicos aceptan rutas conocidas, indicaciones y destinos exactos', () => {
	const tema = 'guia_dinamica'
	const texto = '<b>Esto se dibuja como texto.</b>'
	const pasos = pasos_de_soporte({ tema, pasos: [
		{ clave: 'vista.ventas', texto },
		{ clave: 'listado.revertir_importacion', texto, destino: 1059 },
		{ clave: 'indicacion', texto },
	] })
	assert.equal(pasos[0].ruta.name, 'sale')
	assert.equal(pasos[0].indicacion, true)
	assert.equal(pasos[1].ancla, 'listado.revertir_importacion.1059')
	assert.equal(pasos[2].texto, texto)
	assert.equal(pasos[2].indicacion, true)
	for (const invalido of [
		{ clave: 'indicacion', texto, selector: 'body' },
		{ clave: 'indicacion', texto, destino: 1 },
		{ clave: 'listado.revertir_importacion', texto, destino: '1059' },
		{ clave: 'constructor', texto },
	]) assert.deepEqual(pasos_de_soporte({ tema, pasos: [{ clave: 'indicacion', texto }, invalido] }), [])
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
		_capas_ocultas: new Set(),
		activa: corrida,
		pregunta: '¿Cómo abro el ticket?',
		vaciar_eventos: () => Promise.resolve(),
		post: () => Promise.reject(error),
		cargar: () => {},
		aceptar_guia: guia => avisos.push(guia.uuid),
		evento: (...datos) => eventos.push(datos),
		$nextTick: () => {},
		$refs: {},
		$toast: { info: texto => avisos.push(texto) },
	})
	vm._motor = { cortar_tour: () => vm.terminar(corrida, { motivo: 'cortado' }) }
	return { vm, corrida, avisos, eventos }
}

test('si Empresa guarda la pregunta, espera y abre solo el recorrido que responde a esa guía', async (t) => {
	const documento = global.document
	global.document = { body: { classList: { remove: () => {} } } }
	t.after(() => { global.document = documento })
	const { vm, corrida, avisos, eventos } = pregunta_con_error({
		response: { status: 502, data: { ok: false, code: 'question_saved' } },
	})
	t.after(() => vm.limpiar_espera())
	await vm.enviar_pregunta()
	assert.equal(corrida.pregunta_registrada, true)
	assert.equal(vm.activa, corrida)
	assert.equal(vm.error_pregunta, '')
	assert.match(vm.esperando_guia, /quedó guardada/)
	vm.pendientes = [{ uuid: 'otra' }, { uuid: 'de-otro-tour', previous_uuid: 'otro' }]
	vm.reformular_si_llego()
	assert.equal(vm.activa, corrida)
	vm.pendientes.push({ uuid: 'nueva', previous_uuid: 'guia' })
	vm.reformular_si_llego()
	assert.equal(vm.activa, null)
	assert.equal(vm.esperando_guia, '')
	assert.deepEqual(avisos, ['nueva'])
	assert.deepEqual(eventos, [])
})

test('cerrar la guía mientras espera conserva el aviso pendiente y cancela el inicio automático', async (t) => {
	const documento = global.document
	global.document = { body: { classList: { remove: () => {} } } }
	t.after(() => { global.document = documento })
	const { vm, corrida, avisos, eventos } = pregunta_con_error(null)
	vm.post = () => Promise.resolve({ data: { ok: true } })
	t.after(() => vm.limpiar_espera())
	await vm.enviar_pregunta()
	assert.equal(vm.activa, corrida)
	assert.match(vm.esperando_guia, /preparando los pasos/)
	vm._motor.cortar_tour()
	vm.pendientes = [{ uuid: 'nueva', previous_uuid: 'guia' }]
	vm.reformular_si_llego()
	assert.equal(anfitrion.computed.pendiente.call(vm).uuid, 'nueva')
	assert.deepEqual(avisos, [])
	assert.deepEqual(eventos, [])
})

test('un sondeo lento no descarta la guía que ya viene en camino', async () => {
	const peticiones = []
	const vm = Object.assign(anfitrion.data(), anfitrion.methods, {
		_retirados: new Set(),
		$axios: { get: () => new Promise(resolver => peticiones.push(resolver)) },
		escuchar: () => {},
		reformular_si_llego: () => {},
	})
	const consulta = vm.cargar()
	vm.cargar()
	assert.equal(peticiones.length, 1)
	peticiones[0]({ data: { model: [{ uuid: 'nueva', tema: 'guia_dinamica' }] } })
	await consulta
	assert.equal(vm.pendientes[0].uuid, 'nueva')
	assert.equal(peticiones.length, 2)
	peticiones[1]({ data: { model: [] } })
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
