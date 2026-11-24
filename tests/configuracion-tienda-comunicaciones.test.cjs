// Contrato declarativo y recorrido real del guardado genérico, sin API ni servicios.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const configuracion = cargar('models/online_configuration.js').default
const banner = cargar('models/title.js').default
const modal = cargar('common-vue/components/model/Index.vue', {
	'@/common-vue/components/Confirm': {},
	'@/common-vue/components/BtnLoader': {},
	'@/common-vue/components/BtnDelete': {},
	'@/common-vue/components/BtnPdf': {},
	'@/common-vue/components/model/ModelForm': {},
	'@/utils/laravel_validation_toast': {},
}).default

function campo(modelo, clave) {
	const encontrados = modelo.properties.filter(prop => prop.key === clave)
	assert.equal(encontrados.length, 1, clave + ' debe existir una sola vez')
	return encontrados[0]
}

function enviar(nombre, modelo, valores) {
	return modal.methods.getModelToSend.call({
		model_name: nombre,
		model: valores,
		properties: modelo.properties,
		$store: { state: { [nombre]: {} } },
		props_to_send_on_save: [],
	})
}

test('footer ofrece texto plano en los controles genéricos y topes visibles del contrato U6', () => {
	for (const [clave, tipo, tope] of [
		['footer_contacto_titulo', 'text', 80],
		['footer_contacto_email', 'text', 150],
		['footer_contacto_texto', 'textarea', 2000],
	]) {
		const prop = campo(configuracion, clave)
		assert.equal(prop.type, tipo)
		assert.equal(prop.value, '')
		assert.match(prop.descripcion_visible, new RegExp('hasta ' + tope, 'i'))
		assert.match(prop.descripcion_visible, /Vacío usa/)
		assert.ok(!prop.required && !prop.not_show_on_form && !prop.v_if_function)
	}
	assert.match(campo(configuracion, 'footer_contacto_titulo').descripcion_visible, /sin HTML/)
	assert.match(campo(configuracion, 'footer_contacto_texto').descripcion_visible, /sin HTML.*saltos de línea/)
	assert.match(campo(configuracion, 'footer_contacto_email').descripcion_visible, /correo válido/)
})

test('el nuevo contacto no reemplaza las páginas ni los destinatarios de pedidos', () => {
	assert.equal(campo(configuracion, 'quienes_somos').type, 'texteditor')
	assert.equal(campo(configuracion, 'mensaje_contacto').type, 'texteditor')
	assert.equal(campo(configuracion, 'titulo_quienes_somos').type, 'text')
	assert.equal(campo(configuracion, 'mail_notificacion_pedidos').type, 'text')
	assert.match(campo(configuracion, 'footer_contacto_email').descripcion_visible, /No cambia los destinatarios/)
	assert.match(campo(configuracion, 'footer_contacto_texto').descripcion_visible, /No reemplaza Contacto ni Quiénes somos/)
})

test('banner agrega un enlace opcional sin reemplazar imágenes, título ni contenido', () => {
	const prop = campo(banner, 'link')
	assert.equal(prop.type, 'text')
	assert.equal(prop.value, '')
	assert.ok(!prop.required)
	for (const fragmento of ['500', 'http://', 'https://', '/catalogo', 'sin usuario ni contraseña', 'con /', 'controles', 'barras invertidas', '//', 'javascript:', 'data:', 'sin enlace']) {
		assert.ok(prop.descripcion_visible.includes(fragmento), fragmento)
	}
	assert.equal(campo(banner, 'image_url').type, 'image')
	assert.equal(campo(banner, 'crop_image_url').type, 'image')
	assert.equal(campo(banner, 'header').is_title, true)
	assert.equal(campo(banner, 'lead').type, 'textarea')
})

test('guardar configuración conserva los nuevos valores y los contactos anteriores sin mutar el formulario', () => {
	const valores = {
		id: 7,
		footer_contacto_titulo: 'á'.repeat(80),
		footer_contacto_email: 'ventas@tutienda.com',
		footer_contacto_texto: 'Horario de atención\n' + 'ñ'.repeat(1980),
		mensaje_contacto: '<p>Contacto existente</p>',
		quienes_somos: '<p>Nuestra historia</p>',
		mail_notificacion_pedidos: 'pedidos@tutienda.com',
	}
	const copia = { ...valores }
	const resultado = enviar('online_configuration', configuracion, valores)
	assert.deepEqual(resultado, copia)
	assert.notEqual(resultado, valores)
	assert.deepEqual(valores, copia)
})

test('vaciar el footer llega como vacío al servidor para recuperar los predeterminados', () => {
	const valores = { id: 7, footer_contacto_titulo: '', footer_contacto_email: '', footer_contacto_texto: '' }
	assert.deepEqual(enviar('online_configuration', configuracion, valores), valores)
})

test('un modelo de API anterior no recibe campos nuevos inventados al guardar', () => {
	const valores = { id: 7, mensaje_contacto: 'Contacto' }
	const resultado = enviar('online_configuration', configuracion, valores)
	assert.deepEqual(resultado, valores)
	assert.equal(Object.hasOwn(resultado, 'footer_contacto_titulo'), false)
	assert.deepEqual(enviar('title', banner, { id: 4, header: 'Oferta' }), { id: 4, header: 'Oferta' })
})

test('enlace cargado, modificado o vacío pasa por el mismo guardado sin codificarlo ni truncarlo', () => {
	for (const link of [null, '', '/catalogo', 'catalogo', 'https://ejemplo.com/ofertas?categoria=1&orden=2', '/' + 'a'.repeat(499)]) {
		const valores = { id: 4, header: 'Oferta', lead: 'Ver más', link }
		assert.deepEqual(enviar('title', banner, valores), valores)
	}
})
