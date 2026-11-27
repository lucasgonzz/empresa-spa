// Ticket #177 (misión soporte-t177-m50): en el reparto de un presupuesto la fila inicial nace con el método
// de pago 3 fijo. Si el negocio no tiene ese método en su catálogo, "Calcular" avanzaba a "Listo" con una
// opción sin id ni nombre (el select mostraba "null"). Las reglas viven en funciones puras
// (mixins/metodos_de_pago_reglas.js) y el mixin de validación las usa; acá se prueban las dos cosas.
const test = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

// Catálogo de un negocio al que le falta el método 3 (Efectivo): sólo tiene 1 (cuenta corriente) y 2.
const catalogo_sin_el_3 = [
	{ id: 1, name: 'Cuenta corriente' },
	{ id: 2, name: 'Tarjeta' },
]
// Catálogo completo.
const catalogo_completo = [
	{ id: 1, name: 'Cuenta corriente' },
	{ id: 2, name: 'Tarjeta' },
	{ id: 3, name: 'Efectivo' },
]

/**
 * Arma un `this` falso para invocar los métodos del mixin sin Vue: el store con el catálogo y un toast que
 * anota los mensajes.
 *
 * @param {Array} catalogo Catálogo de métodos de pago del store.
 * @returns {{contexto: object, mensajes: string[]}}
 */
function contexto_falso(catalogo) {
	const mensajes = []
	const contexto = {
		$store: { state: { current_acount_payment_method: { models: catalogo } } },
		$toast: { error: texto => mensajes.push(texto) },
	}
	return { contexto, mensajes }
}

/**
 * Corre `hay_metodo_de_pago_sin_elegir` del mixin real con un contexto falso.
 *
 * @param {Array} filas Filas del reparto.
 * @param {Array} catalogo Catálogo del store.
 * @returns {{resultado: boolean, mensajes: string[]}}
 */
function validar(filas, catalogo) {
	const mixin = cargar('mixins/metodos_de_pago_validacion.js').default
	const { contexto, mensajes } = contexto_falso(catalogo)
	const resultado = mixin.methods.hay_metodo_de_pago_sin_elegir.call(contexto, filas)
	return { resultado, mensajes }
}

// ---------------------------------------------------------------- CA1: metodo_de_pago_existe

test('CA1: un id presente en el catálogo existe; uno ausente no', () => {
	const { metodo_de_pago_existe } = cargar('mixins/metodos_de_pago_reglas.js')
	assert.equal(metodo_de_pago_existe(2, catalogo_sin_el_3), true)
	assert.equal(metodo_de_pago_existe('2', catalogo_sin_el_3), true)
	assert.equal(metodo_de_pago_existe(3, catalogo_sin_el_3), false)
})

test('CA1: 0, null, vacío, "null" y undefined nunca existen', () => {
	const { metodo_de_pago_existe } = cargar('mixins/metodos_de_pago_reglas.js')
	;[0, null, '', 'null', undefined].forEach(id => {
		assert.equal(metodo_de_pago_existe(id, catalogo_completo), false, 'id ' + String(id))
		assert.equal(metodo_de_pago_existe(id, []), false, 'id ' + String(id) + ' con catálogo vacío')
	})
})

test('CA1: con catálogo vacío o no array, un id truthy no se bloquea (catálogo no cargado)', () => {
	const { metodo_de_pago_existe } = cargar('mixins/metodos_de_pago_reglas.js')
	assert.equal(metodo_de_pago_existe(3, []), true)
	assert.equal(metodo_de_pago_existe(3, undefined), true)
	assert.equal(metodo_de_pago_existe(3, null), true)
})

// ---------------------------------------------------------------- CA2: metodo_de_pago_por_defecto

test('CA2: devuelve el preferido (3) sólo si está en el catálogo; si no, 0', () => {
	const { metodo_de_pago_por_defecto } = cargar('mixins/metodos_de_pago_reglas.js')
	assert.equal(metodo_de_pago_por_defecto(catalogo_completo), 3)
	assert.equal(metodo_de_pago_por_defecto(catalogo_sin_el_3), 0)
	assert.equal(metodo_de_pago_por_defecto(catalogo_sin_el_3, 2), 2)
})

test('CA2: con catálogo vacío conserva el comportamiento actual (el preferido)', () => {
	const { metodo_de_pago_por_defecto } = cargar('mixins/metodos_de_pago_reglas.js')
	assert.equal(metodo_de_pago_por_defecto([]), 3)
	assert.equal(metodo_de_pago_por_defecto(undefined), 3)
})

// ---------------------------------------------------------------- CA3 / CA7: hay_metodo_de_pago_sin_elegir

test('CA3: id 0 con monto conserva el texto actual', () => {
	const { resultado, mensajes } = validar([{ current_acount_payment_method_id: 0, amount: 50 }], catalogo_completo)
	assert.equal(resultado, true)
	assert.deepEqual(mensajes, ['Elegí el método de pago 1, o borrá esa fila'])
})

test('CA3: id inexistente con monto frena con el texto nuevo y el número de fila', () => {
	const filas = [
		{ current_acount_payment_method_id: 2, amount: 10 },
		{ current_acount_payment_method_id: 3, amount: 50 },
	]
	const { resultado, mensajes } = validar(filas, catalogo_sin_el_3)
	assert.equal(resultado, true)
	assert.deepEqual(mensajes, ['El método de pago 2 no está disponible en tu sistema. Elegí otro método o borrá esa fila'])
})

test('CA3: método válido con monto no frena ni avisa', () => {
	const { resultado, mensajes } = validar([{ current_acount_payment_method_id: 2, amount: 50 }], catalogo_sin_el_3)
	assert.equal(resultado, false)
	assert.deepEqual(mensajes, [])
})

test('CA3: fila sin monto con id inexistente no molesta', () => {
	const filas = [{ current_acount_payment_method_id: 3, amount: '', amount_cotizado: '' }]
	const { resultado, mensajes } = validar(filas, catalogo_sin_el_3)
	assert.equal(resultado, false)
	assert.deepEqual(mensajes, [])
})

test('CA3: con el catálogo vacío (no cargado) un id truthy con monto no se bloquea', () => {
	const { resultado, mensajes } = validar([{ current_acount_payment_method_id: 3, amount: 50 }], [])
	assert.equal(resultado, false)
	assert.deepEqual(mensajes, [])
})

test('CA7: el ticket en dólares (moneda 2, 68,47, método 3 fuera del catálogo) frena', () => {
	const fila_del_ticket = {
		current_acount_payment_method_id: 3,
		moneda_id: 2,
		amount: 68.47,
		amount_cotizado: 68.47 * 1200,
		caja_id: 0,
		cuota_id: 0,
	}
	const { resultado, mensajes } = validar([fila_del_ticket], catalogo_sin_el_3)
	assert.equal(resultado, true)
	assert.equal(mensajes.length, 1)
	assert.match(mensajes[0], /^El método de pago 1 no está disponible en tu sistema\./)
})

test('CA7: sólo con amount_cotizado y método inexistente también frena', () => {
	const filas = [{ current_acount_payment_method_id: 3, amount: 0, amount_cotizado: 500 }]
	assert.equal(validar(filas, catalogo_sin_el_3).resultado, true)
})

// ---------------------------------------------------------------- CA5 / CA6: armar_opciones_del_segundo_paso

/**
 * Verifica que ninguna opción del segundo paso carezca de id o de nombre.
 *
 * @param {Array} opciones Opciones armadas.
 */
function assert_opciones_completas(opciones) {
	opciones.forEach(opcion => {
		assert.ok(Number(opcion.id) > 0, 'opción sin id')
		assert.ok(typeof opcion.name === 'string' && opcion.name.length > 0, 'opción sin name')
	})
}

test('CA5: con el método inexistente no devuelve opciones y marca la fila inválida', () => {
	const { armar_opciones_del_segundo_paso } = cargar('mixins/metodos_de_pago_reglas.js')
	const filas = [{ __row_id: 'a', current_acount_payment_method_id: 3, moneda_id: 2, amount: 68.47, caja_id: 0, cuota_id: 0 }]
	const salida = armar_opciones_del_segundo_paso(filas, catalogo_sin_el_3, [], [])
	assert.deepEqual(salida.opciones, [])
	assert.deepEqual(salida.filas_siguientes, [])
	assert.notEqual(salida.fila_invalida, null)
	assert.equal(salida.fila_invalida.indice, 0)
})

test('CA5: una fila en blanco y en cero se saltea en silencio, aunque su id no exista', () => {
	const { armar_opciones_del_segundo_paso } = cargar('mixins/metodos_de_pago_reglas.js')
	const filas = [
		{ current_acount_payment_method_id: 0, amount: '' },
		{ current_acount_payment_method_id: 3, amount: '' },
		{ current_acount_payment_method_id: 2, amount: 100, __row_id: 'b', moneda_id: 1, caja_id: 7, cuota_id: 0 },
	]
	const salida = armar_opciones_del_segundo_paso(filas, catalogo_sin_el_3, [], [])
	assert.equal(salida.fila_invalida, null)
	assert.equal(salida.opciones.length, 1)
	assert.equal(salida.filas_siguientes.length, 1)
	assert_opciones_completas(salida.opciones)
})

test('CA6: método válido, una fila, sin descuento ni recargo', () => {
	const { armar_opciones_del_segundo_paso } = cargar('mixins/metodos_de_pago_reglas.js')
	const filas = [{ __row_id: 'a', current_acount_payment_method_id: 2, moneda_id: 2, amount: 68.47, caja_id: 5, cuota_id: 0 }]
	const salida = armar_opciones_del_segundo_paso(filas, catalogo_sin_el_3, [], [])
	assert.equal(salida.fila_invalida, null)
	assert.equal(salida.opciones.length, 1)
	assert.equal(salida.opciones[0].id, 2)
	assert.equal(salida.opciones[0].name, 'Tarjeta')
	assert.equal(salida.opciones[0].amount, '')
	assert.equal(salida.opciones[0].discount_amount, null)
	assert.equal(salida.opciones[0].surchage_amount, null)
	assert.equal(salida.opciones[0].caja_id, 5)
	assert.equal(salida.filas_siguientes[0].__row_id, 'a')
	assert.equal(salida.filas_siguientes[0].current_acount_payment_method_id, 2)
	assert.equal(salida.filas_siguientes[0].moneda_id, 2)
	assert.equal(salida.filas_siguientes[0].amount, '')
})

test('CA6: varios métodos válidos conservan el orden', () => {
	const { armar_opciones_del_segundo_paso } = cargar('mixins/metodos_de_pago_reglas.js')
	const filas = [
		{ __row_id: 'a', current_acount_payment_method_id: 2, amount: 40 },
		{ __row_id: 'b', current_acount_payment_method_id: 1, amount: 60 },
	]
	const salida = armar_opciones_del_segundo_paso(filas, catalogo_sin_el_3, [], [])
	assert.equal(salida.fila_invalida, null)
	assert.deepEqual(salida.opciones.map(o => o.id), [2, 1])
	assert.deepEqual(salida.filas_siguientes.map(f => f.__row_id), ['a', 'b'])
	assert_opciones_completas(salida.opciones)
})

test('CA6: con descuento del método, el descuento es porcentaje del monto', () => {
	const { armar_opciones_del_segundo_paso } = cargar('mixins/metodos_de_pago_reglas.js')
	const filas = [{ __row_id: 'a', current_acount_payment_method_id: 3, amount: 200 }]
	const descuentos = [{ current_acount_payment_method_id: 3, discount_percentage: 10 }]
	const salida = armar_opciones_del_segundo_paso(filas, catalogo_completo, descuentos, [])
	assert.equal(salida.opciones[0].discount_amount, 20)
	assert.equal(salida.filas_siguientes[0].discount_amount, 20)
	assert.equal(salida.opciones[0].surchage_amount, null)
})

test('CA6: con cuota con recargo, el recargo es porcentaje del monto', () => {
	const { armar_opciones_del_segundo_paso } = cargar('mixins/metodos_de_pago_reglas.js')
	const filas = [{ __row_id: 'a', current_acount_payment_method_id: 2, amount: 1000, cuota_id: 4 }]
	const cuotas = [{ id: 4, descuento: 0, recargo: 12 }]
	const salida = armar_opciones_del_segundo_paso(filas, catalogo_sin_el_3, [], cuotas)
	assert.equal(salida.opciones[0].surchage_amount, 120)
	assert.equal(salida.opciones[0].discount_amount, null)
	assert.equal(salida.filas_siguientes[0].surchage_amount, 120)
	assert_opciones_completas(salida.opciones)
})

test('CA6: con cuota con descuento, el descuento es porcentaje del monto', () => {
	const { armar_opciones_del_segundo_paso } = cargar('mixins/metodos_de_pago_reglas.js')
	const filas = [{ __row_id: 'a', current_acount_payment_method_id: 2, amount: 1000, cuota_id: 5 }]
	const cuotas = [{ id: 5, descuento: 5, recargo: 0 }]
	const salida = armar_opciones_del_segundo_paso(filas, catalogo_sin_el_3, [], cuotas)
	assert.equal(salida.opciones[0].discount_amount, 50)
})

test('CA5: una fila válida seguida de una inexistente con monto invalida todo el armado', () => {
	const { armar_opciones_del_segundo_paso } = cargar('mixins/metodos_de_pago_reglas.js')
	const filas = [
		{ __row_id: 'a', current_acount_payment_method_id: 2, amount: 40 },
		{ __row_id: 'b', current_acount_payment_method_id: 3, amount: 60 },
	]
	const salida = armar_opciones_del_segundo_paso(filas, catalogo_sin_el_3, [], [])
	assert.equal(salida.fila_invalida.indice, 1)
	assert.deepEqual(salida.opciones, [])
	assert.deepEqual(salida.filas_siguientes, [])
})
