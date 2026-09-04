// Exploración de la IMPORTACIÓN DE EXCEL — listas de precios y stock por sucursal.
//
// Nace de /explorar del 2/9/2026 (pedido de Lucas: costo→listas con y sin precio fijado, stock
// por sucursal con movimiento por diferencia, categorías existentes y nuevas). Los números
// esperados se calcularon A MANO antes de tocar la interfaz y quedaron en
// PREDICCIONES-importacion-excel.md del slot; acá cada aserción cita su predicción (P1..P12).
//
// ── Qué afirma ───────────────────────────────────────────────────────────────────────────────
//
//  1. Importar un Excel de alta crea los artículos con el precio único = costo × 1.21 y los
//     pivots de TODAS las listas de la cuenta (Mayorista 20% / Minorista 40%), con
//     final_de_lista = costo × (1+margen%) × 1.21.
//  2. Una columna "setear precio final de lista" con 'Si' y un $ final fijan el precio de ESA
//     lista; el margen del pivot se deriva al revés, neto de IVA.
//  3. Reimportar con costo nuevo recalcula los finales de lista LINEALMENTE (setear=0), y deja
//     QUIETO el final de la lista fijada, derivando el margen nuevo (setear=1). El caso central
//     del pedido de Lucas.
//  4. El stock por sucursal se aplica POR DIFERENCIA: pivot 100 y Excel 120 ⇒ UN movimiento de
//     +20 hacia esa sucursal ('Importacion de excel'), la otra sucursal intacta.
//  5. Una categoría del Excel que ya existe (aun con otra capitalización) se asigna sin crear
//     duplicado; una que no existe se crea UNA sola vez aunque la usen dos filas.
//
// ── De qué fixture depende ───────────────────────────────────────────────────────────────────
//
// De la cuenta de TestingImportListasSeeder (empresa-api, doc 5678 / clave 1234): listas
// Mayorista 20% (setear=0) y Minorista 40% (setear=0), sucursales 'Sucursal Centro' y
// 'Sucursal Norte', categoría 'Herramientas', SIN IIBB, RRII migrada. Si el login falla,
// correr en empresa-api:
//
//     php artisan db:seed --class="Database\Seeders\testing\TestingImportListasSeeder" --env=testing --force
//
// Los Excel se generan EN CADA CORRIDA con identificadores propios (e2e/fixtures/importacion/
// generar.js): por eso "6 creados" es verdad también sobre la base acumulada del slot.
//
// ── Trampas que ya costaron una corrida (o que este archivo esquiva a propósito) ─────────────
//
// 🔴 Este spec NO usa el storageState de la ferretería: pisa la sesión con storageState vacío y
//    loguea a mano con la cuenta de listas. Sin eso estaría midiendo la cuenta equivocada.
// 🔴 El análisis del paso 1 y la recomendación del paso 3 llaman a Claude DE VERDAD (la key está
//    en el .env del slot) y se esperan por polling HTTP: timeouts altos a propósito.
// 🔴 El mapeo del paso 2 NO se confía a la IA: el spec SETEA cada columna por el texto del
//    encabezado. La exploración mide el sistema, no la puntería del modelo.
// 🔴 La importación corre en el WORKER de cola: sin `php artisan queue:work` el POST devuelve
//    200 y nada pasa nunca (e2e/README.md). El fin se espera por LOS DATOS (toPass), no por el
//    modal de notificación: el navegador del harness está aislado de Pusher (fixtures.js) y esa
//    notificación llega por broadcast.
// 🔴 Los radios y checkboxes de BootstrapVue tienen el input OCULTO: se clickea el label padre
//    (mismo motivo que poner_toggle de helpers/vender.js).
const { test, expect } = require('../fixtures')
const path = require('path')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { completar_campo } = require('../helpers/formulario')
const { aislar_broadcasts } = require('../helpers/entorno')
const { generar } = require('../fixtures/importacion/generar')

// 🔴 Sesión propia COMPARTIDA entre los tests del serial. `test.use({ storageState })` no sirve
// acá: cada test abriría un contexto nuevo SIN la sesión que el primer test consiguió logueando
// (costó la primera corrida: el test 2 se quedaba esperando `recursos-estado` en una página que
// había vuelto al login). La página se crea una vez en beforeAll, deslogueada, y el login del
// primer test vale para todos.
let page

test.beforeAll(async ({ browser }) => {
	// 🔴 El storageState VACÍO es explícito y no negociable: browser.newContext() dentro de
	// @playwright/test hereda las opciones del proyecto, INCLUIDO el storageState de la
	// ferretería que dejó auth.setup.js. Sin esta línea, este spec navega a /login ya logueado
	// como la otra cuenta y el sistema lo saca al dashboard equivocado (costó una corrida:
	// el form de login nunca aparecía y el snapshot mostraba al usuario "Lucas" adentro).
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

// ── Los números predichos (PREDICCIONES-importacion-excel.md) ────────────────────────────────
//
// Cuenta sin IIBB, artículos con IVA 21% al final (RRII migrada), listas 20% y 40%:
//
//   final único            = costo × 1.21
//   final de lista (set=0) = costo × (1 + margen/100) × 1.21
//   margen con final fijado = (final/1.21 − costo) / costo × 100   (DECIMAL(12,2) ⇒ 2 decimales)
const ESPERADO = {
	taladro_1: { costo: 1000, final: 1210, mayorista: 1452, minorista: 1694 },
	lija_1: { costo: 500, final: 605, mayorista: 726, minorista_fijado: 1210, margen_derivado: 100 },
	taladro_2: { costo: 1200, final: 1452, mayorista: 1742.4, minorista: 2032.8 },
	lija_2: { costo: 600, mayorista: 871.2, minorista_fijado: 1210, margen_derivado: 66.67 },
}

// ── Estado compartido ────────────────────────────────────────────────────────────────────────

const contexto = {
	sufijo: String(Date.now()),
	/** Rutas de los Excel generados para ESTA corrida y sus identificadores. */
	archivos: null,
	datos: null,
	/** Origin de la API, capturado del propio login de la SPA. */
	api: null,
	/** Ids por nombre de artículo. */
	ids: {},
	/** Ids de las sucursales por nombre, leídos del catálogo de la cuenta. */
	sucursales: {},
	/** Ids de las listas por nombre. */
	listas: {},
	/** Cantidad de categorías de la cuenta ANTES del Excel 1 (todo por diferencia). */
	categorias_previas: null,
}

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────

/**
 * GET a la API con la sesión de la página (mismo camino y mismas cookies que usa la SPA).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} ruta Relativa a /api, sin barra inicial.
 * @returns {Promise<any>}
 */
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

/**
 * Marca un radio/checkbox de BootstrapVue clickeando su LABEL (el input está oculto).
 *
 * 🔴 El label, no el div contenedor: el click de Playwright va al CENTRO del elemento, y el
 * centro del `.custom-control` (ancho completo) suele caer a la derecha del texto, donde no hay
 * nada clickeable — el radio quedaba sin marcar y el botón Importar deshabilitado, sin ningún
 * error (costó una pasada entera del análisis).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} testid
 */
async function elegir_radio(page, testid) {
	const input = page.locator(`[data-testid="${testid}"]`)
	await input.locator('xpath=following-sibling::label').click()
	await expect(input, `el radio ${testid} no quedó marcado tras el click`).toBeChecked()
}

/**
 * En el paso 2 del modal, asigna una propiedad del sistema a la columna cuyo ENCABEZADO de Excel
 * es exactamente `encabezado`. Por label y no por value: los values de sucursales y listas llevan
 * el id de la base, que cambia entre slots.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} encabezado Texto exacto del encabezado en el Excel.
 * @param {string} label Label exacto de la opción del select (ej. 'Stock: Sucursal Centro').
 */
async function mapear_columna(page, encabezado, label) {
	const bloque = page
		.locator('.ai-import-mapping-block')
		.filter({ has: page.locator('.ai-import-mapping-excel-header', { hasText: new RegExp('^\\s*' + encabezado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$') }) })

	// 🔴 Si falla, decir QUÉ encabezados llegaron: el paso 2 lo arma Claude y no es determinista
	// (ver el comentario completo en exploracion-importacion-codigos.spec.js — costó una corrida).
	if (await bloque.count() === 0) {
		const disponibles = await page.locator('.ai-import-mapping-excel-header').allInnerTexts()
		expect(
			false,
			`no encontré la columna "${encabezado}" en el mapeo del paso 2. `
			+ `Las que devolvió el análisis: ${JSON.stringify(disponibles.map(t => t.trim()))}. `
			+ 'Si el Excel sí la tiene, es la variabilidad del análisis con IA: volvé a correr.'
		).toBeTruthy()
	}

	await expect(bloque, `no encontré la columna "${encabezado}" en el mapeo del paso 2`).toHaveCount(1)
	await bloque.locator('select').selectOption({ label })
}

/**
 * Recorre el modal de importación de punta a punta con un archivo ya generado.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} archivo Ruta absoluta del .xlsx.
 * @param {Array<[string, string]>} mapeo Pares [encabezado del Excel, label de la propiedad].
 * @param {Object} [opciones]
 * @param {string} [opciones.politica_intra] Testid-valor de la política intra-archivo, si aplica.
 * @param {string} [opciones.politica_colision] Ídem política de colisión.
 * @param {boolean} [opciones.solo_editar] true ⇒ radio "Solo editar existentes".
 */
async function importar_excel(page, archivo, mapeo, opciones = {}) {
	// El menú Crear del listado es un b-dropdown split: el CARET es el que despliega, y el ítem
	// "Importar con IA" vive en el submenú que se abre al pasar el mouse por "Importación"
	// (mismo recorrido que verifica menu-crear-submenu-importacion.spec.js).
	const dropdown_crear = page.locator('#dropdown_article')
	await dropdown_crear.locator('.dropdown-toggle-split').click()

	const menu_principal = dropdown_crear.locator('.excel-create-dropdown-menu')
	await expect(menu_principal).toBeVisible()

	const item_importacion = menu_principal.locator('.excel-dropdown-submenu', { hasText: 'Importación' })
	await item_importacion.hover()

	const submenu = item_importacion.locator('.excel-dropdown-submenu__menu')
	await expect(submenu).toBeVisible()
	await submenu.locator('li, a, button').filter({ hasText: 'Importar con IA' }).first().click()

	// Paso 1: archivo + analizar. El input real de b-form-file vive dentro del wrapper.
	const input_archivo = page.locator('[data-testid="ai-import-archivo"] input[type="file"], input[data-testid="ai-import-archivo"]').first()
	await input_archivo.setInputFiles(archivo)

	await expect(page.locator('[data-testid="ai-import-btn-analizar"]')).toBeEnabled({ timeout: 20000 })
	await page.locator('[data-testid="ai-import-btn-analizar"]').click()

	// El análisis llama a Claude y se espera por polling: la señal de que terminó es la tabla de
	// mapeo del paso 2.
	await expect(page.locator('.ai-import-mapping-block').first()).toBeVisible({ timeout: 240000 })

	// Paso 2: proveedor y mapeo A MANO (la exploración no mide la puntería de la IA). El
	// proveedor va SIEMPRE explícito: si cada corrida deja al modelo elegir uno distinto, el
	// paso 3 agrega la pregunta de "códigos en otros proveedores" y Continuar queda muerto.
	if (opciones.proveedor) {
		await page.locator('[data-testid="ai-import-proveedor"]').selectOption({ label: opciones.proveedor })
	}

	for (const [encabezado, label] of mapeo) {
		await mapear_columna(page, encabezado, label)
	}

	await page.locator('[data-testid="ai-import-btn-confirmar-mapeo"]').click()

	// Paso 3: la recomendación también viaja a Claude; la señal es el botón Continuar.
	await expect(page.locator('[data-testid="ai-import-btn-continuar"]')).toBeVisible({ timeout: 240000 })

	// Las dos decisiones son CONDICIONALES: el bloque solo se dibuja si el archivo trae
	// duplicados (intra) o filas que se identifican por código de proveedor (colisión). Elegir
	// solo si el radio existe; si el que llama la pidió y no está, no es un error del spec.
	if (opciones.politica_intra) {
		const radio = page.locator('[data-testid="ai-import-politica-intra-' + opciones.politica_intra + '"]')
		if (await radio.count() > 0) {
			await elegir_radio(page, 'ai-import-politica-intra-' + opciones.politica_intra)
		}
	}
	if (opciones.politica_colision) {
		const radio = page.locator('[data-testid="ai-import-politica-colision-' + opciones.politica_colision + '"]')
		if (await radio.count() > 0) {
			await elegir_radio(page, 'ai-import-politica-colision-' + opciones.politica_colision)
		}
	}

	// La tercera pregunta (códigos en OTROS proveedores) también bloquea Continuar si aparece.
	const radio_otro = page.locator('[data-testid="ai-import-politica-otro-ignorar"]')
	if (await radio_otro.count() > 0) {
		await elegir_radio(page, 'ai-import-politica-otro-ignorar')
	}

	await expect(page.locator('[data-testid="ai-import-btn-continuar"]')).toBeEnabled()
	await page.locator('[data-testid="ai-import-btn-continuar"]').click()

	// Paso 4: operación e importar.
	await elegir_radio(page, opciones.solo_editar ? 'ai-import-operacion-solo-editar' : 'ai-import-operacion-crear-y-editar')

	// La condición observable de "se puede importar": el botón habilitado. Si algo de arriba no
	// quedó elegido, esto falla ACÁ con un mensaje claro, no sesenta segundos después.
	await expect(page.locator('[data-testid="ai-import-btn-importar"]')).toBeEnabled()

	const [respuesta] = await Promise.all([
		page.waitForResponse(r => r.url().includes('ai-excel-import/import') && r.request().method() === 'POST', { timeout: 60000 }),
		page.locator('[data-testid="ai-import-btn-importar"]').click(),
	])
	expect(respuesta.ok(), 'el POST de la importación no salió bien').toBeTruthy()

	// El modal se cierra o queda informando; la importación sigue en el worker. El que llama
	// espera por LOS DATOS. Cerramos el modal si quedó abierto para no tapar el listado.
	await page.keyboard.press('Escape').catch(() => {})
}

/**
 * Busca un artículo por el buscador general del listado y devuelve su id. Reintenta hasta que el
 * worker lo haya creado.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} nombre
 * @returns {Promise<string>}
 */
async function id_por_buscador(page, nombre) {
	let id = null

	await expect(async () => {
		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		const buscador = page.locator('[data-testid="buscador-general"]')
		await buscador.click()
		await buscador.pressSequentially(nombre, { delay: 15 })

		const [respuesta] = await Promise.all([
			page.waitForResponse(r => r.url().includes('/global-search/') && r.request().method() === 'POST', { timeout: 20000 }),
			page.locator('[data-testid="buscador-general-lupa"]').click(),
		])
		expect(respuesta.ok()).toBeTruthy()

		await expect(page.locator('[data-testid^="celda-article-name-"]').first()).toBeVisible({ timeout: 10000 })

		id = await page.evaluate(texto => {
			const celda = [...document.querySelectorAll('[data-testid^="celda-article-name-"]')]
				.find(c => c.innerText.trim() === texto)
			return celda ? celda.dataset.testid.replace('celda-article-name-', '') : null
		}, nombre)

		expect(id, `todavía no aparece "${nombre}" (¿terminó el worker?)`).not.toBeNull()
	}).toPass({ timeout: 120000, intervals: [3000] })

	return id
}

/**
 * Pivot de una lista de un artículo, vía GET article/{id} con la sesión de la página.
 *
 * @returns {Promise<{percentage: number, final_price: number, setear: number}>}
 */
async function pivot_de_lista(page, article_id, price_type_id) {
	const res = await api_get(page, 'article/' + article_id)
	const modelo = res.model || res.article || res

	expect(modelo && modelo.price_types, `GET article/${article_id} no trajo price_types`).toBeTruthy()

	const lista = modelo.price_types.find(pt => Number(pt.id) === Number(price_type_id))
	expect(lista, `el artículo ${article_id} no tiene pivot con la lista ${price_type_id}`).toBeTruthy()

	return {
		percentage: lista.pivot.percentage === null ? null : Number(lista.pivot.percentage),
		final_price: lista.pivot.final_price === null ? null : Number(lista.pivot.final_price),
		setear: Number(lista.pivot.setear_precio_final),
	}
}

// ── Los tests ────────────────────────────────────────────────────────────────────────────────

test.describe.serial('Exploración: importación de Excel — listas y stock', () => {

	test('login con la cuenta de listas y foto previa', async () => {
		// Los Excel de ESTA corrida, con identificadores propios (re-ejecutable sobre base usada).
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

		expect(login.ok(), 'el login de la cuenta de listas falló: ¿corriste TestingImportListasSeeder?').toBeTruthy()
		contexto.api = new URL(login.url()).origin

		await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 })
		await esperar_recursos_descargados(page, { abrir_panel: false })

		// Foto previa: sucursales, listas y cantidad de categorías de la cuenta.
		const sucursales = await api_get(page, 'address')
		const lista_sucursales = sucursales.models || sucursales.addresses || sucursales
		for (const s of lista_sucursales) {
			contexto.sucursales[s.street] = s.id
		}
		expect(contexto.sucursales['Sucursal Centro'], 'falta la sucursal Centro del fixture').toBeTruthy()
		expect(contexto.sucursales['Sucursal Norte'], 'falta la sucursal Norte del fixture').toBeTruthy()

		const listas = await api_get(page, 'price-type')
		const lista_listas = listas.models || listas.price_types || listas
		for (const l of lista_listas) {
			contexto.listas[l.name] = l.id
		}
		expect(contexto.listas['Mayorista'], 'falta la lista Mayorista del fixture').toBeTruthy()
		expect(contexto.listas['Minorista'], 'falta la lista Minorista del fixture').toBeTruthy()

		const categorias = await api_get(page, 'category')
		const lista_categorias = categorias.models || categorias.categories || categorias
		contexto.categorias_previas = lista_categorias.length
	})

	test('Excel 1: el alta de 6 artículos por el modal de IA', async () => {
		test.setTimeout(600000)

		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		await importar_excel(page, contexto.archivos.alta, [
			['Nombre', 'Nombre'],
			['Codigo de barras', 'Código de barras'],
			['Codigo proveedor', 'Código de proveedor'],
			['Costo', 'Costo'],
			['Categoria', 'Categoría'],
			['Stock Centro', 'Stock: Sucursal Centro'],
			['Stock Norte', 'Stock: Sucursal Norte'],
			['Fijar precio Minorista', 'Setear precio final: Minorista'],
			['Precio final Minorista', '$ Final: Minorista'],
		], { politica_colision: 'actualizar_todos', proveedor: 'Proveedor Alfa' })

		// El fin lo dicen los datos: el último artículo del archivo, creado por el worker.
		contexto.ids.martillo = await id_por_buscador(page, contexto.datos.nombre_martillo)
		contexto.ids.taladro = await id_por_buscador(page, contexto.datos.nombre_taladro)
		contexto.ids.lija = await id_por_buscador(page, contexto.datos.nombre_lija)
		contexto.ids.pintura = await id_por_buscador(page, contexto.datos.nombre_pintura)
		contexto.ids.rodillo = await id_por_buscador(page, contexto.datos.nombre_rodillo)
		contexto.ids.cinta = await id_por_buscador(page, contexto.datos.nombre_cinta)
	})

	test('P2: los precios únicos salen de costo × 1.21', async () => {
		const esperados = [
			['taladro', 1000, 1210],
			['lija', 500, 605],
			['pintura', 2000, 2420],
			['rodillo', 800, 968],
			['cinta', 300, 363],
			['martillo', 600, 726],
		]

		for (const [clave, costo, final] of esperados) {
			const res = await api_get(page, 'article/' + contexto.ids[clave])
			const modelo = res.model || res.article || res
			expect(Number(modelo.cost), `costo de ${clave}`).toBeCloseTo(costo, 2)
			expect(Number(modelo.final_price), `precio final único de ${clave} (P2: costo × 1.21)`).toBeCloseTo(final, 2)
		}
	})

	test('P3: el Taladro queda en las dos listas con los márgenes por defecto', async () => {
		const mayorista = await pivot_de_lista(page, contexto.ids.taladro, contexto.listas['Mayorista'])
		expect(mayorista.percentage, 'margen Mayorista (default de la lista)').toBeCloseTo(20, 2)
		expect(mayorista.final_price, 'final Mayorista = 1000 × 1.2 × 1.21').toBeCloseTo(ESPERADO.taladro_1.mayorista, 2)
		expect(mayorista.setear, 'setear_precio_final tiene que quedar en 0').toBe(0)

		const minorista = await pivot_de_lista(page, contexto.ids.taladro, contexto.listas['Minorista'])
		expect(minorista.percentage, 'margen Minorista (default de la lista)').toBeCloseTo(40, 2)
		expect(minorista.final_price, 'final Minorista = 1000 × 1.4 × 1.21').toBeCloseTo(ESPERADO.taladro_1.minorista, 2)
		expect(minorista.setear).toBe(0)
	})

	test('P4: la Lija nace con la Minorista FIJADA en 1210 y margen derivado 100%', async () => {
		const minorista = await pivot_de_lista(page, contexto.ids.lija, contexto.listas['Minorista'])
		expect(minorista.setear, 'la columna "Setear... = Si" tiene que dejar setear_precio_final = 1').toBe(1)
		expect(minorista.final_price, 'el $ final de la lista fijada').toBeCloseTo(1210, 2)
		expect(minorista.percentage, 'margen derivado: (1210/1.21 − 500)/500 × 100').toBeCloseTo(100, 2)

		const mayorista = await pivot_de_lista(page, contexto.ids.lija, contexto.listas['Mayorista'])
		expect(mayorista.setear).toBe(0)
		expect(mayorista.final_price, 'la Mayorista de la Lija sigue el margen: 500 × 1.2 × 1.21').toBeCloseTo(726, 2)
	})

	test('P5: la categoría nueva se creó UNA vez y la existente no se duplicó', async () => {
		const categorias = await api_get(page, 'category')
		const lista = categorias.models || categorias.categories || categorias

		const nuevas = lista.filter(c => c.name === contexto.datos.categoria_nueva)
		expect(nuevas.length, 'la categoría nueva del Excel tiene que crearse UNA sola vez (dos filas la usan)').toBe(1)

		const herramientas = lista.filter(c => c.name.toLowerCase() === 'herramientas')
		expect(herramientas.length, '"herramientas" en minúscula tiene que matchear la existente, no crear otra').toBe(1)

		expect(lista.length, 'total de categorías: solo una más que antes del Excel').toBe(contexto.categorias_previas + 1)

		// Y las dos filas quedaron atadas a su categoría.
		const pintura = await api_get(page, 'article/' + contexto.ids.pintura)
		const rodillo = await api_get(page, 'article/' + contexto.ids.rodillo)
		expect(Number((pintura.model || pintura).category_id)).toBe(Number(nuevas[0].id))
		expect(Number((rodillo.model || rodillo).category_id)).toBe(Number(nuevas[0].id))
		const cinta = await api_get(page, 'article/' + contexto.ids.cinta)
		expect(Number((cinta.model || cinta).category_id)).toBe(Number(herramientas[0].id))
	})

	test('P6: el stock inicial entró por sucursal, con su movimiento cada una', async () => {
		const res = await api_get(page, 'article/' + contexto.ids.taladro)
		const modelo = res.model || res
		expect(Number(modelo.stock), 'stock global del Taladro = 100 + 50').toBeCloseTo(150, 2)

		const movimientos = await api_get(page, 'stock-movement/' + contexto.ids.taladro + '/10/0')
		const lista = movimientos.models || movimientos

		const a_centro = lista.filter(m => Number(m.to_address_id) === Number(contexto.sucursales['Sucursal Centro']))
		const a_norte = lista.filter(m => Number(m.to_address_id) === Number(contexto.sucursales['Sucursal Norte']))

		expect(a_centro.length, 'un movimiento hacia Centro').toBe(1)
		expect(Number(a_centro[0].amount), '+100 a Centro').toBeCloseTo(100, 2)
		expect(a_norte.length, 'un movimiento hacia Norte').toBe(1)
		expect(Number(a_norte[0].amount), '+50 a Norte').toBeCloseTo(50, 2)
	})

	test('Excel 2: costos nuevos y stock 120 en Centro', async () => {
		test.setTimeout(600000)

		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		await importar_excel(page, contexto.archivos.costos, [
			['Codigo de barras', 'Código de barras'],
			['Costo', 'Costo'],
			['Stock Centro', 'Stock: Sucursal Centro'],
			['Stock Norte', 'Stock: Sucursal Norte'],
		], { solo_editar: true, proveedor: 'Proveedor Alfa' })

		// El fin lo dice el dato: el costo del Taladro en 1200.
		await expect(async () => {
			const res = await api_get(page, 'article/' + contexto.ids.taladro)
			expect(Number((res.model || res).cost)).toBeCloseTo(1200, 2)
		}).toPass({ timeout: 120000, intervals: [3000] })
	})

	test('P8: +20% de costo ⇒ +20% en los finales de las dos listas (setear=0)', async () => {
		const mayorista = await pivot_de_lista(page, contexto.ids.taladro, contexto.listas['Mayorista'])
		expect(mayorista.final_price, 'Mayorista: 1200 × 1.2 × 1.21').toBeCloseTo(ESPERADO.taladro_2.mayorista, 2)

		const minorista = await pivot_de_lista(page, contexto.ids.taladro, contexto.listas['Minorista'])
		expect(minorista.final_price, 'Minorista: 1200 × 1.4 × 1.21').toBeCloseTo(ESPERADO.taladro_2.minorista, 2)

		const res = await api_get(page, 'article/' + contexto.ids.taladro)
		expect(Number((res.model || res).final_price), 'final único: 1200 × 1.21').toBeCloseTo(ESPERADO.taladro_2.final, 2)
	})

	test('P9: la lista fijada NO mueve el final; SÍ cambian costo y margen', async () => {
		const res = await api_get(page, 'article/' + contexto.ids.lija)
		expect(Number((res.model || res).cost), 'el costo de la Lija SÍ cambió').toBeCloseTo(600, 2)

		const minorista = await pivot_de_lista(page, contexto.ids.lija, contexto.listas['Minorista'])
		expect(minorista.setear, 'setear_precio_final se conserva en 1').toBe(1)
		expect(minorista.final_price, 'el final fijado NO se mueve al cambiar el costo').toBeCloseTo(1210, 2)
		expect(minorista.percentage, 'el margen se deriva del precio fijo: (1000 − 600)/600 × 100').toBeCloseTo(66.67, 2)

		const mayorista = await pivot_de_lista(page, contexto.ids.lija, contexto.listas['Mayorista'])
		expect(mayorista.final_price, 'la lista NO fijada sí se recalcula: 600 × 1.2 × 1.21').toBeCloseTo(ESPERADO.lija_2.mayorista, 2)
	})

	test('P10: Centro 100→120 deja UN movimiento de +20 y Norte queda intacto', async () => {
		const res = await api_get(page, 'article/' + contexto.ids.taladro)
		expect(Number((res.model || res).stock), 'stock global 150 + 20').toBeCloseTo(170, 2)

		const movimientos = await api_get(page, 'stock-movement/' + contexto.ids.taladro + '/10/0')
		const lista = movimientos.models || movimientos

		const a_centro = lista.filter(m => Number(m.to_address_id) === Number(contexto.sucursales['Sucursal Centro']))
		const a_norte = lista.filter(m => Number(m.to_address_id) === Number(contexto.sucursales['Sucursal Norte']))

		expect(a_centro.length, 'Centro tiene que tener DOS movimientos: el inicial (+100) y el delta (+20)').toBe(2)
		const delta = a_centro.map(m => Number(m.amount)).sort((a, b) => a - b)[0]
		expect(delta, 'el movimiento nuevo es el DELTA (+20), no el absoluto (120)').toBeCloseTo(20, 2)

		expect(a_norte.length, 'Norte sigue con su único movimiento inicial: la celda vacía no lo toca').toBe(1)
	})

	test('P11: la fila sin cambios no deja rastro (ni update, ni movimiento)', async () => {
		const res = await api_get(page, 'article/' + contexto.ids.cinta)
		const modelo = res.model || res

		expect(Number(modelo.cost), 'el costo de la Cinta sigue igual').toBeCloseTo(300, 2)
		expect(Number(modelo.stock), 'el stock de la Cinta sigue igual').toBeCloseTo(20, 2)

		const movimientos = await api_get(page, 'stock-movement/' + contexto.ids.cinta + '/10/0')
		const lista = movimientos.models || movimientos
		expect(lista.length, 'reimportar el mismo stock NO puede generar un movimiento nuevo').toBe(1)
	})
})
