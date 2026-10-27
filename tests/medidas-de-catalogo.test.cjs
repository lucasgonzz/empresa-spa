// Reglas puras de Alertas → Catálogo → Medidas (misión medidas-masivas-catalogo, 27/10/2026):
// src/utils/medidas_de_catalogo.js (formato de valores, nota de conversión, validación de lo que se
// edita y normalización de lo que manda la API) y src/components/.../medidas/textos.js.
//
// Ejecutar con: node --test tests/medidas-de-catalogo.test.cjs
// No levanta servidores ni usa la suite de Playwright.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const medidas = cargar('utils/medidas_de_catalogo.js')
const textos = cargar('components/alertas/components/lista-de-alertas-table/medidas/textos.js')

// --- Formato de valores ------------------------------------------------------------------------

test('formatear_numero: coma decimal, punto de miles y sin ceros de relleno', () => {
	assert.equal(medidas.formatear_numero(7), '7')
	assert.equal(medidas.formatear_numero(0.82), '0,82')
	assert.equal(medidas.formatear_numero('0.8200'), '0,82')
	assert.equal(medidas.formatear_numero(1250.5), '1.250,5')
	// Un entero que termina en cero no pierde el cero ("100" no es "1").
	assert.equal(medidas.formatear_numero(100), '100')
	assert.equal(medidas.formatear_numero('700.0000'), '700')
	assert.equal(medidas.formatear_numero(0.0109), '0,0109')
	assert.equal(medidas.formatear_numero(null), '')
	assert.equal(medidas.formatear_numero(''), '')
	assert.equal(medidas.formatear_numero(undefined), '')
	assert.equal(medidas.formatear_numero('abc'), '')
})

test('formatear_medida pega la unidad', () => {
	assert.equal(medidas.formatear_medida(0.82, 'kg'), '0,82 kg')
	assert.equal(medidas.formatear_medida(7, 'cm'), '7 cm')
	assert.equal(medidas.formatear_medida(7), '7')
	assert.equal(medidas.formatear_medida(null, 'cm'), '')
})

test('nota_de_conversion: «70 mm → 7 cm» y «820 g → 0,82 kg» (los dos casos reales de Masquito)', () => {
	assert.equal(medidas.nota_de_conversion({ convertido: true, valor: 7, unidad: 'cm', valor_original: 70, unidad_original: 'mm' }), '70 mm → 7 cm')
	assert.equal(medidas.nota_de_conversion({ convertido: true, valor: 0.82, unidad: 'kg', valor_original: 820, unidad_original: 'g' }), '820 g → 0,82 kg')
	// La coma decimal del original también se respeta.
	assert.equal(medidas.nota_de_conversion({ convertido: true, valor: 0.0109, unidad: 'kg', valor_original: 10.9, unidad_original: 'g' }), '10,9 g → 0,0109 kg')
})

test('nota_de_conversion: sin conversión, o sin datos del original, no dice nada', () => {
	assert.equal(medidas.nota_de_conversion({ convertido: false, valor: 7, unidad: 'cm', valor_original: 70, unidad_original: 'mm' }), '')
	assert.equal(medidas.nota_de_conversion({ convertido: true, valor: 7, unidad: 'cm', valor_original: null, unidad_original: 'mm' }), '')
	assert.equal(medidas.nota_de_conversion({ convertido: true, valor: 7, unidad: 'cm', valor_original: 70, unidad_original: null }), '')
	assert.equal(medidas.nota_de_conversion({ convertido: true, valor: null, unidad: 'cm', valor_original: 70, unidad_original: 'mm' }), '')
	assert.equal(medidas.nota_de_conversion(null), '')
	assert.equal(medidas.nota_de_conversion(undefined), '')
})

test('entero_es agrupa los miles', () => {
	assert.equal(medidas.entero_es(4159), '4.159')
	assert.equal(medidas.entero_es('12'), '12')
	assert.equal(medidas.entero_es(null), '0')
	assert.equal(medidas.entero_es('x'), '0')
})

test('texto_para_input: coma decimal y sin miles; null es vacío', () => {
	assert.equal(medidas.texto_para_input(0.82), '0,82')
	assert.equal(medidas.texto_para_input(1250.5), '1250,5')
	assert.equal(medidas.texto_para_input(7), '7')
	assert.equal(medidas.texto_para_input(null), '')
	assert.equal(medidas.texto_para_input(0), '')
})

// --- Direcciones web ---------------------------------------------------------------------------

test('url_segura solo deja pasar http y https', () => {
	assert.equal(medidas.url_segura('https://www.ficha.com.ar/a'), 'https://www.ficha.com.ar/a')
	assert.equal(medidas.url_segura('http://x.com'), 'http://x.com')
	assert.equal(medidas.url_segura('javascript:alert(1)'), null)
	assert.equal(medidas.url_segura('data:text/html,hola'), null)
	assert.equal(medidas.url_segura('//x.com'), null)
	assert.equal(medidas.url_segura(null), null)
	assert.equal(medidas.url_segura(undefined), null)
})

test('dominio_de saca el host sin www ni puerto', () => {
	assert.equal(medidas.dominio_de('https://www.Ficha.com.ar/a/b?c=1'), 'ficha.com.ar')
	assert.equal(medidas.dominio_de('http://tienda.ejemplo.com:8080/x'), 'tienda.ejemplo.com')
	assert.equal(medidas.dominio_de('javascript:alert(1)'), '')
	assert.equal(medidas.dominio_de('no es una url'), '')
})

// --- Edición de los cuatro valores -------------------------------------------------------------

test('parsear_numero_es acepta coma o punto decimal y miles con punto', () => {
	assert.deepEqual(medidas.parsear_numero_es('7,5'), { vacio: false, valido: true, numero: 7.5 })
	assert.deepEqual(medidas.parsear_numero_es('7.5'), { vacio: false, valido: true, numero: 7.5 })
	assert.deepEqual(medidas.parsear_numero_es('1.250,5'), { vacio: false, valido: true, numero: 1250.5 })
	assert.deepEqual(medidas.parsear_numero_es(' 12 '), { vacio: false, valido: true, numero: 12 })
	assert.deepEqual(medidas.parsear_numero_es(''), { vacio: true, valido: true, numero: null })
	assert.deepEqual(medidas.parsear_numero_es(null), { vacio: true, valido: true, numero: null })
	assert.equal(medidas.parsear_numero_es('abc').valido, false)
	assert.equal(medidas.parsear_numero_es('7 cm').valido, false)
	assert.equal(medidas.parsear_numero_es('7,5,2').valido, false)
	assert.equal(medidas.parsear_numero_es('-3').valido, false)
	assert.equal(medidas.parsear_numero_es('1e3').valido, false)
})

test('validar_valores_editados: manda solo los campos con número', () => {
	const r = medidas.validar_valores_editados({ peso: '0,82', alto: '7', ancho: '', profundidad: '  ' })
	assert.deepEqual(r.valores, { peso: 0.82, alto: 7 })
	assert.deepEqual(r.errores, {})
	assert.equal(r.hay_errores, false)
	assert.equal(r.cantidad, 2)
})

test('validar_valores_editados: marca cada campo mal escrito, sin cortar los demás', () => {
	const r = medidas.validar_valores_editados({ peso: 'mucho', alto: '0', ancho: '1500', profundidad: '12,5' })
	assert.equal(r.hay_errores, true)
	assert.deepEqual(Object.keys(r.errores).sort(), ['alto', 'ancho', 'peso'])
	assert.equal(r.errores.peso, 'Escribí un número, por ejemplo 7,5.')
	assert.equal(r.errores.alto, 'Tiene que ser mayor que cero.')
	assert.equal(r.errores.ancho, 'Es demasiado grande: el máximo es 1.000 cm.')
	assert.deepEqual(r.valores, { profundidad: 12.5 })
	assert.equal(r.cantidad, 1)
})

test('validar_valores_editados: topes de cordura del plan (peso 2000 kg, medidas 1000 cm)', () => {
	assert.equal(medidas.validar_valores_editados({ peso: '2000' }).hay_errores, false)
	assert.equal(medidas.validar_valores_editados({ peso: '2000,1' }).errores.peso, 'Es demasiado grande: el máximo es 2.000 kg.')
	assert.equal(medidas.validar_valores_editados({ alto: '1000' }).hay_errores, false)
	assert.equal(medidas.validar_valores_editados({ alto: '1000,1' }).hay_errores, true)
})

test('validar_valores_editados: todo vacío o una entrada absurda no tira excepción', () => {
	assert.deepEqual(medidas.validar_valores_editados({}), { valores: {}, errores: {}, hay_errores: false, cantidad: 0 })
	assert.equal(medidas.validar_valores_editados(null).cantidad, 0)
	assert.equal(medidas.validar_valores_editados('x').cantidad, 0)
})

test('validar_valores_editados: redondea a 4 decimales, como la base', () => {
	assert.equal(medidas.validar_valores_editados({ peso: '0,123456' }).valores.peso, 0.1235)
})

// --- Normalización: resumen, conteos, corrida --------------------------------------------------

test('normalizar_resumen: el badge de la API manda; sin badge, a revisar + sin ver', () => {
	assert.deepEqual(medidas.normalizar_resumen({ a_revisar: 3, sin_ver: 1, badge: 9, en_proceso: 2 }), { a_revisar: 3, sin_ver: 1, badge: 9, en_proceso: 2 })
	assert.equal(medidas.normalizar_resumen({ a_revisar: '3', sin_ver: '1' }).badge, 4)
	assert.equal(medidas.normalizar_resumen({ a_revisar: 3, sin_ver: 1, badge: 0 }).badge, 0)
	assert.deepEqual(medidas.normalizar_resumen(null), { a_revisar: 0, sin_ver: 0, badge: 0, en_proceso: 0 })
	assert.deepEqual(medidas.normalizar_resumen('x'), medidas.resumen_vacio())
})

test('normalizar_conteos: números siempre', () => {
	assert.deepEqual(medidas.normalizar_conteos({ asignadas: '5', a_revisar: 2, sin_datos: null }), { asignadas: 5, a_revisar: 2, sin_datos: 0, pendientes: 0, errores: 0 })
	assert.deepEqual(medidas.normalizar_conteos(undefined), { asignadas: 0, a_revisar: 0, sin_datos: 0, pendientes: 0, errores: 0 })
})

test('normalizar_corrida: el RunPayload del contrato, con defaults', () => {
	const c = medidas.normalizar_corrida({
		id: '7', origen: 'catalogo', status: 'en_proceso', solo_con_stock: 1, total: '4159', procesados: 120,
		conteos: { asignadas: 10, a_revisar: 5, sin_datos: 100, pendientes: 4039, errores: 5 },
		busquedas: 260, validaciones_ia: 120, started_at: '2026-10-28 10:00:00', finished_at: null,
		esta_trabada: false, puede_detener: true, puede_reanudar: false, visto: false,
	})
	assert.equal(c.id, 7)
	assert.equal(c.total, 4159)
	assert.equal(c.solo_con_stock, true)
	assert.equal(c.conteos.a_revisar, 5)
	assert.equal(c.puede_detener, true)
	assert.equal(c.visto, false)
	assert.equal(c.finished_at, null)
})

test('normalizar_corrida: alias y defaults razonables si faltan campos', () => {
	const c = medidas.normalizar_corrida({ id: 3, status: 'detenida', total_articulos: 50, trabada: true })
	assert.equal(c.total, 50)
	assert.equal(c.esta_trabada, true)
	assert.equal(c.puede_reanudar, true)
	assert.equal(c.puede_detener, false)
	assert.equal(c.visto, true)
	assert.equal(c.origen, 'catalogo')
	assert.equal(medidas.normalizar_corrida({ id: 4, status: 'pendiente' }).puede_detener, true)
	assert.equal(medidas.normalizar_corrida({ id: 4, status: 'terminada' }).puede_reanudar, false)
})

test('normalizar_corrida: algo que no es una corrida da null', () => {
	assert.equal(medidas.normalizar_corrida(null), null)
	assert.equal(medidas.normalizar_corrida({}), null)
	assert.equal(medidas.normalizar_corrida('x'), null)
})

// --- Normalización: items ----------------------------------------------------------------------

/** Un ItemPayload completo como el de los dos casos reales de Masquito. */
function item_completo() {
	return {
		id: 11, article_id: 501, article_name: 'Espada de juguete', article_bar_code: '7790000000001', article_provider_code: 'ESP-1',
		status: 'asignada', motivo: '', motivo_detalle: '', criterio_usado: 'codigo_de_barras',
		propuesta: { peso: 0.82, alto: 100, ancho: 7, profundidad: 11 },
		faltan: [],
		campos: [
			{ clave: 'peso', etiqueta: 'Peso', valor: 0.82, unidad: 'kg', valor_original: 820, unidad_original: 'g', convertido: true, cita: 'Peso: 820 g', url: 'https://www.ficha.com.ar/espada', alcance: 'producto' },
			{ clave: 'alto', etiqueta: 'Alto', valor: 100, unidad: 'cm', valor_original: 100, unidad_original: 'cm', convertido: false, cita: '70 x 11 x 100 cm', url: 'https://www.ficha.com.ar/espada', alcance: 'envio' },
			{ clave: 'ancho', etiqueta: 'Ancho', valor: 7, unidad: 'cm', valor_original: 70, unidad_original: 'mm', convertido: true, cita: '70 x 11 x 1000 mm', url: 'https://otra.com/x', alcance: 'envio' },
			{ clave: 'profundidad', etiqueta: 'Profundidad', valor: 11, unidad: 'cm', valor_original: 11, unidad_original: 'cm', convertido: false, cita: null, url: null, alcance: null },
		],
		fuentes: [{ url: 'https://www.ficha.com.ar/espada', titulo: 'Espada', dominio: 'ficha.com.ar' }],
		nota_ia: '', busquedas: 2, revisado_at: null,
	}
}

test('normalizar_item: los cuatro campos en orden, con «Largo» para profundidad', () => {
	const item = medidas.normalizar_item(item_completo())
	assert.deepEqual(item.campos.map(c => c.clave), ['peso', 'alto', 'ancho', 'profundidad'])
	assert.deepEqual(item.campos.map(c => c.etiqueta), ['Peso', 'Alto', 'Ancho', 'Largo'])
	assert.deepEqual(item.campos.map(c => c.falta), [false, false, false, false])
	assert.equal(item.cantidad_con_valor, 4)
	assert.deepEqual(item.faltan, [])
	assert.deepEqual(item.propuesta, { peso: 0.82, alto: 100, ancho: 7, profundidad: 11 })
})

test('normalizar_item: marca convertidos y arma la nota de cada uno', () => {
	const item = medidas.normalizar_item(item_completo())
	const notas = item.campos.map(c => medidas.nota_de_conversion(c))
	assert.deepEqual(notas, ['820 g → 0,82 kg', '', '70 mm → 7 cm', ''])
})

test('normalizar_item: medidas parciales, los faltantes quedan marcados', () => {
	const crudo = item_completo()
	crudo.status = 'a_revisar'
	crudo.motivo = 'medidas_parciales'
	crudo.propuesta = { peso: 0.82, alto: null, ancho: 0, profundidad: null }
	crudo.campos = [crudo.campos[0]]
	crudo.faltan = ['alto', 'ancho', 'profundidad']
	const item = medidas.normalizar_item(crudo)
	assert.deepEqual(item.campos.map(c => c.falta), [false, true, true, true])
	assert.deepEqual(item.faltan, ['alto', 'ancho', 'profundidad'])
	assert.equal(item.cantidad_con_valor, 1)
	// Un campo que falta no puede estar «convertido» ni tener valor.
	assert.equal(item.campos[1].valor, null)
	assert.equal(item.campos[1].convertido, false)
	assert.equal(item.propuesta.ancho, null)
})

test('normalizar_item: sin `campos`, el valor sale de `propuesta` con la unidad de siempre', () => {
	const item = medidas.normalizar_item({ id: 1, propuesta: { peso: '1.5000', alto: 20 } })
	assert.equal(item.campos[0].valor, 1.5)
	assert.equal(item.campos[0].unidad, 'kg')
	assert.equal(item.campos[1].unidad, 'cm')
	assert.equal(item.campos[2].falta, true)
})

test('normalizar_item: las fuentes salen de `fuentes` y, si faltan, de las URLs de los campos, sin repetir', () => {
	const item = medidas.normalizar_item(item_completo())
	assert.deepEqual(item.fuentes.map(f => f.dominio), ['ficha.com.ar', 'otra.com'])
	const sin_fuentes = item_completo()
	sin_fuentes.fuentes = []
	assert.deepEqual(medidas.normalizar_item(sin_fuentes).fuentes.map(f => f.url), ['https://www.ficha.com.ar/espada', 'https://otra.com/x'])
})

test('normalizar_item: una URL que no es web no llega a ser un link', () => {
	const crudo = item_completo()
	crudo.fuentes = [{ url: 'javascript:alert(1)', titulo: 'malo' }]
	crudo.campos[0].url = 'javascript:alert(1)'
	crudo.campos[1].url = null
	crudo.campos[2].url = null
	const item = medidas.normalizar_item(crudo)
	assert.deepEqual(item.fuentes, [])
	assert.equal(item.campos[0].url, null)
})

test('normalizar_item: algo que no es un item da null; items descarta lo inválido', () => {
	assert.equal(medidas.normalizar_item(null), null)
	assert.equal(medidas.normalizar_item({}), null)
	assert.deepEqual(medidas.normalizar_items([{ id: 1 }, null, 'x', { id: 2 }]).map(i => i.id), [1, 2])
	assert.deepEqual(medidas.normalizar_items(undefined), [])
})

test('normalizar_diagnostico: un bloque por plan, con las páginas y por qué se descartó cada una', () => {
	const plan = medidas.normalizar_diagnostico([
		{ criterio: 'codigo_de_barras', consulta: '"7790000000001"', busquedas: 1, resultados: 8, paginas: [
			{ url: 'https://a.com/x', titulo: 'A', leida: true, motivo_descarte: 'sin_medidas' },
			{ url: 'javascript:alert(1)', titulo: 'B', motivo: 'otro_producto' },
		] },
		{ criterio: 'nombre', consulta: 'espada ficha técnica peso medidas', usado: false, motivo_no_usado: 'Ya se probó.' },
		null,
	])
	assert.equal(plan.length, 2)
	assert.equal(plan[0].resultados, 8)
	assert.equal(plan[0].paginas[0].dominio, 'a.com')
	assert.equal(plan[0].paginas[0].leida, true)
	assert.equal(plan[0].paginas[0].motivo, 'sin_medidas')
	assert.equal(plan[0].paginas[1].url, null)
	assert.equal(plan[0].paginas[1].motivo, 'otro_producto')
	assert.equal(plan[1].usado, false)
	assert.deepEqual(plan[1].paginas, [])
	assert.deepEqual(medidas.normalizar_diagnostico(null), [])
})

test('normalizar_diagnostico: la forma real de la API (plan usado con ia y resultado, plan no usado con `motivo`)', () => {
	const planes = medidas.normalizar_diagnostico([
		{ criterio: 'codigo_de_barras', usado: false, motivo: 'El código de barras cargado no es un GTIN válido (puede ser un código interno).' },
		{
			criterio: 'codigo_proveedor', usado: true, consulta: '"ESP-1" espada', ok: true, error: null, resultados: 8, duracion_ms: 900,
			paginas: [
				{ url: 'https://a.com/x', titulo: 'A', dominio: 'a.com', leida: false, motivo: 'La página no contiene el código buscado.' },
				{ url: 'https://b.com/y', titulo: 'B', dominio: 'b.com', leida: true },
			],
			ia: { llamada: true, respondio: true, match: 'otro_producto', nota: 'Es otro modelo.', campos: { peso: 'ok', alto: 'La cita no contiene el número.', ancho: 'ok' } },
			resultado: 'otro_producto',
		},
		{ criterio: 'nombre', usado: true, consulta: 'espada ficha técnica peso medidas', resultados: 0, paginas: [], ia: null, resultado: 'tope_demo' },
	])
	assert.equal(planes[0].usado, false)
	assert.equal(planes[0].motivo_no_usado, 'El código de barras cargado no es un GTIN válido (puede ser un código interno).')
	assert.equal(planes[0].busquedas, 0)
	assert.equal(planes[1].busquedas, 1)
	assert.equal(planes[1].resultados, 8)
	assert.equal(planes[1].resultado, 'otro_producto')
	assert.equal(planes[1].paginas[0].motivo, 'La página no contiene el código buscado.')
	assert.equal(planes[1].paginas[1].leida, true)
	assert.equal(planes[1].ia.match, 'otro_producto')
	assert.deepEqual(planes[1].ia.campos.map(c => [c.clave, c.etiqueta, c.ok]), [['peso', 'Peso', true], ['alto', 'Alto', false], ['ancho', 'Ancho', true]])
	assert.equal(planes[1].ia.campos[1].motivo, 'La cita no contiene el número.')
	// El corte por el tope de la demo no gastó ninguna consulta, y sin llamada a la IA no hay bloque de IA.
	assert.equal(planes[2].busquedas, 0)
	assert.equal(planes[2].ia, null)
})

test('normalizar_diagnostico: `resultados` como lista cuenta como páginas', () => {
	const plan = medidas.normalizar_diagnostico([{ criterio: 'nombre', resultados: [{ url: 'https://a.com' }, { url: 'https://b.com' }] }])
	assert.equal(plan[0].resultados, 2)
	assert.equal(plan[0].paginas.length, 2)
})

// --- Normalización: previa y forma de las respuestas -------------------------------------------

test('normalizar_previa: espeja la de imágenes; lo que falta es «no se sabe» y no bloquea', () => {
	const p = medidas.normalizar_previa({
		a_buscar: 4159, sin_medidas: 4800, excluidos_sin_stock: 3000, excluidos_en_otra_asignacion: 2,
		proveedor_configurado: false, ia_configurada: true,
		estimacion: { busquedas: 9150, minutos: 830, usd_busquedas: 9.15, usd_ia: 2.9 },
	})
	assert.equal(p.a_buscar, 4159)
	assert.equal(p.sin_medidas, 4800)
	assert.equal(p.excluidos_en_otra_corrida, 2)
	assert.equal(p.proveedor_configurado, false)
	assert.equal(p.ia_configurada, true)
	assert.equal(p.estimacion.busquedas, 9150)
	assert.equal(p.estimacion.usd_ia, 2.9)

	const vacia = medidas.normalizar_previa(null)
	assert.equal(vacia.a_buscar, 0)
	assert.equal(vacia.proveedor_configurado, null)
	assert.equal(vacia.ia_configurada, null)
	assert.equal(vacia.corrida_activa, null)
	assert.equal(vacia.estimacion.busquedas, null)
})

test('normalizar_previa: la corrida activa se normaliza', () => {
	const p = medidas.normalizar_previa({ a_buscar: 0, corrida_activa: { id: 9, status: 'en_proceso', total: 10, procesados: 3 } })
	assert.equal(p.corrida_activa.id, 9)
	assert.equal(p.corrida_activa.procesados, 3)
})

test('extraer_paginador acepta {data}, {models: paginador} y {models: lista}', () => {
	const a = medidas.extraer_paginador({ data: [{ id: 1 }], total: 40, last_page: 2, current_page: 1 })
	assert.equal(a.data.length, 1)
	assert.equal(a.total, 40)
	assert.equal(a.last_page, 2)
	const b = medidas.extraer_paginador({ models: { data: [{ id: 1 }, { id: 2 }], total: '2', last_page: 1, current_page: 1 }, resumen: {} })
	assert.equal(b.data.length, 2)
	assert.equal(b.total, 2)
	const c = medidas.extraer_paginador({ models: [{ id: 1 }] })
	assert.equal(c.total, 1)
	assert.equal(medidas.extraer_paginador({}), null)
	assert.equal(medidas.extraer_paginador(null), null)
	assert.equal(medidas.extraer_paginador('x'), null)
})

test('extraer_modelo acepta {model}, {data} y el objeto suelto', () => {
	assert.deepEqual(medidas.extraer_modelo({ model: { id: 1 } }), { id: 1 })
	assert.deepEqual(medidas.extraer_modelo({ data: { id: 2 } }), { id: 2 })
	assert.deepEqual(medidas.extraer_modelo({ id: 3 }), { id: 3 })
	assert.equal(medidas.extraer_modelo(null), null)
})

// --- textos.js ---------------------------------------------------------------------------------

test('texto_de: usa el mapa, humaniza lo desconocido y no se deja engañar por propiedades de Object', () => {
	assert.equal(textos.texto_de(textos.MOTIVOS, 'variante_dudosa'), 'Variante dudosa')
	assert.equal(textos.texto_de(textos.MOTIVOS, 'medidas_parciales'), 'Medidas parciales')
	assert.equal(textos.texto_de(textos.MOTIVOS, 'coincidencia_por_nombre'), 'Coincidencia por nombre')
	assert.equal(textos.texto_de(textos.MOTIVOS, 'algo_nuevo'), 'Algo nuevo')
	assert.equal(textos.texto_de(textos.MOTIVOS, 'constructor'), 'Constructor')
	assert.equal(textos.texto_de(textos.MOTIVOS, ''), '')
	assert.equal(textos.texto_de(textos.MOTIVOS, null), '')
})

test('los motivos que piden mirar el artículo van en ámbar', () => {
	assert.ok(textos.MOTIVOS_DE_AVISO.indexOf('variante_dudosa') !== -1)
	assert.ok(textos.MOTIVOS_DE_AVISO.indexOf('medidas_parciales') !== -1)
	assert.ok(textos.MOTIVOS_DE_AVISO.indexOf('sin_resultados') === -1)
})

test('esta_activa, porcentaje_de y conteo', () => {
	assert.equal(textos.esta_activa({ status: 'pendiente' }), true)
	assert.equal(textos.esta_activa({ status: 'en_proceso' }), true)
	assert.equal(textos.esta_activa({ status: 'terminada' }), false)
	assert.equal(textos.esta_activa(null), false)
	assert.equal(textos.porcentaje_de({ total: 200, procesados: 50 }), 25)
	assert.equal(textos.porcentaje_de({ total: 0, procesados: 0 }), null)
	assert.equal(textos.porcentaje_de({ total: 10, procesados: 99 }), 100)
	assert.equal(textos.porcentaje_de(null), null)
	assert.equal(textos.conteo({ a_revisar: '4' }, 'a_revisar'), 4)
	assert.equal(textos.conteo(null, 'a_revisar'), 0)
	assert.equal(textos.conteo({}, 'sin_datos'), 0)
})

test('texto de consultas de una corrida: total y promedio por artículo', () => {
	assert.equal(textos.texto_de_consultas({ busquedas: 1830, procesados: 1000 }), '1.830 · 1,83 por artículo')
	assert.equal(textos.texto_de_consultas({ busquedas: 0, procesados: 0 }), '0')
	assert.equal(textos.consultas_del_articulo(0), 'Sin consultas')
	assert.equal(textos.consultas_del_articulo(1), '1 consulta')
	assert.equal(textos.consultas_del_articulo(3), '3 consultas')
})

test('alcance de la corrida: dice si fue solo con stock', () => {
	assert.equal(textos.texto_de_alcance_de_la_corrida({ origen: 'catalogo', solo_con_stock: false }), 'Todo el catálogo')
	assert.equal(textos.texto_de_alcance_de_la_corrida({ origen: 'catalogo', solo_con_stock: true }), 'Todo el catálogo · solo con stock')
})

test('duración y dólares en texto', () => {
	assert.equal(textos.duracion_en_texto(45), '45 min')
	assert.equal(textos.duracion_en_texto(660), '11 h')
	assert.equal(textos.duracion_en_texto(667), '11 h 7 min')
	assert.equal(textos.dolares_en_texto(7.5), '7,50')
})

// --- Aprobar con valores editados (contrato: ausente = propuesto, número = ese, null = no escribir) ---

/** La propuesta de los dos casos reales: peso y alto y ancho, sin largo. */
const PROPUESTA = { peso: 0.82, alto: 100, ancho: 7, profundidad: null }

test('armar_valores_a_aprobar: lo que no se tocó se omite', () => {
	const r = medidas.armar_valores_a_aprobar({ peso: '0,82', alto: '100', ancho: '7', profundidad: '' }, PROPUESTA)
	assert.deepEqual(r.valores, {})
	assert.deepEqual(r.excluidos, [])
	assert.equal(r.a_escribir, 3)
	assert.equal(r.hay_errores, false)
})

test('armar_valores_a_aprobar: lo que cambió va con el número nuevo, también un campo que la propuesta no traía', () => {
	const r = medidas.armar_valores_a_aprobar({ peso: '0,82', alto: '35,5', ancho: '7', profundidad: '11' }, PROPUESTA)
	assert.deepEqual(r.valores, { alto: 35.5, profundidad: 11 })
	assert.equal(r.a_escribir, 4)
})

test('armar_valores_a_aprobar: lo que se vació, habiendo propuesta, va en null explícito (no se escribe)', () => {
	const r = medidas.armar_valores_a_aprobar({ peso: '', alto: '100', ancho: '', profundidad: '' }, PROPUESTA)
	// Peso y ancho se vaciaron: null. Largo no tenía propuesta: no hay qué excluir, se omite.
	assert.deepEqual(r.valores, { peso: null, ancho: null })
	assert.deepEqual(r.excluidos, ['peso', 'ancho'])
	assert.equal(r.a_escribir, 1)
})

test('armar_valores_a_aprobar: vaciar todo no deja nada para escribir (a_escribir 0)', () => {
	const r = medidas.armar_valores_a_aprobar({ peso: '', alto: '', ancho: '', profundidad: '' }, PROPUESTA)
	assert.equal(r.a_escribir, 0)
	assert.deepEqual(r.valores, { peso: null, alto: null, ancho: null })
})

test('armar_valores_a_aprobar: comparar con la propuesta redondea a 4 decimales (0,12349 es lo propuesto 0.1235)', () => {
	const r = medidas.armar_valores_a_aprobar({ peso: '0,12349' }, { peso: 0.1235 })
	assert.deepEqual(r.valores, {})
	assert.equal(r.a_escribir, 1)
})

test('armar_valores_a_aprobar: un valor mal escrito es un error y no arma nada', () => {
	const r = medidas.armar_valores_a_aprobar({ peso: 'x', alto: '', ancho: '7', profundidad: '' }, PROPUESTA)
	assert.equal(r.hay_errores, true)
	assert.equal(r.errores.peso, 'Escribí un número, por ejemplo 7,5.')
	assert.deepEqual(r.valores, {})
})

test('armar_valores_a_aprobar: tolera una propuesta ausente', () => {
	assert.deepEqual(medidas.armar_valores_a_aprobar({ alto: '3' }, null).valores, { alto: 3 })
	assert.equal(medidas.armar_valores_a_aprobar(null, undefined).a_escribir, 0)
})

test('lectura_de_valor: muestra cómo se va a guardar, incluida la ambigüedad de «1.250»', () => {
	assert.equal(medidas.lectura_de_valor('1.250', 'kg'), 'Se guarda 1,25 kg')
	assert.equal(medidas.lectura_de_valor('1.250,5', 'kg'), 'Se guarda 1.250,5 kg')
	assert.equal(medidas.lectura_de_valor('7,5', 'cm'), 'Se guarda 7,5 cm')
	assert.equal(medidas.lectura_de_valor('7.5', 'cm'), 'Se guarda 7,5 cm')
	assert.equal(medidas.lectura_de_valor('0,123456', 'kg'), 'Se guarda 0,1235 kg')
	assert.equal(medidas.lectura_de_valor('', 'cm'), '')
	assert.equal(medidas.lectura_de_valor('abc', 'cm'), '')
	assert.equal(medidas.lectura_de_valor('0', 'cm'), '')
	assert.equal(medidas.lectura_de_valor(null, 'cm'), '')
})

test('normalizar_resultado_de_accion: lee los campos del cuerpo y de `model`, solo claves válidas, sin repetir', () => {
	const r = medidas.normalizar_resultado_de_accion({ llenados: ['peso', 'alto'], salteados: ['ancho', 'ancho', 'inventado'], model: { excluidos: ['profundidad'], revertidos: ['peso'], conservados: ['alto'] } })
	assert.deepEqual(r, { llenados: ['peso', 'alto'], salteados: ['ancho'], excluidos: ['profundidad'], revertidos: ['peso'], conservados: ['alto'] })
	assert.deepEqual(medidas.normalizar_resultado_de_accion(null), { llenados: [], salteados: [], excluidos: [], revertidos: [], conservados: [] })
	assert.deepEqual(medidas.normalizar_resultado_de_accion({ llenados: 'peso' }).llenados, [])
})

test('normalizar_item: `aplicado` por campo (true / false / null si la API no lo informa)', () => {
	const it = medidas.normalizar_item({ id: 1, propuesta: { peso: 1, alto: 2, ancho: 3 }, campos: [
		{ clave: 'peso', valor: 1, aplicado: true },
		{ clave: 'alto', valor: 2, aplicado: false },
		{ clave: 'ancho', valor: 3 },
	] })
	assert.deepEqual(it.campos.map(c => c.aplicado), [true, false, null, null])
})

test('texto_de_campos: nombres con «y», «Largo» para profundidad, en el orden de los chips', () => {
	assert.equal(textos.texto_de_campos(['profundidad', 'peso']), 'Peso y Largo')
	assert.equal(textos.texto_de_campos(['alto', 'ancho', 'peso']), 'Peso, Alto y Ancho')
	assert.equal(textos.texto_de_campos(['ancho']), 'Ancho')
	assert.equal(textos.texto_de_campos([]), '')
	assert.equal(textos.texto_de_campos(null), '')
	assert.equal(textos.texto_de_campos(['otro']), '')
})

test('aviso_de_aprobacion: sin salteados ni excluidos no hay aviso; con ellos dice qué campos', () => {
	assert.equal(textos.aviso_de_aprobacion(null), null)
	assert.equal(textos.aviso_de_aprobacion({ llenados: ['peso', 'alto'], salteados: [], excluidos: [] }), null)
	const salteados = textos.aviso_de_aprobacion({ llenados: ['peso'], salteados: ['alto', 'ancho'], excluidos: [] })
	assert.equal(salteados.tipo, 'warning')
	assert.equal(salteados.texto, 'Se cargó Peso. No se pisó Alto y Ancho: el artículo ya tenía un valor cargado.')
	const excluidos = textos.aviso_de_aprobacion({ llenados: ['alto'], salteados: [], excluidos: ['peso'] })
	assert.equal(excluidos.tipo, 'info')
	assert.equal(excluidos.texto, 'Se cargó Alto. No se cargó Peso, como pediste.')
	const ambos = textos.aviso_de_aprobacion({ llenados: [], salteados: ['peso'], excluidos: ['alto'] })
	assert.equal(ambos.tipo, 'warning')
	assert.equal(ambos.texto, 'No se pisó Peso: el artículo ya tenía un valor cargado. No se cargó Alto, como pediste.')
})

test('aviso_de_quitar: «Listo» de siempre, o qué se conservó porque se modificó después', () => {
	assert.deepEqual(textos.aviso_de_quitar({ revertidos: ['peso'], conservados: [] }), { tipo: 'success', texto: 'Listo: le quitamos las medidas al artículo' })
	assert.deepEqual(textos.aviso_de_quitar(null), { tipo: 'success', texto: 'Listo: le quitamos las medidas al artículo' })
	const con_conservados = textos.aviso_de_quitar({ revertidos: ['peso', 'alto'], conservados: ['ancho'] })
	assert.equal(con_conservados.tipo, 'warning')
	assert.equal(con_conservados.texto, 'Se quitó Peso y Alto. Se conservó Ancho porque se modificó después de la búsqueda.')
	assert.equal(textos.aviso_de_quitar({ revertidos: [], conservados: ['peso'] }).texto, 'No se quitó nada. Se conservó Peso porque se modificó después de la búsqueda.')
})

test('el texto de «no disponible» ya no habla de activar nada para el negocio', () => {
	assert.equal(textos.TEXTOS.no_disponible.titulo, 'Todavía no está disponible')
	assert.equal(textos.TEXTOS.no_disponible.pista, 'La búsqueda de peso y medidas se habilita con la próxima actualización de tu sistema.')
	assert.doesNotMatch(JSON.stringify(textos.TEXTOS.no_disponible), /activada|negocio|extensi/i)
})
