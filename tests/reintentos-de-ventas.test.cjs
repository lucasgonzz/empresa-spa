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

test('solo un 4xx marca rechazada_at; el 5xx y la caida de red van por la rama del reintento', () => {
	const fuente = fs.readFileSync(path.join(__dirname, '../src/offline/sync_sales.js'), 'utf8')
	assert.match(fuente, /status >= 400 && status < 500 && !es_problema_de_sesion/)
	// rechazada_at solo se escribe en la rama del 4xx y en la del 200 sin modelo, nunca en la del 5xx.
	const rama_5xx = fuente.slice(fuente.indexOf('campos_tras_fallo_de_servidor(sale, message'))
	assert.equal(rama_5xx.slice(0, 1500).includes('rechazada_at'), false)
})

test('el reintento periodico saltea las ventas en pausa; el online y el login no', () => {
	const sync = fs.readFileSync(path.join(__dirname, '../src/offline/sync_sales.js'), 'utf8')
	const index = fs.readFileSync(path.join(__dirname, '../src/offline/index.js'), 'utf8')
	assert.match(sync, /omitir_rechazadas\) \{[\s\S]*esta_en_espera\(sale, ahora\)/)
	assert.match(index, /!venta\.rechazada_at && !esta_en_espera\(venta, ahora\)/)
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
