// Vender no guarda sin lista de precios cuando la cuenta vende con listas.
//
// Nace de la mision vender-lista-obligatoria (17/9/2026). En Trama --cuenta con
// `users.listas_de_precio = 1`, donde el precio base es costo + IVA y todo el margen vive en las
// listas-- se midieron 24 ventas en 60 dias a costo, siete de ellas seguidas el 10/9 en la misma
// sesion: el catalogo de listas no habia llegado al arrancar, la primera venta que se limpio
// arrastro el null a las siguientes y el selector, que solo se dibujaba si habia lista, desaparecio.
//
// ── Que afirma ───────────────────────────────────────────────────────────────────────────────
//
//  (a) Al entrar a Vender con una cuenta con listas, el selector "Lista de precios" se ve y trae
//      elegida la lista por defecto: la de mayor `position`, y a igual position la de id mas alto
//      (mismo criterio que ArticlePricesHelper::resolver_precio_de_venta() del back).
//  (b) Guardada una venta, la venta SIGUIENTE sigue con esa lista: limpiar el remito no la pierde.
//  (c) Con el catalogo de listas vacio (GET /api/price-type interceptado a `{models: []}`), el
//      selector se ve VACIO, guardar frena con el aviso y NO sale ningun POST a /api/sale.
//  (d) Editar una venta que quedo sin lista muestra la lista por defecto, deshabilitada.
//
// ── De que fixture depende ───────────────────────────────────────────────────────────────────
//
// De la cuenta de TestingImportListasSeeder (empresa-api, doc 5678 / clave 1234): es la UNICA
// cuenta del fixture con `listas_de_precio = 1` --la ferreteria de auth.setup.js vende a precio
// unico y su suite entera lo asume, ver el comentario de ese seeder--. Trae las listas Mayorista
// (position 1) y Minorista (position 2), y las sucursales 'Sucursal Centro' y 'Sucursal Norte'.
// Si el login falla, correr en empresa-api:
//
//     php artisan db:seed --class="Database\Seeders\testing\TestingImportListasSeeder" --env=testing --force
//
// Si la cuenta esta pero sin el flag (alguien lo apago a mano), el spec se SALTEA entero con el
// motivo en pantalla: volver a correr el seeder lo prende de nuevo.
//
// Lo que este archivo crea y deja en esa cuenta: un articulo propio por corrida (`zz Lista e2e
// <sufijo>`, para no depender de los de la importacion, que solo existen si esa exploracion corrio
// antes) y dos ventas de mostrador. Es un tenant de exploracion; ningun otro spec cuenta filas ahi.
//
// ── Trampas que ya costaron una corrida (o que este archivo esquiva a proposito) ─────────────
//
// 🔴 Este spec NO usa el storageState de la ferreteria: pisa la sesion con storageState vacio y
//    loguea a mano con la cuenta de listas. Sin eso estaria midiendo la cuenta equivocada.
// 🔴 (d) necesita una venta SIN lista en una cuenta que YA no deja guardar sin lista --ni por la
//    interfaz ni por la API (POST y PUT contestan 422)--. La unica forma limpia de fabricarla es
//    venderla con una lista TEMPORAL y borrar esa lista despues: la venta queda con un
//    price_type_id colgado, `sale.price_type` vuelve null, y eso es exactamente "una venta sin
//    lista" para el front. Crear la lista dispara en el back el recalculo masivo de precios de la
//    cuenta (PriceTypeController::store -> ProcessSetFinalPrices, en la cola); es inocuo, los
//    insumos son los mismos, y borrar la lista detacha sus pivotes.
// 🔴 La sucursal FRENA el guardado si no se elige, sin error visible (ver
//    circuito-venta-contado.spec.js). Esta cuenta tiene dos, asi que se elige siempre.
// 🔴 El aviso de (c) es un toast de vue-toast-notification (`.v-toast__item`). Se lo busca por el
//    fragmento "listas de precios" y no por el texto entero: el texto es de la interfaz y cambia.
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { completar_campo, crear_desde_buscador, abrir_pestania } = require('../helpers/formulario')
const { aislar_broadcasts } = require('../helpers/entorno')
const {
	abrir_vender,
	agregar_articulo,
	elegir_opcion_que_contenga,
	abrir_modulo_del_dia,
} = require('../helpers/vender')

// 🔴 Sesion propia COMPARTIDA entre los tests del serial, igual que en
// exploracion-importacion-listas-stock.spec.js: `test.use({ storageState })` abriria un contexto
// nuevo por test, SIN la sesion que consiguio el login del primero.
let page

test.beforeAll(async ({ browser }) => {
	// 🔴 El storageState VACIO es explicito: browser.newContext() hereda el del proyecto, que es
	// la sesion de la ferreteria que dejo auth.setup.js. Sin esta linea el login nunca aparece.
	const contexto_navegador = await browser.newContext({ storageState: { cookies: [], origins: [] } })
	page = await contexto_navegador.newPage()
	await aislar_broadcasts(page)
})

test.afterAll(async () => {
	if (page) {
		await page.context().close()
	}
})

// ── Datos de entrada ─────────────────────────────────────────────────────────────────────────

const DOC_LISTAS = process.env.E2E_DOC_LISTAS || '5678'
const CLAVE_LISTAS = process.env.E2E_PASSWORD_LISTAS || '1234'

/** Sucursal del fixture. Sin sucursal elegida la venta no se guarda. */
const SUCURSAL = 'Sucursal Centro'

/** Identificador de ESTA corrida: el articulo y la lista temporal lo llevan en el nombre. */
const SUFIJO = String(Date.now())
/** El articulo que se vende. Sin caracteres especiales: el buscador no los tipea bien. */
const ARTICULO = 'zz Lista e2e ' + SUFIJO
const COSTO = 1000
const CANTIDAD = 2
/** La lista que se crea y se borra para fabricar la venta sin lista de (d). */
const LISTA_TEMPORAL = 'zz Lista temporal e2e ' + SUFIJO

/** Fragmento del aviso de chequeos/price_type.js (MENSAJE_SIN_LISTA_DE_PRECIOS). */
const FRAGMENTO_DEL_AVISO = 'listas de precios'

/** El selector de lista de Vender (price-type/Index.vue). */
const SELECTOR = '[data-testid="venta-lista-de-precios"]'

// ── Estado compartido entre los tests seriales ───────────────────────────────────────────────

const contexto = {
	/** Motivo para saltear la suite entera, o null si se corre. */
	saltear: null,
	/** Origin de la API, capturado del propio login de la SPA. */
	api: null,
	/** El catalogo de listas de la cuenta, tal cual lo devolvio la API. */
	listas: [],
	/** La lista que Vender tiene que elegir sola: mayor position, desempate por id mas alto. */
	lista_por_defecto: null,
	/** Id del articulo creado para esta corrida. */
	articulo_id: null,
	/** La lista temporal de (d), tal cual la devolvio el POST. */
	lista_temporal: null,
	/** La venta de (d), guardada con la lista temporal. */
	venta_sin_lista: null,
}

test.beforeEach(async () => {
	test.skip(contexto.saltear !== null, contexto.saltear || '')
})

// ── Helpers de este archivo ──────────────────────────────────────────────────────────────────

/**
 * Pedido a la API con la sesion de la pagina: mismo camino y mismas cookies que usa la SPA.
 *
 * Se hace desde adentro de la pagina (y no con page.request) para que viaje el Referer de la
 * SPA, que es lo que hace que Sanctum trate al pedido como stateful y use la sesion. `api/*`
 * esta excluido de la verificacion CSRF (VerifyCsrfToken::$except), asi que no hace falta token.
 *
 * @param {string} metodo GET, POST, DELETE.
 * @param {string} ruta Relativa a /api, sin barra inicial.
 * @param {Object|null} [data]
 * @returns {Promise<{ok: boolean, status: number, cuerpo: any}>}
 */
async function api(metodo, ruta, data = null) {
	return page.evaluate(async ({ api, metodo, ruta, data }) => {
		const headers = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
		if (data) {
			headers['Content-Type'] = 'application/json'
		}
		const r = await fetch(api + '/api/' + ruta, {
			method: metodo,
			credentials: 'include',
			headers,
			body: data ? JSON.stringify(data) : undefined,
		})
		let cuerpo = null
		try {
			cuerpo = await r.json()
		} catch (error) {
			cuerpo = null
		}
		return { ok: r.ok, status: r.status, cuerpo }
	}, { api: contexto.api, metodo, ruta, data })
}

/**
 * La misma regla que resolver_lista_por_defecto() del front y resolver_precio_de_venta() del
 * back: se calcula ACA, sobre el catalogo real, en vez de hardcodear "Minorista". Asi el spec no
 * se rompe si alguien agrega una lista al fixture, y sigue afirmando lo que importa: que Vender
 * elige la misma que elegiria el back.
 *
 * @param {Array<Object>} listas
 * @returns {Object|null}
 */
function lista_por_defecto_segun_el_criterio(listas) {
	let elegida = null

	for (const lista of listas) {
		const position = lista.position === null || typeof lista.position === 'undefined' ? 0 : Number(lista.position)

		if (elegida === null) {
			elegida = lista
			continue
		}

		const position_elegida = elegida.position === null || typeof elegida.position === 'undefined' ? 0 : Number(elegida.position)

		if (position > position_elegida || (position === position_elegida && Number(lista.id) > Number(elegida.id))) {
			elegida = lista
		}
	}

	return elegida
}

/**
 * Lo que el selector de lista tiene elegido: `{ value, text }`, o `{ value: null, text: '' }` si
 * esta vacio (selectedIndex -1, que es como se ve una venta sin lista desde esta mision).
 *
 * @returns {Promise<{value: string|null, text: string}>}
 */
async function lista_elegida_en_el_selector() {
	return page.locator(SELECTOR).evaluate(select => {
		if (select.selectedIndex < 0) {
			return { value: null, text: '' }
		}
		const opcion = select.options[select.selectedIndex]
		return { value: opcion.value, text: opcion.text }
	})
}

/**
 * Espera a que el selector tenga elegida la lista pedida. Se reintenta porque el selector espeja
 * el store por un watch (y por un setTimeout de 500 ms al montarse): leerlo al toque puede
 * agarrar el instante anterior.
 *
 * @param {Object} lista
 * @param {string} motivo Para el mensaje del rojo.
 * @returns {Promise<void>}
 */
async function esperar_lista_elegida(lista, motivo) {
	await expect(page.locator(SELECTOR), 'el selector "Lista de precios" tenia que estar visible').toBeVisible()

	await expect(async () => {
		const elegida = await lista_elegida_en_el_selector()
		expect(
			String(elegida.value),
			`${motivo}: el selector tenia que tener elegida "${lista.name}" (id ${lista.id}) y tiene "${elegida.text}"`
		).toBe(String(lista.id))
	}).toPass({ timeout: 15000 })
}

/**
 * Elige una opcion de un select SOLO si la ofrece. Para el metodo de pago: esta cuenta puede no
 * tener ninguno cargado, y una venta de mostrador se guarda igual sin el.
 *
 * @param {string} testid
 * @param {string} texto
 * @returns {Promise<boolean>} si se eligio.
 */
async function elegir_si_ofrece(testid, texto) {
	const select = page.locator(`[data-testid="${testid}"]`)

	if (await select.count() === 0) {
		return false
	}

	const ofrece = await select.evaluate((elemento, buscado) => {
		return [...elemento.options].some(o => o.text.includes(buscado))
	}, texto)

	if (!ofrece) {
		return false
	}

	await elegir_opcion_que_contenga(page, testid, texto)
	return true
}

/**
 * Arma una venta de mostrador con el articulo de la corrida: entra a Vender, agrega el articulo y
 * elige la sucursal (y el metodo de pago si hay). No la guarda: cada test guarda a su manera.
 *
 * @returns {Promise<void>}
 */
async function armar_venta_de_mostrador() {
	await abrir_vender(page)
	await agregar_articulo(page, ARTICULO, contexto.articulo_id, CANTIDAD)
	await elegir_opcion_que_contenga(page, 'venta-sucursal', SUCURSAL)
	await elegir_si_ofrece('venta-metodo-pago', 'Efectivo')
}

/**
 * Guarda lo que haya en Vender esperando el POST de la venta, y devuelve el modelo que contesto
 * el servidor.
 *
 * @returns {Promise<Object>}
 */
async function guardar_venta() {
	const [respuesta] = await Promise.all([
		page.waitForResponse(res => /\/api\/sale(\?|$)/.test(res.url()) && res.request().method() === 'POST'),
		page.locator('[data-testid="btn-guardar-venta"]').click(),
	])

	expect(respuesta.ok(), `el POST de la venta no salio bien (status ${respuesta.status()})`).toBeTruthy()

	const cuerpo = await respuesta.json()
	expect(cuerpo.model && cuerpo.model.id, 'el POST de la venta no devolvio un modelo con id').toBeTruthy()

	return cuerpo.model
}

/**
 * Clickea algo que tiene que abrir un modal de ModelForm, REINTENTANDO hasta que el modal exista
 * (el `show()` de BootstrapVue es un no-op silencioso si el chunk del modal no llego; ver
 * circuito-listado.spec.js).
 *
 * @param {string} testid
 * @param {string} model_name
 * @returns {Promise<void>}
 */
async function abrir_modal_con(testid, model_name) {
	const modal = page.locator(`#${model_name}___BV_modal_outer_`)

	await expect(async () => {
		await page.locator(`[data-testid="${testid}"]`).click()
		await expect(modal).toBeAttached({ timeout: 3000 })
	}).toPass({ timeout: 30000 })
}

/**
 * Carga la venta guardada en Vender para editarla: fila del listado del dia -> "Actualizar venta".
 * Mismo camino que circuito-presupuesto.spec.js.
 *
 * @param {number|string} venta_id
 * @returns {Promise<void>}
 */
async function abrir_venta_para_editar(venta_id) {
	await abrir_modulo_del_dia(page, '/ventas/todas', { solapa: SUCURSAL })

	// El modo seleccion tiene que estar apagado para que el click abra la venta.
	const modo_seleccion = page.locator('[data-testid="btn-modo-seleccion"]')
	await expect(modo_seleccion).toBeVisible()

	if (await modo_seleccion.getAttribute('data-activo') === 'si') {
		await modo_seleccion.click()
	}

	await page.locator(`[data-testid="sale-row-${venta_id}"]`).click()

	const btn = page.locator('[data-testid="btn-actualizar-venta"]')
	await expect(btn, 'el modal de la venta tenia que ofrecer "Actualizar venta"').toBeVisible()
	await btn.click()

	await expect(
		page.locator(`[data-testid="venta-item-cantidad-${contexto.articulo_id}"]`),
		'la venta tenia que quedar cargada en Vender'
	).toBeVisible()
}

// ─────────────────────────────────────────────────────────────────────────────────────────────

test.describe.serial('Vender: la lista de precios es obligatoria en una cuenta con listas', () => {

	test('login con la cuenta de listas, linea de base y articulo propio', async () => {
		await page.goto('/login')

		const [login] = await Promise.all([
			page.waitForResponse(r => r.url().includes('/login') && r.request().method() === 'POST', { timeout: 30000 }),
			(async () => {
				await completar_campo(page, 'login-doc-number', DOC_LISTAS)
				await completar_campo(page, 'login-password', CLAVE_LISTAS)
				await page.locator('[data-testid="login-submit"]').click()
			})(),
		])

		expect(login.ok(), 'el login de la cuenta de listas fallo: ¿corriste TestingImportListasSeeder?').toBeTruthy()
		contexto.api = new URL(login.url()).origin

		await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 })
		await esperar_recursos_descargados(page, { abrir_panel: false })

		// El flag que hace que esta suite tenga sentido, leido del store de la SPA (es lo mismo
		// que mira requiere_lista_de_precios() en el front).
		const listas_de_precio = await page.evaluate(() => {
			const raiz = document.querySelector('#app')
			const user = raiz && raiz.__vue__ && raiz.__vue__.$store ? raiz.__vue__.$store.state.auth.user : null
			return user ? user.listas_de_precio : null
		})

		if (!(listas_de_precio === 1 || listas_de_precio === true || listas_de_precio === '1')) {
			contexto.saltear = `la cuenta ${DOC_LISTAS} no tiene users.listas_de_precio = 1: volve a correr TestingImportListasSeeder en empresa-api, que lo prende siempre`
			test.skip(true, contexto.saltear)
		}

		// Linea de base: el catalogo de listas, y cual tiene que elegir Vender sola.
		const listas = await api('GET', 'price-type')
		contexto.listas = (listas.cuerpo && listas.cuerpo.models) ? listas.cuerpo.models : []

		expect(contexto.listas.length, 'la cuenta tenia que tener listas de precios').toBeGreaterThan(0)
		expect(contexto.listas.some(l => l.name === 'Mayorista'), 'falta la lista Mayorista del fixture').toBeTruthy()
		expect(contexto.listas.some(l => l.name === 'Minorista'), 'falta la lista Minorista del fixture').toBeTruthy()

		contexto.lista_por_defecto = lista_por_defecto_segun_el_criterio(contexto.listas)
		console.log(`[lista] por defecto segun el criterio: "${contexto.lista_por_defecto.name}" (id ${contexto.lista_por_defecto.id}, position ${contexto.lista_por_defecto.position})`)

		// El articulo de la corrida, por el listado (mismo camino que circuito-listado.spec.js).
		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })
		await abrir_modal_con('btn-crear-article', 'article')

		// 🔴 El nombre de un articulo nuevo es un BUSCADOR, con dos Enter: ver crear_desde_buscador.
		await crear_desde_buscador(page, 'article-name', ARTICULO)

		// El costo vive en la pestaña "Precio": ModelForm solo renderiza el grupo activo.
		await abrir_pestania(page, 'article', 'Precio')
		await completar_campo(page, 'article-cost', COSTO)

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => /\/api\/article(\?|$)/.test(res.url()) && res.request().method() === 'POST'),
			page.locator('[data-testid="btn-guardar-article"]').click(),
		])
		expect(respuesta.ok(), 'el POST del articulo no salio bien').toBeTruthy()

		const cuerpo = await respuesta.json()
		contexto.articulo_id = cuerpo.model ? String(cuerpo.model.id) : null
		expect(contexto.articulo_id, 'el POST del articulo no devolvio un modelo con id').not.toBeNull()

		console.log(`[lista] articulo creado: ${ARTICULO} (id ${contexto.articulo_id})`)
	})

	test('(a) al entrar a Vender el selector muestra la lista por defecto', async () => {
		await abrir_vender(page)

		await esperar_lista_elegida(contexto.lista_por_defecto, 'al entrar a Vender')
	})

	test('(b) guardada una venta con lista, la siguiente sigue con lista', async () => {
		await armar_venta_de_mostrador()
		await esperar_lista_elegida(contexto.lista_por_defecto, 'antes de guardar')

		const venta = await guardar_venta()

		expect(
			String(venta.price_type_id),
			'la venta tenia que guardarse con la lista por defecto'
		).toBe(String(contexto.lista_por_defecto.id))

		console.log(`[lista] venta N° ${venta.num} (id ${venta.id}) con la lista ${venta.price_type_id}`)

		// Guardar limpia el remito (limpiar_vender). Hasta esta mision, ese par setPriceType(null)
		// + setPriceType() podia dejar la venta siguiente sin lista; ahora la conserva.
		await esperar_lista_elegida(contexto.lista_por_defecto, 'en la venta siguiente, recien limpiada')
	})

	test('(c) sin catalogo de listas, guardar frena con el aviso y no sale ningun POST', async () => {
		// El catalogo vacio, como si la request del arranque no hubiera traido nada. Predicado y no
		// glob, para no agarrar de paso /api/price-type-surchage.
		const es_el_catalogo = url => /\/api\/price-type(\?|$)/.test(url.href)

		await page.route(es_el_catalogo, route => route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ models: [] }),
		}))

		/** Los POST a /api/sale que salgan mientras dura el test. Tienen que ser cero. */
		const posts = []
		const escuchar = request => {
			if (request.method() === 'POST' && /\/api\/sale(\?|$)/.test(request.url())) {
				posts.push(request.url())
			}
		}
		page.on('request', escuchar)

		try {
			// Carga entera de la pagina: el catalogo baja en el arranque, y ahi lo agarra la ruta.
			await armar_venta_de_mostrador()

			// El selector tiene que verse igual, VACIO: es la señal de que falta la lista. Antes de
			// esta mision el grupo entero desaparecia.
			await expect(page.locator(SELECTOR), 'el selector tenia que verse aunque no haya lista').toBeVisible()
			const elegida = await lista_elegida_en_el_selector()
			expect(elegida.value, `con el catalogo vacio el selector no podia tener nada elegido y tiene "${elegida.text}"`).toBeNull()

			await page.locator('[data-testid="btn-guardar-venta"]').click()

			await expect(
				page.locator('.v-toast__item').filter({ hasText: FRAGMENTO_DEL_AVISO }).first(),
				'guardar sin lista tenia que frenar con el aviso de listas de precios'
			).toBeVisible({ timeout: 10000 })

			// Espera deliberada y no un poll: lo que se afirma es una AUSENCIA sostenida (que ningun
			// POST salga despues del click), y eso no tiene condicion positiva que esperar.
			await page.waitForTimeout(1500)

			expect(posts, 'no tenia que salir ningun POST a /api/sale').toEqual([])
		} finally {
			page.off('request', escuchar)
			await page.unroute(es_el_catalogo)
		}
	})

	test('(d) editar una venta sin lista muestra la lista por defecto, deshabilitada', async () => {
		// Varias navegaciones y una cola de por medio (ver el encabezado): presupuesto propio.
		test.setTimeout(420000)

		// 1. La lista temporal. position 0 para que nunca sea la lista por defecto.
		const creada = await api('POST', 'price-type', {
			name: LISTA_TEMPORAL,
			percentage: 10,
			position: 0,
			ocultar_al_publico: 0,
			incluir_en_lista_de_precios_de_excel: 0,
			setear_precio_final: 0,
			se_usa_en_tienda_nube: 0,
			se_usa_en_ml: 0,
			update_existing_articles_percentage_mode: 'none',
			categories: [],
			sub_categories: [],
		})
		expect(creada.ok && creada.cuerpo && creada.cuerpo.model, `no se pudo crear la lista temporal (status ${creada.status})`).toBeTruthy()
		contexto.lista_temporal = creada.cuerpo.model
		console.log(`[lista] lista temporal "${LISTA_TEMPORAL}" (id ${contexto.lista_temporal.id})`)

		// 2. Una venta con esa lista. abrir_vender() recarga la pagina, que es lo que hace que el
		//    catalogo traiga la lista nueva (el broadcast esta aislado en el harness).
		await armar_venta_de_mostrador()
		await esperar_lista_elegida(contexto.lista_por_defecto, 'antes de cambiar a la lista temporal')
		await page.locator(SELECTOR).selectOption(String(contexto.lista_temporal.id))
		await esperar_lista_elegida(contexto.lista_temporal, 'despues de elegirla a mano')

		contexto.venta_sin_lista = await guardar_venta()
		expect(
			String(contexto.venta_sin_lista.price_type_id),
			'la venta tenia que guardarse con la lista temporal'
		).toBe(String(contexto.lista_temporal.id))

		// 3. Se borra la lista: la venta queda con un price_type_id colgado, o sea sin lista.
		const borrada = await api('DELETE', 'price-type/' + contexto.lista_temporal.id)
		expect(borrada.ok, `no se pudo borrar la lista temporal (status ${borrada.status})`).toBeTruthy()

		// 4. Editarla: la lista que se ve es la por defecto del comercio, y no se puede cambiar.
		await abrir_venta_para_editar(contexto.venta_sin_lista.id)

		await esperar_lista_elegida(contexto.lista_por_defecto, 'editando una venta que quedo sin lista')
		await expect(
			page.locator(SELECTOR),
			'editando un comprobante guardado la lista no se puede cambiar'
		).toBeDisabled()

		console.log(`[lista] venta N° ${contexto.venta_sin_lista.num} sin lista: en edicion muestra "${contexto.lista_por_defecto.name}"`)
	})
})
