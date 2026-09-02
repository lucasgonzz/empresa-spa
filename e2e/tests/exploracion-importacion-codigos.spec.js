// Exploración de la IMPORTACIÓN DE EXCEL — códigos de barras y de proveedor repetidos.
//
// Nace de /explorar del 2/9/2026. Los números esperados se calcularon a mano ANTES de tocar la
// interfaz (PREDICCIONES-importacion-excel.md del slot, P13..P17). Complementa a
// exploracion-importacion-listas-stock.spec.js: acá lo que se explora es la IDENTIDAD de los
// artículos y las políticas del paso 3 del modal de IA.
//
// ── Qué afirma ───────────────────────────────────────────────────────────────────────────────
//
//  1. Un bar_code repetido DENTRO del archivo se mergea con "última fila gana": se crea UN solo
//     artículo con los datos de la última aparición, y la sobrescritura queda reportada.
//  2. Un bar_code que ya existe en DOS artículos de la base (data heredada sucia) hace que la
//     fila se SALTEE con un conflicto ambiguo: no se toca ninguno de los dos.
//  3. Las políticas de códigos de proveedor: 'productos_distintos' + 'crear_nuevo' crea uno POR
//     FILA aunque el código exista; 'actualizar_todos' actualiza TODOS los que comparten el
//     código; 'saltear_y_reportar' no toca nada y deja el conflicto. Y un DEFECTO ABIERTO que
//     este archivo fija (test 4a): 'ultima_gana' + 'actualizar_todos' NO fusiona las filas
//     repetidas del archivo — crea una por fila, contra la promesa textual de la UI (la causa
//     y la línea están en el comentario del test).
//
// ── De qué fixture depende ───────────────────────────────────────────────────────────────────
//
// La cuenta de TestingImportListasSeeder (doc 5678 / clave 1234), que además siembra los DOS
// artículos "heredados" con bar_code 30000001 (Heredado Duplicado Uno y Dos) contra los que se
// afirma la ambigüedad. Los demás identificadores son propios de cada corrida (sufijo).
//
// ── Trampas ──────────────────────────────────────────────────────────────────────────────────
//
// 🔴 Cinco pasadas por el modal de IA = diez llamadas a Claude (análisis + recomendación por
//    archivo). El timeout de cada test es alto a propósito; no es lentitud de la interfaz.
// 🔴 El botón "Continuar" del paso 3 queda DESHABILITADO hasta elegir política cuando hay filas
//    identificadas por código de proveedor: elegirla no es opcional en estos archivos.
// 🔴 Los conflictos se leen de GET import-history/{id}/conflicts: el navegador está aislado de
//    Pusher y el modal de notificación no llega solo.
const { test, expect } = require('../fixtures')
const path = require('path')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { completar_campo } = require('../helpers/formulario')
const { aislar_broadcasts } = require('../helpers/entorno')
const { generar, BAR_CODE_HEREDADO_DUPLICADO } = require('../fixtures/importacion/generar')

// 🔴 Sesión propia COMPARTIDA entre los tests del serial (mismo motivo y mismo patrón que
// exploracion-importacion-listas-stock.spec.js: `test.use({ storageState })` abriría un contexto
// nuevo y deslogueado por test).
let page

test.beforeAll(async ({ browser }) => {
	// 🔴 storageState VACÍO explícito: browser.newContext() hereda las opciones del proyecto,
	// incluido el storageState de la ferretería (ver el comentario completo en
	// exploracion-importacion-listas-stock.spec.js — costó una corrida).
	const contexto_navegador = await browser.newContext({ storageState: { cookies: [], origins: [] } })
	page = await contexto_navegador.newPage()
	await aislar_broadcasts(page)
})

test.afterAll(async () => {
	if (page) {
		await page.context().close()
	}
})

const DOC_LISTAS = process.env.E2E_DOC_LISTAS || '5678'
const CLAVE_LISTAS = process.env.E2E_PASSWORD_LISTAS || '1234'

const contexto = {
	sufijo: String(Date.now()),
	archivos: null,
	datos: null,
	api: null,
	ids: {},
	/** Ids de artículos con el provider_code repetido de la corrida, por etapa. */
	pc_rep_ids: [],
}

// Helpers compartidos con el otro spec de exploración (copiados a propósito: cada spec tiene que
// poder leerse solo; si crecen, se extraen a e2e/helpers/importacion.js).

async function api_get(page, ruta) {
	return page.evaluate(async ({ api, ruta }) => {
		const r = await fetch(api + '/api/' + ruta, {
			credentials: 'include',
			headers: { Accept: 'application/json' },
		})
		if (!r.ok) {
			return { __error: r.status }
		}
		return r.json()
	}, { api: contexto.api, ruta })
}

async function elegir_radio(page, testid) {
	// El LABEL, no el div contenedor: el click va al centro del elemento y el centro del
	// .custom-control cae a la derecha del texto, donde no hay nada clickeable (ver el
	// comentario completo en exploracion-importacion-listas-stock.spec.js).
	const input = page.locator(`[data-testid="${testid}"]`)
	await input.locator('xpath=following-sibling::label').click()
	await expect(input, `el radio ${testid} no quedó marcado tras el click`).toBeChecked()
}

async function mapear_columna(page, encabezado, label) {
	const bloque = page
		.locator('.ai-import-mapping-block')
		.filter({ has: page.locator('.ai-import-mapping-excel-header', { hasText: new RegExp('^\\s*' + encabezado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$') }) })

	await expect(bloque, `no encontré la columna "${encabezado}" en el mapeo del paso 2`).toHaveCount(1)
	await bloque.locator('select').selectOption({ label })
}

async function importar_excel(page, archivo, mapeo, opciones = {}) {
	// El menú Crear es un b-dropdown split: despliega el CARET, y "Importar con IA" vive en el
	// submenú de "Importación" (mismo recorrido que menu-crear-submenu-importacion.spec.js).
	const dropdown_crear = page.locator('#dropdown_article')
	await dropdown_crear.locator('.dropdown-toggle-split').click()

	const menu_principal = dropdown_crear.locator('.excel-create-dropdown-menu')
	await expect(menu_principal).toBeVisible()

	const item_importacion = menu_principal.locator('.excel-dropdown-submenu', { hasText: 'Importación' })
	await item_importacion.hover()

	const submenu = item_importacion.locator('.excel-dropdown-submenu__menu')
	await expect(submenu).toBeVisible()
	await submenu.locator('li, a, button').filter({ hasText: 'Importar con IA' }).first().click()

	const input_archivo = page.locator('[data-testid="ai-import-archivo"] input[type="file"], input[data-testid="ai-import-archivo"]').first()
	await input_archivo.setInputFiles(archivo)

	await expect(page.locator('[data-testid="ai-import-btn-analizar"]')).toBeEnabled({ timeout: 20000 })
	await page.locator('[data-testid="ai-import-btn-analizar"]').click()

	await expect(page.locator('.ai-import-mapping-block').first()).toBeVisible({ timeout: 240000 })

	// El proveedor se fija SIEMPRE explícito: dejarlo al criterio de la IA hace que dos corridas
	// del mismo circuito elijan proveedores distintos, y entonces el paso 3 agrega la pregunta
	// "el código existe en otros proveedores" y el botón Continuar queda muerto esperando una
	// respuesta que el spec no contempló (costó una corrida en 4b).
	if (opciones.proveedor) {
		await page.locator('[data-testid="ai-import-proveedor"]').selectOption({ label: opciones.proveedor })
	}

	for (const [encabezado, label] of mapeo) {
		await mapear_columna(page, encabezado, label)
	}

	await page.locator('[data-testid="ai-import-btn-confirmar-mapeo"]').click()
	await expect(page.locator('[data-testid="ai-import-btn-continuar"]')).toBeVisible({ timeout: 240000 })

	// Las dos decisiones son CONDICIONALES: solo se dibujan si el archivo trae duplicados
	// (intra) o filas identificadas por código de proveedor (colisión). Con
	// `exigir_politicas: true` el spec AFIRMA que el paso 3 las está mostrando (P17): si el
	// archivo trae la colisión y el radio no aparece, el operador estaría eligiendo a ciegas,
	// y eso es un hallazgo, no un caso para saltear.
	if (opciones.politica_intra) {
		const radio = page.locator('[data-testid="ai-import-politica-intra-' + opciones.politica_intra + '"]')
		if (opciones.exigir_politicas) {
			await expect(radio, 'P17: el paso 3 tiene que ofrecer la política intra-archivo con este Excel').toHaveCount(1)
		}
		if (await radio.count() > 0) {
			await elegir_radio(page, 'ai-import-politica-intra-' + opciones.politica_intra)
		}
	}
	if (opciones.politica_colision) {
		const radio = page.locator('[data-testid="ai-import-politica-colision-' + opciones.politica_colision + '"]')
		if (opciones.exigir_politicas) {
			await expect(radio, 'P17: el paso 3 tiene que ofrecer la política de colisión con este Excel').toHaveCount(1)
		}
		if (await radio.count() > 0) {
			await elegir_radio(page, 'ai-import-politica-colision-' + opciones.politica_colision)
		}
	}

	// La tercera pregunta (códigos existentes en OTROS proveedores) también bloquea Continuar si
	// aparece: se responde con lo pedido, o con 'ignorar' de default defensivo.
	const radio_otro = page.locator('[data-testid="ai-import-politica-otro-' + (opciones.politica_otro || 'ignorar') + '"]')
	if (await radio_otro.count() > 0) {
		await elegir_radio(page, 'ai-import-politica-otro-' + (opciones.politica_otro || 'ignorar'))
	}

	await expect(page.locator('[data-testid="ai-import-btn-continuar"]')).toBeEnabled()
	await page.locator('[data-testid="ai-import-btn-continuar"]').click()

	await elegir_radio(page, opciones.solo_editar ? 'ai-import-operacion-solo-editar' : 'ai-import-operacion-crear-y-editar')

	// La condición observable de "se puede importar": el botón habilitado (falla acá, claro).
	await expect(page.locator('[data-testid="ai-import-btn-importar"]')).toBeEnabled()

	const [respuesta] = await Promise.all([
		page.waitForResponse(r => r.url().includes('ai-excel-import/import') && r.request().method() === 'POST', { timeout: 60000 }),
		page.locator('[data-testid="ai-import-btn-importar"]').click(),
	])
	expect(respuesta.ok(), 'el POST de la importación no salió bien').toBeTruthy()

	await page.keyboard.press('Escape').catch(() => {})
}

/**
 * Espera a que el worker termine la última importación (status fuera de en_preparacion /
 * en_proceso) y devuelve el import_history más nuevo.
 */
async function esperar_ultima_importacion(page, id_minimo) {
	let history = null

	await expect(async () => {
		const res = await api_get(page, 'import-history/article')
		const lista = res.models || res
		expect(Array.isArray(lista) && lista.length > 0, 'todavía no hay import_history').toBeTruthy()

		const mas_nueva = lista.reduce((a, b) => (Number(a.id) > Number(b.id) ? a : b))
		expect(Number(mas_nueva.id), 'todavía no apareció la importación nueva').toBeGreaterThan(id_minimo)
		expect(['en_preparacion', 'en_proceso']).not.toContain(mas_nueva.status)

		history = mas_nueva
	}).toPass({ timeout: 120000, intervals: [3000] })

	return history
}

/**
 * Artículos creados por una importación, juntando los de todos sus chunks.
 * (created-models recibe el id del CHUNK —ArticleImportResult—, no el del historial.)
 */
async function creados_de_la_importacion(page, history_id) {
	const res = await api_get(page, 'import-history/chunks/' + history_id)
	const chunks = res.models || []
	const creados = []

	for (const chunk of chunks) {
		const r = await api_get(page, 'import-history/created-models/' + chunk.id)
		const modelo = r.model
		if (modelo && Array.isArray(modelo.articulos_creados)) {
			creados.push(...modelo.articulos_creados)
		}
	}

	return creados
}

/** Id de import_history más alto que existe AHORA (para esperar por diferencia al siguiente). */
async function id_de_ultima_importacion(page) {
	const res = await api_get(page, 'import-history/article')
	const lista = res.models || res
	return Array.isArray(lista) && lista.length ? Math.max(...lista.map(h => Number(h.id))) : 0
}

// ── Los tests ────────────────────────────────────────────────────────────────────────────────

test.describe.serial('Exploración: importación de Excel — códigos repetidos', () => {

	test('login con la cuenta de listas', async () => {
		const generado = generar(contexto.sufijo, path.join(__dirname, '..', '.tmp-importacion'))
		contexto.archivos = generado.archivos
		contexto.datos = generado.datos

		await page.goto('/login')

		const [login] = await Promise.all([
			page.waitForResponse(r => r.url().includes('/login') && r.request().method() === 'POST', { timeout: 30000 }),
			(async () => {
				await completar_campo(page, 'login-doc-number', DOC_LISTAS)
				await completar_campo(page, 'login-password', CLAVE_LISTAS)
				await page.locator('[data-testid="login-submit"]').click()
			})(),
		])
		expect(login.ok(), 'el login falló: ¿corriste TestingImportListasSeeder?').toBeTruthy()
		contexto.api = new URL(login.url()).origin

		await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 })
		await esperar_recursos_descargados(page, { abrir_panel: false })
	})

	test('un artículo propio pre-existente (alta mínima)', async () => {
		test.setTimeout(600000)

		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		const id_previo = await id_de_ultima_importacion(page)

		await importar_excel(page, contexto.archivos.alta_minima, [
			['Nombre', 'Nombre'],
			['Codigo de barras', 'Código de barras'],
			['Codigo proveedor', 'Código de proveedor'],
			['Costo', 'Costo'],
		], { politica_colision: 'actualizar_todos', proveedor: 'Proveedor Alfa' })

		const history = await esperar_ultima_importacion(page, id_previo)
		const modelos = await creados_de_la_importacion(page, history.id)
		expect(modelos.length, 'el alta mínima crea exactamente 1 artículo').toBe(1)
		contexto.ids.taladro = Number(modelos[0].id)
	})

	test('P13-P16: bar_codes repetidos — merge adentro del archivo, ambigüedad contra la base', async () => {
		test.setTimeout(600000)

		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		const id_previo = await id_de_ultima_importacion(page)

		await importar_excel(page, contexto.archivos.barcodes, [
			['Nombre', 'Nombre'],
			['Codigo de barras', 'Código de barras'],
			['Costo', 'Costo'],
		], { politica_colision: 'actualizar_todos', proveedor: 'Proveedor Alfa' })

		const history = await esperar_ultima_importacion(page, id_previo)

		// P13: las dos filas de la Sierra crean UN solo artículo, con los datos de la ÚLTIMA.
		const modelos_creados = await creados_de_la_importacion(page, history.id)
		expect(modelos_creados.length, 'P13/P16: las 4 filas crean UN solo artículo (el merge de la Sierra)').toBe(1)
		expect(modelos_creados[0].name, 'P13: gana la ÚLTIMA fila del merge').toBe(contexto.datos.nombre_sierra_bis)
		expect(Number(modelos_creados[0].cost), 'P13: el costo es el de la última fila').toBeCloseTo(950, 2)

		// P14: la fila 3 actualizó el Taladro pre-existente (1200 → 1300).
		await expect(async () => {
			const res = await api_get(page, 'article/' + contexto.ids.taladro)
			expect(Number((res.model || res).cost), 'P14: el Taladro tomó el costo de la fila 3').toBeCloseTo(1300, 2)
		}).toPass({ timeout: 60000, intervals: [3000] })

		// P15: la fila del bar_code heredado quedó SALTEADA con conflicto ambiguo.
		const conflictos = await api_get(page, 'import-history/' + history.id + '/conflicts')
		const lista_conflictos = conflictos.models || conflictos.conflicts || conflictos

		const ambiguos = lista_conflictos.filter(c =>
			(c.tipo || c.type || '').includes('ambiguo')
			&& String(c.valor || c.value || '') === BAR_CODE_HEREDADO_DUPLICADO
		)
		expect(ambiguos.length, 'P15: el bar_code duplicado en base deja UN conflicto ambiguo').toBeGreaterThanOrEqual(1)

		// La sobrescritura del merge también tiene que estar reportada (P13).
		const sobrescritas = lista_conflictos.filter(c => (c.tipo || c.type || '').includes('sobrescrita'))
		expect(sobrescritas.length, 'P13: la sobrescritura de la Sierra queda reportada').toBeGreaterThanOrEqual(1)

		// P15: los dos heredados siguen intactos. El conflicto trae sus ids: se leen y se afirma
		// que conservan los costos del seeder (111 y 222) — la fila ambigua no tocó a ninguno.
		const ids_heredados = [].concat(...ambiguos.map(c => {
			const crudos = c.article_ids || c.articles_ids || []
			return Array.isArray(crudos) ? crudos : JSON.parse(crudos || '[]')
		}))
		expect(ids_heredados.length, 'el conflicto ambiguo tiene que nombrar a los 2 artículos').toBeGreaterThanOrEqual(2)

		const costos_heredados = []
		for (const id of ids_heredados) {
			const res = await api_get(page, 'article/' + id)
			costos_heredados.push(Number((res.model || res).cost))
		}
		costos_heredados.sort((a, b) => a - b)
		expect(costos_heredados[0], 'P15: Heredado Uno sigue en 111').toBeCloseTo(111, 2)
		expect(costos_heredados[costos_heredados.length - 1], 'P15: Heredado Dos sigue en 222').toBeCloseTo(222, 2)
	})

	test('4a: DEFECTO ABIERTO — "última gana" + "actualizar todos" NO fusiona y crea DOS', async () => {
		test.setTimeout(600000)

		// 🔴 Este test FIJA un defecto encontrado por la exploración del 2/9/2026, no el
		// comportamiento deseado. La UI promete, al elegir "Es el mismo producto, cargado más de
		// una vez": *"Se va a conservar la información de la última aparición de cada código"* —
		// y acá las dos filas del mismo código crean DOS artículos igual.
		//
		// La causa, con línea: la política de colisión 'actualizar_todos' viaja como
		// permitir_provider_code_repetido=1 (derive_flags_from_choice, ai-excel-import/Index.vue
		// ~4195), y ProcessRow::esta_repetido() (empresa-api, línea ~2663) SALTEA el escalón
		// provider_code de la detección intra-archivo cuando ese flag está prendido — quedó
		// colgado del flag VIEJO en vez de mirar `filas_repetidas_del_archivo`, que es el que el
		// paso 3 nuevo manda para exactamente esta decisión. Con nombres distintos, la cadena cae
		// al escalón name, no matchea, y no hay merge: matching_counts_json del history queda con
		// creado_nuevo=2 y merge_fila_repetida=0 (la detección nunca corrió).
		//
		// La suite de la API (RepetidosEnElArchivoTest) prueba 'ultima_gana' SOLO con
		// permitir_provider_code_repetido=0: esta combinación era inexpresable con los checkboxes
		// viejos y el flujo nuevo la volvió elegible sin que el backend la soporte.
		//
		// EL DÍA QUE SE CORRIJA: este test se pone rojo; cambiar el 2 por 1 (un solo creado, con
		// costo 120, el de la última fila) y actualizar la cadena 4b/4c/4d que arranca de acá.
		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		const id_previo = await id_de_ultima_importacion(page)

		await importar_excel(page, contexto.archivos.provider_repetido, [
			['Nombre', 'Nombre'],
			['Codigo proveedor', 'Código de proveedor'],
			['Costo', 'Costo'],
		], { politica_intra: 'ultima_gana', politica_colision: 'actualizar_todos', exigir_politicas: true, proveedor: 'Proveedor Alfa' })

		const history = await esperar_ultima_importacion(page, id_previo)
		const modelos = await creados_de_la_importacion(page, history.id)

		expect(modelos.length, 'comportamiento ACTUAL (defecto): dos filas del mismo código crean DOS artículos').toBe(2)

		const costos = modelos.map(m => Number(m.cost)).sort((a, b) => a - b)
		expect(costos[0], 'cada fila creó el suyo: la primera con 100').toBeCloseTo(100, 2)
		expect(costos[1], 'y la segunda con 120').toBeCloseTo(120, 2)

		contexto.pc_rep_ids = modelos.map(m => Number(m.id))
	})

	test('4b: "productos distintos" + "no identificar" crea uno POR FILA', async () => {
		test.setTimeout(600000)

		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		const id_previo = await id_de_ultima_importacion(page)

		await importar_excel(page, contexto.archivos.provider_repetido, [
			['Nombre', 'Nombre'],
			['Codigo proveedor', 'Código de proveedor'],
			['Costo', 'Costo'],
		], { politica_intra: 'productos_distintos', politica_colision: 'crear_nuevo', exigir_politicas: true, proveedor: 'Proveedor Alfa' })

		const history = await esperar_ultima_importacion(page, id_previo)
		const modelos = await creados_de_la_importacion(page, history.id)

		expect(modelos.length, '4b: cada fila crea su artículo aunque el código exista').toBe(2)

		for (const m of modelos) {
			contexto.pc_rep_ids.push(Number(m.id))
		}
		// 2 del defecto de 4a + 2 de esta corrida (cuando se corrija 4a, esto vuelve a 3).
		expect(contexto.pc_rep_ids.length, 'a esta altura hay 4 artículos con el código repetido').toBe(4)
	})

	test('4c: "actualizar todos" pisa el costo de TODOS los que comparten el código', async () => {
		test.setTimeout(600000)

		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		await importar_excel(page, contexto.archivos.provider_actualizar, [
			['Nombre', 'Nombre'],
			['Codigo proveedor', 'Código de proveedor'],
			['Costo', 'Costo'],
		], { politica_colision: 'actualizar_todos', solo_editar: true, exigir_politicas: true, proveedor: 'Proveedor Alfa' })

		// El fin lo dicen los datos: los tres en costo 200.
		await expect(async () => {
			for (const id of contexto.pc_rep_ids) {
				const res = await api_get(page, 'article/' + id)
				expect(Number((res.model || res).cost), `4c: el artículo ${id} tiene que pasar a costo 200`).toBeCloseTo(200, 2)
			}
		}).toPass({ timeout: 120000, intervals: [3000] })
	})

	test('4d: "saltear y reportar" no toca nada y deja el conflicto', async () => {
		test.setTimeout(600000)

		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		const id_previo = await id_de_ultima_importacion(page)

		await importar_excel(page, contexto.archivos.provider_saltear, [
			['Nombre', 'Nombre'],
			['Codigo proveedor', 'Código de proveedor'],
			['Costo', 'Costo'],
		], { politica_colision: 'saltear_y_reportar', solo_editar: true, exigir_politicas: true, proveedor: 'Proveedor Alfa' })

		const history = await esperar_ultima_importacion(page, id_previo)

		// El conflicto ambiguo por provider_code quedó reportado…
		const conflictos = await api_get(page, 'import-history/' + history.id + '/conflicts')
		const lista_conflictos = conflictos.models || conflictos.conflicts || conflictos
		const ambiguos = lista_conflictos.filter(c => (c.tipo || c.type || '').includes('ambiguo'))
		expect(ambiguos.length, '4d: la colisión salteada deja su conflicto').toBeGreaterThanOrEqual(1)

		// …y NINGUNO de los tres se movió de 200.
		for (const id of contexto.pc_rep_ids) {
			const res = await api_get(page, 'article/' + id)
			expect(Number((res.model || res).cost), `4d: el artículo ${id} NO tiene que cambiar`).toBeCloseTo(200, 2)
		}
	})
})
