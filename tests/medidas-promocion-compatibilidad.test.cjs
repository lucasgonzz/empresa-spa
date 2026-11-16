const test = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const funciones = cargar('mixins/model_functions.js', {
	moment: require('moment'),
	'@/common-vue/mixins/dates': {},
	'@/mixins/vender/select_payment_methods': {},
	'@/offline/db': {},
	'@/utils/whatsapp_phone': {},
	'@/constants/vender_print_shortcut_options': {},
	'@/utils/formas_de_envio': {},
}).default.methods
const promocion = cargar('models/promocion_vinoteca.js').default

test('una promo de API anterior conserva su formulario sin enviar columnas desconocidas', () => {
	const anterior = { id: 14, name: 'Mix clásico', stock: 4 }
	const antes = JSON.stringify(anterior)
	for (const campo of ['peso', 'alto', 'ancho', 'profundidad']) {
		const prop = promocion.properties.find(prop => prop.key === campo)
		assert.equal(funciones[prop.v_if_function](prop, anterior), false)
	}
	assert.equal(JSON.stringify(anterior), antes)
})

test('las medidas vacías de una API nueva siguen disponibles para cargar o limpiar', () => {
	const nueva = { id: 14, peso: null, alto: null, ancho: null, profundidad: null }
	assert.equal(funciones.mostrar_medidas_de_envio_de_promocion(null, nueva), true)
	assert.equal(funciones.mostrar_medidas_de_envio_de_promocion(null, { id: 14, peso: 0 }), true)
})

test('el alta ofrece los campos aunque todavía no exista una promoción guardada', () => {
	assert.equal(funciones.mostrar_medidas_de_envio_de_promocion(null, { id: null }), true)
	assert.equal(funciones.mostrar_medidas_de_envio_de_promocion(null, {}), true)
})
