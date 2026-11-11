// Alertas → Catálogo → Imágenes con el origen nuevo `proveedor_web` (misión importaciones-de-martin,
// 11/11/2026): las fotos que soporte trae de la página web de un proveedor no se buscan en Google ni
// las mira la IA, y ninguna pantalla tiene que decir lo contrario. Prueba los textos de
// imagenes/textos.js y el render del encabezado del detalle y de la fila "A revisar", sin navegador,
// sin DOM y sin la suite de Playwright (mismo arnés que tests/medidas-componentes.test.cjs).
//
// Ejecutar con: node --test tests/imagenes-proveedor-web.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const Vue = require('vue')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

Vue.config.productionTip = false
Vue.config.devtools = false
Vue.config.silent = true
Vue.config.ignoredElements = [/^b-/, 'estado-asignacion', 'miniatura']

Vue.mixin({
	methods: {
		date: valor => String(valor).slice(0, 10),
		hour: valor => String(valor).slice(11, 16),
	},
})

const textos = cargar('components/alertas/components/lista-de-alertas-table/imagenes/textos.js')
const Encabezado = cargar('components/alertas/components/lista-de-alertas-table/imagenes/detalle/Encabezado.vue').default
const FilaARevisar = cargar('components/alertas/components/lista-de-alertas-table/imagenes/detalle/FilaARevisar.vue').default

function instanciar(opciones, props) {
	return new Vue(Object.assign({}, opciones, { propsData: props || {} }))
}

function texto_de(nodo) {
	if (!nodo) {
		return ''
	}
	let texto = nodo.text || ''
	const hijos = nodo.children || (nodo.componentOptions && nodo.componentOptions.children) || []
	hijos.forEach(hijo => {
		texto += ' ' + texto_de(hijo)
	})
	return texto.replace(/\s+/g, ' ').trim()
}

function buscar_todos(nodo, condicion, salida) {
	salida = salida || []
	if (!nodo) {
		return salida
	}
	if (condicion(nodo)) {
		salida.push(nodo)
	}
	const hijos = nodo.children || (nodo.componentOptions && nodo.componentOptions.children) || []
	hijos.forEach(hijo => buscar_todos(hijo, condicion, salida))
	return salida
}

function por_testid(arbol, testid) {
	return buscar_todos(arbol, nodo => nodo.data && nodo.data.attrs && nodo.data.attrs['data-testid'] === testid)[0]
}

/** RunPayload (contrato §5.1) de una carga desde la web del proveedor. */
function asignacion(extra) {
	return Object.assign({
		id: 7, uuid: 'u-7', origen: 'proveedor_web', proveedor: '', fuente: 'www.ferreteria-ejemplo.com.ar',
		status: 'terminada', motivo_estado: null, total_articulos: 3, procesados: 3,
		conteos: { asignadas: 2, a_revisar: 1, no_asignadas: 0, pendientes: 0 },
		busquedas: 0, busquedas_por_articulo: 0, busquedas_por_criterio: { codigo_de_barras: 0, nombre: 0 },
		validaciones_ia: 0, lanzada_por: null, es_de_catalogo: false,
		created_at: '2026-11-11T15:00:00', started_at: '2026-11-11T15:00:00', finished_at: '2026-11-11T15:01:00',
		visto: false, trabada: false,
	}, extra || {})
}

/** ItemPayload (contrato §5.2) de una dudosa de la web del proveedor. */
function item_web(extra) {
	return Object.assign({
		id: 31, article_id: 501, article_name: 'Llave francesa 10"', article_bar_code: '7791234567890', article_provider_code: 'LF-10',
		status: 'a_revisar', motivo: 'coincidencia_dudosa', motivo_detalle: null, criterio_usado: 'nombre', busquedas: 0,
		validaciones_ia: 0, imagen_url: 'http://empresa.local/storage/imgcand_x.webp',
		imagen: {
			ancho: 800, alto: 800, fondo_blanco: null, fondo_blanco_ratio: null, dominio: null, pagina: null,
			url_origen: 'https://www.ferreteria-ejemplo.com.ar/producto/llave-francesa-10', fuente: 'ferreteria-ejemplo.com.ar',
			ia: { veredicto: 'sin_evaluar', confianza: null, problemas: [], motivo: null },
		},
		avisos: [], diagnostico: [], alternativas: [],
	}, extra || {})
}

test('ORIGENES nombra la web del proveedor', () => {
	assert.equal(textos.texto_de(textos.ORIGENES, 'proveedor_web'), 'Web del proveedor')
	assert.equal(textos.texto_de(textos.CRITERIOS, 'codigo_proveedor'), 'Código de proveedor')
	assert.equal(textos.es_de_proveedor_web(asignacion()), true)
	assert.equal(textos.es_de_proveedor_web(asignacion({ origen: 'seleccion' })), false)
	assert.equal(textos.es_de_proveedor_web(null), false)
})

test('dominio_de deja el sitio, venga como dominio o como URL', () => {
	assert.equal(textos.dominio_de('https://www.Ferreteria.com.ar/productos/x?y=1'), 'ferreteria.com.ar')
	assert.equal(textos.dominio_de('ferreteria.com.ar'), 'ferreteria.com.ar')
	assert.equal(textos.dominio_de('www.ferreteria.com.ar'), 'ferreteria.com.ar')
	assert.equal(textos.dominio_de(''), '')
	assert.equal(textos.dominio_de(null), '')
	assert.equal(textos.fuente_de(asignacion()), 'ferreteria-ejemplo.com.ar')
	assert.equal(textos.fuente_de(asignacion({ fuente: undefined })), '')
})

test('origen_de_la_imagen: url_origen primero, pagina de respaldo, y nunca un link que no sea web', () => {
	assert.deepEqual(textos.origen_de_la_imagen(item_web().imagen), {
		dominio: 'ferreteria-ejemplo.com.ar',
		pagina: 'https://www.ferreteria-ejemplo.com.ar/producto/llave-francesa-10',
	})
	// Una de Google: lo de siempre.
	assert.deepEqual(textos.origen_de_la_imagen({ dominio: 'mercadolibre.com.ar', pagina: 'https://mercadolibre.com.ar/p/1' }), {
		dominio: 'mercadolibre.com.ar',
		pagina: 'https://mercadolibre.com.ar/p/1',
	})
	// Sin fuente: el dominio sale de la página.
	assert.equal(textos.origen_de_la_imagen({ url_origen: 'https://www.prov.com/a' }).dominio, 'prov.com')
	assert.equal(textos.origen_de_la_imagen({ url_origen: 'javascript:alert(1)' }).pagina, null)
	assert.deepEqual(textos.origen_de_la_imagen(null), { dominio: '', pagina: null })
})

test('la columna Búsquedas de la tabla no muestra un 0 para la web del proveedor', () => {
	assert.equal(textos.texto_de_busquedas(asignacion()), 'No aplica')
	assert.equal(textos.texto_de_busquedas(asignacion({ origen: 'seleccion', busquedas: 12, busquedas_por_articulo: 1.5 })), '12 · 1,50 por artículo')
})

test('encabezado de la web del proveedor: el sitio en lugar de Google y de las búsquedas', () => {
	const arbol = instanciar(Encabezado, { asignacion: asignacion() })._render()
	const todo = texto_de(arbol)
	// "Sin búsquedas en Google" sí va (es lo que se aclara); lo que no va es Google como fuente.
	assert.ok(!/Google Imágenes|Buscado en/.test(todo), 'no tiene que dar a Google como fuente: ' + todo)
	assert.equal(por_testid(arbol, 'imagenes-detalle-busquedas'), undefined)
	const fuente = texto_de(por_testid(arbol, 'imagenes-detalle-fuente'))
	assert.match(fuente, /Fotos traídas de ferreteria-ejemplo\.com\.ar/)
	assert.match(fuente, /Sin búsquedas en Google ni validaciones con IA/)
	assert.match(todo, /Origen Web del proveedor/)
	assert.match(todo, /Sitio ferreteria-ejemplo\.com\.ar/)
})

test('encabezado de la web del proveedor sin fuente: no inventa un sitio', () => {
	const arbol = instanciar(Encabezado, { asignacion: asignacion({ fuente: null }) })._render()
	assert.match(texto_de(por_testid(arbol, 'imagenes-detalle-fuente')), /Fotos traídas de la web del proveedor/)
	assert.match(texto_de(arbol), /Sitio Web del proveedor/)
})

test('encabezado de una de Google: igual que siempre', () => {
	const arbol = instanciar(Encabezado, { asignacion: asignacion({ origen: 'seleccion', fuente: undefined, proveedor: 'serper', busquedas: 5 }) })._render()
	assert.ok(por_testid(arbol, 'imagenes-detalle-busquedas'))
	assert.equal(por_testid(arbol, 'imagenes-detalle-fuente'), undefined)
	assert.match(texto_de(arbol), /Buscado en Google Imágenes/)
})

test('fila a revisar de la web del proveedor: link a la página del producto, sin la IA ni búsquedas', () => {
	const arbol = instanciar(FilaARevisar, { item: item_web() })._render()
	const todo = texto_de(arbol)
	const link = por_testid(arbol, 'imagenes-pagina-31')
	assert.ok(link, 'falta el link a la página de origen')
	assert.equal(link.data.attrs.href, 'https://www.ferreteria-ejemplo.com.ar/producto/llave-francesa-10')
	assert.equal(link.data.attrs.rel, 'noopener noreferrer')
	assert.match(texto_de(link), /Ver en la web del proveedor/)
	assert.match(todo, /800 × 800 px · ferreteria-ejemplo\.com\.ar/)
	assert.ok(!/La IA/.test(todo), 'no tiene que hablar de la IA: ' + todo)
	assert.ok(!/búsqueda/i.test(todo), 'no tiene que hablar de búsquedas: ' + todo)
})

test('fila a revisar de Google: el link y la IA de siempre', () => {
	const arbol = instanciar(FilaARevisar, { item: item_web({
		criterio_usado: 'codigo_de_barras', busquedas: 1,
		imagen: { ancho: 600, alto: 600, dominio: 'mercadolibre.com.ar', pagina: 'https://mercadolibre.com.ar/p/1', ia: { veredicto: 'dudoso', confianza: 'medium', problemas: [], motivo: null } },
	}) })._render()
	const todo = texto_de(arbol)
	assert.match(texto_de(por_testid(arbol, 'imagenes-pagina-31')), /Ver dónde se encontró/)
	assert.match(todo, /La IA: no está segura, confianza media\./)
	assert.match(todo, /1 búsqueda/)
})
