// Reintentos de las ventas offline que el servidor no pudo guardar (mision panchito-venta-price-vender,
// 1/11/2026). Funciones puras: se cargan sin navegador con tests/helpers/cargar_modulo_esm.cjs.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const {
	PAUSAS_ENTRE_REINTENTOS_MS,
	CAMPOS_LOCALES_DE_REINTENTO,
	pausa_tras_fallos,
	esta_en_espera,
	campos_tras_fallo_de_servidor,
	debe_avisar_el_fallo,
} = cargar('offline/reintentos_de_ventas.js')

const MINUTO = 60 * 1000
const AHORA = Date.UTC(2026, 10, 1, 21, 0, 0)

test('la pausa crece 1, 2, 5, 15 y 60 minutos y se queda en 60', () => {
	assert.deepEqual(PAUSAS_ENTRE_REINTENTOS_MS, [1 * MINUTO, 2 * MINUTO, 5 * MINUTO, 15 * MINUTO, 60 * MINUTO])
	assert.equal(pausa_tras_fallos(1), 1 * MINUTO)
	assert.equal(pausa_tras_fallos(3), 5 * MINUTO)
	assert.equal(pausa_tras_fallos(5), 60 * MINUTO)
	assert.equal(pausa_tras_fallos(500), 60 * MINUTO, 'el tope es de una hora, no crece mas')
	assert.equal(pausa_tras_fallos(0), 1 * MINUTO)
	assert.equal(pausa_tras_fallos(undefined), 1 * MINUTO)
})

test('un fallo del servidor NUNCA marca la venta como rechazada ni la borra', () => {
	const campos = campos_tras_fallo_de_servidor({ id: 7 }, 'Undefined array key', AHORA)
	assert.equal('rechazada_at' in campos, false)
	assert.equal('rechazo_mensaje' in campos, false)
	assert.equal(campos.fallos_de_servidor, 1)
	assert.equal(campos.ultimo_fallo_de_servidor, 'Undefined array key')
	assert.equal(campos.reintentar_despues_de, new Date(AHORA + MINUTO).toISOString())
})

test('los fallos seguidos suman y alargan la pausa', () => {
	let venta = { id: 7 }
	let ahora = AHORA
	for (let i = 1; i <= 7; i++) {
		const campos = campos_tras_fallo_de_servidor(venta, 'error', ahora)
		assert.equal(campos.fallos_de_servidor, i)
		assert.equal(new Date(campos.reintentar_despues_de).getTime() - ahora, pausa_tras_fallos(i))
		venta = Object.assign({}, venta, campos)
		ahora += pausa_tras_fallos(i)
	}
})

test('la venta esta en pausa hasta que se cumple la hora y despues se reintenta sola', () => {
	const venta = Object.assign({ id: 1 }, campos_tras_fallo_de_servidor({ id: 1 }, 'error', AHORA))
	assert.equal(esta_en_espera(venta, AHORA), true)
	assert.equal(esta_en_espera(venta, AHORA + MINUTO - 1), true)
	assert.equal(esta_en_espera(venta, AHORA + MINUTO), false)
	assert.equal(esta_en_espera(venta, AHORA + 5 * MINUTO), false)
})

test('una venta sin fallos, o con una fecha ilegible, no esta en pausa (nunca se pierde por esto)', () => {
	assert.equal(esta_en_espera({ id: 1 }, AHORA), false)
	assert.equal(esta_en_espera({ id: 1, reintentar_despues_de: null }, AHORA), false)
	assert.equal(esta_en_espera({ id: 1, reintentar_despues_de: 'no es una fecha' }, AHORA), false)
	assert.equal(esta_en_espera(null, AHORA), false)
})

test('si el reloj del equipo retrocedio, una pausa de mas de 60 minutos no se respeta', () => {
	const venta = Object.assign({ id: 1 }, campos_tras_fallo_de_servidor({ id: 1, fallos_de_servidor: 9 }, 'error', AHORA))
	// El reloj salta 3 horas hacia atras: la pausa guardada queda a ~3 h 60 min en el futuro.
	assert.equal(esta_en_espera(venta, AHORA - 3 * 60 * MINUTO), false)
	// Con el reloj normal, la pausa de 60 minutos se respeta hasta cumplirse.
	assert.equal(esta_en_espera(venta, AHORA + 59 * MINUTO), true)
	assert.equal(esta_en_espera(venta, AHORA + 60 * MINUTO), false)
})

test('el corte de MySQL de la medianoche no pierde ventas: con la base de vuelta entra en <= 1 hora', () => {
	// Cortes cada vez mas largos: la venta sigue reintentable (sin rechazada_at) y la espera maxima es 1 h.
	let venta = { id: 3 }
	let ahora = AHORA
	for (let i = 0; i < 12; i++) {
		venta = Object.assign({}, venta, campos_tras_fallo_de_servidor(venta, 'SQLSTATE[HY000] [2002] Connection refused', ahora))
		assert.equal(venta.rechazada_at, undefined)
		ahora += pausa_tras_fallos(venta.fallos_de_servidor)
		assert.equal(esta_en_espera(venta, ahora), false, 'cumplida la pausa, el reintento periodico la toma')
	}
	assert.ok(pausa_tras_fallos(venta.fallos_de_servidor) <= 60 * MINUTO)
})

test('el aviso al cajero sale en el fallo 1, en el 5 y despues cada 20 (no cada 30 segundos)', () => {
	const avisos = []
	for (let fallos = 1; fallos <= 100; fallos++) {
		if (debe_avisar_el_fallo(fallos)) {
			avisos.push(fallos)
		}
	}
	assert.deepEqual(avisos, [1, 5, 20, 40, 60, 80, 100])
})

test('los campos de reintento son locales: no viajan al POST /sale', () => {
	const fuente = fs.readFileSync(path.join(__dirname, '../src/offline/sync_sales.js'), 'utf8')
	assert.match(fuente, /\.\.\.CAMPOS_LOCALES_DE_REINTENTO/)
	assert.deepEqual(CAMPOS_LOCALES_DE_REINTENTO, [
		'fallos_de_servidor',
		'ultimo_fallo_de_servidor',
		'ultimo_fallo_at',
		'reintentar_despues_de',
	])
})

// ---- Comportamiento real de subir_ventas_del_equipo con la base y la API simuladas ----

/** Una "IndexedDB" en memoria con lo que usa sync_sales.js: sales.toArray / update / delete. */
function base_en_memoria(ventas) {
	const filas = ventas.map(v => Object.assign({}, v))
	return {
		filas,
		sales: {
			toArray: () => Promise.resolve(filas.map(f => Object.assign({}, f))),
			update(id, campos) {
				const fila = filas.find(f => f.id === id)
				if (fila) { Object.assign(fila, campos) }
				return Promise.resolve(1)
			},
			delete(id) {
				const i = filas.findIndex(f => f.id === id)
				if (i >= 0) { filas.splice(i, 1) }
				return Promise.resolve()
			},
		},
	}
}

/** El mixin con sus dependencias simuladas. `respuestas` es la cola de lo que contesta POST /sale. */
function escenario_de_subida(ventas, respuestas) {
	const db = base_en_memoria(ventas)
	const avisos = []
	const posts = []
	const modulo = cargar('offline/sync_sales.js', {
		'./db': { __esModule: true, default: db },
		'moment': { __esModule: true, default: () => ({ format: () => '01/11/2026 21:00' }) },
	}).default
	const contexto = Object.assign({}, modulo.methods, {
		$toast: {
			error: texto => avisos.push(['error', texto]),
			warning: texto => avisos.push(['warning', texto]),
			success: texto => avisos.push(['success', texto]),
		},
		$store: { commit() {} },
		$api: {
			post(url, cuerpo) {
				posts.push(cuerpo)
				const respuesta = respuestas.shift()
				return respuesta.error ? Promise.reject(respuesta.error) : Promise.resolve(respuesta)
			},
		},
		owner_id: null,
		price: valor => String(valor),
	})
	return { db, avisos, posts, subir: opciones => contexto.subir_ventas_del_equipo(opciones) }
}

const error_http = (status, message) => ({ error: { response: { status, data: { message } } } })

test('un 500 NO rechaza ni borra la venta: queda reintentable, con su pausa, y no manda campos locales', async () => {
	const e = escenario_de_subida([{ id: 1, offline_uuid: 'u-1', total: 100, created_at: '2026-11-01T20:00:00Z' }], [error_http(500, 'boom')])
	await e.subir({ omitir_rechazadas: true })
	assert.equal(e.db.filas.length, 1, 'la venta sigue en el equipo')
	assert.equal(e.db.filas[0].rechazada_at, undefined, 'un 5xx no es un rechazo')
	assert.equal(e.db.filas[0].fallos_de_servidor, 1)
	assert.equal(e.db.filas[0].ultimo_fallo_de_servidor, 'boom')
	assert.ok(new Date(e.db.filas[0].reintentar_despues_de).getTime() > Date.now())
	assert.equal(e.posts.length, 1)
	assert.equal('reintentar_despues_de' in e.posts[0], false, 'los campos de reintento no viajan al POST')
	assert.equal('fallos_de_servidor' in e.posts[0], false)
	assert.equal(e.avisos.filter(a => a[0] === 'warning').length, 1, 'avisa en el primer fallo')
})

test('el reintento periodico no vuelve a golpear una venta en pausa; el online/login si la intenta', async () => {
	const e = escenario_de_subida([{ id: 1, offline_uuid: 'u-1', total: 100, created_at: '2026-11-01T20:00:00Z' }], [error_http(500, 'boom'), error_http(500, 'boom'), { status: 201, data: { model: { id: 9 } } }])
	await e.subir({ omitir_rechazadas: true })
	assert.equal(e.posts.length, 1)
	// 30 segundos despues, otra vuelta del reintento periodico: en pausa, no hay POST ni aviso nuevo.
	await e.subir({ omitir_rechazadas: true })
	assert.equal(e.posts.length, 1, 'la pausa frena al reintento periodico')
	assert.equal(e.avisos.length, 1)
	// El evento online / el login (sin opciones) intentan todo igual: el segundo 500 suma un fallo.
	await e.subir()
	assert.equal(e.posts.length, 2)
	assert.equal(e.db.filas[0].fallos_de_servidor, 2)
	assert.equal(e.avisos.length, 1, 'el segundo fallo no repite el aviso')
	// Cuando el servidor se arregla, la venta entra y se borra del equipo.
	await e.subir()
	assert.equal(e.posts.length, 3)
	assert.equal(e.db.filas.length, 0, 'entro y se borro del equipo')
})

test('un 422 si es un rechazo: marca rechazada_at con el motivo y la venta sigue en el equipo', async () => {
	const e = escenario_de_subida([{ id: 1, offline_uuid: 'u-1', total: 100, created_at: '2026-11-01T20:00:00Z' }], [error_http(422, 'El artículo X tiene una fila sin precio')])
	await e.subir({ omitir_rechazadas: true })
	assert.equal(e.db.filas.length, 1)
	assert.ok(e.db.filas[0].rechazada_at)
	assert.match(e.db.filas[0].rechazo_mensaje, /sin precio/)
	assert.equal(e.db.filas[0].fallos_de_servidor, undefined)
})

test('un 5xx despues de varios 5xx sigue sin marcar rechazada, hasta el infinito', async () => {
	const respuestas = []
	for (let i = 0; i < 30; i++) { respuestas.push(error_http(500, 'boom')) }
	const e = escenario_de_subida([{ id: 1, offline_uuid: 'u-1', total: 100, created_at: '2026-11-01T20:00:00Z' }], respuestas)
	for (let i = 0; i < 30; i++) { await e.subir() }
	assert.equal(e.db.filas.length, 1)
	assert.equal(e.db.filas[0].rechazada_at, undefined)
	assert.equal(e.db.filas[0].fallos_de_servidor, 30)
	assert.equal(e.avisos.length, 3, 'avisos en el fallo 1, 5 y 20, no uno por intento')
})

test('agregar_otro_precio no crea una fila sin precio (undefined/null), pero el vacio sigue creandola', () => {
	const mixin = cargar('mixins/vender/varios_precios.js', {
		'./vender_set_total': {},
		'@/mixins/vender_set_total': {},
	}).default
	const store = []
	const contexto = {
		recalcular_varios_precios() { store.push('recalculo') },
	}
	const item = { varios_precios: [] }

	mixin.methods.agregar_otro_precio.call(contexto, item, undefined)
	mixin.methods.agregar_otro_precio.call(contexto, item, null)
	assert.equal(item.varios_precios.length, 0, 'un precio undefined/null no puede dejar una fila')
	assert.deepEqual(store, [], 'y tampoco recalcula')

	mixin.methods.agregar_otro_precio.call(contexto, item, 120)
	mixin.methods.agregar_otro_precio.call(contexto, item, '')
	assert.equal(item.varios_precios.length, 2)
	assert.equal(item.varios_precios[1].price_vender, 120)
	assert.equal(item.varios_precios[0].price_vender, '')
	assert.ok(Object.prototype.hasOwnProperty.call(item.varios_precios[0], 'price_vender'))
	assert.equal(JSON.parse(JSON.stringify(item.varios_precios[1])).price_vender, 120)
})
