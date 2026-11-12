// Recorridos de Robotito que guían en la pantalla (misión robotito-tour-guiado, 12/11/2026).
//
// El defecto de origen (ticket 104): cinco tarjetas de texto centradas sobre un fondo oscuro mientras la
// pantalla de atrás seguía en otra solapa del ABM. Acá se fija lo que lo corrige: las solapas del ABM son
// pasos con ruta y ancla, una indicación sin ancla va acoplada y sin fondo, y un ancla que no aparece cae
// a esa misma tarjeta en vez de cortar el recorrido.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')
const { generar, serializar, DESTINO } = require('../scripts/generar-catalogo-soporte.cjs')

const catalogo = cargar('tours/catalogo-soporte.json')
const { pasos_dinamicos } = cargar('tours/soporte-dinamico.js')

test('el catálogo commiteado es el que sale del código y sus claves pasan la validación del Admin', () => {
	assert.equal(fs.readFileSync(DESTINO, 'utf8').replace(/\r\n/g, '\n'), serializar(generar()),
		'El catálogo quedó viejo: corré node scripts/generar-catalogo-soporte.cjs --api ../empresa-api')

	const claves = catalogo.abm.map(entrada => entrada.clave)
	assert.equal(new Set(claves).size, claves.length, 'No hay dos solapas con la misma clave.')
	// El Admin acepta /^[a-z0-9_.]{1,80}$/ y empresa-api hasta 80 caracteres.
	claves.forEach(clave => assert.match(clave, /^[a-z0-9_.]{1,80}$/, clave))

	const impuestos = catalogo.abm.find(entrada => entrada.clave === 'abm.solapa.precios.impuestos_sobre_ventas')
	assert.deepEqual(impuestos, {
		clave: 'abm.solapa.precios.impuestos_sobre_ventas',
		tipo: 'solapa',
		grupo: 'Precios',
		texto: 'Impuestos sobre ventas',
		view: 'precios',
		sub_view: 'impuestos-sobre-ventas',
		sub_view_inicial: 'listas-de-precios',
		extenciones: [],
	})
	assert.deepEqual(catalogo.abm.find(entrada => entrada.clave === 'abm.solapa.integraciones.whatsapp_bot').extenciones, ['agentes_ia'])
	assert.equal(catalogo.abm.some(entrada => entrada.view === 'balanzas'), false, 'Lo que depende de la configuración del dueño no se ofrece.')
	assert.ok(catalogo.pantallas.some(pantalla => pantalla.clave === 'vista.listado'))
	assert.ok(catalogo.controles.some(control => control.clave === 'soporte.abrir' && control.ancla === 'soporte.abrir'))
})

test('las solapas del ABM llevan en la pantalla el mismo data-tour que publica el catálogo', () => {
	const abm = cargar('common-vue/views/Abm.vue', { '@/router/routes': {}, '@/common-vue/mixins/generals': { cumple_config_del_dueno: () => true } }).default
	const grupos = cargar('mixins/abm.js').default.computed.abm_views.call({ owner: null })
	const vista = {
		abm_views: grupos,
		idiom: 'es',
		hasExtencion: () => true,
		plural: modelo => fs.readFileSync(require('node:path').join(__dirname, '..', 'src', 'models', modelo + '.js'), 'utf8')
			.match(/plural_model_name_spanish\s*:\s*(['"])(.*?)\1/)[2],
		componentForModel: () => null,
	}

	const anclas = abm.computed.views.call(vista).map(item => item.data_tour)
	grupos.forEach(function (grupo) {
		grupo.models.forEach(modelo => anclas.push(abm.methods.buildItem.call(vista, modelo, grupo).data_tour))
	})

	catalogo.abm.forEach(entrada => assert.ok(anclas.includes(entrada.clave), entrada.clave + ' no tiene ancla en Abm.vue'))
	assert.equal(abm.methods.buildItem.call(vista, 'category', null).data_tour, undefined, 'Un ABM sin grupos no lleva ancla.')
})

test('el recorrido del ticket 104 señala Precios e Impuestos sobre ventas y deja las indicaciones en esa solapa', () => {
	const pasos = pasos_dinamicos([
		{ clave: 'abm.grupo.precios', texto: 'Dentro de ABM, tocá Precios.' },
		{ clave: 'abm.solapa.precios.impuestos_sobre_ventas', texto: 'Ahora tocá Impuestos sobre ventas.' },
		{ clave: 'indicacion', texto: 'Abrí Ingresos Brutos.' },
		{ clave: 'indicacion', texto: 'Destildá Activo y guardá.' },
		{ clave: 'vista.listado', texto: 'Así queda el Listado.' },
		{ clave: 'indicacion', texto: 'Revisá un precio.' },
	])
	const destino = { name: 'abm', params: { view: 'precios', sub_view: 'impuestos-sobre-ventas' } }

	assert.equal(pasos.length, 6)
	const [grupo, solapa, abrir, destildar, listado, revisar] = pasos

	assert.equal(grupo.ancla, 'abm.grupo.precios')
	assert.equal(grupo.avanza, 'clic', 'Tocar la solapa señalada avanza el paso.')
	assert.deepEqual(grupo.ruta, { name: 'abm', params: { view: 'articulos', sub_view: 'categorias' } })
	assert.deepEqual(grupo.ruta_suficiente, { name: 'abm' }, 'Si ya está en el ABM no se la mueve.')

	assert.equal(solapa.ancla, 'abm.solapa.precios.impuestos_sobre_ventas')
	assert.equal(solapa.avanza, 'clic')
	assert.deepEqual(solapa.ruta, { name: 'abm', params: { view: 'precios', sub_view: 'listas-de-precios' } })
	assert.deepEqual(solapa.ruta_suficiente, { name: 'abm', params: { view: 'precios' } })
	assert.ok(solapa.techo_ms <= 5000, 'Una solapa que no está no deja esperando.')

	assert.equal(abrir.indicacion, true)
	assert.deepEqual(abrir.ruta, destino, 'Quien avanza con Siguiente igual llega a la solapa de la que se habla.')
	assert.deepEqual(destildar.ruta, destino)
	assert.equal(abrir.ancla, undefined)

	assert.deepEqual(listado.ruta, { name: 'article' })
	assert.equal(revisar.ruta, undefined, 'Después de otra pantalla la indicación ya no hereda la solapa.')
})

test('las claves anteriores se compilan igual y una clave desconocida sigue invalidando la guía', () => {
	assert.deepEqual(pasos_dinamicos([{ clave: 'indicacion', texto: 'Revisá la venta.' }]),
		[{ foco: false, requerido: true, texto: 'Revisá la venta.', indicacion: true }])
	assert.deepEqual(pasos_dinamicos([{ clave: 'vista.abm', texto: 'Este es el ABM.' }]),
		[{ foco: false, requerido: true, texto: 'Este es el ABM.', ruta: { name: 'abm', params: { view: 'articulos', sub_view: 'categorias' } }, indicacion: true }])
	assert.deepEqual(pasos_dinamicos([{ clave: 'abm.solapa.precios.no_existe', texto: 'x' }]), [])
	assert.deepEqual(pasos_dinamicos([{ clave: 'abm.grupo.precios', texto: 'x', destino: 3 }]), [])
})

// --- El motor, con driver.js y el DOM reemplazados por dobles ---------------------------------------

function entorno_del_motor() {
	const clases = new Set()
	const oyentes = []
	const resaltados = []
	const decorados = []
	const anterior = { document: global.document, window: global.window }

	global.document = {
		body: {
			classList: {
				add: (...nombres) => nombres.forEach(nombre => clases.add(nombre)),
				remove: (...nombres) => nombres.forEach(nombre => clases.delete(nombre)),
				contains: nombre => clases.has(nombre),
			},
		},
		querySelectorAll: () => [],
		querySelector: () => null,
		addEventListener: (tipo, oyente) => oyentes.push({ tipo: tipo, oyente: oyente }),
		removeEventListener: (tipo, oyente) => {
			const i = oyentes.findIndex(item => item.tipo === tipo && item.oyente === oyente)
			if (i !== -1) oyentes.splice(i, 1)
		},
	}
	global.window = {}

	let config = null
	const motor = cargar('tours/motor.js', {
		'driver.js': {
			driver: function (opciones) {
				config = opciones
				return {
					highlight: function (paso) {
						// driver.js prende `driver-active` en el primer highlight y deja el resto inerte.
						clases.add('driver-active')
						resaltados.push(paso)
						opciones.onPopoverRender({ nextButton: { style: {} }, previousButton: { style: {} }, description: { style: {} } })
					},
					refresh: () => {},
					destroy: () => clases.delete('driver-active'),
				}
			},
		},
		'driver.js/dist/driver.css': {},
		'@/tours/catalogo': { default: {} },
		'@/tours/ganchos': { default: {} },
	})

	return {
		motor: motor,
		clases: clases,
		oyentes: oyentes,
		resaltados: resaltados,
		decorados: decorados,
		siguiente: () => config.onNextClick(),
		restaurar: () => {
			motor.cortar_tour()
			global.document = anterior.document
			global.window = anterior.window
		},
	}
}

function contexto_de(entorno, extra) {
	const router = { currentRoute: { name: 'abm', params: { view: 'precios', sub_view: 'descuentos' } }, empujes: [] }
	router.push = function (ruta) {
		router.empujes.push(ruta)
		router.currentRoute = { name: ruta.name, params: ruta.params || {} }
		return Promise.resolve()
	}
	return Object.assign({
		router: router,
		texto_plano: true,
		clase_popover: 'tour-soporte',
		al_faltar_pasos: () => {},
		decorar_popover: (popover, refrescar, estado) => entorno.decorados.push(estado),
	}, extra)
}

const esperar = ms => new Promise(resolver => setTimeout(resolver, ms))

test('una indicación de la guía dinámica va acoplada: sin fondo, con la pantalla usable y sin la trampa de teclas de driver', async () => {
	const entorno = entorno_del_motor()
	try {
		const contexto = contexto_de(entorno, { indicacion_acoplada: true })
		assert.equal(entorno.motor.iniciar_tour({ id: 'robotito-soporte', pasos: [
			{ indicacion: true, texto: 'Buscá Ingresos Brutos.', ruta: { name: 'abm', params: { view: 'precios', sub_view: 'impuestos-sobre-ventas' } } },
		] }, contexto), true)
		await esperar(700)

		assert.deepEqual(contexto.router.empujes, [{ name: 'abm', params: { view: 'precios', sub_view: 'impuestos-sobre-ventas' } }], 'Navega antes de mostrar la tarjeta.')
		assert.equal(entorno.resaltados.length, 1)
		assert.equal(entorno.resaltados[0].element, undefined)
		assert.equal(entorno.resaltados[0].popover.popoverClass, 'tour-soporte tour-tarjeta-acoplada')
		assert.ok(entorno.clases.has('tour-tarjeta-acoplada'))
		assert.equal(entorno.clases.has('driver-active'), false, 'Sin driver-active el resto de la página recibe los clics.')
		assert.deepEqual(entorno.decorados, [{ acoplada: true }])

		// Tab y Escape no llegan a window, que es donde driver.js los atiende; el resto de las teclas sí.
		const teclas = entorno.oyentes.filter(item => item.tipo === 'keydown')
		assert.equal(teclas.length, 1)
		const frenadas = []
		;['Tab', 'Escape', 'Enter'].forEach(tecla => teclas[0].oyente({ key: tecla, stopPropagation: () => frenadas.push(tecla) }))
		assert.deepEqual(frenadas, ['Tab', 'Escape'])

		entorno.motor.cortar_tour()
		assert.equal(entorno.clases.has('tour-tarjeta-acoplada'), false)
		assert.equal(entorno.oyentes.filter(item => item.tipo === 'keydown' || item.tipo === 'keyup').length, 0)
	} finally {
		entorno.restaurar()
	}
})

test('si el ancla no aparece en su techo, el paso cae a la tarjeta acoplada en vez de cortar el recorrido', async () => {
	const entorno = entorno_del_motor()
	try {
		const terminados = []
		const contexto = contexto_de(entorno, { indicacion_acoplada: true, al_terminar: resultado => terminados.push(resultado) })
		entorno.motor.iniciar_tour({ id: 'robotito-soporte', pasos: [{
			ancla: 'abm.solapa.precios.impuestos_sobre_ventas', avanza: 'clic', requerido: true, techo_ms: 300, texto: 'Tocá Impuestos sobre ventas.',
			ruta: { name: 'abm', params: { view: 'precios', sub_view: 'listas-de-precios' } },
			ruta_suficiente: { name: 'abm', params: { view: 'precios' } },
		}] }, contexto)
		await esperar(900)

		assert.deepEqual(contexto.router.empujes, [], 'Ya estaba en ABM → Precios: no se la mueve de solapa.')
		assert.equal(entorno.resaltados.length, 1)
		assert.equal(entorno.resaltados[0].element, undefined)
		assert.match(entorno.resaltados[0].popover.popoverClass, /tour-tarjeta-acoplada/)
		assert.deepEqual(terminados, [], 'El recorrido sigue abierto.')
	} finally {
		entorno.restaurar()
	}
})

test('sin la opción (la demo y los tours fijos) la indicación queda centrada y un ancla requerida que falta corta como antes', async () => {
	const entorno = entorno_del_motor()
	try {
		let contexto = contexto_de(entorno)
		entorno.motor.iniciar_tour({ id: 'fijo', pasos: [{ indicacion: true, texto: 'Mirá esto.' }] }, contexto)
		await esperar(50)
		assert.equal(entorno.resaltados[0].popover.popoverClass, undefined)
		assert.equal(entorno.resaltados[0].popover.side, 'over')
		assert.ok(entorno.clases.has('driver-active'))
		assert.equal(entorno.clases.has('tour-tarjeta-acoplada'), false)
		assert.equal(entorno.oyentes.length, 0)
		assert.deepEqual(entorno.decorados, [{ acoplada: false }])

		const terminados = []
		contexto = contexto_de(entorno, { al_terminar: resultado => terminados.push(resultado) })
		entorno.motor.iniciar_tour({ id: 'fijo', pasos: [{ ancla: 'no.existe', requerido: true, techo_ms: 300, texto: 'x' }] }, contexto)
		await esperar(900)
		assert.equal(entorno.resaltados.length, 1, 'No se dibujó ninguna tarjeta nueva.')
		assert.equal(terminados.length, 1)
		assert.equal(terminados[0].motivo, 'cortado')
	} finally {
		entorno.restaurar()
	}
})

test('al pasar de una indicación acoplada a un control resaltado vuelve el modo normal de driver', async () => {
	const entorno = entorno_del_motor()
	try {
		const contexto = contexto_de(entorno, { indicacion_acoplada: true })
		entorno.motor.iniciar_tour({ id: 'robotito-soporte', pasos: [
			{ indicacion: true, texto: 'Primero mirá la pantalla.' },
			{ indicacion: true, texto: 'Ahora el control.' },
		] }, contexto)
		await esperar(50)
		assert.ok(entorno.clases.has('tour-tarjeta-acoplada'))

		// El segundo paso se muestra sin acoplar (como lo haría un paso con ancla): se simula con un
		// contexto que deja de pedir la tarjeta acoplada.
		contexto.indicacion_acoplada = false
		entorno.siguiente()
		await esperar(50)
		assert.equal(entorno.resaltados.length, 2)
		assert.equal(entorno.clases.has('tour-tarjeta-acoplada'), false)
		assert.ok(entorno.clases.has('driver-active'), 'El control resaltado vuelve a ser lo único que recibe clics.')
		assert.equal(entorno.oyentes.length, 0)
	} finally {
		entorno.restaurar()
	}
})

test('el anfitrión pide la tarjeta acoplada solo para la guía dinámica y deja mover la tarjeta', () => {
	const fuente = fs.readFileSync(require('node:path').join(__dirname, '..', 'src', 'components', 'robotito-soporte', 'Anfitrion.vue'), 'utf8')
	assert.match(fuente, /indicacion_acoplada: guia\.tema === TEMA_GUIA_DINAMICA/)
	assert.match(fuente, /body\.tour-tarjeta-acoplada \.driver-overlay\s+display: none !important/)

	const anfitrion = cargar('components/robotito-soporte/Anfitrion.vue', { './CabeceraTarjeta': {}, './Pregunta': {}, './Valoracion': {} }).default
	const anterior = global.document
	const clases = new Set()
	const boton = { atributos: {}, setAttribute(nombre, valor) { this.atributos[nombre] = valor }, addEventListener(tipo, oyente) { this.clic = oyente } }
	global.document = { createElement: () => boton }
	try {
		const insertados = []
		const popover = {
			footer: {},
			wrapper: {
				querySelector: () => null,
				insertBefore: (nodo, antes) => insertados.push([nodo, antes]),
				classList: { toggle: (nombre, activo) => (activo ? clases.add(nombre) : clases.delete(nombre)) },
			},
		}
		const vm = { _tarjeta_arriba: false }
		anfitrion.methods.agregar_boton_mover.call(vm, popover)
		assert.deepEqual(insertados, [[boton, popover.footer]])
		assert.equal(boton.textContent, 'Mover arriba')
		boton.clic()
		assert.equal(boton.textContent, 'Mover abajo')
		assert.ok(clases.has('tour-tarjeta-acoplada--arriba'))
		assert.equal(vm._tarjeta_arriba, true, 'La posición elegida se conserva para el paso siguiente.')
	} finally {
		global.document = anterior
	}
})
