// E10 (prueba con cliente gruñón, ronda 5, 14/11/2026): las direcciones web de un mensaje del panel de
// Agentes (Soporte y Asistente personal) se pueden tocar y abren en otra pestaña, sin v-html (D43).
//
// Cubre la función pura (common-vue/components/support-chat/enlaces.js), la capa de enlaces de
// formato.js (negrita y menciones intactas), el camino de Soporte (Conversation.vue) y que las dos
// plantillas dibujen el <a> con interpolación y nunca con v-html.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const compiler = require('vue-template-compiler')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const enlaces = cargar('common-vue/components/support-chat/enlaces.js')
const { segmentar_mensaje } = cargar('components/asistente-ia/formato.js')

function fuente(ruta) {
	return fs.readFileSync(path.join(__dirname, '..', 'src', ruta), 'utf8')
}

// Solo los tramos que son enlace, como [texto, href].
function solo_enlaces(tramos) {
	return tramos.filter(tramo => tramo.enlace).map(tramo => [tramo.texto, tramo.enlace])
}

test('una dirección simple se enlaza tal cual y el resto queda como texto', () => {
	const texto = 'Acá se ve cómo se hace: https://recursos.comerciocity.com/?v=T6.16'
	assert.deepEqual(enlaces.segmentar_enlaces(texto), [
		{ texto: 'Acá se ve cómo se hace: ', enlace: null },
		{ texto: 'https://recursos.comerciocity.com/?v=T6.16', enlace: 'https://recursos.comerciocity.com/?v=T6.16' },
	])
})

test('la puntuación de cierre pegada queda afuera del enlace', () => {
	const encuesta = 'https://api-admin.comerciocity.com/public/prueba/encuesta/nSnl9C'
	const texto = '¿Me contás en esta encuesta? Te lleva un minuto: ' + encuesta + '. Si querés seguir usando el sistema, escribime por acá.'
	const tramos = enlaces.segmentar_enlaces(texto)
	assert.deepEqual(solo_enlaces(tramos), [[encuesta, encuesta]])
	assert.equal(tramos.map(tramo => tramo.texto).join(''), texto, 'No se pierde ni se agrega nada.')
	;[',', ';', ':', '!', '?', '»', '"', '\'', '...', '?!'].forEach(signo => {
		assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('Mirá ' + encuesta + signo + ' dale')), [[encuesta, encuesta]], signo)
	})
	// «…» rodeando la dirección: la comilla de apertura no es parte y la de cierre tampoco.
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('«' + encuesta + '»')), [[encuesta, encuesta]])
	// Adentro de la dirección la puntuación sí va.
	const con_query = 'https://x.com/a?b=1,2&c=3.4'
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('ver ' + con_query + '.')), [[con_query, con_query]])
})

test('paréntesis: afuera si no abre adentro de la dirección, adentro si tiene su par', () => {
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('(ver https://x.com/a)')), [['https://x.com/a', 'https://x.com/a']])
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('(ver https://x.com/a).')), [['https://x.com/a', 'https://x.com/a']])
	const wiki = 'https://es.wikipedia.org/wiki/Foo_(bar)'
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('Leé ' + wiki + '.')), [[wiki, wiki]])
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('(Leé ' + wiki + ')')), [[wiki, wiki]])
})

test('dos direcciones en un mensaje, http y https', () => {
	const texto = 'Primero http://a.com/uno y después https://b.com.ar/dos?x=1, listo.'
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces(texto)), [
		['http://a.com/uno', 'http://a.com/uno'],
		['https://b.com.ar/dos?x=1', 'https://b.com.ar/dos?x=1'],
	])
})

test('javascript:, data:, mailto:, dominios pelados y esquemas falsos no se enlazan', () => {
	;[
		'javascript:alert(1)',
		'JavaScript:alert(document.cookie)',
		'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
		'mailto:alguien@ejemplo.com',
		'comerciocity.com',
		'www.comerciocity.com',
		'ftp://archivos.com/x',
		'xhttps://malo.com',
		'javascript:https://x.com',
		'https://',
		'http:///sin-host',
	].forEach(texto => {
		const tramos = enlaces.segmentar_enlaces('mirá ' + texto + ' ahora')
		assert.deepEqual(solo_enlaces(tramos), [], texto)
	})
	assert.equal(enlaces.es_direccion_web('javascript:alert(1)'), false)
	assert.equal(enlaces.es_direccion_web('https://x.com'), true)
	assert.equal(enlaces.es_direccion_web(null), false)
})

test('un texto sin direcciones queda igual', () => {
	const texto = 'Hola, ¿cómo andás? Te escribo por la venta de ayer.'
	assert.deepEqual(enlaces.segmentar_enlaces(texto), [{ texto: texto, enlace: null }])
	assert.deepEqual(enlaces.segmentar_enlaces(''), [])
	assert.deepEqual(enlaces.segmentar_enlaces(undefined), [])
	// En formato.js, igual que antes y con enlace: null.
	assert.deepEqual(segmentar_mensaje(texto, []), [{ texto: texto, mencion: null, negrita: false, enlace: null }])
})

test('formato.js: la dirección es una hoja propia, y en negrita es enlace y negrita a la vez', () => {
	const hojas = segmentar_mensaje('Entrá a **https://x.com/a** y listo.', [])
	assert.deepEqual(hojas, [
		{ texto: 'Entrá a ', mencion: null, negrita: false, enlace: null },
		{ texto: 'https://x.com/a', mencion: null, negrita: true, enlace: 'https://x.com/a' },
		{ texto: ' y listo.', mencion: null, negrita: false, enlace: null },
	])
	// Negrita que contiene la dirección y más texto: la dirección corta antes de los asteriscos.
	const mixtas = segmentar_mensaje('**Mirá https://x.com.** Chau', [])
	assert.deepEqual(mixtas, [
		{ texto: 'Mirá ', mencion: null, negrita: true, enlace: null },
		{ texto: 'https://x.com', mencion: null, negrita: true, enlace: 'https://x.com' },
		{ texto: '.', mencion: null, negrita: true, enlace: null },
		{ texto: ' Chau', mencion: null, negrita: false, enlace: null },
	])
	// En una lista (el formato no interpreta las listas: el guion sale tal cual).
	const lista = segmentar_mensaje('Pasos:\n- Abrí https://x.com/1\n- Después https://x.com/2.', [])
	assert.deepEqual(solo_enlaces(lista), [['https://x.com/1', 'https://x.com/1'], ['https://x.com/2', 'https://x.com/2']])
	assert.equal(lista.map(hoja => hoja.texto).join(''), 'Pasos:\n- Abrí https://x.com/1\n- Después https://x.com/2.')
})

test('formato.js: una mención existente no cambia, y una dirección que se pisa con una mención no se enlaza', () => {
	const menciones = [{ tipo: 'cliente', id: 7, texto: 'Juan Pérez' }]
	const hojas = segmentar_mensaje('**Juan Pérez** debe. Detalle: https://x.com/cc', menciones)
	assert.deepEqual(hojas, [
		{ texto: 'Juan Pérez', mencion: menciones[0], negrita: true, enlace: null },
		{ texto: ' debe. Detalle: ', mencion: null, negrita: false, enlace: null },
		{ texto: 'https://x.com/cc', mencion: null, negrita: false, enlace: 'https://x.com/cc' },
	])
	// Un artículo cuyo nombre trae una dirección: gana la mención, no hay enlace.
	const raro = [{ tipo: 'articulo', id: 3, texto: 'Kit https://x.com/kit' }]
	const con_mencion = segmentar_mensaje('Te recomiendo Kit https://x.com/kit hoy', raro)
	assert.deepEqual(con_mencion, [
		{ texto: 'Te recomiendo ', mencion: null, negrita: false, enlace: null },
		{ texto: 'Kit https://x.com/kit', mencion: raro[0], negrita: false, enlace: null },
		{ texto: ' hoy', mencion: null, negrita: false, enlace: null },
	])
})

test('Soporte (Conversation.vue): las partes de texto se enlazan y los videos de la prueba siguen igual', () => {
	const Conversacion = cargar('common-vue/components/support-chat/Conversation.vue', {
		'@/common-vue/components/support-chat/ImageLightbox.vue': {},
		'@/runtime_config': { env: () => '' },
	}).default
	const m = Conversacion.methods
	const encuesta = 'https://api-admin.comerciocity.com/public/prueba/encuesta/nSnl9C'
	const partes = m.partes_del_mensaje('Te lleva un minuto: ' + encuesta + '. Si querés seguir, escribime.')
	assert.equal(partes.length, 1, 'La encuesta no es un video: sigue en la parte de texto.')
	assert.deepEqual(solo_enlaces(m.enlaces_del_texto(partes[0])), [[encuesta, encuesta]])
	assert.deepEqual(m.enlaces_del_texto('sin enlaces'), [{ texto: 'sin enlaces', enlace: null }])

	const sfc = compiler.parseComponent(fuente('common-vue/components/support-chat/Conversation.vue'))
	assert.doesNotMatch(sfc.template.content, /\sv-html=/)
	assert.match(sfc.template.content, /<a v-if="tramo\.enlace" [^>]*:href="tramo\.enlace" target="_blank" rel="noopener noreferrer">\{\{ tramo\.texto \}\}<\/a>/)
	assert.match(sfc.template.content, /<video v-if="i % 2 && es_video_de_la_prueba\(parte\)"/)
	assert.equal(compiler.compile(sfc.template.content, { whitespace: 'condense' }).errors.length, 0)
})

test('Asistente (mensaje/agente/Index.vue): el segmento con dirección se dibuja como <a> que abre en otra pestaña', () => {
	const Agente = cargar('components/asistente-ia/mensaje/agente/Index.vue', {
		'@/components/asistente-ia/AccionCard': {},
		'@/components/asistente-ia/AdjuntosDeMensaje': {},
		'@/components/asistente-ia/OfertaDeSoporte': {},
		'@/components/asistente-ia/Icono': {},
		'@/components/asistente-ia/mensaje/agente/ValoracionMensaje': {},
		'@/components/asistente-ia/valoracion': { valoracion_de: () => null },
		'@/components/asistente-ia/identidad': { logo_del_negocio: () => '' },
		'@/components/asistente-ia/portapapeles': { copiar_al_portapapeles: () => Promise.resolve() },
		'@/components/asistente-ia/seguir_con_soporte': { uuid_de_la_oferta: () => null },
	}).default
	const vm = { message: { contenido: 'Mirá **acá**: https://x.com/a. Chau', menciones: [] } }
	const segmentos = Agente.computed.segmentos_del_texto.call(vm)
	const enlace = segmentos.find(segmento => segmento.href)
	assert.equal(enlace.texto, 'https://x.com/a')
	assert.equal(enlace.href, 'https://x.com/a')
	assert.equal(enlace.clase, 'asistente-ia-enlace')
	assert.equal(segmentos.filter(segmento => segmento.href).length, 1)
	// «Copiar» sigue copiando el texto tal cual se lee.
	assert.equal(Agente.computed.texto_plano.call({ segmentos_del_texto: segmentos }), 'Mirá acá: https://x.com/a. Chau')

	const sfc = compiler.parseComponent(fuente('components/asistente-ia/mensaje/agente/Index.vue'))
	assert.doesNotMatch(sfc.template.content, /\sv-html=/)
	assert.match(sfc.template.content, /:is="segmento\.href \? 'a' : 'span'"/)
	assert.match(sfc.template.content, /:target="segmento\.href \? '_blank' : null"/)
	assert.match(sfc.template.content, /:rel="segmento\.href \? 'noopener noreferrer' : null"/)
	assert.doesNotMatch(sfc.script.content, /\basync\b|\bawait\b/)
	const sass = sfc.styles.filter(estilo => estilo.lang === 'sass')
	const con_espacios = sass.reduce((lineas, estilo) => lineas.concat(estilo.content.split('\n').filter(linea => /^\t* +\S/.test(linea))), [])
	assert.deepEqual(con_espacios, [])
})

// ─── Revisión de E10: ataques ────────────────────────────────────────────────────────────

test('ataque: usuario o clave en la autoridad nunca se enlaza (el host real sería otro)', () => {
	;[
		'https://bueno.com@malo.com/x',
		'https://bueno.com:@malo.com',
		'https://usuario:clave@malo.com/',
		'http://@malo.com',
		'https://bueno.com%40x@malo.com',
	].forEach(direccion => {
		assert.equal(enlaces.es_direccion_web(direccion), false, direccion)
		assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('Entrá a ' + direccion + ' ya')), [], direccion)
	})
	// Un @ DESPUÉS de la autoridad (en el camino o la query) no cambia el host: se enlaza.
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('ver https://x.com/a@b')), [['https://x.com/a@b', 'https://x.com/a@b']])
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('ver https://x.com/?m=a@b.com')), [['https://x.com/?m=a@b.com', 'https://x.com/?m=a@b.com']])
})

test('ataque: invisibles y bidi adentro de la dirección la dejan como texto', () => {
	const c = codigo => String.fromCharCode(codigo)
	;[0x200B, 0x200C, 0x200D, 0x200E, 0x200F, 0x202A, 0x202D, 0x202E, 0x2060, 0x2066, 0x2069, 0xFEFF, 0x01, 0x1F, 0x7F, 0x85, 0x9F].forEach(codigo => {
		const direccion = 'https://x.com/' + c(codigo) + 'abc'
		assert.equal(enlaces.es_direccion_web(direccion), false, codigo.toString(16))
		const tramos = enlaces.segmentar_enlaces('ver ' + direccion + ' ya')
		assert.deepEqual(solo_enlaces(tramos).filter(([texto]) => texto.indexOf(c(codigo)) !== -1), [], codigo.toString(16))
	})
	// El override bidi en el host («https://moc.lam» que se lee al revés): texto.
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('https://' + c(0x202E) + 'moc.olam/x')), [])
})

test('ataque: host que new URL traduce a otro no se enlaza (incluye IDN, a propósito)', () => {
	const c = codigo => String.fromCharCode(codigo)
	;[
		'https://x.com' + c(0x3002) + 'y',   // punto ideográfico: x.com.y
		'https://x.com' + c(0xFF0E) + 'y',   // punto de ancho completo
		'https://x%2Ecom/a',
		'https://xn--ejemplo.com' + c(0x3002) + 'ar',
		'https://ma' + c(0xF1) + 'ana.com.ar',   // con eñe: pasa a punycode, ante la duda texto
		'https://0x7f.1/x',                    // IPv4 en hexa: el navegador lo traduce a 127.0.0.1
	].forEach(direccion => {
		assert.equal(enlaces.es_direccion_web(direccion), false, direccion)
	})
	// Mayúsculas en el host, puerto e IPv6: el host es el mismo, se enlazan.
	assert.equal(enlaces.es_direccion_web('https://X.COM/a'), true)
	assert.equal(enlaces.es_direccion_web('https://x.com:8080/a'), true)
	assert.equal(enlaces.es_direccion_web('http://[::1]:3000/'), true)
	assert.equal(enlaces.es_direccion_web('https://127.0.0.1/x'), true)
})

test('ataque: la elipsis queda afuera del enlace', () => {
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('Mirá https://x.com/a… y después')), [['https://x.com/a', 'https://x.com/a']])
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('Mirá https://x.com…')), [['https://x.com', 'https://x.com']])
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('(https://x.com/a)…')), [['https://x.com/a', 'https://x.com/a']])
})

test('ataque: JaVaScRiPt: y variantes de mayúsculas no se enlazan; HTTPS en mayúsculas sí', () => {
	;['JaVaScRiPt:alert(1)', 'JAVASCRIPT:alert(1)', 'jAvAsCrIpT://x.com', 'DaTa:text/html,x', 'javascript://https://x.com'].forEach(texto => {
		assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('mirá ' + texto + ' ya')), [], texto)
	})
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('ver HTTPS://X.COM/a')), [['HTTPS://X.COM/a', 'HTTPS://X.COM/a']])
})

test('ataque: entradas largas terminan rápido y lo que pasa el tope queda como texto', () => {
	const casos = [
		'https://x.com/' + ')'.repeat(100000),
		'https://x.com/' + ').'.repeat(50000),
		'https://x.com/' + '('.repeat(50000) + ')'.repeat(50000),
		'https://x.com/' + '.'.repeat(100000),
		'https://x.com/' + 'a'.repeat(100000),
	]
	casos.forEach((texto, indice) => {
		const desde = process.hrtime.bigint()
		enlaces.segmentar_enlaces(texto)
		segmentar_mensaje(texto, [])
		const ms = Number(process.hrtime.bigint() - desde) / 1e6
		assert.ok(ms < 200, 'caso ' + indice + ': ' + ms.toFixed(1) + ' ms')
	})
	// Más largo que el tope: texto.
	const larga = 'https://x.com/' + 'a'.repeat(enlaces.LARGO_MAXIMO)
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('ver ' + larga)), [])
	// Justo en el tope: se enlaza.
	const justa = 'https://x.com/' + 'a'.repeat(enlaces.LARGO_MAXIMO - 'https://x.com/'.length)
	assert.equal(justa.length, enlaces.LARGO_MAXIMO)
	assert.deepEqual(solo_enlaces(enlaces.segmentar_enlaces('ver ' + justa)), [[justa, justa]])
	// Muchas direcciones normales (7.000, 112.000 caracteres) siguen enlazando todas, en tiempo
	// lineal: cada una pasa por new URL (~30 µs) dos veces (enlaces.js y formato.js). Con el find
	// por hoja de antes, formato.js solo ya tardaba ~800 ms; el tope es holgado por la máquina cargada.
	const muchas = ('https://x.com/a ').repeat(7000)
	const desde = process.hrtime.bigint()
	assert.equal(solo_enlaces(enlaces.segmentar_enlaces(muchas)).length, 7000)
	assert.equal(solo_enlaces(segmentar_mensaje(muchas, [])).length, 7000)
	const ms = Number(process.hrtime.bigint() - desde) / 1e6
	assert.ok(ms < 1500, 'muchas direcciones: ' + ms.toFixed(1) + ' ms')
	// Muchas negritas (camino de antes, ahora con cursor): rápido también.
	const negritas = ('**a** ').repeat(7000)
	const desde_negritas = process.hrtime.bigint()
	assert.equal(segmentar_mensaje(negritas, []).filter(hoja => hoja.negrita).length, 7000)
	assert.ok(Number(process.hrtime.bigint() - desde_negritas) / 1e6 < 500, 'muchas negritas')
})

test('Soporte: el enlace tiene su foco por teclado propio', () => {
	const sfc = compiler.parseComponent(fuente('common-vue/components/support-chat/Conversation.vue'))
	const css = sfc.styles.map(estilo => estilo.content).join('\n')
	assert.match(css, /\.support-message-link:focus-visible \{[^}]*outline: 2px solid/)
})
