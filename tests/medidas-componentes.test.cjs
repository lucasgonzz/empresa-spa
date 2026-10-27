// Componentes de Alertas → Catálogo → Medidas (misión medidas-masivas-catalogo, 27/10/2026):
// humo de render y comportamiento de las filas, sin navegador, sin DOM y sin la suite de Playwright.
//
// Ejecutar con: node --test tests/medidas-componentes.test.cjs
//
// Cómo: se compila el <template> y se carga el <script> de cada .vue con tests/helpers/
// cargar_modulo_esm.cjs, se instancia el componente SIN montarlo (no hay DOM) y se llama a `_render()`
// para obtener el árbol de VNodes, igual que tests/total-antes-de-guardar.test.cjs. Eso alcanza para
// cazar lo que en el navegador sería una pantalla en blanco (una variable que no existe en el
// template, un v-for sobre algo que no es lista) y para chequear lo que dibuja cada fila. Lo visual
// (tres anchos, overflow) NO se prueba acá: se mira en un navegador.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const Vue = require('vue')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

Vue.config.productionTip = false
Vue.config.devtools = false
// Los import() perezosos de los .vue (Diagnostico, BarraProgreso) no se resuelven en este arnés: sin avisos.
Vue.config.silent = true
// Los b-button, b-form-input, empty-state... no están registrados en el test: son etiquetas sueltas.
Vue.config.ignoredElements = [/^b-/, 'empty-state', 'estado-corrida', 'barra-progreso', 'horizontal-nav']

// Helpers globales que en la app llegan por mixin (this.date / this.hour).
Vue.mixin({
	methods: {
		date: valor => String(valor).slice(0, 10),
		hour: valor => String(valor).slice(11, 16),
	},
})

const medidas = cargar('utils/medidas_de_catalogo.js')
const Chips = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/ChipsDeMedidas.vue').default
const Fuente = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/FuenteDeMedidas.vue').default
const FilaARevisar = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/FilaARevisar.vue').default
const FilaAsignada = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/FilaAsignada.vue').default
const FilaSinDatos = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/FilaSinDatos.vue').default
const Diagnostico = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/Diagnostico.vue').default
const Encabezado = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/Encabezado.vue').default
const BarraDeSolapa = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/BarraDeSolapa.vue').default
const PaginacionItems = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/PaginacionItems.vue').default
const EstadoCorrida = cargar('components/alertas/components/lista-de-alertas-table/medidas/EstadoCorrida.vue').default
const TablaCorridas = cargar('components/alertas/components/lista-de-alertas-table/medidas/TablaCorridas.vue').default

/**
 * Instancia un componente sin montarlo.
 *
 * @param {object} opciones El `default` del .vue.
 * @param {object} props Props del componente.
 * @returns {Vue}
 */
function instanciar(opciones, props) {
	return new Vue(Object.assign({}, opciones, { propsData: props || {} }))
}

/**
 * El texto de un árbol de VNodes, con espacios normalizados.
 *
 * @param {object} nodo
 * @returns {string}
 */
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

/** Todos los VNodes del árbol que cumplen una condición. */
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

/** El VNode con un data-testid, o undefined. */
function por_testid(arbol, testid) {
	return buscar_todos(arbol, nodo => nodo.data && nodo.data.attrs && nodo.data.attrs['data-testid'] === testid)[0]
}

/** Un ItemPayload como el que manda la API, normalizado. */
function item(extra) {
	return medidas.normalizar_item(Object.assign({
		id: 11, article_id: 501, article_name: 'Espada de juguete', article_bar_code: '7790000000001', article_provider_code: 'ESP-1',
		status: 'a_revisar', motivo: 'variante_dudosa', motivo_detalle: 'La página es de otra versión.', criterio_usado: 'codigo_de_barras',
		propuesta: { peso: 0.82, alto: 100, ancho: 7, profundidad: null },
		campos: [
			{ clave: 'peso', valor: 0.82, unidad: 'kg', valor_original: 820, unidad_original: 'g', convertido: true, cita: 'Peso: 820 g', url: 'https://www.ficha.com.ar/espada', alcance: 'producto' },
			{ clave: 'alto', valor: 100, unidad: 'cm', convertido: false, cita: '70 x 11 x 100 cm', url: 'https://www.ficha.com.ar/espada', alcance: 'envio' },
			{ clave: 'ancho', valor: 7, unidad: 'cm', valor_original: 70, unidad_original: 'mm', convertido: true, cita: '70 mm', url: 'https://www.ficha.com.ar/espada', alcance: 'envio' },
		],
		fuentes: [{ url: 'https://www.ficha.com.ar/espada', titulo: 'Espada', dominio: 'ficha.com.ar' }],
		nota_ia: 'La página es de la versión con espada de 35 cm.', busquedas: 2,
	}, extra || {}))
}

// --- Chips -------------------------------------------------------------------------------------

test('los chips muestran los cuatro campos, con «falta» y con la nota de conversión', () => {
	const it = item()
	const arbol = instanciar(Chips, { campos: it.campos, item_id: it.id })._render()
	const texto = texto_de(arbol)
	assert.match(texto, /Peso 0,82 kg 820 g → 0,82 kg/)
	assert.match(texto, /Alto 100 cm/)
	assert.match(texto, /Ancho 7 cm 70 mm → 7 cm/)
	assert.match(texto, /Largo falta/)
	// Una sola nota por campo convertido, y ninguna para los demás.
	assert.ok(por_testid(arbol, 'medidas-conversion-11-peso'))
	assert.ok(por_testid(arbol, 'medidas-conversion-11-ancho'))
	assert.equal(por_testid(arbol, 'medidas-conversion-11-alto'), undefined)
	assert.equal(por_testid(arbol, 'medidas-conversion-11-profundidad'), undefined)
	// El chip que falta está marcado para el ámbar.
	assert.equal(por_testid(arbol, 'medidas-chip-11-profundidad').data.attrs['data-falta'], 1)
	assert.equal(por_testid(arbol, 'medidas-chips-11').data.attrs['data-faltan'], 1)
})

// --- Fuente ------------------------------------------------------------------------------------

test('la fuente muestra el dominio con link seguro, el tipo de medidas y ofrece la cita', () => {
	const it = item()
	const arbol = instanciar(Fuente, { fuentes: it.fuentes, campos: it.campos, item_id: it.id })._render()
	const link = por_testid(arbol, 'medidas-fuente-link-11-0')
	assert.equal(link.data.attrs.href, 'https://www.ficha.com.ar/espada')
	assert.equal(link.data.attrs.rel, 'noopener noreferrer')
	assert.equal(link.data.attrs.target, '_blank')
	assert.match(texto_de(link), /ficha\.com\.ar/)
	assert.match(texto_de(por_testid(arbol, 'medidas-alcance-11')), /Medidas del producto · Medidas del envío/)
	assert.ok(por_testid(arbol, 'medidas-citas-boton-11'))
	// Cerrada por defecto: la lista de citas no se dibuja.
	assert.equal(por_testid(arbol, 'medidas-citas-11'), undefined)
})

test('la fuente abierta lista la cita literal de cada medida', () => {
	const it = item()
	const vm = instanciar(Fuente, { fuentes: it.fuentes, campos: it.campos, item_id: it.id })
	vm.abierto = true
	const texto = texto_de(por_testid(vm._render(), 'medidas-citas-11'))
	assert.match(texto, /Peso Peso: 820 g/)
	assert.match(texto, /Alto 70 x 11 x 100 cm/)
	assert.doesNotMatch(texto, /Largo/)
})

test('sin fuentes ni citas, la fuente no dibuja nada', () => {
	const vacio = item({ campos: [], propuesta: { peso: 1 }, fuentes: [] })
	const arbol = instanciar(Fuente, { fuentes: vacio.fuentes, campos: vacio.campos, item_id: vacio.id })._render()
	assert.equal(arbol.tag, undefined)
})

// --- Fila «A revisar» --------------------------------------------------------------------------

test('A revisar: motivo como etiqueta, nota de la IA, y las tres acciones', () => {
	const arbol = instanciar(FilaARevisar, { item: item() })._render()
	assert.match(texto_de(por_testid(arbol, 'medidas-motivo-11')), /Variante dudosa/)
	assert.match(texto_de(por_testid(arbol, 'medidas-nota-ia-11')), /espada de 35 cm/)
	assert.match(texto_de(arbol), /La página es de otra versión\./)
	assert.ok(por_testid(arbol, 'medidas-rechazar-11'))
	assert.ok(por_testid(arbol, 'medidas-editar-11'))
	assert.ok(por_testid(arbol, 'medidas-aprobar-11'))
	assert.ok(por_testid(arbol, 'medidas-tilde-11'))
	assert.equal(por_testid(arbol, 'medidas-edicion-11'), undefined)
	assert.match(texto_de(por_testid(arbol, 'medidas-codigo-barras-11')), /7790000000001/)
})

test('A revisar: sin ninguna medida propuesta, Aprobar queda apagado y Editar sigue', () => {
	const sin_valores = item({ propuesta: {}, campos: [], motivo: 'coincidencia_por_nombre' })
	const arbol = instanciar(FilaARevisar, { item: sin_valores })._render()
	assert.equal(por_testid(arbol, 'medidas-aprobar-11').data.attrs.disabled, true)
	assert.notEqual(por_testid(arbol, 'medidas-editar-11').data.attrs.disabled, true)
})

test('A revisar: Editar abre los cuatro inputs con lo propuesto, los que faltan vacíos', () => {
	const vm = instanciar(FilaARevisar, { item: item() })
	vm.abrir_edicion()
	assert.deepEqual(vm.entradas, { peso: '0,82', alto: '100', ancho: '7', profundidad: '' })
	const arbol = vm._render()
	assert.ok(por_testid(arbol, 'medidas-edicion-11'))
	;['peso', 'alto', 'ancho', 'profundidad'].forEach(clave => {
		assert.ok(por_testid(arbol, 'medidas-campo-11-' + clave), 'falta el input de ' + clave)
	})
	assert.ok(por_testid(arbol, 'medidas-guardar-aprobar-11'))
	assert.ok(por_testid(arbol, 'medidas-cancelar-11'))
	// Editando, Aprobar tal cual no se ofrece (se aprueba con Guardar y aprobar).
	assert.equal(por_testid(arbol, 'medidas-aprobar-11').data.attrs.disabled, true)
	assert.equal(por_testid(arbol, 'medidas-editar-11'), undefined)
})

test('A revisar: Guardar y aprobar emite `aprobar` con los valores editados (solo los escritos)', () => {
	const vm = instanciar(FilaARevisar, { item: item() })
	const emitidos = []
	vm.$on('aprobar', valores => emitidos.push(valores))
	vm.abrir_edicion()
	vm.entradas.alto = '35,5'
	vm.entradas.profundidad = '11'
	vm.entradas.peso = ''
	vm.guardar_y_aprobar()
	assert.equal(emitidos.length, 1)
	assert.deepEqual(emitidos[0], { alto: 35.5, ancho: 7, profundidad: 11 })
})

test('A revisar: Guardar y aprobar con un valor mal escrito no emite y marca el campo', () => {
	const vm = instanciar(FilaARevisar, { item: item() })
	const emitidos = []
	vm.$on('aprobar', valores => emitidos.push(valores))
	vm.abrir_edicion()
	vm.entradas.peso = 'pesado'
	vm.entradas.ancho = '0'
	vm.guardar_y_aprobar()
	assert.equal(emitidos.length, 0)
	assert.equal(vm.errores.peso, 'Escribí un número, por ejemplo 7,5.')
	assert.equal(vm.errores.ancho, 'Tiene que ser mayor que cero.')
	const arbol = vm._render()
	assert.match(texto_de(por_testid(arbol, 'medidas-campo-error-11-peso')), /Escribí un número/)
	// Al volver a escribir en el campo, su error desaparece.
	vm.limpiar_error('peso')
	assert.equal(vm.errores.peso, undefined)
})

test('A revisar: con los cuatro vacíos se pide escribir al menos una medida', () => {
	const vm = instanciar(FilaARevisar, { item: item() })
	const emitidos = []
	vm.$on('aprobar', valores => emitidos.push(valores))
	vm.abrir_edicion()
	vm.entradas = { peso: '', alto: '', ancho: '', profundidad: '' }
	vm.guardar_y_aprobar()
	assert.equal(emitidos.length, 0)
	assert.equal(vm.error_general, 'Escribí al menos una medida para aprobar.')
})

test('A revisar: Cancelar cierra la edición sin emitir nada', () => {
	const vm = instanciar(FilaARevisar, { item: item() })
	const emitidos = []
	vm.$on('aprobar', valores => emitidos.push(valores))
	vm.abrir_edicion()
	vm.entradas.peso = 'x'
	vm.guardar_y_aprobar()
	vm.cerrar_edicion()
	assert.equal(vm.editando, false)
	assert.deepEqual(vm.errores, {})
	assert.equal(emitidos.length, 0)
})

test('A revisar: no se puede guardar mientras hay una acción en vuelo', () => {
	const vm = instanciar(FilaARevisar, { item: item(), procesando: true })
	const emitidos = []
	vm.$on('aprobar', valores => emitidos.push(valores))
	vm.abrir_edicion()
	vm.guardar_y_aprobar()
	assert.equal(emitidos.length, 0)
})

// --- Fila «Asignadas» y «Sin datos» ------------------------------------------------------------

test('Asignadas: chips, quién aprobó, fuente y Quitar', () => {
	const it = item({ status: 'aprobada', motivo: 'codigo_exacto', motivo_detalle: 'Peso y medidas completos de una página que tiene el código de barras del artículo.', revisado_por: 'Juan', nota_ia: '' })
	const vm = instanciar(FilaAsignada, { item: it })
	const emitidos = []
	vm.$on('quitar', () => emitidos.push('quitar'))
	const arbol = vm._render()
	assert.match(texto_de(por_testid(arbol, 'medidas-aprobada-por-11')), /Aprobada por Juan/)
	assert.match(texto_de(arbol), /Código exacto/)
	assert.match(texto_de(arbol), /Peso y medidas completos de una página que tiene el código de barras del artículo\./)
	// Los chips y la fuente son componentes hijos: acá se ve que la fila se los pasa, con los campos.
	const hijos = buscar_todos(arbol, nodo => !!nodo.componentOptions)
	assert.equal(hijos.length, 2)
	assert.deepEqual(hijos[0].componentOptions.propsData.campos.map(c => c.clave), ['peso', 'alto', 'ancho', 'profundidad'])
	assert.equal(hijos[0].componentOptions.propsData.item_id, 11)
	assert.ok(por_testid(arbol, 'medidas-quitar-11'))
	assert.equal(por_testid(arbol, 'medidas-nota-ia-11'), undefined)
	assert.equal(por_testid(arbol, 'medidas-aprobar-11'), undefined)
})

test('Asignadas sola (sin revisión) no dice «Aprobada»', () => {
	const arbol = instanciar(FilaAsignada, { item: item({ status: 'asignada', motivo: '' }) })._render()
	assert.equal(por_testid(arbol, 'medidas-aprobada-por-11'), undefined)
})

test('Sin datos: motivo, detalle, y «Ver qué se probó» siempre ofrecido', () => {
	const sin = item({ status: 'sin_datos', motivo: 'sin_resultados', motivo_detalle: 'El buscador no devolvió resultados.', propuesta: {}, campos: [], fuentes: [], nota_ia: '', diagnostico: [] })
	const vm = instanciar(FilaSinDatos, { item: sin })
	const arbol = vm._render()
	assert.match(texto_de(por_testid(arbol, 'medidas-motivo-11')), /Sin resultados/)
	assert.match(texto_de(arbol), /El buscador no devolvió resultados\./)
	assert.match(texto_de(por_testid(arbol, 'medidas-diagnostico-11')), /Ver qué se probó/)
	// Sin acciones de aprobar.
	assert.equal(por_testid(arbol, 'medidas-aprobar-11'), undefined)
	assert.equal(por_testid(arbol, 'medidas-quitar-11'), undefined)
	vm.abierto = true
	assert.match(texto_de(por_testid(vm._render(), 'medidas-diagnostico-11')), /Ocultar qué se probó/)
})

test('Sin datos: los motivos de sistema van en ámbar y «no se encontró» en gris', () => {
	const gris = instanciar(FilaSinDatos, { item: item({ status: 'sin_datos', motivo: 'sin_resultados' }) })
	assert.equal(gris.tono_del_motivo, 'neutro')
	const ambar = instanciar(FilaSinDatos, { item: item({ status: 'sin_datos', motivo: 'error_interno' }) })
	assert.equal(ambar.tono_del_motivo, 'aviso')
	const desconocido = instanciar(FilaSinDatos, { item: item({ status: 'sin_datos', motivo: 'algo_nuevo' }) })
	assert.equal(desconocido.motivo, 'Algo nuevo')
})

test('Diagnóstico: cada plan con su consulta, resultados y el porqué de cada página', () => {
	const sin = item({ status: 'sin_datos', diagnostico: [
		{ criterio: 'codigo_de_barras', consulta: '"7790000000001"', busquedas: 1, resultados: 8, paginas: [
			{ url: 'https://a.com/x', leida: true, motivo_descarte: 'sin_medidas' },
			{ url: 'https://b.com/y', leida: false, motivo_descarte: 'sin_el_codigo' },
		] },
		{ criterio: 'nombre', consulta: 'espada ficha técnica peso medidas', usado: false, motivo_no_usado: 'Se llegó al tope de consultas.' },
	] })
	const arbol = instanciar(Diagnostico, { diagnostico: sin.diagnostico, item_id: sin.id })._render()
	const texto = texto_de(arbol)
	assert.match(texto, /Por código de barras "7790000000001"/)
	assert.match(texto, /1 consulta · 8 resultados/)
	assert.match(texto, /a\.com Se leyó No traía medidas/)
	assert.match(texto, /b\.com No se leyó No traía el código del artículo/)
	assert.match(texto, /Por nombre espada ficha técnica peso medidas Se llegó al tope de consultas\./)
})

test('Diagnóstico con la forma real de la API: resultado del plan, lo que vio la IA y qué medida falló', () => {
	const sin = item({ status: 'sin_datos', diagnostico: [
		{ criterio: 'codigo_de_barras', usado: false, motivo: 'El artículo no tiene código de barras.' },
		{
			criterio: 'nombre', usado: true, consulta: 'espada ficha técnica peso medidas', resultados: 8,
			paginas: [{ url: 'https://a.com/x', dominio: 'a.com', leida: false, motivo: 'Es un PDF: no se leen.' }],
			ia: { llamada: true, respondio: true, match: 'variante_distinta', nota: 'Es el pack por 6.', campos: { peso: 'ok', alto: 'La cita no contiene el número.' } },
			resultado: 'sin_medidas',
		},
	] })
	const arbol = instanciar(Diagnostico, { diagnostico: sin.diagnostico, item_id: sin.id })._render()
	const texto = texto_de(arbol)
	assert.match(texto, /Por código de barras El artículo no tiene código de barras\./)
	assert.match(texto, /1 consulta · 8 resultados/)
	assert.match(texto, /Las páginas no traían medidas que se pudieran validar\./)
	assert.match(texto, /a\.com No se leyó Es un PDF: no se leen\./)
	assert.match(texto, /La IA vio una variante o presentación distinta\./)
	assert.match(texto, /Es el pack por 6\./)
	assert.match(texto, /Peso: válida/)
	assert.match(texto, /Alto: sin valor La cita no contiene el número\./)
})

test('Diagnóstico vacío dice que no quedó registrado', () => {
	const arbol = instanciar(Diagnostico, { diagnostico: [], item_id: 3 })._render()
	assert.match(texto_de(arbol), /No quedó registrado qué se probó/)
})

// --- Encabezado, barra, paginación, estado -----------------------------------------------------

function corrida(extra) {
	return medidas.normalizar_corrida(Object.assign({
		id: 7, origen: 'catalogo', status: 'en_proceso', solo_con_stock: true, total: 4159, procesados: 1000,
		conteos: { asignadas: 40, a_revisar: 120, sin_datos: 800, pendientes: 3159, errores: 0 },
		busquedas: 2100, validaciones_ia: 1000, started_at: '2026-10-28 10:00:00', created_at: '2026-10-28 09:59:00', finished_at: null,
		esta_trabada: false, puede_detener: true, puede_reanudar: false, visto: false,
	}, extra || {}))
}

test('Encabezado: Detener solo con el acceso maestro; consultas y promedio', () => {
	const sin_maestro = instanciar(Encabezado, { corrida: corrida(), es_acceso_maestro: false })._render()
	assert.equal(por_testid(sin_maestro, 'medidas-detener'), undefined)
	const con_maestro = instanciar(Encabezado, { corrida: corrida(), es_acceso_maestro: true })._render()
	assert.ok(por_testid(con_maestro, 'medidas-detener'))
	assert.equal(por_testid(con_maestro, 'medidas-reanudar'), undefined)
	const consultas = texto_de(por_testid(con_maestro, 'medidas-detalle-consultas'))
	assert.match(consultas, /2\.100 consultas al buscador 2,10 por artículo 1\.000 validaciones con IA/)
	assert.match(texto_de(con_maestro), /Todo el catálogo · solo con stock/)
})

test('Encabezado: una corrida detenida ofrece Reanudar', () => {
	const detenida = corrida({ status: 'detenida', puede_detener: false, puede_reanudar: true, motivo_estado: 'Se detuvo desde el acceso maestro.' })
	const arbol = instanciar(Encabezado, { corrida: detenida, es_acceso_maestro: true })._render()
	assert.ok(por_testid(arbol, 'medidas-reanudar'))
	assert.equal(por_testid(arbol, 'medidas-detener'), undefined)
	assert.match(texto_de(por_testid(arbol, 'medidas-detalle-motivo')), /Se detuvo/)
})

test('Estado de la corrida: chip, barra de avance y «Parece trabada»', () => {
	const arbol = instanciar(EstadoCorrida, { corrida: corrida({ esta_trabada: true }) })._render()
	const texto = texto_de(arbol)
	assert.match(texto, /En curso/)
	assert.match(texto, /Parece trabada/)
	assert.match(texto, /1\.000 de 4\.159 artículos · 24 %/)
	const terminada = texto_de(instanciar(EstadoCorrida, { corrida: corrida({ status: 'terminada' }) })._render())
	assert.match(terminada, /Terminada/)
	assert.doesNotMatch(terminada, /de 4\.159/)
})

test('Barra de solapa: el lote solo existe en «A revisar» y con filas', () => {
	const props = { solapa: 'a_revisar', cantidad_en_pagina: 3, cantidad_seleccionados: 2 }
	const revisar = instanciar(BarraDeSolapa, props)._render()
	assert.ok(por_testid(revisar, 'medidas-seleccionar-pagina'))
	assert.match(texto_de(por_testid(revisar, 'medidas-lote-aprobar')), /Aprobar seleccionadas \(2\)/)
	assert.match(texto_de(por_testid(revisar, 'medidas-lote-rechazar')), /Rechazar seleccionadas \(2\)/)
	const sin_seleccion = instanciar(BarraDeSolapa, Object.assign({}, props, { cantidad_seleccionados: 0 }))._render()
	assert.equal(por_testid(sin_seleccion, 'medidas-lote-aprobar'), undefined)
	const asignadas = instanciar(BarraDeSolapa, Object.assign({}, props, { solapa: 'asignadas' }))._render()
	assert.equal(por_testid(asignadas, 'medidas-seleccionar-pagina'), undefined)
	assert.ok(por_testid(asignadas, 'medidas-buscador'))
	const novedades = instanciar(BarraDeSolapa, Object.assign({}, props, { hay_novedades: true }))._render()
	assert.ok(por_testid(novedades, 'medidas-actualizar-lista'))
})

test('Paginación: 25, 50 y 100 por página, y el total', () => {
	const vm = instanciar(PaginacionItems, { total: 130, pagina: 1, por_pagina: 25 })
	assert.deepEqual(vm.opciones, [25, 50, 100])
	const arbol = vm._render()
	assert.match(texto_de(por_testid(arbol, 'medidas-paginacion-total')), /130 artículos/)
	assert.equal(instanciar(PaginacionItems, { total: 0 })._render().tag, undefined)
})

// --- Tabla de corridas -------------------------------------------------------------------------

/** Un $store de mentira con lo que lee TablaCorridas. */
function con_store(estado, prueba) {
	const anterior = Vue.prototype.$store
	Vue.prototype.$store = { state: { dimension_search: estado }, commit() {}, dispatch() {} }
	try {
		prueba()
	} finally {
		Vue.prototype.$store = anterior
	}
}

test('Tabla de corridas: una fila por corrida con las cifras de las tres solapas', () => {
	const estado = { models: [corrida(), corrida({ id: 8, status: 'terminada', visto: true, solo_con_stock: false })], cargado: true, loading: false, error: false, total: 2, per_page: 25, page: 1 }
	con_store(estado, () => {
		const arbol = instanciar(TablaCorridas)._render()
		const fila = por_testid(arbol, 'medidas-fila-corrida-7')
		const texto = texto_de(fila)
		assert.match(texto, /Todo el catálogo · solo con stock/)
		assert.match(texto, /Artículos 4\.159/)
		assert.match(texto, /Asignadas 40/)
		assert.match(texto, /A revisar 120/)
		assert.match(texto, /Sin datos 800/)
		assert.match(texto, /2\.100 · 2,10 por artículo/)
		assert.ok(por_testid(arbol, 'medidas-ver-corrida-7'))
		assert.ok(por_testid(arbol, 'medidas-fila-corrida-8'))
		assert.match(texto_de(por_testid(arbol, 'medidas-corridas-total')), /2 búsquedas/)
		// La que sigue corriendo no se marca como nueva aunque `visto` sea false.
		assert.equal(fila.data.class['med-corrida--nueva'], false)
	})
})

test('Tabla de corridas: una terminada que nadie abrió se marca como nueva', () => {
	const estado = { models: [corrida({ status: 'terminada', visto: false })], cargado: true, loading: false, error: false, total: 1, per_page: 25, page: 1 }
	con_store(estado, () => {
		const arbol = instanciar(TablaCorridas)._render()
		assert.equal(por_testid(arbol, 'medidas-fila-corrida-7').data.class['med-corrida--nueva'], true)
	})
})

test('Tabla de corridas: cargando, error con Reintentar y vacío', () => {
	con_store({ models: [], cargado: false, loading: true, error: false, total: 0, per_page: 25, page: 1 }, () => {
		assert.ok(por_testid(instanciar(TablaCorridas)._render(), 'medidas-corridas-cargando'))
	})
	con_store({ models: [], cargado: true, loading: false, error: true, total: 0, per_page: 25, page: 1 }, () => {
		const arbol = instanciar(TablaCorridas)._render()
		assert.ok(por_testid(arbol, 'medidas-corridas-error'))
		assert.ok(por_testid(arbol, 'medidas-corridas-reintentar'))
	})
	con_store({ models: [], cargado: true, loading: false, error: false, total: 0, per_page: 25, page: 1 }, () => {
		assert.ok(por_testid(instanciar(TablaCorridas)._render(), 'medidas-corridas-vacio'))
	})
})
