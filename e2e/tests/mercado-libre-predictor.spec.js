// Predictor de categorias de Mercado Libre en el formulario del articulo (Listado).
//
// Mision mercado-libre-pruebas (27/10/2026). Cubre el bloque "Mercado Libre" del formulario del
// articulo (src/components/listado/components/mercado-libre-form/), de punta a punta contra la API
// real y el catalogo publico real de Mercado Libre:
//
//   1. Las "Sugeridas" salen del NOMBRE escrito en "Datos generales", aunque todavia no se haya
//      confirmado con Enter. Es la regresion del 27/10/2026: con el nombre escrito, la solapa decia
//      "Escribi el nombre del articulo..." porque el nombre de un articulo nuevo vive en la query
//      del buscador de NameInput.vue, no en el modelo, y la solapa no existe mientras se escribe.
//   2. Elegir una sugerida trae los datos que pide esa categoria, con el contador de obligatorios;
//      completarlos y guardar manda la categoria y los atributos en el MISMO POST del articulo.
//   3. Al volver a abrir el articulo, la categoria y lo escrito siguen ahi.
//   4. "Buscar" encuentra categorias por texto libre, y elegir otra y guardar cambia la categoria.
//   5. "Ver todas" recorre el arbol hasta la ultima categoria de una rama y la deja usar.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// Lo que hay que saber antes de tocar este archivo
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// 🔴 1. Depende de la extension `usa_mercado_libre` del usuario del fixture
//    (TestingFerreteriaSeeder::seed_extenciones(), desde el 27/10/2026). Sin ella la pestaña
//    "Mercado Libre" NO EXISTE (`if_has_extencion` en src/models/article.js) y el rojo dice que no
//    encuentra `nav-item-Mercado Libre`, sin que haya nada roto en el predictor.
//
// 🔴 2. Necesita que la API tenga MERCADO_LIBRE_CLIENT_ID y MERCADO_LIBRE_CLIENT_SECRET en su .env y
//    salida a api.mercadolibre.com. El predictor, el buscador y el arbol usan el token de la
//    APLICACION (client_credentials, ver CatalogoPublicoService): NO hace falta ninguna cuenta de
//    Mercado Libre conectada y este spec no publica nada. Sin credenciales la API contesta con un
//    mensaje y el primer test falla en `predictor_ok`, que lo dice.
//
// 🔴 3. Se afirma la ESTRUCTURA, no categorias puntuales. Lo que sugiere Mercado Libre para un
//    nombre cambia con el tiempo; afirmar "Taladros percutores" haria rojo el dia que reordene. Lo
//    que si se afirma: que hay sugerencias, que se pidieron con el nombre escrito, y que lo elegido
//    es exactamente lo que viaja al guardar y lo que vuelve al reabrir.
//
// 🔴 4. Serial y con estado compartido: el test 3 reabre el articulo que crea el 2, y el 4 le cambia
//    la categoria. Si uno falla, los siguientes se saltean, que es lo correcto.
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { abrir_pestania, crear_desde_buscador } = require('../helpers/formulario')
const { buscar_articulo, limpiar_busqueda_del_listado } = require('../helpers/vender')

// ── Datos de entrada ─────────────────────────────────────────────────────────────────────────

/**
 * Nombre de un articulo comun de ferreteria, para que el predictor tenga de donde agarrarse. El
 * sufijo lo hace unico por corrida (crear_desde_buscador exige que el nombre no exista) sin cambiar
 * lo que el predictor entiende.
 */
const NOMBRE = `Taladro percutor 13 mm 750 W E2E${Date.now() % 1000000}`

/** Texto libre para el modo "Buscar": otra rama del catalogo, para que el cambio se note. */
const TEXTO_BUSQUEDA = 'remera de algodon'

/** Tope de niveles al bajar por el arbol: el catalogo de MLA no pasa de 7. */
const MAXIMO_DE_NIVELES = 9

// ── Estado compartido entre los tests seriales ───────────────────────────────────────────────

const contexto = {
	/** Id del articulo que crea el test 2. */
	id_creado: null,
	/** Categoria elegida en el test 2, tal cual la devolvio `POST meli-category/resolve`. */
	categoria: null,
	/** id local del atributo -> valor escrito/elegido en el test 2 ({tipo, valor}). */
	completados: {},
}

// ── Helpers de este archivo ──────────────────────────────────────────────────────────────────

/**
 * Entra al listado y abre el formulario de alta de un articulo.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function abrir_alta_de_articulo(page) {
	await page.goto('/listado-de-articulos')
	await esperar_recursos_descargados(page, { abrir_panel: false })

	const modal = page.locator('#article___BV_modal_outer_')
	await expect(async () => {
		await page.locator('[data-testid="btn-crear-article"]').click()
		await expect(modal).toBeAttached({ timeout: 3000 })
	}).toPass({ timeout: 30000 })
}

/**
 * Promesa que se resuelve con la respuesta del predictor pedida con una consulta dada. Se arma
 * ANTES de la accion que dispara el pedido (si no, la respuesta puede llegar antes de escucharla).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} consulta Texto con el que se espera que se pida (`q`).
 * @returns {Promise<import('@playwright/test').Response>}
 */
function esperar_predictor(page, consulta) {
	return page.waitForResponse(res => {
		if (!res.url().includes('/meli-category-predictor') || res.request().method() !== 'GET') {
			return false
		}
		return new URL(res.url()).searchParams.get('q') === consulta
	}, { timeout: 60000 })
}

/**
 * Verifica que la respuesta del predictor haya salido bien, con un mensaje que diga QUE mirar si no.
 *
 * @param {import('@playwright/test').Response} respuesta
 * @returns {Promise<void>}
 */
async function predictor_ok(respuesta) {
	let detalle = ''
	if (!respuesta.ok()) {
		detalle = await respuesta.text()
	}
	expect(
		respuesta.ok(),
		`el predictor de categorias respondio ${respuesta.status()}: ${detalle}. ` +
		'¿La API tiene MERCADO_LIBRE_CLIENT_ID y MERCADO_LIBRE_CLIENT_SECRET en su .env?'
	).toBeTruthy()
}

/**
 * Elige una categoria clickeando un boton del selector y devuelve la categoria resuelta.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} boton Sugerida, resultado de busqueda o "Usar esta categoria".
 * @returns {Promise<Object>} La categoria de `POST meli-category/resolve` (con sus `atributos`).
 */
async function elegir_categoria(page, boton) {
	const [respuesta] = await Promise.all([
		page.waitForResponse(
			res => res.url().includes('/meli-category/resolve') && res.request().method() === 'POST',
			{ timeout: 60000 }
		),
		boton.click(),
	])
	const cuerpo = await respuesta.json()
	expect(respuesta.ok(), `resolver la categoria fallo: ${cuerpo.message || respuesta.status()}`).toBeTruthy()
	expect(cuerpo.model, 'el resolve no devolvio la categoria').toBeTruthy()

	await expect(page.locator('[data-testid="meli-categoria-elegida"]'))
		.toContainText(cuerpo.model.meli_category_name)

	return cuerpo.model
}

/**
 * Valor de prueba para un atributo de texto, respetando el largo maximo de la categoria.
 *
 * @param {Object} atributo Atributo del resolve.
 * @returns {string|null} null si el tipo no se puede completar con un texto cualquiera.
 */
function valor_de_prueba(atributo) {
	if (atributo.values && atributo.values.length) {
		return atributo.values[0].name
	}
	if (atributo.value_type === 'number') {
		return '10'
	}
	if (atributo.value_type === 'number_unit') {
		const unidad = atributo.default_unit || (atributo.allowed_units && atributo.allowed_units[0] && atributo.allowed_units[0].name)
		return unidad ? `10 ${unidad}` : null
	}
	if (atributo.value_type === 'string') {
		const texto = `E2E ${atributo.name}`
		return atributo.value_max_length ? texto.slice(0, atributo.value_max_length) : texto
	}
	return null
}

// ─────────────────────────────────────────────────────────────────────────────────────────────

test.describe.serial('Listado: categoria de Mercado Libre del articulo', () => {

	test('las sugeridas usan el nombre escrito aunque todavia no se haya confirmado', async ({ page }) => {
		await abrir_alta_de_articulo(page)

		// Se escribe el nombre en el buscador del campo y se cierra SIN Enter: el nombre queda en la
		// query del buscador y no en el modelo. Es lo que hace alguien que escribe el nombre y pasa
		// directo a la solapa de Mercado Libre.
		await page.locator('[data-testid="article-name"]').click()
		const modal_input = page.locator('[data-testid="article-name-search-modal-input"]')
		await modal_input.fill('')
		await modal_input.pressSequentially(NOMBRE)
		await modal_input.press('Escape')
		await expect(page.locator('#article-name-search-modal')).toBeHidden()
		await expect(page.locator('#article___BV_modal_outer_'), 'el Escape cerro tambien el formulario del articulo')
			.toBeAttached()

		// Las sugerencias se piden cuando el bloque PASA A VERSE: el pedido sale al abrir la solapa.
		const predictor = esperar_predictor(page, NOMBRE)
		await abrir_pestania(page, 'article', 'Mercado Libre')
		await expect(page.locator('[data-testid="meli-form"]')).toBeVisible()
		await predictor_ok(await predictor)

		await expect(page.locator('[data-testid="meli-form"]')).toContainText(`«${NOMBRE}»`)
		await expect(page.locator('[data-testid="meli-sugerencia"]').first()).toBeVisible()
	})

	test('elegir una sugerida trae los datos de la categoria y viajan con el articulo al guardar', async ({ page }) => {
		await abrir_alta_de_articulo(page)
		await crear_desde_buscador(page, 'article-name', NOMBRE)

		const predictor = esperar_predictor(page, NOMBRE)
		await abrir_pestania(page, 'article', 'Mercado Libre')
		await predictor_ok(await predictor)

		const sugerencias = page.locator('[data-testid="meli-sugerencia"]')
		await expect(sugerencias.first()).toBeVisible()
		const categoria = await elegir_categoria(page, sugerencias.first())
		contexto.categoria = categoria

		// Los datos que pide la categoria aparecen recien con la categoria elegida.
		const bloque_atributos = page.locator('[data-testid="meli-atributos"]')
		await expect(bloque_atributos).toBeVisible()

		// Obligatorios que cuentan como faltantes en un articulo nuevo: los requeridos (los
		// automaticos tambien, porque un articulo nuevo no tiene marca ni codigo de barras de donde
		// sacarlos). Se completan todos los que se pueden completar con un valor de prueba.
		const requeridos = (categoria.atributos || []).filter(atributo => atributo.required)
		const completables = requeridos.filter(atributo => valor_de_prueba(atributo) !== null)

		if (requeridos.length) {
			await expect(page.locator('[data-testid="meli-atributos-faltan"]')).toBeVisible()
		}

		// Si la categoria que sugirio Mercado Libre no pide nada completable, los tests 2 y 3 no
		// prueban ningun atributo. No se falla (depende de lo que sugiera Mercado Libre ese dia), pero
		// queda ANOTADO en el informe y en la consola para que un verde asi no pase por completo.
		if (completables.length === 0) {
			const aviso = `la categoria "${categoria.meli_category_name}" no pide datos obligatorios completables: ` +
				'los tests 2 y 3 no probaron atributos en esta corrida'
			test.info().annotations.push({ type: 'sin-atributos', description: aviso })
			console.warn(`[meli] OJO: ${aviso}`)
		}

		for (const atributo of completables) {
			const caja = page.locator(`[data-testid="meli-atributo-${atributo.meli_id}"]`)
			await expect(caja, `no se dibujo el dato obligatorio "${atributo.name}"`).toBeVisible()

			const select = caja.locator('select')
			if (await select.count() > 0) {
				// Lista cerrada: la primera opcion real (la 0 es el "elegir...")
				await select.selectOption({ index: 1 })
				contexto.completados[atributo.id] = { tipo: 'select', valor: await select.inputValue() }
			} else {
				const valor = valor_de_prueba(atributo)
				const input = caja.locator('input')
				await input.fill(valor)
				await expect(input).toHaveValue(valor)
				contexto.completados[atributo.id] = { tipo: 'texto', valor }
			}
		}

		// Si se pudieron completar todos los requeridos, el contador tiene que desaparecer.
		if (requeridos.length && completables.length === requeridos.length) {
			await expect(page.locator('[data-testid="meli-atributos-faltan"]')).toBeHidden()
		}

		// 🔴 La categoria y los atributos viajan en el MISMO POST del articulo: no hay un guardado
		//    aparte del bloque de Mercado Libre. Se mira el cuerpo del pedido, no solo la respuesta.
		const [respuesta] = await Promise.all([
			page.waitForResponse(res => /\/article(\?|$)/.test(res.url()) && res.request().method() === 'POST'),
			page.locator('[data-testid="btn-guardar-article"]').click(),
		])
		const enviado = respuesta.request().postDataJSON()
		expect(enviado.meli_category_id, 'el POST del articulo no llevo la categoria de Mercado Libre')
			.toBe(categoria.id)
		expect(Array.isArray(enviado.meli_attributes), 'el POST del articulo no llevo meli_attributes').toBeTruthy()
		Object.keys(contexto.completados).forEach(id => {
			const viajo = enviado.meli_attributes.find(item => String(item.meli_attribute_id) === String(id))
			expect(viajo, `el atributo ${id} completado no viajo en el POST`).toBeTruthy()
		})

		const cuerpo = await respuesta.json()
		expect(respuesta.ok(), `guardar el articulo fallo: ${cuerpo.message || respuesta.status()}`).toBeTruthy()
		contexto.id_creado = cuerpo.model ? String(cuerpo.model.id) : null
		expect(contexto.id_creado, 'el POST del articulo no devolvio un modelo con id').not.toBeNull()
		expect(String(cuerpo.model.meli_category_id), 'la API no guardo la categoria').toBe(String(categoria.id))

		console.log(`[meli] articulo ${contexto.id_creado} en "${categoria.meli_category_name}" ` +
			`(${completables.length}/${requeridos.length} obligatorios completados)`)
	})

	test('al reabrir el articulo siguen la categoria y los datos completados', async ({ page }) => {
		test.skip(!contexto.id_creado, 'depende del articulo que crea el test anterior')

		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })
		await limpiar_busqueda_del_listado(page)
		const id = await buscar_articulo(page, NOMBRE)
		expect(id).toBe(contexto.id_creado)

		await page.locator(`[data-testid="article-row-${id}"]`).click()
		await expect(page.locator('#article___BV_modal_outer_')).toBeAttached()

		// Lo guardado lo trae el formulario al abrir la solapa: se lee esa respuesta para afirmar lo
		// que hay en el SERVIDOR, y despues la pantalla.
		const guardados = page.waitForResponse(
			res => res.url().includes(`/article-meli-attribute/${id}`) && res.request().method() === 'GET',
			{ timeout: 60000 }
		)
		await abrir_pestania(page, 'article', 'Mercado Libre')
		const respuesta = await guardados
		expect(respuesta.ok()).toBeTruthy()

		await expect(page.locator('[data-testid="meli-categoria-elegida"]'))
			.toContainText(contexto.categoria.meli_category_name)

		for (const atributo of (contexto.categoria.atributos || [])) {
			const completado = contexto.completados[atributo.id]
			if (!completado) {
				continue
			}
			const caja = page.locator(`[data-testid="meli-atributo-${atributo.meli_id}"]`)
			if (completado.tipo === 'select') {
				await expect(caja.locator('select')).toHaveValue(completado.valor)
			} else {
				await expect(caja.locator('input')).toHaveValue(completado.valor)
			}
		}
	})

	test('buscar otra categoria por texto y guardar la cambia', async ({ page }) => {
		test.skip(!contexto.id_creado, 'depende del articulo que crea el test 2')

		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })
		await limpiar_busqueda_del_listado(page)
		const id = await buscar_articulo(page, NOMBRE)
		expect(id).toBe(contexto.id_creado)

		await page.locator(`[data-testid="article-row-${id}"]`).click()
		await abrir_pestania(page, 'article', 'Mercado Libre')
		await expect(page.locator('[data-testid="meli-categoria-elegida"]'))
			.toContainText(contexto.categoria.meli_category_name)

		await page.locator('[data-testid="meli-cambiar-categoria"]').click()
		await page.locator('[data-testid="meli-modo-buscar"]').click()

		const input = page.locator('[data-testid="meli-buscar-categoria-input"]')
		await input.fill(TEXTO_BUSQUEDA)
		const busqueda = esperar_predictor(page, TEXTO_BUSQUEDA)
		await page.locator('[data-testid="meli-buscar-categoria-btn"]').click()
		await predictor_ok(await busqueda)

		const resultados = page.locator('[data-testid="meli-resultado-busqueda"]')
		await expect(resultados.first()).toBeVisible()
		const nueva = await elegir_categoria(page, resultados.first())
		expect(nueva.id, 'la busqueda tenia que llevar a otra categoria').not.toBe(contexto.categoria.id)

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes(`/article/${id}`) && res.request().method() === 'PUT'),
			page.locator('[data-testid="btn-guardar-article"]').click(),
		])
		const enviado = respuesta.request().postDataJSON()
		expect(enviado.meli_category_id).toBe(nueva.id)
		// Al cambiar de categoria los datos de la anterior no sirven: viaja la lista (vacia o con lo
		// de la nueva) para que la API reemplace los atributos y aplique el cambio.
		expect(Array.isArray(enviado.meli_attributes), 'cambiar de categoria tiene que mandar meli_attributes').toBeTruthy()
		// Y lo completado para la categoria ANTERIOR no viaja: no le sirve a la nueva.
		Object.keys(contexto.completados).forEach(id_viejo => {
			const viajo = enviado.meli_attributes.find(item => String(item.meli_attribute_id) === String(id_viejo))
			expect(viajo, `el atributo ${id_viejo} de la categoria anterior viajo con la nueva`).toBeFalsy()
		})

		const cuerpo = await respuesta.json()
		expect(respuesta.ok(), `guardar el articulo fallo: ${cuerpo.message || respuesta.status()}`).toBeTruthy()
		expect(String(cuerpo.model.meli_category_id), 'la API no aplico el cambio de categoria').toBe(String(nueva.id))
	})

	test('ver todas recorre el arbol hasta la ultima categoria de una rama y la deja usar', async ({ page }) => {
		await abrir_alta_de_articulo(page)
		await abrir_pestania(page, 'article', 'Mercado Libre')

		const raiz = page.waitForResponse(
			res => res.url().includes('/meli-category-children') && res.request().method() === 'GET',
			{ timeout: 60000 }
		)
		await page.locator('[data-testid="meli-modo-explorar"]').click()
		expect((await raiz).ok(), 'el arbol de categorias no cargo').toBeTruthy()

		const usar = page.locator('[data-testid="meli-usar-categoria-del-arbol"]')
		const hijas = page.locator('[data-testid="meli-categoria-del-arbol"]')
		await expect(hijas.first()).toBeVisible()

		// Se baja siempre por la primera rama hasta que aparece "Usar esta categoria".
		//
		// 🔴 Cada nivel se espera dos veces: la RESPUESTA y el REDIBUJO. waitForResponse vuelve cuando
		//    llega el JSON, no cuando Vue pinto el nivel nuevo; decidir ahi mismo con isVisible() leia
		//    el nivel viejo (volvia a clickear la misma hija, o esperaba 4 minutos una hija que en la
		//    hoja ya no existe). La señal del redibujo es la ultima miga, que pasa a ser la hija
		//    clickeada; y recien despues se mira si hay "Usar esta categoria" u otra hija para seguir.
		let niveles = 0
		while (niveles < MAXIMO_DE_NIVELES) {
			await expect(usar.or(hijas.first())).toBeVisible()
			if (await usar.isVisible()) {
				break
			}
			const nombre_de_la_hija = (await hijas.first().innerText()).trim()
			const nivel = page.waitForResponse(
				res => res.url().includes('/meli-category-children/') && res.request().method() === 'GET',
				{ timeout: 60000 }
			)
			await hijas.first().click()
			expect((await nivel).ok()).toBeTruthy()
			await expect(page.locator('[data-testid="meli-arbol-actual"]')).toHaveText(nombre_de_la_hija)
			niveles++
		}

		await expect(usar, `no se llego a una ultima categoria en ${MAXIMO_DE_NIVELES} niveles`).toBeVisible()
		await elegir_categoria(page, usar)
		await expect(page.locator('[data-testid="meli-atributos"]')).toBeVisible()
		console.log(`[meli] arbol: ultima categoria a ${niveles} niveles de la raiz`)
	})
})
