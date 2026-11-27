// Ticket #177 (misión soporte-t177), criterios CA7 y CA8: cuando un reporte falla al buscar un rango de
// fechas, la pantalla no deja los totales del período anterior, muestra el mensaje del servidor (o uno
// genérico en castellano, nunca «Server Error») y avisa una sola vez por búsqueda.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

// Los submódulos del store (importan axios y la config de runtime) se reemplazan por vacíos: acá solo
// se prueba el store de reportes.
const SUBMODULOS = {
	'@/runtime_config': { env: () => '' },
	'@/store/reportes/article_performance': { __esModule: true, default: {} },
	'@/store/reportes/font': { __esModule: true, default: {} },
	'@/store/reportes/article_purchase': { __esModule: true, default: {} },
}

/**
 * Carga el store de reportes con un axios falso cuyo get() responde lo que diga `responder`.
 *
 * @param {Function} responder (url, config) => Promise
 * @returns {{modulo: object, pedidos: Array}}
 */
function cargar_store(responder) {
	const pedidos = []
	const axios = {
		defaults: {},
		get: (url, config) => {
			pedidos.push({ url: url, config: config })
			return responder(url, config)
		},
	}
	const modulo = cargar('store/reportes/index.js', Object.assign({
		axios: { __esModule: true, default: axios },
		moment: require('moment'),
	}, SUBMODULOS))
	return { modulo: modulo, pedidos: pedidos }
}

/** Contexto de Vuex de mentira: commit aplica la mutación real sobre el state real del store. */
function contexto(store) {
	const ctx = {
		state: JSON.parse(JSON.stringify(store.default.state)),
		commit: (nombre, valor) => {
			assert.ok(store.default.mutations[nombre], 'Falta la mutación ' + nombre)
			store.default.mutations[nombre](ctx.state, valor)
		},
		dispatch: (nombre, valor) => store.default.actions[nombre](ctx, valor),
		rootState: {},
	}
	return ctx
}

const rechazo = (status, data) => Promise.reject({ response: { status: status, data: data } })
const GENERICO = 'No pudimos calcular el reporte para esas fechas. Probá de nuevo en un momento; si sigue pasando, avisanos por soporte.'

// Las 4 acciones: nombre, campo de datos que se limpia, campo de error y mutación que lo llena.
const ACCIONES = [
	{ accion: 'getEstadoResultados', datos: 'estado_resultados', error: 'error_estado_resultados', url: 'api/reportes/estado-resultados', viejo: { ventas_brutas: 999 } },
	{ accion: 'getPosicionFiscal', datos: 'posicion_fiscal', error: 'error_posicion_fiscal', url: 'api/reportes/posicion-fiscal', viejo: { iva: 1 } },
	{ accion: 'getFlujoCaja', datos: 'flujo_caja', error: 'error_flujo_caja', url: 'api/reportes/flujo-caja', viejo: { total_ingresos: 5 } },
]

ACCIONES.forEach(caso => {
	test('CA7 ' + caso.accion + ': un 422 limpia los datos viejos y deja el mensaje del servidor', () => {
		const { modulo, pedidos } = cargar_store(() => rechazo(422, {
			message: 'The given data was invalid.',
			errors: { hasta: ['La fecha "Hasta" no es válida. Elegila de nuevo en el calendario.'] },
		}))
		const ctx = contexto(modulo)
		ctx.state[caso.datos] = caso.viejo
		return modulo.default.actions[caso.accion](ctx).then(() => {
			assert.deepEqual(ctx.state[caso.datos], {})
			assert.equal(ctx.state[caso.error], 'La fecha "Hasta" no es válida. Elegila de nuevo en el calendario.')
			assert.equal(ctx.state[caso.datos + '_loading'], false)
			// CA8: banderas para que el interceptor global no apile un toast por pedido.
			assert.equal(pedidos[0].url, caso.url)
			assert.equal(pedidos[0].config.skip_global_error_event, true)
			assert.equal(pedidos[0].config.skip_global_validation_toast, true)
		})
	})

	test('CA7 ' + caso.accion + ': un 500 «Server Error» muestra el texto genérico, nunca «Server Error»', () => {
		const { modulo } = cargar_store(() => rechazo(500, { message: 'Server Error' }))
		const ctx = contexto(modulo)
		ctx.state[caso.datos] = caso.viejo
		return modulo.default.actions[caso.accion](ctx).then(() => {
			assert.deepEqual(ctx.state[caso.datos], {})
			assert.equal(ctx.state[caso.error], GENERICO)
			assert.ok(!/server error/i.test(ctx.state[caso.error]))
		})
	})

	test('CA7 ' + caso.accion + ': sin respuesta (red caída) también es el texto genérico', () => {
		const { modulo } = cargar_store(() => Promise.reject(new Error('Network Error')))
		const ctx = contexto(modulo)
		return modulo.default.actions[caso.accion](ctx).then(() => {
			assert.equal(ctx.state[caso.error], GENERICO)
		})
	})

	test('CA7 ' + caso.accion + ': una búsqueda exitosa posterior limpia el error', () => {
		let fallar = true
		const nuevo = {}
		nuevo[caso.datos] = { ok: 1 }
		const { modulo } = cargar_store(() => fallar ? rechazo(500, { message: 'Server Error' }) : Promise.resolve({ data: nuevo }))
		const ctx = contexto(modulo)
		return modulo.default.actions[caso.accion](ctx).then(() => {
			assert.notEqual(ctx.state[caso.error], '')
			fallar = false
			return modulo.default.actions[caso.accion](ctx)
		}).then(() => {
			assert.equal(ctx.state[caso.error], '')
			assert.deepEqual(ctx.state[caso.datos], { ok: 1 })
		})
	})
})

test('CA7 getReportes (company-performance): un 422 limpia model y meses_anteriores y deja el mensaje', () => {
	const { modulo, pedidos } = cargar_store(() => rechazo(422, {
		message: 'El rango no puede superar los 12 meses.',
	}))
	const ctx = contexto(modulo)
	ctx.state.model = { total_vendido: 1000 }
	ctx.state.meses_anteriores = [{ mes: 'agosto' }]
	return modulo.default.actions.getReportes(ctx).then(() => {
		assert.deepEqual(ctx.state.model, {})
		assert.deepEqual(ctx.state.meses_anteriores, [])
		assert.equal(ctx.state.error_reportes, 'El rango no puede superar los 12 meses.')
		assert.equal(ctx.state.loading, false)
		assert.equal(pedidos[0].config.skip_global_error_event, true)
		assert.equal(pedidos[0].config.skip_global_validation_toast, true)
	})
})

test('CA7 getReportes: un 500 deja el texto genérico y un éxito posterior lo limpia', () => {
	let fallar = true
	const { modulo } = cargar_store(() => fallar ? rechazo(500, { message: 'Server Error' }) : Promise.resolve({ data: { model: { a: 1 }, meses_anteriores: [] } }))
	const ctx = contexto(modulo)
	return modulo.default.actions.getReportes(ctx).then(() => {
		assert.equal(ctx.state.error_reportes, GENERICO)
		fallar = false
		return modulo.default.actions.getReportes(ctx)
	}).then(() => {
		assert.equal(ctx.state.error_reportes, '')
		assert.deepEqual(ctx.state.model, { a: 1 })
	})
})

test('CA7 mensaje_de_error_de_reporte: 422 con errors devuelve el primer error; 5xx y sin respuesta, el genérico', () => {
	const { modulo } = cargar_store(() => Promise.resolve({ data: {} }))
	const mensaje = modulo.mensaje_de_error_de_reporte
	assert.equal(mensaje({ response: { status: 422, data: { message: 'The given data was invalid.', errors: { desde: ['Primero', 'Segundo'], hasta: ['Tercero'] } } } }), 'Primero')
	assert.equal(mensaje({ response: { status: 422, data: { message: 'Texto claro' } } }), 'Texto claro')
	assert.equal(mensaje({ response: { status: 500, data: { message: 'Server Error' } } }), GENERICO)
	assert.equal(mensaje({ response: { status: 503, data: {} } }), GENERICO)
	assert.equal(mensaje({}), GENERICO)
	assert.equal(mensaje(undefined), GENERICO)
	// Un 4xx que traiga literalmente «Server Error» tampoco se muestra.
	assert.equal(mensaje({ response: { status: 400, data: { message: 'Server Error' } } }), GENERICO)
})

const SESION = 'Tu sesión venció o no tenés permiso para ver este reporte. Volvé a ingresar y probá de nuevo.'

test('CA7 401/403: las 4 acciones en paralelo dejan el mensaje de sesión en castellano y no despachan errorEvent a mano', () => {
	// El aviso de sesión lo da Reportes (un toast en buscar()): el store no despacha errorEvent.
	const eventos = []
	global.CustomEvent = class { constructor(tipo, init) { this.type = tipo; this.detail = init && init.detail } }
	global.document = { dispatchEvent: evento => eventos.push(evento) }
	const campos = { getEstadoResultados: 'error_estado_resultados', getPosicionFiscal: 'error_posicion_fiscal', getFlujoCaja: 'error_flujo_caja', getReportes: 'error_reportes' }
	const intentos = [401, 403].map(status => {
		const { modulo } = cargar_store(() => rechazo(status, { message: status == 401 ? 'Unauthenticated.' : 'This action is unauthorized.' }))
		const ctx = contexto(modulo)
		return Promise.all(Object.keys(campos).map(accion => modulo.default.actions[accion](ctx))).then(() => {
			Object.keys(campos).forEach(accion => {
				assert.equal(ctx.state[campos[accion]], SESION)
				assert.ok(!/unauthenticated|unauthorized|server error/i.test(ctx.state[campos[accion]]))
			})
		})
	})
	return Promise.all(intentos).then(() => {
		assert.equal(eventos.length, 0)
	}).finally(() => {
		delete global.document
		delete global.CustomEvent
	})
})

test('CA7 mensaje_de_error_de_reporte: 401 y 403 devuelven el aviso de sesión en castellano', () => {
	const { modulo } = cargar_store(() => Promise.resolve({ data: {} }))
	assert.equal(modulo.mensaje_de_error_de_reporte({ response: { status: 401, data: { message: 'Unauthenticated.' } } }), SESION)
	assert.equal(modulo.mensaje_de_error_de_reporte({ response: { status: 403, data: { message: 'Forbidden' } } }), SESION)
})

test('CA8 buscar(): con sesión vencida (las 4 secciones iguales) muestra UN toast en castellano con el aviso de sesión', () => {
	const avisos = []
	const estado = { error_reportes: SESION, error_estado_resultados: SESION, error_posicion_fiscal: SESION, error_flujo_caja: SESION }
	const vista = {
		$store: { state: { reportes: estado }, dispatch: () => Promise.resolve() },
		$toast: { error: texto => avisos.push(texto) },
	}
	return SeleccionarFecha.methods.buscar.call(vista).then(() => {
		assert.deepEqual(avisos, [SESION])
		assert.ok(!/unauthenticated|unauthorized|server error/i.test(avisos[0]))
	})
})

// ---------------------------------------------------------------------------------------------------
// CA8: seleccionar-fecha/Index.vue
// ---------------------------------------------------------------------------------------------------
const SeleccionarFecha = cargar('components/reportes/components/seleccionar-fecha/Index.vue', {
	'@/common-vue/mixins/horizontal_nav_scroll': { __esModule: true, default: {} },
}).default

test('CA8 buscar(): cuatro pedidos que fallan con el mismo mensaje muestran un solo aviso', () => {
	const avisos = []
	const estado = { error_reportes: '', error_estado_resultados: '', error_posicion_fiscal: '', error_flujo_caja: '' }
	const vista = {
		$store: {
			state: { reportes: estado },
			// Cada acción falsa deja su error en el state, como hace el store real, y resuelve.
			dispatch: nombre => {
				const campo = { 'reportes/getReportes': 'error_reportes', 'reportes/getEstadoResultados': 'error_estado_resultados', 'reportes/getPosicionFiscal': 'error_posicion_fiscal', 'reportes/getFlujoCaja': 'error_flujo_caja' }[nombre]
				estado[campo] = 'El rango no puede superar los 12 meses.'
				return Promise.resolve()
			},
		},
		$toast: { error: texto => avisos.push(texto) },
	}
	return SeleccionarFecha.methods.buscar.call(vista).then(() => {
		assert.deepEqual(avisos, ['El rango no puede superar los 12 meses.'])
	})
})

test('CA8 buscar(): sin errores no avisa nada; con mensajes distintos los junta en un solo aviso', () => {
	const avisos = []
	const estado = { error_reportes: '', error_estado_resultados: '', error_posicion_fiscal: '', error_flujo_caja: '' }
	const vista = {
		$store: { state: { reportes: estado }, dispatch: () => Promise.resolve() },
		$toast: { error: texto => avisos.push(texto) },
	}
	return SeleccionarFecha.methods.buscar.call(vista).then(() => {
		assert.equal(avisos.length, 0)
		estado.error_reportes = 'Uno'
		estado.error_flujo_caja = 'Dos'
		return SeleccionarFecha.methods.buscar.call(vista)
	}).then(() => {
		assert.equal(avisos.length, 1)
		assert.ok(avisos[0].includes('Uno') && avisos[0].includes('Dos'))
	})
})

test('CA8 fecha_invalida rechaza años mal escritos además de desde > hasta', () => {
	const invalida = (desde, hasta) => SeleccionarFecha.computed.fecha_invalida.call({ mes_inicio: desde, mes_fin: hasta })
	assert.equal(invalida('2026-10-01', '20261-11-27'), true)
	assert.equal(invalida('0202-11-01', '2026-11-27'), true)
	assert.equal(invalida('1999-12-31', '2026-11-27'), true)
	assert.equal(invalida('2026-11-27', '2101-01-01'), true)
	assert.equal(invalida('2026-11-30', '2026-11-01'), true)
	assert.equal(invalida('2026-09-01', '2026-09-30'), false)
	assert.equal(invalida('', '2026-09-30'), false)
})
