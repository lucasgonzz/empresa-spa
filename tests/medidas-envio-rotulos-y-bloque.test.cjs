const test = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const combo = cargar('models/combo.js').default
const promocion = cargar('models/promocion_vinoteca.js').default
const articulo = cargar('models/article.js').default

// Orden y textos que lee el dueño: el mismo orden en que se mide una caja y lo que pide Zipnova.
const ORDEN = ['peso', 'profundidad', 'ancho', 'alto']
const TEXTOS = {
	peso: 'Peso del paquete (kg)',
	profundidad: 'Largo del paquete (cm)',
	ancho: 'Ancho del paquete (cm)',
	alto: 'Alto del paquete (cm)',
}

// Devuelve los modelos de paquete con la key de la prop previa al bloque.
const paquetes = [
	{ nombre: 'combo', modelo: combo, previa: 'online' },
	{ nombre: 'promocion_vinoteca', modelo: promocion, previa: 'description' },
]

test('rótulos y orden de medidas en combo, promo y artículo', () => {
	for (const { nombre, modelo } of paquetes) {
		const keys = modelo.properties.map(prop => prop.key)
		const desde = keys.indexOf('peso')
		assert.deepEqual(keys.slice(desde, desde + 4), ORDEN, nombre + ': orden contiguo')
		ORDEN.forEach(key => {
			const prop = modelo.properties.find(prop => prop.key === key)
			assert.equal(prop.text, TEXTOS[key], nombre + ': texto de ' + key)
		})
	}
	// Ninguna prop de los tres modelos habla de "profundidad" en su rótulo.
	for (const modelo of [combo, promocion, articulo]) {
		modelo.properties.forEach(prop => {
			assert.ok(!/profundidad/i.test(prop.text || ''), 'rótulo con profundidad: ' + prop.text)
		})
	}
	// Artículo: sólo cambia el texto de profundidad.
	const largo = articulo.properties.find(prop => prop.key === 'profundidad')
	assert.equal(largo.text, 'Largo (cm)')
	assert.deepEqual(largo.if_has_alguna_extencion, ['usa_tienda_nube', 'online'])
	assert.equal(articulo.properties.find(prop => prop.key === 'peso').text, 'Peso (kg)')
	assert.equal(articulo.properties.find(prop => prop.key === 'alto').text, 'Alto (cm)')
	assert.equal(articulo.properties.find(prop => prop.key === 'ancho').text, 'Ancho (cm)')
})

test('bloque 2x2: mid_full_cols, full_cols en la prop previa, keys intactas', () => {
	for (const { nombre, modelo, previa } of paquetes) {
		const props = modelo.properties
		const desde = props.findIndex(prop => prop.key === 'peso')
		assert.equal(props[desde - 1].key, previa, nombre + ': prop previa')
		assert.equal(props[desde - 1].full_cols, true, nombre + ': full_cols en la previa')
		assert.equal(props[desde + 4].key, 'articles', nombre + ': prop posterior')
		props.slice(desde, desde + 4).forEach(prop => {
			assert.equal(prop.mid_full_cols, true, nombre + ': mid_full_cols en ' + prop.key)
			assert.deepEqual(prop.variable_decimals, { min: 0, max: 4 })
			assert.equal(prop.value, null)
			assert.equal(prop.not_show, true)
		})
	}
	const vif = promocion.properties.filter(prop => ORDEN.includes(prop.key))
	vif.forEach(prop => assert.equal(prop.v_if_function, 'mostrar_medidas_de_envio_de_promocion'))
	combo.properties.filter(prop => ORDEN.includes(prop.key))
		.forEach(prop => assert.equal(prop.v_if_function, undefined))
})
