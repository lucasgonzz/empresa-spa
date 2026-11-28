// Fotos extra del agente en la burbuja pendiente (misión ft-agente-fotos-alternativas-t172, anexo cruzado).
// El agente puede mandar hasta 4 fotos por respuesta: la primera viaja en `media_src` y las otras (hasta 3)
// en `ai_extra_media_urls`. Mientras la respuesta espera aprobación (`ai_status == 'a_confirmar'`) la burbuja
// tiene que mostrarlas, para que el operador vea todo lo que va a salir al confirmar.
//   CA-S1: a_confirmar + URLs -> lista en orden, se muestra, con el texto «También se envían N fotos más...».
//   CA-S2: null, ausente, [] o strings vacíos -> nada.
//   CA-S3: enviado / enviando / entrante con extras -> nada (las ya enviadas salen como filas propias).
//
// Ejecutar con: node --test tests/whatsapp-fotos-extra-del-agente.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const RUTA = 'components/whatsapp/conversation/MessageBubble.vue'
const MessageBubble = cargar(RUTA, {
	moment: function () {},
	'@/components/whatsapp/conversation/AudioPlayer': {},
}).default

const URL_1 = 'https://cdn.ejemplo.com/a.jpg'
const URL_2 = 'https://cdn.ejemplo.com/b.jpg'
const URL_3 = 'https://cdn.ejemplo.com/c.jpg'

/**
 * Arma un `this` mínimo del componente con el mensaje dado y evalúa los computeds involucrados.
 *
 * @param {object} message Mensaje de la burbuja.
 * @returns {object} Contexto con los computeds ya resueltos.
 */
function contexto(message) {
	const self = { message: message }
	self.is_out = MessageBubble.computed.is_out.call(self)
	self.espera_confirmacion = MessageBubble.computed.espera_confirmacion.call(self)
	self.fotos_extra_del_agente = MessageBubble.computed.fotos_extra_del_agente.call(self)
	self.muestra_fotos_extra = MessageBubble.computed.muestra_fotos_extra.call(self)
	return self
}

/**
 * Mensaje saliente del agente con el estado y las fotos extra pedidas.
 */
function mensaje(ai_status, extras, direction) {
	const m = { direction: direction || 'out', ai_status: ai_status, media_type: 'image', media_src: URL_1 }
	if (extras !== undefined) {
		m.ai_extra_media_urls = extras
	}
	return m
}

test('CA-S1: a_confirmar con 3 URLs -> lista de 3 en orden y se muestra', () => {
	const c = contexto(mensaje('a_confirmar', [URL_1, URL_2, URL_3]))
	assert.deepEqual(c.fotos_extra_del_agente, [URL_1, URL_2, URL_3])
	assert.equal(c.muestra_fotos_extra, true)
})

test('CA-S1: el texto dice la cantidad de fotos extra', () => {
	const c = contexto(mensaje('a_confirmar', [URL_1, URL_2, URL_3]))
	assert.equal(MessageBubble.computed.texto_fotos_extra.call(c), 'También se envían 3 fotos más con esta respuesta')
	const una = contexto(mensaje('a_confirmar', [URL_1]))
	assert.equal(MessageBubble.computed.texto_fotos_extra.call(una), 'También se envía 1 foto más con esta respuesta')
})

test('CA-S1: descarta los strings vacíos intercalados y conserva el orden', () => {
	const c = contexto(mensaje('a_confirmar', [URL_1, '', URL_2, '   ']))
	assert.deepEqual(c.fotos_extra_del_agente, [URL_1, URL_2])
	assert.equal(c.muestra_fotos_extra, true)
})

test('CA-S2: null, ausente, [] o sólo strings vacíos -> nada', () => {
	const casos = [null, undefined, [], [''], ['', '  ']]
	casos.forEach(extras => {
		const c = contexto(mensaje('a_confirmar', extras))
		assert.deepEqual(c.fotos_extra_del_agente, [])
		assert.equal(c.muestra_fotos_extra, false)
	})
})

test('CA-S3: enviado, enviando o entrante con extras -> nada', () => {
	const extras = [URL_1, URL_2, URL_3]
	;['enviado', 'enviando', null, undefined].forEach(estado => {
		const c = contexto(mensaje(estado, extras))
		assert.deepEqual(c.fotos_extra_del_agente, [])
		assert.equal(c.muestra_fotos_extra, false)
	})
	const entrante = contexto(mensaje('a_confirmar', extras, 'in'))
	assert.deepEqual(entrante.fotos_extra_del_agente, [])
	assert.equal(entrante.muestra_fotos_extra, false)
})

test('cada miniatura abre el lightbox con SU url', () => {
	const commits = []
	const self = { $store: { commit: (tipo, valor) => commits.push([tipo, valor]) } }
	MessageBubble.methods.abrir_lightbox_de.call(self, URL_2)
	assert.deepEqual(commits, [['whatsapp_chat/setLightboxUrl', URL_2]])
})

test('template: la sección extra existe, usa los computeds y abre el lightbox por URL', () => {
	const fuente = fs.readFileSync(path.join(__dirname, '..', 'src', RUTA), 'utf8')
	assert.match(fuente, /v-if="muestra_fotos_extra"/)
	assert.match(fuente, /v-for="[^"]*in fotos_extra_del_agente"/)
	assert.match(fuente, /abrir_lightbox_de\(/)
	assert.match(fuente, /texto_fotos_extra/)
})
