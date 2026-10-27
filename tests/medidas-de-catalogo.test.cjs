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
