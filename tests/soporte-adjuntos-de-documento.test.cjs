// El chat de Soporte acepta la lista de precios del negocio (misión prueba-e2e-campana-imperio, 11/11/2026).
//
// Hasta hoy el selector de archivos solo ofrecía audios e imágenes: un negocio en prueba no tenía cómo mandarle
// su Excel o su PDF a Soporte desde el sistema.
//
//  L1. El selector ofrece además .xlsx, .xls, .csv y .pdf. Las imágenes siguen pasando por el editor y los audios
//      van directo al adjunto, como siempre.
//  L2. Un documento de más de 10 MB no se adjunta y se avisa en pantalla; si igual la API rechaza el envío con
//      un motivo (422), la burbuja lo muestra.
//  L3. La burbuja muestra el documento con su nombre (`original_name`), y «Adjunto» si la API es anterior.
//
// Ejecutar con: node --test tests/soporte-adjuntos-de-documento.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const compiler = require('vue-template-compiler')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const SRC = path.resolve(__dirname, '..', 'src')

function fuente(ruta) {
	return fs.readFileSync(path.join(SRC, ruta), 'utf8').replace(/\r\n/g, '\n')
}

const adjuntos = cargar('common-vue/components/support-chat/adjuntos.js')

test('L: el selector ofrece audios, imágenes y además Excel, CSV y PDF', () => {
	assert.equal(adjuntos.ACEPTA, 'audio/*,image/*,.xlsx,.xls,.csv,.pdf')
	const sfc = compiler.parseComponent(fuente('common-vue/components/support-chat/MessageInput.vue'))
	assert.match(sfc.template.content, /type="file"\s+:accept="acepta"/)
	assert.doesNotMatch(sfc.template.content, /accept="audio\/\*,image\/\*"/)

	const MessageInput = cargar('common-vue/components/support-chat/MessageInput.vue', {
		'@/common-vue/components/support-chat/ImageAnnotationEditor.vue': { __esModule: true, default: {} },
	}).default
	assert.equal(MessageInput.computed.acepta.call({}), adjuntos.ACEPTA)
})

test('L: qué es un documento y qué no', () => {
	const xlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	assert.equal(adjuntos.es_documento({ name: 'Lista de precios.xlsx', type: xlsx }), true)
	assert.equal(adjuntos.es_documento({ name: 'lista.XLS', type: 'application/vnd.ms-excel' }), true)
	assert.equal(adjuntos.es_documento({ name: 'lista.csv', type: 'text/csv' }), true)
	assert.equal(adjuntos.es_documento({ name: 'lista.csv', type: '' }), true, 'Windows manda el CSV sin tipo.')
	assert.equal(adjuntos.es_documento({ name: 'catalogo.v2.pdf', type: 'application/pdf' }), true)
	assert.equal(adjuntos.es_documento({ name: 'captura.png', type: 'image/png' }), false)
	assert.equal(adjuntos.es_documento({ name: 'foto.pdf', type: 'image/jpeg' }), false, 'Una imagen renombrada sigue siendo imagen.')
	assert.equal(adjuntos.es_documento({ name: 'audio_1.webm', type: 'audio/webm' }), false)
	assert.equal(adjuntos.es_documento({ name: 'notas.docx', type: '' }), false)
	assert.equal(adjuntos.es_documento({ name: 'pdf', type: '' }), false)
	assert.equal(adjuntos.es_documento(null), false)
})

test('L: un documento de más de 10 MB se rechaza con un aviso claro; lo demás no tiene tope nuevo', () => {
	const tope = adjuntos.TOPE_DE_DOCUMENTO
	assert.equal(tope, 10 * 1024 * 1024)
	assert.equal(adjuntos.rechazo_del_adjunto({ name: 'lista.xlsx', type: '', size: tope }), null)
	assert.equal(adjuntos.rechazo_del_adjunto({ name: 'lista.xlsx', type: '', size: tope + 1 }), 'El archivo pesa más de 10 MB. Achicalo o mandalo en partes.')
	assert.equal(adjuntos.rechazo_del_adjunto({ name: 'captura.png', type: 'image/png', size: tope * 3 }), null)
	assert.equal(adjuntos.rechazo_del_adjunto({ name: 'audio.webm', type: 'audio/webm', size: tope * 3 }), null)
	assert.equal(adjuntos.rechazo_del_adjunto(null), null)
})

/**
 * Un MessageInput sin montar, con el borrador y el adjunto andando como en el componente.
 *
 * @returns {object}
 */
function compositor() {
	const MessageInput = cargar('common-vue/components/support-chat/MessageInput.vue', {
		'@/common-vue/components/support-chat/ImageAnnotationEditor.vue': { __esModule: true, default: {} },
	}).default
	const vm = Object.assign(MessageInput.data(), MessageInput.methods, {
		clave_borrador: 'ticket:40',
		can_send: true,
		$set(objeto, clave, valor) { objeto[clave] = valor },
		$delete(objeto, clave) { delete objeto[clave] },
		$refs: { file_input: { value: 'algo' } },
	})
	Object.defineProperty(vm, 'borrador', { get: MessageInput.computed.borrador })
	Object.defineProperty(vm, 'body', MessageInput.computed.body)
	Object.defineProperty(vm, 'attachment', MessageInput.computed.attachment)
	return vm
}

test('L: elegir un Excel lo deja adjunto; uno demasiado pesado avisa y no se adjunta', () => {
	const vm = compositor()
	const lista = { name: 'Lista de precios.xlsx', type: '', size: 48000 }
	const evento = { target: { files: [lista], value: 'C:\\fakepath\\Lista de precios.xlsx' } }
	vm.on_file_change(evento)
	assert.equal(vm.attachment, lista)
	assert.equal(vm.attachment_error, '')
	assert.equal(evento.target.value, '', 'El selector queda listo para volver a elegir el mismo archivo.')

	const pesado = { name: 'catalogo.pdf', type: 'application/pdf', size: adjuntos.TOPE_DE_DOCUMENTO + 1 }
	vm.on_file_change({ target: { files: [pesado], value: 'x' } })
	assert.equal(vm.attachment, lista, 'El adjunto anterior no se pierde.')
	assert.equal(vm.attachment_error, 'El archivo pesa más de 10 MB. Achicalo o mandalo en partes.')

	// Elegir después uno válido limpia el aviso; quitar el adjunto también.
	vm.on_file_change({ target: { files: [lista], value: 'x' } })
	assert.equal(vm.attachment_error, '')
	vm.attachment_error = 'viejo'
	vm.remove_attachment()
	assert.equal(vm.attachment_error, '')
	assert.equal(vm.attachment, null)
})

test('L: las imágenes siguen yendo al editor y los audios directo al adjunto', () => {
	const vm = compositor()
	const editadas = []
	vm.open_image_editor = archivo => editadas.push(archivo)
	const imagen = { name: 'captura.png', type: 'image/png', size: adjuntos.TOPE_DE_DOCUMENTO * 2 }
	vm.on_file_change({ target: { files: [imagen], value: 'x' } })
	assert.deepEqual(editadas, [imagen])
	assert.equal(vm.attachment, null)

	const audio = { name: 'nota.mp3', type: 'audio/mpeg', size: 9000 }
	vm.on_file_change({ target: { files: [audio], value: 'x' } })
	assert.equal(vm.attachment, audio)
})

test('L: un documento viaja como mensaje de texto con adjunto (el `kind` de siempre)', () => {
	const vm = compositor()
	const enviados = []
	vm.$emit = (nombre, valor) => enviados.push([nombre, valor])
	vm.confirmando = false
	vm.recording = false
	const lista = { name: 'lista.csv', type: 'text/csv', size: 1200 }
	vm.attachment = lista
	vm.body = 'Va mi lista'
	vm.emit_send()
	return Promise.resolve().then(() => Promise.resolve()).then(() => {
		assert.deepEqual(enviados, [['send', { body: 'Va mi lista', kind: 'text', attachment: lista }]])
	})
})

test('L: la burbuja muestra el documento con su nombre, y «Adjunto» si la API todavía no lo guarda', () => {
	assert.equal(adjuntos.nombre_del_adjunto({ original_name: ' Lista de precios.xlsx ' }), 'Lista de precios.xlsx')
	assert.equal(adjuntos.nombre_del_adjunto({ original_name: null, path: 'support_messages/3/abc.xlsx' }), 'Adjunto')
	assert.equal(adjuntos.nombre_del_adjunto({}), 'Adjunto')
	assert.equal(adjuntos.nombre_del_adjunto(null), 'Adjunto')

	const sfc = compiler.parseComponent(fuente('common-vue/components/support-chat/Conversation.vue'))
	const plantilla = sfc.template.content
	assert.match(plantilla, /<a\s+v-else\s+class="support-message-file"\s+target="_blank"\s+rel="noopener noreferrer"/)
	assert.match(plantilla, /<span>\{\{ nombre_del_adjunto\(message\.attachments\[0\]\) \}\}<\/span>/)
	// Audio e imagen siguen con su reproductor y su miniatura.
	assert.match(plantilla, /<audio\s+v-if="message\.kind === 'audio'"/)
	assert.match(plantilla, /v-else-if="message\.kind === 'image'"/)

	const Conversacion = cargar('common-vue/components/support-chat/Conversation.vue', {
		'@/common-vue/components/support-chat/ImageLightbox.vue': {},
		'@/runtime_config': { env: () => 'http://api.test' },
	}).default
	assert.equal(Conversacion.methods.nombre_del_adjunto({ original_name: 'catalogo.pdf' }), 'catalogo.pdf')
	assert.equal(Conversacion.methods.attachment_url({ path: 'support_messages/3/abc.xlsx' }), 'http://api.test/storage/support_messages/3/abc.xlsx')
})

test('L: si la API rechaza el envío con un motivo (422), la burbuja lo dice; si no, «No enviado»', () => {
	const Conversacion = cargar('common-vue/components/support-chat/Conversation.vue', {
		'@/common-vue/components/support-chat/ImageLightbox.vue': {},
		'@/runtime_config': { env: () => '' },
	}).default
	const etiqueta = Conversacion.methods.delivery_error_label
	assert.equal(etiqueta({ _delivery_error: 'not_sent' }), 'No enviado')
	assert.equal(etiqueta({ _delivery_error: 'not_sent', _delivery_error_message: 'El archivo pesa más de 10 MB. Achicalo o mandalo en partes.' }), 'El archivo pesa más de 10 MB. Achicalo o mandalo en partes.')
	assert.equal(etiqueta({ remote_delivery_status: 'not_received' }), 'No recibido en soporte central')

	const armar = error => {
		const axios = { defaults: {}, post: () => Promise.reject(error) }
		const store = cargar('store/support_message.js', {
			axios: { __esModule: true, default: axios },
			'@/runtime_config': { env: () => 'http://api.test' },
		}).default
		const state = JSON.parse(JSON.stringify(store.state))
		const contexto = {
			state,
			rootState: { auth: { user: { id: 12 } } },
			commit(nombre, valor) { if (!nombre.includes('/')) store.mutations[nombre](state, valor) },
			dispatch: () => Promise.resolve(),
		}
		return store.actions.sendMessage(contexto, { body: 'Va mi lista', kind: 'text' }).then(() => state.models[0])
	}
	const log = console.log
	console.log = () => {}
	return Promise.all([
		armar({ response: { status: 422, data: { code: 'adjunto_demasiado_grande', message: 'El archivo pesa más de 10 MB. Achicalo o mandalo en partes.' } } }),
		armar({ response: { status: 500, data: { message: 'Server Error' } } }),
		armar(new Error('sin red')),
	]).then(filas => {
		console.log = log
		assert.equal(filas[0]._delivery_error, 'not_sent')
		assert.equal(filas[0]._delivery_error_message, 'El archivo pesa más de 10 MB. Achicalo o mandalo en partes.')
		assert.equal(filas[1]._delivery_error_message, null, 'Un 500 no le muestra su texto al usuario.')
		assert.equal(filas[2]._delivery_error_message, null)
	})
})

test('sin async/await y con SASS solo a tabulaciones en lo que tocó la misión', () => {
	;['common-vue/components/support-chat/MessageInput.vue', 'common-vue/components/support-chat/Conversation.vue'].forEach(ruta => {
		const sfc = compiler.parseComponent(fuente(ruta))
		assert.doesNotMatch(sfc.script.content, /\basync\b|\bawait\b/, ruta)
		const sass = sfc.styles.filter(estilo => estilo.lang === 'sass')
		const con_espacios = sass.reduce((lineas, estilo) => lineas.concat(estilo.content.split('\n').filter(linea => /^\t* +\S/.test(linea))), [])
		assert.deepEqual(con_espacios, [], ruta)
	})
	;['common-vue/components/support-chat/adjuntos.js', 'store/support_message.js'].forEach(ruta => {
		assert.doesNotMatch(fuente(ruta), /\basync\b|\bawait\b/, ruta)
	})
})
