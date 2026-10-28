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
const textos_de_la_ronda = cargar('components/alertas/components/lista-de-alertas-table/medidas/textos.js')
const Chips = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/ChipsDeMedidas.vue').default
const Fuente = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/FuenteDeMedidas.vue').default
const FilaARevisar = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/FilaARevisar.vue').default
const FilaAsignada = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/FilaAsignada.vue').default
const FilaSinDatos = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/FilaSinDatos.vue').default
const Diagnostico = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/Diagnostico.vue').default
const Encabezado = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/Encabezado.vue').default
const BarraDeSolapa = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/BarraDeSolapa.vue').default
const PaginacionItems = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/PaginacionItems.vue').default
// El modal importa dos stores que traen axios: se cargan con dobles (solo se usan sus funciones puras).
const ModalCatalogo = cargar('components/alertas/components/lista-de-alertas-table/medidas/ModalCatalogo.vue', {
	'@/store/dimension_search': { es_cancelacion: () => false },
	'@/store/image_assignment': {
		normalizar_tope_demo: () => ({ aplica: false, tope: 0, usadas: 0, restantes: 0 }),
		aviso_de_tope_demo: () => '',
		mensaje_de_tope_demo_agotado: () => '',
	},
}).default
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

// Cambio de contrato INTENCIONAL (revisión del 27/10/2026): antes «Guardar y aprobar» mandaba todos los
// campos con número; ahora manda SOLO lo que cambió (número distinto de la propuesta) y `null` explícito
// para lo que la persona vació (= no escribir ese campo). Lo que no tocó se omite (la API usa lo propuesto).
test('A revisar: Guardar y aprobar emite solo lo que cambió y null para lo que se vació', () => {
	const vm = instanciar(FilaARevisar, { item: item() })
	const emitidos = []
	vm.$on('aprobar', valores => emitidos.push(valores))
	vm.abrir_edicion()
	vm.entradas.alto = '35,5'
	vm.entradas.profundidad = '11'
	vm.entradas.peso = ''
	vm.guardar_y_aprobar()
	assert.equal(emitidos.length, 1)
	// Peso vaciado: null. Alto cambió y Largo se agregó: el número. Ancho no se tocó: ausente.
	assert.deepEqual(emitidos[0], { peso: null, alto: 35.5, profundidad: 11 })
	assert.equal('ancho' in emitidos[0], false)
})

test('A revisar: sin cambios, Guardar y aprobar emite null (se aprueba lo propuesto)', () => {
	const vm = instanciar(FilaARevisar, { item: item() })
	const emitidos = []
	vm.$on('aprobar', valores => emitidos.push(valores))
	vm.abrir_edicion()
	vm.guardar_y_aprobar()
	assert.deepEqual(emitidos, [null])
})

test('A revisar: si se vacían todos los campos no se manda el pedido y se avisa en el lugar', () => {
	const vm = instanciar(FilaARevisar, { item: item() })
	const emitidos = []
	vm.$on('aprobar', valores => emitidos.push(valores))
	vm.abrir_edicion()
	vm.entradas = { peso: '', alto: '', ancho: '', profundidad: '' }
	vm.guardar_y_aprobar()
	assert.equal(emitidos.length, 0)
	assert.equal(vm.error_general, 'No queda ninguna medida para cargar. Si no sirve ningún valor, rechazá la propuesta.')
	assert.match(texto_de(por_testid(vm._render(), 'medidas-edicion-error-11')), /rechazá la propuesta/)
})

test('A revisar: bajo cada input se lee cómo se va a guardar («1.250» es 1,25) o que el campo no se carga', () => {
	const vm = instanciar(FilaARevisar, { item: item() })
	vm.abrir_edicion()
	vm.entradas.peso = '1.250'
	vm.entradas.alto = ''
	let arbol = vm._render()
	assert.equal(texto_de(por_testid(arbol, 'medidas-lectura-11-peso')), 'Se guarda 1,25 kg')
	// Alto tenía propuesta y se vació: se avisa que no se carga.
	assert.equal(texto_de(por_testid(arbol, 'medidas-lectura-11-alto')), 'No se carga este campo')
	assert.equal(texto_de(por_testid(arbol, 'medidas-lectura-11-ancho')), 'Se guarda 7 cm')
	// Largo no tenía propuesta y está vacío: no hay nada que decir.
	assert.equal(por_testid(arbol, 'medidas-lectura-11-profundidad'), undefined)
	vm.entradas.peso = 'abc'
	arbol = vm._render()
	assert.equal(por_testid(arbol, 'medidas-lectura-11-peso'), undefined)
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

// --- Campos que no se pisaron (campos[].aplicado) ----------------------------------------------

test('Asignadas: un campo que la API dice que no se aplicó se marca «ya tenía valor, no se pisó»', () => {
	const it = item({ status: 'asignada', motivo: '', propuesta: { peso: 0.82, alto: 100, ancho: 7 }, campos: [
		{ clave: 'peso', valor: 0.82, aplicado: true },
		{ clave: 'alto', valor: 100, aplicado: false },
		{ clave: 'ancho', valor: 7 },
	] })
	const hijos = buscar_todos(instanciar(FilaAsignada, { item: it })._render(), nodo => !!nodo.componentOptions)
	// Atributo booleano sin valor: Vue lo convierte en true al instanciar el hijo.
	assert.notEqual(hijos[0].componentOptions.propsData.marcar_no_aplicados, undefined)

	const arbol = instanciar(Chips, { campos: it.campos, item_id: it.id, marcar_no_aplicados: true })._render()
	assert.equal(por_testid(arbol, 'medidas-chip-11-alto').data.attrs['data-no-aplicado'], 1)
	assert.match(texto_de(por_testid(arbol, 'medidas-no-aplicado-11-alto')), /ya tenía valor, no se pisó/)
	// Los aplicados, y los que la API no informa, no se marcan.
	assert.equal(por_testid(arbol, 'medidas-chip-11-peso').data.attrs['data-no-aplicado'], 0)
	assert.equal(por_testid(arbol, 'medidas-no-aplicado-11-peso'), undefined)
	assert.equal(por_testid(arbol, 'medidas-no-aplicado-11-ancho'), undefined)
	// Un campo que falta no se marca aunque `aplicado` sea false.
	assert.equal(por_testid(arbol, 'medidas-no-aplicado-11-profundidad'), undefined)
})

test('A revisar no marca nada como «no se pisó»: todavía no se aplicó ningún campo', () => {
	const it = item({ propuesta: { peso: 0.82 }, campos: [{ clave: 'peso', valor: 0.82, aplicado: false }] })
	const arbol = instanciar(Chips, { campos: it.campos, item_id: it.id })._render()
	assert.equal(por_testid(arbol, 'medidas-no-aplicado-11-peso'), undefined)
	const hijos = buscar_todos(instanciar(FilaARevisar, { item: it })._render(), nodo => !!nodo.componentOptions)
	assert.ok(!hijos[0].componentOptions.propsData.marcar_no_aplicados)
})

// --- Detalle de una corrida: un solo pedido de artículos al abrir ------------------------------

test('Detalle: al abrir, el horizontal-nav que avisa la solapa ya elegida NO repite el pedido de artículos', async () => {
	const Detalle = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/Index.vue', {
		'@/common-vue/components/horizontal-nav/Index': {},
		'@/store/dimension_search': { es_cancelacion: () => false },
	}).default
	const pedidos = []
	const anterior = Vue.prototype.$store
	Vue.prototype.$store = {
		state: {},
		commit() {},
		dispatch(accion, datos) {
			pedidos.push(accion)
			if (accion === 'dimension_search/get_corrida') {
				return Promise.resolve(corrida({ status: 'terminada', conteos: { asignadas: 0, a_revisar: 5, sin_datos: 0 } }))
			}
			if (accion === 'dimension_search/get_items') {
				// La respuesta no llega todavía: el pedido sigue en vuelo, como en un arranque real.
				return new Promise(() => {})
			}
			return Promise.resolve()
		},
	}
	const vm = new Vue(Object.assign({}, Detalle, { propsData: { corrida_id: 7 } }))
	try {
		// Dejar que llegue la corrida: ahí se elige la solapa y se pide la primera página.
		await new Promise(resolver => setTimeout(resolver, 0))
		assert.equal(vm.solapa, 'a_revisar')
		assert.equal(pedidos.filter(accion => accion === 'dimension_search/get_items').length, 1)

		// Lo que hace el nav al montarse (emitir_setSelected_al_inicio): avisar la solapa que ya está elegida.
		vm.al_elegir_solapa({ route_value: 'a_revisar' })
		assert.equal(pedidos.filter(accion => accion === 'dimension_search/get_items').length, 1, 'se repitió el pedido')

		// Elegir OTRA solapa sí pide la suya.
		vm.al_elegir_solapa({ route_value: 'sin_datos' })
		assert.equal(vm.solapa, 'sin_datos')
		assert.equal(pedidos.filter(accion => accion === 'dimension_search/get_items').length, 2)

		// Y volver a tocar la activa cuando ya no está cargando recarga (la forma de ver lo último).
		vm.cargando_items = false
		vm.al_elegir_solapa({ route_value: 'sin_datos' })
		assert.equal(pedidos.filter(accion => accion === 'dimension_search/get_items').length, 3)
	} finally {
		vm.$destroy()
		await new Promise(resolver => setTimeout(resolver, 20))
		Vue.prototype.$store = anterior
	}
})

// --- Avisos de lo que contó la API al aprobar o quitar -----------------------------------------

test('Detalle: aprobar avisa los campos que no se pisaron; quitar avisa lo que se conservó', async () => {
	const Detalle = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/Index.vue', {
		'@/common-vue/components/horizontal-nav/Index': {},
		'@/store/dimension_search': { es_cancelacion: () => false },
	}).default
	const anterior_store = Vue.prototype.$store
	const anterior_toast = Vue.prototype.$toast
	const toasts = []
	Vue.prototype.$toast = {
		success: (texto) => toasts.push(['success', texto]),
		warning: (texto) => toasts.push(['warning', texto]),
		info: (texto) => toasts.push(['info', texto]),
		error: (texto) => toasts.push(['error', texto]),
	}
	let respuesta = null
	Vue.prototype.$store = {
		state: {},
		commit() {},
		dispatch(accion) {
			if (accion === 'dimension_search/get_corrida') {
				return Promise.resolve(corrida({ status: 'terminada' }))
			}
			if (accion === 'dimension_search/get_items') {
				return new Promise(() => {})
			}
			if (accion === 'dimension_search/aprobar' || accion === 'dimension_search/quitar') {
				return Promise.resolve(respuesta)
			}
			return Promise.resolve()
		},
	}
	const vm = new Vue(Object.assign({}, Detalle, { propsData: { corrida_id: 7 } }))
	try {
		await new Promise(resolver => setTimeout(resolver, 0))
		const it = item()

		// Aprobar sin nada raro: no hay aviso (la fila que se va es la confirmación).
		respuesta = Object.assign({}, it, { resultado_de_la_accion: medidas.normalizar_resultado_de_accion({ llenados: ['peso', 'alto', 'ancho'] }) })
		await vm.resolver_uno(it, 'aprobar', 'a_revisar', 'asignadas')
		assert.deepEqual(toasts, [])

		// Aprobar con un campo que el artículo ya tenía y otro que la persona sacó.
		respuesta = Object.assign({}, it, { resultado_de_la_accion: medidas.normalizar_resultado_de_accion({ llenados: ['peso'], salteados: ['alto'], excluidos: ['ancho'] }) })
		await vm.resolver_uno(it, 'aprobar', 'a_revisar', 'asignadas')
		assert.deepEqual(toasts[0], ['warning', 'Se cargó Peso. No se pisó Alto: el artículo ya tenía un valor cargado. No se cargó Ancho, como pediste.'])

		// Quitar sin conservados: el «Listo» de siempre, una sola vez.
		toasts.length = 0
		respuesta = Object.assign({}, it, { resultado_de_la_accion: medidas.normalizar_resultado_de_accion({ revertidos: ['peso', 'alto'] }) })
		await vm.resolver_uno(it, 'quitar', 'asignadas', 'sin_datos')
		assert.deepEqual(toasts, [['success', 'Listo: le quitamos las medidas al artículo']])

		// Quitar con un campo modificado después: se conserva y se dice cuál.
		toasts.length = 0
		respuesta = Object.assign({}, it, { resultado_de_la_accion: medidas.normalizar_resultado_de_accion({ revertidos: ['peso'], conservados: ['alto'] }) })
		await vm.resolver_uno(it, 'quitar', 'asignadas', 'sin_datos')
		assert.deepEqual(toasts, [['warning', 'Se quitó Peso. Se conservó Alto porque se modificó después de la búsqueda.']])

		// Rechazar nunca avisa.
		toasts.length = 0
		respuesta = Object.assign({}, it, { resultado_de_la_accion: medidas.normalizar_resultado_de_accion({}) })
		await vm.resolver_uno(it, 'rechazar', 'a_revisar', 'sin_datos')
		assert.deepEqual(toasts, [])
	} finally {
		vm.$destroy()
		// Las promesas que dispara el cierre (refrescar el resumen) todavía usan el $store falso.
		await new Promise(resolver => setTimeout(resolver, 20))
		Vue.prototype.$store = anterior_store
		Vue.prototype.$toast = anterior_toast
	}
})

// --- Arranque: el resumen del badge no depende de la extensión agentes_ia ----------------------

test('start_methods: get_resumen_de_medidas pide el resumen SIN mirar la extensión agentes_ia', async () => {
	const mixin = cargar('mixins/start_methods.js', {
		'@/mixins/set_employee_vender': { __esModule: true, default: {} },
		'@/mixins/cotizacion_dolar': { __esModule: true, default: {} },
	}).default
	const despachos = []
	const contexto = {
		// Un negocio SIN la extensión (Masquito): si el método la consultara, no pediría nada.
		hasExtencion: () => false,
		$store: { dispatch: accion => { despachos.push(accion); return Promise.resolve() } },
	}
	await mixin.methods.get_resumen_de_medidas.call(contexto)
	assert.deepEqual(despachos, ['dimension_search/get_resumen'])
	// El de imágenes, en cambio, sigue exigiéndola.
	await mixin.methods.get_resumen_de_imagenes.call(contexto)
	assert.deepEqual(despachos, ['dimension_search/get_resumen'])
})

// --- Motivos nuevos en las filas y aviso por campo ----------------------------------------------

test('Chips: el aviso de un campo sale como nota chica bajo ese chip, y solo si viene', () => {
	const it = item({ propuesta: { peso: 0.82, alto: 100 }, campos: [
		{ clave: 'peso', valor: 0.82, aviso: 'La página da un rango de peso: se tomó el menor.', rango: true },
		{ clave: 'alto', valor: 100 },
	] })
	const arbol = instanciar(Chips, { campos: it.campos, item_id: it.id })._render()
	assert.match(texto_de(por_testid(arbol, 'medidas-aviso-11-peso')), /La página da un rango de peso: se tomó el menor\./)
	assert.equal(por_testid(arbol, 'medidas-aviso-11-alto'), undefined)
	// Un campo que falta no muestra aviso aunque venga uno.
	const falta = item({ propuesta: {}, campos: [{ clave: 'peso', valor: null, aviso: 'x' }] })
	assert.equal(por_testid(instanciar(Chips, { campos: falta.campos, item_id: 11 })._render(), 'medidas-aviso-11-peso'), undefined)
})

test('A revisar: los motivos nuevos salen como etiqueta de aviso, con su frase larga y la nota de la IA', () => {
	const casos = [
		['valor_ambiguo', 'Valor ambiguo'],
		['valor_en_rango', 'Rango en la página'],
		['cita_sin_etiqueta', 'Cita sin etiqueta'],
		['difiere_de_lo_cargado', 'Difiere de lo cargado'],
	]
	casos.forEach(([motivo, etiqueta]) => {
		const it = item({ motivo: motivo, motivo_detalle: 'Frase larga de ' + motivo + '.', nota_ia: 'Nota de la IA de ' + motivo + '.' })
		const vm = instanciar(FilaARevisar, { item: it })
		assert.equal(vm.tono_del_motivo, 'aviso', motivo)
		const arbol = vm._render()
		assert.equal(texto_de(por_testid(arbol, 'medidas-motivo-11')), etiqueta)
		assert.match(texto_de(arbol), new RegExp('Frase larga de ' + motivo))
		assert.match(texto_de(por_testid(arbol, 'medidas-nota-ia-11')), new RegExp('Nota de la IA de ' + motivo))
	})
})

test('Sin datos: «Completado a mano» es neutro, muestra su frase y no dibuja medidas', () => {
	const it = item({ status: 'rechazada', motivo: 'completado_a_mano', motivo_detalle: 'Alguien cargó las medidas a mano mientras esperaba revisión.', propuesta: {}, campos: [], fuentes: [], nota_ia: '' })
	const vm = instanciar(FilaSinDatos, { item: it })
	assert.equal(vm.tono_del_motivo, 'neutro')
	const arbol = vm._render()
	assert.equal(texto_de(por_testid(arbol, 'medidas-motivo-11')), 'Completado a mano')
	assert.match(texto_de(arbol), /Alguien cargó las medidas a mano/)
	assert.equal(por_testid(arbol, 'medidas-chips-11'), undefined)
	assert.equal(buscar_todos(arbol, nodo => !!nodo.componentOptions && /chips/i.test(String(nodo.tag))).length, 0)
})

test('Asignadas: el motivo nuevo y su frase también se ven', () => {
	const it = item({ status: 'asignada', motivo: 'valor_ambiguo', motivo_detalle: 'Frase larga.', nota_ia: 'Nota IA.' })
	const arbol = instanciar(FilaAsignada, { item: it })._render()
	assert.match(texto_de(arbol), /Valor ambiguo/)
	assert.match(texto_de(arbol), /Frase larga\./)
	assert.match(texto_de(por_testid(arbol, 'medidas-nota-ia-11')), /Nota IA\./)
})

// --- Misión medidas-sin-datos (28/10/2026) -----------------------------------------------------

/** Un ítem a revisar con dos valores que el sistema no pudo comprobar en la página. */
function item_sin_respaldo(extra) {
	return item(Object.assign({
		motivo: 'valor_sin_respaldo',
		motivo_detalle: 'La IA encontró estos valores pero el sistema no pudo comprobarlos en la página: revisalos antes de aprobar.',
		propuesta: { peso: 1.2, alto: 30, ancho: null, profundidad: null },
		campos: [
			{ clave: 'peso', valor: 1.2, unidad: 'kg', cita: 'Peso bruto 1,2 kg', url: 'https://www.ficha.com.ar/espada', alcance: 'producto', sin_respaldo: true, motivo_rechazo: 'cita_no_esta_en_la_pagina' },
			{ clave: 'alto', valor: 30, unidad: 'cm', cita: 'Alto 30 cm', url: 'https://www.ficha.com.ar/espada', alcance: 'producto', sin_respaldo: true, motivo_rechazo: 'cita_no_coincide_con_el_valor' },
		],
	}, extra || {}))
}

test('Sin respaldo: el aviso se ve sin desplegar nada, con el motivo en lenguaje de comerciante, la cita y el link', () => {
	const it = item_sin_respaldo()
	const arbol = instanciar(Fuente, { fuentes: it.fuentes, campos: it.campos, item_id: it.id })._render()
	const aviso = por_testid(arbol, 'medidas-sin-respaldo-11')
	assert.ok(aviso, 'el aviso tiene que estar a la vista sin tocar el desplegable')
	const texto = texto_de(aviso)
	assert.match(texto, /No se pudo comprobar en la página/)
	assert.match(texto_de(por_testid(arbol, 'medidas-sin-respaldo-campo-11-peso')), /Peso La cita no aparece en la página\. Peso bruto 1,2 kg/)
	assert.match(texto_de(por_testid(arbol, 'medidas-sin-respaldo-campo-11-alto')), /Alto La cita dice otro número\./)
	const links = buscar_todos(aviso, nodo => nodo.tag === 'a')
	assert.equal(links.length, 2)
	assert.equal(links[0].data.attrs.href, 'https://www.ficha.com.ar/espada')
	assert.equal(links[0].data.attrs.rel, 'noopener noreferrer')
})

test('Sin respaldo: un campo sin cita igual se avisa, y sin ningún campo sin respaldo no se dibuja el aviso', () => {
	const sin_cita = item_sin_respaldo({
		fuentes: [],
		propuesta: { peso: 1.2 },
		campos: [{ clave: 'peso', valor: 1.2, unidad: 'kg', sin_respaldo: true, motivo_rechazo: 'sin_cita' }],
	})
	const arbol = instanciar(Fuente, { fuentes: sin_cita.fuentes, campos: sin_cita.campos, item_id: sin_cita.id })._render()
	assert.match(texto_de(por_testid(arbol, 'medidas-sin-respaldo-campo-11-peso')), /Peso No trajo cita\./)
	const normal = item()
	const arbol_normal = instanciar(Fuente, { fuentes: normal.fuentes, campos: normal.campos, item_id: normal.id })._render()
	assert.equal(por_testid(arbol_normal, 'medidas-sin-respaldo-11'), undefined)
})

test('Sin respaldo: el chip del valor lo marca, y los demás chips no', () => {
	const it = item_sin_respaldo()
	const arbol = instanciar(Chips, { campos: it.campos, item_id: it.id })._render()
	assert.match(texto_de(por_testid(arbol, 'medidas-sin-respaldo-chip-11-peso')), /sin comprobar en la página/)
	assert.ok(por_testid(arbol, 'medidas-sin-respaldo-chip-11-alto'))
	assert.equal(por_testid(arbol, 'medidas-sin-respaldo-chip-11-ancho'), undefined)
})

test('Sin respaldo: la fila a revisar muestra su motivo en ámbar, el aviso, y aprobar y editar funcionan igual', () => {
	const it = item_sin_respaldo()
	const vm = instanciar(FilaARevisar, { item: it })
	assert.equal(vm.tono_del_motivo, 'aviso')
	const arbol = vm._render()
	assert.equal(texto_de(por_testid(arbol, 'medidas-motivo-11')), 'Sin respaldo en la página')
	assert.match(texto_de(arbol), /revisalos antes de aprobar/)
	// Aprobar tal cual está habilitado (hay valores).
	assert.equal(vm.hay_algo_para_aprobar, true)
	// Editar: los valores propuestos se pueden corregir y salen en el aprobar.
	const emitidos = []
	vm.$on('aprobar', valores => emitidos.push(valores))
	vm.abrir_edicion()
	assert.equal(vm.entradas.peso, '1,2')
	vm.entradas.peso = '1,5'
	vm.guardar_y_aprobar()
	assert.deepEqual(emitidos, [{ peso: 1.5 }])
})

test('Un motivo desconocido en una fila a revisar o sin datos se muestra humanizado, sin romper', () => {
	const a_revisar = instanciar(FilaARevisar, { item: item({ motivo: 'motivo_de_manana', motivo_detalle: '' }) })
	assert.equal(texto_de(por_testid(a_revisar._render(), 'medidas-motivo-11')), 'Motivo de manana')
	assert.equal(a_revisar.tono_del_motivo, 'neutro')
	const sin_datos = instanciar(FilaSinDatos, { item: item({ status: 'sin_datos', motivo: 'paginas_bloqueadas', motivo_detalle: 'El producto apareció pero 3 páginas no se pudieron leer.', propuesta: {}, campos: [], fuentes: [] }) })
	const arbol = sin_datos._render()
	assert.equal(texto_de(por_testid(arbol, 'medidas-motivo-11')), 'Páginas bloqueadas')
	assert.match(texto_de(arbol), /3 páginas no se pudieron leer/)
	const pdf = instanciar(FilaSinDatos, { item: item({ status: 'sin_datos', motivo: 'pdf_no_leido', propuesta: {}, campos: [], fuentes: [] }) })
	assert.equal(texto_de(por_testid(pdf._render(), 'medidas-motivo-11')), 'PDF sin leer')
})

test('Diagnóstico: una página leída con el respaldo lo dice con los créditos, y las no leídas dicen su motivo', () => {
	const sin = item({ status: 'sin_datos', diagnostico: [{
		criterio: 'codigo_de_barras', usado: true, consulta: '"7790000000001"', resultados: 3,
		paginas: [
			{ url: 'https://toolnation.com/x', dominio: 'toolnation.com', leida: true, via_scrape: true, creditos: 4, motivo: '' },
			{ url: 'https://b.com/ficha.pdf', dominio: 'b.com', leida: true, via_scrape: true, creditos: 2, motivo: 'PDF leído con el respaldo.' },
			{ url: 'https://c.com/y', dominio: 'c.com', leida: false, motivo: 'El sitio bloquea la descarga (403)' },
			{ url: 'https://d.com/z', dominio: 'd.com', leida: false, via_scrape: true, creditos: 2, motivo: 'No se pudo leer ni con el respaldo.' },
			{ url: 'https://e.com/w', dominio: 'e.com', leida: true, motivo: '' },
		],
		ia: { llamada: true, respondio: true, match: 'exacto', campos: { peso: 'cita_no_esta_en_la_pagina', alto: 'ok' } },
	}] })
	const arbol = instanciar(Diagnostico, { diagnostico: sin.diagnostico, item_id: sin.id })._render()
	const texto = texto_de(arbol)
	assert.match(texto, /toolnation\.com Se leyó Leída con el respaldo · 4 créditos/)
	// El motivo «PDF leído con el respaldo.» no se repite: la etiqueta ya lo dijo.
	assert.match(texto, /b\.com Se leyó Leída con el respaldo · 2 créditos/)
	assert.doesNotMatch(texto, /PDF leído con el respaldo/)
	assert.match(texto, /c\.com No se leyó El sitio bloquea la descarga \(403\)/)
	assert.match(texto, /d\.com No se leyó Respaldo sin resultado · 2 créditos No se pudo leer ni con el respaldo\./)
	// La página leída de la forma normal no lleva la etiqueta del respaldo; tampoco la que falló.
	assert.ok(por_testid(arbol, 'medidas-pagina-respaldo-11-0-0'))
	assert.equal(por_testid(arbol, 'medidas-pagina-respaldo-11-0-2'), undefined)
	assert.ok(por_testid(arbol, 'medidas-pagina-respaldo-11-0-3'))
	assert.equal(por_testid(arbol, 'medidas-pagina-respaldo-11-0-4'), undefined)
	// El motivo por el que la IA no pasó la validación sale traducido.
	assert.match(texto, /Peso: sin valor La cita no aparece en la página/)
})

// --- Modal de lanzamiento ----------------------------------------------------------------------

/** Un modal con la previa ya cargada (sin montar). */
function modal_con_previa(extra) {
	const vm = instanciar(ModalCatalogo, {})
	vm.previa = medidas.normalizar_previa(Object.assign({
		a_buscar: 300, sin_medidas: 4000, proveedor_configurado: true, ia_configurada: true, tope: 5000,
		estimacion: { busquedas: 600, minutos: 30, usd_busquedas: 1.2, usd_ia: 0.5 },
	}, extra || {}))
	return vm
}

test('Modal: la casilla de reintento viene apagada y el aviso de créditos de lectura se ve con algo para buscar', () => {
	const vm = modal_con_previa()
	assert.equal(vm.reintentar_sin_datos, false)
	const arbol = vm._render()
	assert.ok(por_testid(arbol, 'medidas-catalogo-reintentar-sin-datos'))
	assert.match(texto_de(arbol), /Volver a buscar también los que quedaron sin datos/)
	assert.match(texto_de(por_testid(arbol, 'medidas-catalogo-creditos')), /Leer páginas bloqueadas y PDF consume créditos de búsqueda \(de 2 a 10 por página\)\./)
	// Apagada: no se habla de cuántos suma.
	assert.equal(por_testid(arbol, 'medidas-catalogo-reintento'), undefined)
})

test('Modal: con la casilla tildada la previa muestra cuántos artículos suma; sin el dato de la API (0) no dice nada', () => {
	const vm = modal_con_previa({ reintento_sin_datos: 140 })
	vm.reintentar_sin_datos = true
	assert.match(texto_de(por_testid(vm._render(), 'medidas-catalogo-reintento')), /Esta opción suma 140 artículos/)
	const vieja = modal_con_previa()
	vieja.reintentar_sin_datos = true
	assert.equal(por_testid(vieja._render(), 'medidas-catalogo-reintento'), undefined)
})

test('Modal: sin nada para buscar no se dibuja el aviso de créditos', () => {
	const vm = modal_con_previa({ a_buscar: 0 })
	assert.equal(por_testid(vm._render(), 'medidas-catalogo-creditos'), undefined)
})

test('Modal: previa y lanzamiento reciben las mismas opciones, con o sin la casilla', () => {
	const vm = modal_con_previa()
	assert.deepEqual(vm.opciones_del_pedido(), { solo_con_stock: true, reintentar_sin_datos: false })
	vm.reintentar_sin_datos = true
	vm.solo_con_stock = false
	assert.deepEqual(vm.opciones_del_pedido(), { solo_con_stock: false, reintentar_sin_datos: true })
})

test('Modal: cargar y lanzar mandan la casilla al store', async () => {
	const vm = modal_con_previa()
	const enviados = []
	vm.$store = {
		dispatch: (nombre, valor) => {
			enviados.push([nombre, valor])
			return Promise.resolve(nombre === 'dimension_search/get_previa_catalogo' ? vm.previa : { id: 1 })
		},
		commit: () => {},
	}
	vm.$toast = { success: () => {} }
	vm.$bvModal = { hide: () => {} }
	vm.reintentar_sin_datos = true
	vm.cargar()
	// Se espera a que la previa vuelva: mientras se recalcula, lanzar está apagado.
	await new Promise(resolver => setTimeout(resolver, 0))
	assert.equal(vm.puede_lanzar, true)
	vm.lanzar()
	await new Promise(resolver => setTimeout(resolver, 0))
	assert.deepEqual(enviados[0], ['dimension_search/get_previa_catalogo', { solo_con_stock: true, reintentar_sin_datos: true }])
	assert.deepEqual(enviados[1], ['dimension_search/lanzar_catalogo', { solo_con_stock: true, reintentar_sin_datos: true }])
})

// --- Ajuste de contrato (28/10/2026): respaldo en la estimación y diagnóstico en «A revisar» ----

test('Modal: la estimación suma el respaldo al costo total y muestra su fila', () => {
	const vm = modal_con_previa({ estimacion: { busquedas: 600, minutos: 30, usd_busquedas: 1.2, usd_respaldo: 0.3, usd_ia: 0.5, creditos_respaldo: 300, texto_respaldo: '2 a 10 créditos por página, hasta 3 por artículo: ~300 créditos.' } })
	assert.equal(vm.costo_total, 2)
	const arbol = vm._render()
	assert.match(texto_de(por_testid(arbol, 'medidas-catalogo-usd-respaldo')), /USD 0,30/)
	assert.match(texto_de(por_testid(arbol, 'medidas-catalogo-costo-total')), /Costo total USD 2,00/)
})

test('Modal: sin las claves del respaldo el total es la suma de lo que hay, y con solo un total se muestra ese', () => {
	const sin_respaldo = modal_con_previa()
	assert.equal(sin_respaldo.costo_total, 1.7)
	assert.equal(por_testid(sin_respaldo._render(), 'medidas-catalogo-usd-respaldo'), undefined)
	const solo_total = modal_con_previa({ estimacion: { busquedas: 10, usd_total: 3.5 } })
	assert.equal(solo_total.costo_total, 3.5)
	assert.match(texto_de(por_testid(solo_total._render(), 'medidas-catalogo-costo-total')), /USD 3,50/)
})

test('Modal: el aviso de créditos usa el texto_respaldo de la API y, si no viene, el fijo', () => {
	const con = modal_con_previa({ estimacion: { busquedas: 10, texto_respaldo: '2 a 10 créditos por página, hasta 3 por artículo: ~300 créditos.' } })
	assert.match(texto_de(por_testid(con._render(), 'medidas-catalogo-creditos')), /~300 créditos/)
	const sin = modal_con_previa()
	assert.match(texto_de(por_testid(sin._render(), 'medidas-catalogo-creditos')), /consume créditos de búsqueda \(de 2 a 10 por página\)/)
})

test('Modal: con la casilla apagada no se muestra el N de artículos, aunque la API lo mande siempre', () => {
	const vm = modal_con_previa({ reintento_sin_datos: 140 })
	assert.equal(vm.reintentar_sin_datos, false)
	assert.equal(por_testid(vm._render(), 'medidas-catalogo-reintento'), undefined)
	vm.reintentar_sin_datos = true
	assert.match(texto_de(por_testid(vm._render(), 'medidas-catalogo-reintento')), /suma 140 artículos/)
})

test('A revisar sin respaldo: con diagnóstico ofrece «Ver qué se probó» y lo despliega; sin diagnóstico no ofrece nada', () => {
	const con = item_sin_respaldo({ diagnostico: [{ criterio: 'codigo_de_barras', usado: true, consulta: '"779"', resultados: 2, paginas: [{ url: 'https://a.com/x', dominio: 'a.com', leida: true, via_scrape: true, creditos: 2 }] }] })
	const vm = instanciar(FilaARevisar, { item: con })
	assert.match(texto_de(por_testid(vm._render(), 'medidas-diagnostico-11')), /Ver qué se probó/)
	vm.diagnostico_abierto = true
	const arbol = vm._render()
	assert.match(texto_de(por_testid(arbol, 'medidas-diagnostico-11')), /Ocultar qué se probó/)
	const sin = instanciar(FilaARevisar, { item: item_sin_respaldo() })
	assert.equal(por_testid(sin._render(), 'medidas-diagnostico-11'), undefined)
})

// --- Ronda de arreglos (28/10/2026): lote sin respaldo, URLs seguras, menores del revisor -------

/** Todos los atributos href de un árbol de VNodes. */
function hrefs_de(arbol) {
	return buscar_todos(arbol, nodo => !!(nodo.data && nodo.data.attrs && Object.prototype.hasOwnProperty.call(nodo.data.attrs, 'href')))
		.map(nodo => nodo.data.attrs.href)
}

test('Lote: el aviso de la confirmación dice que las sin respaldo NO se aprueban en lote', () => {
	assert.equal(textos_de_la_ronda.aviso_de_lote_con_sin_respaldo(0), '')
	assert.match(textos_de_la_ronda.aviso_de_lote_con_sin_respaldo(1), /1 tiene valores que el sistema no pudo comprobar en la página y no se aprueba en lote: se aprueba de a una\./)
	assert.match(textos_de_la_ronda.aviso_de_lote_con_sin_respaldo(3), /3 tienen valores que el sistema no pudo comprobar en la página y no se aprueban en lote: se aprueban de a una\./)
})

test('Lote: el mensaje del resultado cuenta las aprobadas y las que se aprueban de a una', () => {
	const t = textos_de_la_ronda.texto_de_omitidos_sin_respaldo
	assert.equal(t(3, 2), '3 aprobadas; 2 tienen valores sin comprobar y se aprueban de a una, mirando la cita y la fuente.')
	assert.equal(t(1, 1), '1 aprobada; 1 tiene valores sin comprobar y se aprueba de a una, mirando la cita y la fuente.')
	assert.equal(t(0, 4), '4 tienen valores sin comprobar y se aprueban de a una, mirando la cita y la fuente.')
	assert.equal(t(5, 0), '')
})

test('Lote: avisar_resultado_del_lote muestra un solo aviso con las omitidas, y el de siempre sin ellas', () => {
	const Detalle = cargar('components/alertas/components/lista-de-alertas-table/medidas/detalle/Index.vue', {
		'@/common-vue/components/horizontal-nav/Index': {},
		'@/store/dimension_search': { es_cancelacion: () => false },
	}).default
	const avisos = []
	const falso = { avisar_resultado_del_lote: Detalle.methods.avisar_resultado_del_lote, $toast: { success: t => avisos.push(['success', t]), warning: t => avisos.push(['warning', t]) } }
	falso.avisar_resultado_del_lote('aprobar', { aprobados: 3, fallidos: [], omitidos_sin_respaldo: 2 })
	assert.deepEqual(avisos, [['warning', '3 aprobadas; 2 tienen valores sin comprobar y se aprueban de a una, mirando la cita y la fuente.']])
	avisos.length = 0
	falso.avisar_resultado_del_lote('aprobar', { aprobados: 3, fallidos: [] })
	assert.deepEqual(avisos, [['success', '3 propuestas aprobadas']])
})

test('URLs: ningún href de la fuente, las citas, el aviso sin respaldo ni el diagnóstico acepta javascript: o data:', () => {
	const malas = ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'vbscript:x', '//evil.com/x', ' javascript:alert(1)']
	malas.forEach(mala => {
		// Directo al componente, sin pasar por el normalizador: es el último filtro antes del DOM.
		const campos = [
			{ clave: 'peso', etiqueta: 'Peso', valor: 1, unidad: 'kg', falta: false, cita: 'Peso 1 kg', url: mala, alcance: null },
			{ clave: 'alto', etiqueta: 'Alto', valor: 2, unidad: 'cm', falta: false, cita: 'Alto 2 cm', url: mala, alcance: null, sin_respaldo: true, motivo_rechazo: 'sin_cita' },
		]
		const fuente = instanciar(Fuente, { fuentes: [{ url: mala, titulo: 't', dominio: 'x.com' }], campos: campos, item_id: 5 })
		fuente.abierto = true
		hrefs_de(fuente._render()).forEach(h => assert.ok(h === null || typeof h === 'undefined', 'href inseguro en la fuente: ' + mala))
		const diag = instanciar(Diagnostico, { item_id: 5, diagnostico: [{ criterio: 'nombre', usado: true, paginas: [{ url: mala, titulo: 't', dominio: 'x.com', leida: true }], ia: null }] })
		hrefs_de(diag._render()).forEach(h => assert.ok(h === null || typeof h === 'undefined', 'href inseguro en el diagnóstico: ' + mala))
	})
	// Pasando por el normalizador, la URL ni siquiera llega al componente.
	const it = medidas.normalizar_item({
		id: 7, status: 'a_revisar', propuesta: { peso: 1 }, fuentes: [{ url: 'javascript:alert(1)' }],
		campos: [{ clave: 'peso', valor: 1, unidad: 'kg', cita: 'Peso 1 kg', url: 'data:text/html,x', sin_respaldo: true, motivo_rechazo: 'sin_cita' }],
		diagnostico: [{ criterio: 'nombre', usado: true, paginas: [{ url: 'javascript:alert(1)', leida: false }] }],
	})
	assert.equal(it.campos[0].url, null)
	assert.equal(it.fuentes.length, 0)
	assert.equal(it.diagnostico[0].paginas[0].url, null)
})

test('URLs: un link http(s) legítimo sí llega al href en la fuente, el aviso sin respaldo y el diagnóstico', () => {
	const it = item_sin_respaldo({ diagnostico: [{ criterio: 'nombre', usado: true, paginas: [{ url: 'https://ok.com/p', leida: true }] }] })
	const fuente = instanciar(Fuente, { fuentes: it.fuentes, campos: it.campos, item_id: it.id })
	assert.ok(hrefs_de(fuente._render()).indexOf('https://www.ficha.com.ar/espada') !== -1)
	const diag = instanciar(Diagnostico, { item_id: it.id, diagnostico: it.diagnostico })
	assert.deepEqual(hrefs_de(diag._render()), ['https://ok.com/p'])
})

test('Sin respaldo: el aviso ámbar trae la ayuda corta, y el desplegable de citas no repite lo del aviso', () => {
	const it = item_sin_respaldo({
		campos: [
			{ clave: 'peso', valor: 1.2, unidad: 'kg', cita: 'Peso bruto 1,2 kg', url: 'https://www.ficha.com.ar/espada', sin_respaldo: true, motivo_rechazo: 'cita_no_esta_en_la_pagina' },
			{ clave: 'alto', valor: 30, unidad: 'cm', cita: 'Alto 30 cm', url: 'https://www.ficha.com.ar/espada' },
		],
	})
	const fuente = instanciar(Fuente, { fuentes: it.fuentes, campos: it.campos, item_id: it.id })
	assert.match(texto_de(por_testid(fuente._render(), 'medidas-sin-respaldo-ayuda-11')), /revisalos antes de aprobar/)
	// Solo el campo que sí está respaldado queda en las citas.
	assert.deepEqual(fuente.citas.map(c => c.clave), ['alto'])
	fuente.abierto = true
	const citas = por_testid(fuente._render(), 'medidas-citas-11')
	assert.doesNotMatch(texto_de(citas), /Peso bruto/)
	assert.match(texto_de(citas), /Alto 30 cm/)
})

test('Sin respaldo: si todos los campos con cita están sin respaldo, no hay desplegable de citas pero el bloque sigue', () => {
	const it = item_sin_respaldo({ fuentes: [] })
	const fuente = instanciar(Fuente, { fuentes: it.fuentes, campos: it.campos, item_id: it.id })
	const arbol = fuente._render()
	assert.equal(fuente.citas.length, 0)
	assert.equal(por_testid(arbol, 'medidas-citas-boton-11'), undefined)
	assert.ok(por_testid(arbol, 'medidas-sin-respaldo-11'))
})

test('Diagnóstico: la página leída con el respaldo no repite el motivo; la que falló con el respaldo muestra sus créditos', () => {
	const sin = item({ status: 'sin_datos', diagnostico: [{
		criterio: 'nombre', usado: true, consulta: 'x', resultados: 4,
		paginas: [
			{ url: 'https://a.com/x', dominio: 'a.com', leida: true, via_scrape: true, creditos: 4, motivo: 'Página leída con el respaldo.' },
			{ url: 'https://b.com/f.pdf', dominio: 'b.com', leida: true, via_scrape: true, creditos: 2, motivo: 'PDF leído con el respaldo.' },
			{ url: 'https://c.com/y', dominio: 'c.com', leida: false, via_scrape: true, creditos: 2, motivo: 'No se pudo leer ni con el respaldo.' },
			{ url: 'https://d.com/z', dominio: 'd.com', leida: false, via_scrape: true, creditos: 0, motivo: 'No se pudo leer ni con el respaldo.' },
			{ url: 'https://e.com/z', dominio: 'e.com', leida: true, motivo: 'Es un PDF raro' },
		],
	}] })
	const texto = texto_de(instanciar(Diagnostico, { diagnostico: sin.diagnostico, item_id: sin.id })._render())
	assert.match(texto, /a\.com Se leyó Leída con el respaldo · 4 créditos b\.com/)
	assert.doesNotMatch(texto, /Página leída con el respaldo/)
	assert.doesNotMatch(texto, /PDF leído con el respaldo/)
	assert.match(texto, /c\.com No se leyó Respaldo sin resultado · 2 créditos No se pudo leer ni con el respaldo\./)
	// Sin créditos gastados no hay etiqueta de respaldo, pero el motivo sí.
	assert.match(texto, /d\.com No se leyó No se pudo leer ni con el respaldo\./)
	// Un motivo que no repite la etiqueta se sigue mostrando.
	assert.match(texto, /e\.com Se leyó Es un PDF raro/)
})

test('texto_de_respaldo_sin_resultado: solo si se usó el respaldo, no se leyó y costó créditos', () => {
	assert.equal(textos_de_la_ronda.texto_de_respaldo_sin_resultado({ via_scrape: true, leida: false, creditos: 2 }), 'Respaldo sin resultado · 2 créditos')
	assert.equal(textos_de_la_ronda.texto_de_respaldo_sin_resultado({ via_scrape: true, leida: false, creditos: 1 }), 'Respaldo sin resultado · 1 crédito')
	assert.equal(textos_de_la_ronda.texto_de_respaldo_sin_resultado({ via_scrape: true, leida: false, creditos: 0 }), '')
	assert.equal(textos_de_la_ronda.texto_de_respaldo_sin_resultado({ via_scrape: true, leida: true, creditos: 2 }), '')
	assert.equal(textos_de_la_ronda.texto_de_respaldo_sin_resultado({ via_scrape: false, leida: false, creditos: 2 }), '')
	assert.equal(textos_de_la_ronda.texto_de_respaldo_sin_resultado(null), '')
})

test('Asignadas: un campo con sin_respaldo:false (la API lo baja al aprobar) no muestra ningún aviso', () => {
	const it = item({
		status: 'aprobada', motivo: 'valor_sin_respaldo', revisado_por: 'Juan',
		campos: [
			{ clave: 'peso', valor: 1.2, unidad: 'kg', cita: 'Peso 1,2 kg', url: 'https://www.ficha.com.ar/espada', sin_respaldo: false, motivo_rechazo: null },
		],
		propuesta: { peso: 1.2 },
	})
	assert.equal(it.campos[0].sin_respaldo, false)
	assert.equal(it.cantidad_sin_respaldo, 0)
	const fuente = instanciar(Fuente, { fuentes: it.fuentes, campos: it.campos, item_id: it.id })._render()
	assert.equal(por_testid(fuente, 'medidas-sin-respaldo-11'), undefined)
	const chips = instanciar(Chips, { campos: it.campos, item_id: it.id })._render()
	assert.equal(por_testid(chips, 'medidas-sin-respaldo-chip-11-peso'), undefined)
	const fila = texto_de(instanciar(FilaAsignada, { item: it })._render())
	assert.doesNotMatch(fila, /No se pudo comprobar en la página|sin comprobar/)
})

test('Asignadas: lo aprobado que salió sin respaldo dice «Revisada a mano», sin la frase de revisar antes de aprobar', () => {
	const it = item({
		status: 'aprobada', motivo: 'valor_sin_respaldo', revisado_por: 'Juan',
		motivo_detalle: 'La IA encontró estos valores pero el sistema no pudo comprobarlos en la página: revisalos antes de aprobar.',
		nota_ia: 'Nota de la IA que sigue valiendo.',
	})
	const vm = instanciar(FilaAsignada, { item: it })
	assert.equal(vm.motivo, 'Revisada a mano')
	assert.equal(vm.tono_del_motivo, 'neutro')
	const arbol = vm._render()
	const texto = texto_de(arbol)
	assert.match(texto, /Revisada a mano/)
	assert.doesNotMatch(texto, /Sin respaldo en la página/)
	assert.doesNotMatch(texto, /revisalos antes de aprobar/)
	// La nota de la IA, con contenido, se conserva; y sigue diciendo quién aprobó.
	assert.match(texto_de(por_testid(arbol, 'medidas-nota-ia-11')), /Nota de la IA que sigue valiendo\./)
	assert.match(texto_de(por_testid(arbol, 'medidas-aprobada-por-11')), /Aprobada por Juan/)
	// Sin nota de la IA no queda ningún párrafo suelto.
	const sin_nota = instanciar(FilaAsignada, { item: item({ status: 'aprobada', motivo: 'valor_sin_respaldo', nota_ia: '', motivo_detalle: 'revisalos antes de aprobar' }) })._render()
	assert.equal(por_testid(sin_nota, 'medidas-nota-ia-11'), undefined)
	assert.doesNotMatch(texto_de(sin_nota), /revisalos antes de aprobar/)
})

test('Asignadas: los demás motivos y su frase se ven como siempre', () => {
	const vm = instanciar(FilaAsignada, { item: item({ status: 'aprobada', motivo: 'valor_ambiguo', motivo_detalle: 'Frase larga.' }) })
	assert.equal(vm.motivo, 'Valor ambiguo')
	assert.equal(vm.tono_del_motivo, 'aviso')
	assert.match(texto_de(vm._render()), /Frase larga\./)
})
