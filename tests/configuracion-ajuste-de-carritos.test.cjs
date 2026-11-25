// CA20 de la misión carritos-ajuste-stock: contrato declarativo de las tres casillas nuevas de la
// configuración de la tienda y función de visibilidad que las oculta cuando la API es vieja.
// Sin API ni servicios: sólo el modelo declarativo y el mixin de funciones de modelo.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

// Modelo declarativo de la configuración online (la pantalla Tienda Online -> Configuración).
const configuracion = cargar('models/online_configuration.js').default

// El mixin importa moment, dexie y otros mixins que no hacen falta para estas funciones: se reemplazan
// por vacíos (con mocks el helper carga el módulo de nuevo y sólo ese módulo los ve).
const mixin = cargar('mixins/model_functions.js', {
	'moment': function () {},
	'@/common-vue/mixins/dates': {},
	'@/mixins/vender/select_payment_methods': {},
	'@/offline/db': {},
}).default

/** Nombre del grupo de casillas de carrito y pedidos. */
const GRUPO_CARRITO = 'Carrito y pedidos'
/** Nombre del grupo de notificaciones por mail. */
const GRUPO_MAILS = 'Notificaciones por mail'
/** Las tres claves nuevas que persiste empresa-api en online_configurations. */
const CLAVES_NUEVAS = [
	'ajustar_carritos_por_stock',
	'avisar_puede_agotarse',
	'avisar_ajuste_carrito_por_mail',
]

/**
 * Devuelve la fila declarada para una clave, exigiendo que exista una sola vez.
 *
 * @param {string} clave Clave de la propiedad en el modelo.
 * @returns {object} La propiedad declarada.
 */
function campo(clave) {
	const encontrados = configuracion.properties.filter(prop => prop.key === clave)
	assert.equal(encontrados.length, 1, clave + ' debe existir una sola vez en online_configuration.js')
	return encontrados[0]
}

/**
 * Claves de las propiedades que pertenecen a un grupo (entre su group_title y el siguiente).
 *
 * @param {string} nombre_del_grupo Texto del group_title.
 * @returns {string[]} Claves en el orden en que se declaran.
 */
function claves_del_grupo(nombre_del_grupo) {
	const claves = []
	let dentro = false
	configuracion.properties.forEach(prop => {
		if (prop.group_title) {
			dentro = prop.group_title === nombre_del_grupo
			return
		}
		if (dentro) {
			claves.push(prop.key)
		}
	})
	return claves
}

test('las tres casillas existen como checkbox con descripción y visibilidad condicionada a la API', () => {
	CLAVES_NUEVAS.forEach(clave => {
		const prop = campo(clave)
		assert.equal(prop.type, 'checkbox', clave + ' debe ser checkbox')
		assert.ok(typeof prop.text === 'string' && prop.text.length > 0, clave + ' necesita text')
		assert.ok(typeof prop.description === 'string' && prop.description.length > 40, clave + ' necesita description')
		assert.equal(prop.v_if_function, 'mostrar_si_la_api_manda_la_clave', clave + ' debe ocultarse con una API vieja')
	})
})

test('los rótulos y las descripciones dicen lo que hace cada opción', () => {
	assert.equal(campo('ajustar_carritos_por_stock').text, 'Ajustar los carritos cuando baja el stock')
	assert.equal(campo('avisar_puede_agotarse').text, 'Avisar en el carrito que un producto puede agotarse')
	assert.equal(campo('avisar_ajuste_carrito_por_mail').text, 'Avisar por mail al comprador cuando se ajusta su carrito')
	assert.match(campo('ajustar_carritos_por_stock').description, /carritos abiertos/)
	assert.match(campo('ajustar_carritos_por_stock').description, /Ignorar el stock en la Tienda/)
	assert.match(campo('avisar_puede_agotarse').description, /No se muestra cuántos clientes ni cuántas unidades/)
	assert.match(campo('avisar_ajuste_carrito_por_mail').description, /Le llega un mail/)
})

test('dos casillas están en Carrito y pedidos y el aviso por mail en Notificaciones por mail', () => {
	const del_carrito = claves_del_grupo(GRUPO_CARRITO)
	assert.ok(del_carrito.includes('ajustar_carritos_por_stock'), 'ajustar_carritos_por_stock en ' + GRUPO_CARRITO)
	assert.ok(del_carrito.includes('avisar_puede_agotarse'), 'avisar_puede_agotarse en ' + GRUPO_CARRITO)
	assert.ok(!del_carrito.includes('avisar_ajuste_carrito_por_mail'))

	const de_mails = claves_del_grupo(GRUPO_MAILS)
	assert.ok(de_mails.includes('avisar_ajuste_carrito_por_mail'), 'avisar_ajuste_carrito_por_mail en ' + GRUPO_MAILS)
	assert.ok(!de_mails.includes('ajustar_carritos_por_stock'))
	assert.ok(!de_mails.includes('avisar_puede_agotarse'))
})

test('el aviso por mail del ajuste va justo después del aviso de ingreso de stock', () => {
	const de_mails = claves_del_grupo(GRUPO_MAILS)
	const posicion_ingreso = de_mails.indexOf('avisar_ingreso_stock_por_mail')
	assert.ok(posicion_ingreso >= 0, 'avisar_ingreso_stock_por_mail debe seguir en ' + GRUPO_MAILS)
	assert.equal(de_mails[posicion_ingreso + 1], 'avisar_ajuste_carrito_por_mail')
})

test('mostrar_si_la_api_manda_la_clave devuelve false sin la clave y true con ella (aunque sea false)', () => {
	assert.equal(typeof mixin.methods.mostrar_si_la_api_manda_la_clave, 'function',
		'Falta mostrar_si_la_api_manda_la_clave en src/mixins/model_functions.js')
	const mostrar = mixin.methods.mostrar_si_la_api_manda_la_clave
	const prop = { key: 'ajustar_carritos_por_stock' }
	// API vieja: el modelo no trae la clave, la casilla no aparece.
	assert.equal(mostrar(prop, { id: 1 }), false)
	assert.equal(mostrar(prop, undefined), false)
	assert.equal(mostrar(prop, null), false)
	// API nueva: la clave viaja, con cualquier valor (incluido false y 0), la casilla aparece.
	assert.equal(mostrar(prop, { id: 1, ajustar_carritos_por_stock: true }), true)
	assert.equal(mostrar(prop, { id: 1, ajustar_carritos_por_stock: false }), true)
	assert.equal(mostrar(prop, { id: 1, ajustar_carritos_por_stock: 0 }), true)
})
