// Exploracion de depositos (3/9/2026) — parte 2: sugerencias de stock con IA.
//
// Que afirma este archivo, todo predicho a mano ANTES de tocar la interfaz (los numeros estan
// derivados de CoberturaService y StockSuggestionService, no de correr el sistema):
//
//   I4 — La cobertura es stock_destino ÷ velocidad, y la velocidad es LOCAL a la sucursal
//        destino: unidades vendidas en esa sucursal en los ultimos 90 dias ÷ 90 (sin historia
//        interanual en esta base). Con una venta de 3 unidades en EXP Norte y stock destino 1:
//        velocidad = 3/90 = 0.0333, cobertura = round(1 / (3/90), 2) = 30.00 dias.
//        La cantidad sugerida respeta el limite del origen: needed = min 6 − stock 1 = 5, pero
//        el origen (Principal, sin minimo → limite 0) solo tiene 3 → se sugieren 3.
//
//   I3 (defecto de producto, verificado contra el codigo) — Un deposito con min/max definidos
//        pero SIN stock cargado queda con address_article.amount = NULL (asi lo deja
//        UpdateAddressesStockHelper::set_stock_min_max cuando el operador completa Min/Max y
//        deja Stock vacio — camino natural para una sucursal nueva), y
//        StockSuggestionService::build_suggestions_for_article() SALTEA los pivots con amount
//        NULL (linea ~84: continue): ese deposito no genera deficit NI puede ser origen. El
//        caso de uso "definile minimo a la sucursal nueva para que el sistema le mande stock"
//        falla en silencio. Este test FIJA el comportamiento real (el articulo no aparece): el
//        dia que se arregle, la asercion de I3 se pone roja — invertirla y cerrar el hallazgo.
//
//   I4.b — "Crear movimientos de deposito" desde la sugerencia crea UN DepositMovement por par
//        origen/destino, en estado "En proceso" (1), y NO mueve stock hasta que se reciba
//        (mismo mecanismo verificado en exploracion-depositos-movimiento-por-estado.spec.js).
//
//   I4.c — Sin credenciales de IA en la cuenta (la base de testing no tiene ANTHROPIC_API_KEY),
//        la sugerencia termina completa igual: resumen_ia_estado queda null y el bloque del
//        resumen NO se dibuja (ni spinner ni error) — la IA solo redacta, nunca calcula.
//
// Requisitos: extension `sugerencias_inteligentes` activa para el usuario (si no esta, el test
// se saltea con aviso), sucursal "Principal" del fixture, y la config de columnas del listado
// guardada al menos una vez (sin eso el boton verde de stock no existe — hallazgo #1 de esta
// exploracion). Los articulos son propios de la corrida (sufijo por timestamp); la sucursal
// "EXP Norte" se crea si falta y se reusa. La caja "Caja Efectivo" tiene que estar abierta
// (la deja abierta el fixture; los circuitos de venta ya dependen de lo mismo).
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { completar_campo, abrir_pestania, crear_desde_buscador } = require('../helpers/formulario')
const { buscar_articulo, abrir_vender, agregar_articulo, elegir_opcion_que_contenga } = require('../helpers/vender')

/** Sucursal del fixture: origen de los traslados. */
const PRINCIPAL = 'Principal'
/** Sucursal propia de la exploracion: destino. */
const NORTE = 'EXP Norte'
/** Metodo de pago y caja de la venta que le da velocidad al articulo (mismos que los circuitos). */
const METODO_PAGO = 'Efectivo'
const CAJA = 'Caja Efectivo'

/** Unidades vendidas en EXP Norte (la velocidad sale de aca: 3/90 por dia). */
const UNIDADES_VENDIDAS = 3

const contexto = {
	sufijo: String(Date.now()),
	api: null,
	arts: {},
	norte_id: null,
	principal_id: null,
	/** id de la sugerencia generada */
	sugerencia_id: null,
	/** lineas de la sugerencia que son de MIS articulos, leidas por API */
	mis_lineas: null,
}

// ── Helpers de API (fetch con la sesion del navegador) — copiados a proposito del spec de
// movimientos: cada spec tiene que poder leerse solo (convencion del harness). ──────────────

async function api_get(page, ruta) {
	return page.evaluate(async ({ api, ruta }) => {
		const r = await fetch(api + '/api/' + ruta, {
			credentials: 'include',
			headers: { Accept: 'application/json' },
		})
		if (!r.ok) return { __error: r.status }
		return r.json()
	}, { api: contexto.api, ruta })
}

/** Pivots de un articulo como mapa address_id -> {amount, stock_min, stock_max}, mas el global. */
async function foto_stock(page, article_id) {
	const res = await api_get(page, 'article/' + article_id)
	expect(res.__error, 'no se pudo leer el articulo ' + article_id).toBeUndefined()
	const pivots = {}
	for (const a of (res.model.addresses || [])) {
		pivots[a.id] = {
			amount: a.pivot.amount === null ? null : Number(a.pivot.amount),
			stock_min: a.pivot.stock_min === null ? null : Number(a.pivot.stock_min),
			stock_max: a.pivot.stock_max === null ? null : Number(a.pivot.stock_max),
		}
	}
	return { global: res.model.stock === null ? null : Number(res.model.stock), pivots }
}

/** Entra al listado con todo cargado. */
async function abrir_listado(page) {
	await page.goto('/listado-de-articulos')
	await esperar_recursos_descargados(page, { abrir_panel: false })
	await page.locator('tbody tr').first().waitFor({ timeout: 90000 })
}

/**
 * Deja visible la fila del articulo sin pagar la busqueda global (los articulos de la corrida
 * son los mas nuevos: el listado por defecto los tiene en la primera pagina). Buscar solo si
 * hace falta — la busqueda con la maquina cargada puede tardar >60s (colgo una corrida el 3/9).
 */
async function posicionar_fila(page, id, nombre) {
	const fila = page.locator(`[data-testid="article-row-${id}"]`)
	if (await fila.count()) {
		await fila.scrollIntoViewIfNeeded()
		return
	}
	await buscar_articulo(page, nombre)
}

/**
 * Seteo directo de stock por sucursal con el boton verde (mismas trampas documentadas en el
 * spec de movimientos: fill con verificacion y reintento porque un re-render puede pisar el
 * valor tipeado sin error, y espera al cierre real de la edicion).
 */
async function setear_stock_directo(page, article_id, valores) {
	const fila = page.locator(`[data-testid="article-row-${article_id}"]`)

	// 🔴 La apertura del inline se REINTENTA entera: el boton verde pushea las sucursales
	// faltantes al objeto article de la fila, y si la fila re-renderiza en el medio (un reload
	// tardio del listado) el objeto nuevo llega sin ese push y los inputs no montan — quedan
	// los prepends Stock/Min/Max pelados, sin textbox adentro (medido el 3/9/2026: pasaba o no
	// segun el timing). Cancelar y reabrir re-pushea sobre el objeto vigente.
	await expect(async () => {
		const editar = fila.locator('[dusk="btn_editar_depositos"]')
		if (await editar.isVisible().catch(() => false)) {
			await editar.click()
		}
		for (const address_id of Object.keys(valores)) {
			await expect(fila.locator(`#input-address-stock-${address_id}`)).toBeVisible({ timeout: 4000 })
		}
	}).toPass({ timeout: 60000 })

	for (const [address_id, v] of Object.entries(valores)) {
		const bloque = fila.locator('.cont-inputs-stock').filter({
			has: page.locator(`#input-address-stock-${address_id}`),
		})
		await expect(bloque, `no aparecio el bloque inline de la sucursal ${address_id}`).toBeVisible()

		const campos = [
			[v.stock, /^Stock/],
			[v.min, /^Min/],
			[v.max, /^Max/],
		]
		for (const [valor, patron] of campos) {
			if (valor === undefined) continue
			const input = bloque.locator('.input-group').filter({ hasText: patron }).locator('input')
			await expect(async () => {
				await input.fill(String(valor))
				await expect(input).toHaveValue(String(valor), { timeout: 1500 })
			}).toPass({ timeout: 45000 })
		}
	}

	// Ademas del PUT se espera el GET del reload de la fila (loadModel): si queda en vuelo,
	// aterriza en medio de la SIGUIENTE edicion y pisa lo tipeado (paso con la maquina lenta).
	const promesa_reload = page.waitForResponse(
		res => res.url().match(new RegExp('/article/' + article_id + '$')) && res.request().method() === 'GET',
		{ timeout: 60000 }
	).catch(() => null)
	const [respuesta] = await Promise.all([
		page.waitForResponse(res => res.url().includes('article-update-addresses') && res.request().method() === 'PUT'),
		fila.locator('[dusk="btn_guardar_depositos"]').click(),
	])
	expect(respuesta.ok(), 'el PUT de article-update-addresses fallo').toBeTruthy()
	await promesa_reload
	await expect(fila.locator('[dusk="btn_editar_depositos"]')).toBeVisible({ timeout: 15000 })
	await page.waitForTimeout(400)
}

test.describe.serial('exploracion depositos: sugerencias de stock', () => {

	test('preparacion: sucursal, tres articulos, stock y la venta que da velocidad', async ({ page }) => {
		test.setTimeout(420000)

		const promesa_api = page.waitForResponse(res => res.url().includes('/api/'), { timeout: 60000 })
		await page.goto('/listado-de-articulos')
		contexto.api = new URL((await promesa_api).url()).origin
		await esperar_recursos_descargados(page, { abrir_panel: false })

		// Sin la extension, la vista propia no existe: el resto del archivo no tiene que correr.
		const yo = await api_get(page, 'user')
		const extensiones = ((yo.user && yo.user.extencions) || []).map(e => e.slug)
		test.skip(!extensiones.includes('sugerencias_inteligentes'),
			'la cuenta no tiene la extension sugerencias_inteligentes: la vista de sugerencias no existe')

		// Sucursal EXP Norte: reusar o crear por interfaz.
		let res = await api_get(page, 'address')
		let norte = (res.models || []).find(a => a.street === NORTE)
		const principal = (res.models || []).find(a => a.street === PRINCIPAL)
		expect(principal, 'el fixture tenia que tener la sucursal Principal').toBeTruthy()
		contexto.principal_id = principal.id

		if (!norte) {
			await page.goto('/abm/sucursales')
			await esperar_recursos_descargados(page, { abrir_panel: false })
			await page.locator('[data-testid="btn-crear-address"]').click()
			await completar_campo(page, 'address-street', NORTE)
			const guardar = page.locator('.modal.show').last().getByRole('button', { name: /Guardar/ })
			const [respuesta] = await Promise.all([
				page.waitForResponse(r => r.url().match(/\/address$/) && r.request().method() === 'POST'),
				guardar.click(),
			])
			expect(respuesta.ok(), 'el POST de la sucursal fallo').toBeTruthy()
			res = await api_get(page, 'address')
			norte = (res.models || []).find(a => a.street === NORTE)
		}
		contexto.norte_id = norte.id

		// Tres articulos propios por el alta real del listado (nombre = buscador de dos Enter).
		await abrir_listado(page)
		for (const [clave, dato] of Object.entries({
			martillo: { nombre: `EXPS ${contexto.sufijo} Martillo`, costo: 1000 },
			pinza: { nombre: `EXPS ${contexto.sufijo} Pinza`, costo: 500 },
			fantasma: { nombre: `EXPS ${contexto.sufijo} Fantasma`, costo: 100 },
		})) {
			await page.locator('[data-testid="btn-crear-article"]').first().click()
			await crear_desde_buscador(page, 'article-name', dato.nombre)
			await abrir_pestania(page, 'article', 'Precio')
			await completar_campo(page, 'article-cost', dato.costo)
			const [respuesta] = await Promise.all([
				page.waitForResponse(r => r.url().match(/\/article$/) && r.request().method() === 'POST'),
				page.locator('[data-testid="btn-guardar-article"]').click(),
			])
			expect(respuesta.ok(), `el POST del articulo "${dato.nombre}" fallo`).toBeTruthy()
			const cuerpo = await respuesta.json()
			expect(cuerpo.model.name, 'el articulo tenia que guardar su nombre').toBe(dato.nombre)
			contexto.arts[clave] = { id: Number(cuerpo.model.id), nombre: dato.nombre }
			await page.waitForTimeout(600)
		}

		// El estado de stock que la prediccion pide (boton verde, dos pasadas por articulo):
		//   Martillo: Principal 3 (origen), EXP Norte 4 con min 6 / max 8 (la venta lo baja a 1).
		//   Pinza:    Principal 3, EXP Norte 9 con min 4 / max 6 (sin deficit: 9 >= 4).
		//   Fantasma: EXP Norte SOLO min 5 / max 9, stock vacio (pivot NULL — el caso I3).
		const m = contexto.arts.martillo
		const p = contexto.arts.pinza
		const f = contexto.arts.fantasma

		// Una sola pasada del inline por articulo, con las DOS sucursales juntas: dos pasadas
		// seguidas sobre la misma fila re-renderizan los inputs en el medio y el valor de la
		// sucursal no tocada puede viajar vacio (paso el 3/9/2026: Principal quedo en 0).
		await posicionar_fila(page, m.id, m.nombre)
		await setear_stock_directo(page, m.id, {
			[contexto.principal_id]: { stock: 3 },
			[contexto.norte_id]: { stock: 4, min: 6, max: 8 },
		})

		await posicionar_fila(page, p.id, p.nombre)
		await setear_stock_directo(page, p.id, {
			[contexto.principal_id]: { stock: 3 },
			[contexto.norte_id]: { stock: 9, min: 4, max: 6 },
		})

		await posicionar_fila(page, f.id, f.nombre)
		await setear_stock_directo(page, f.id, { [contexto.norte_id]: { min: 5, max: 9 } })

		// La foto que las cuentas de abajo asumen.
		const foto_m = await foto_stock(page, m.id)
		expect(foto_m.pivots[contexto.principal_id].amount, 'Martillo Principal tenia que quedar en 3').toBe(3)
		expect(foto_m.pivots[contexto.norte_id].amount, 'Martillo EXP Norte tenia que quedar en 4').toBe(4)
		const foto_f = await foto_stock(page, f.id)
		expect(foto_f.pivots[contexto.norte_id].amount, 'Fantasma EXP Norte tenia que quedar NULL').toBeNull()
		expect(foto_f.pivots[contexto.norte_id].stock_min, 'Fantasma EXP Norte tenia que tener min 5').toBe(5)

		// La venta que le da velocidad a Martillo en EXP Norte: 3 unidades, sucursal EXP Norte.
		await abrir_vender(page)
		await agregar_articulo(page, m.nombre, m.id, UNIDADES_VENDIDAS)
		await elegir_opcion_que_contenga(page, 'venta-sucursal', NORTE)
		await elegir_opcion_que_contenga(page, 'venta-metodo-pago', METODO_PAGO)
		await elegir_opcion_que_contenga(page, 'venta-caja', CAJA)
		const [respuesta_venta] = await Promise.all([
			page.waitForResponse(r => r.url().includes('/sale') && r.request().method() === 'POST'),
			page.locator('[data-testid="btn-guardar-venta"]').click(),
		])
		expect(respuesta_venta.ok(), 'el POST de la venta fallo').toBeTruthy()

		// La venta descuenta de la sucursal de la venta: Martillo EXP Norte 4 -> 1, global 7 -> 4.
		const tras_venta = await foto_stock(page, m.id)
		expect(tras_venta.pivots[contexto.norte_id].amount, 'la venta tenia que dejar EXP Norte de Martillo en 1')
			.toBe(4 - UNIDADES_VENDIDAS)
		expect(tras_venta.pivots[contexto.principal_id].amount, 'la venta no tenia que tocar Principal').toBe(3)
		expect(tras_venta.global, 'el global de Martillo tenia que quedar en 4').toBe(4)
	})

	test('I4: generar la sugerencia manual y esperar que termine', async ({ page }) => {
		test.setTimeout(300000)
		await page.goto('/sugerencias-de-stock')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		await page.locator('[data-testid="sugerencias-btn-nueva"]').click()
		await expect(page.locator('[data-testid="sugerencia-form-generar"]')).toBeVisible()

		// Los defaults del form son los de la prediccion: objetivo minimo, origen absoluto,
		// limite minimo. Se genera tal cual.
		const [respuesta] = await Promise.all([
			page.waitForResponse(r => r.url().match(/\/stock-suggestion$/) && r.request().method() === 'POST'),
			page.locator('[data-testid="sugerencia-form-generar"]').click(),
		])
		expect(respuesta.ok(), 'el POST de la sugerencia fallo').toBeTruthy()
		const cuerpo = await respuesta.json()
		contexto.sugerencia_id = cuerpo.model.id
		expect(cuerpo.model.modo, 'el modo default tenia que ser minimo').toBe('minimo')

		// El catalogo es chico (<= 500): el calculo corre inline y el POST ya vuelve con la
		// corrida despachada. La vista navega al detalle y pollea; a este spec le alcanza con
		// esperar el estado terminado en el badge.
		await page.goto('/sugerencias-de-stock/' + contexto.sugerencia_id)
		await esperar_recursos_descargados(page, { abrir_panel: false })
		await expect(page.locator('[data-testid="sugerencia-detalle-estado"]'))
			.toHaveAttribute('data-estado', 'terminado', { timeout: 90000 })
	})

	test('I4: la linea de Martillo tiene los numeros predichos; Pinza y Fantasma no aparecen (I3)', async ({ page }) => {
		test.setTimeout(300000)
		const m = contexto.arts.martillo
		const p = contexto.arts.pinza
		const f = contexto.arts.fantasma

		// Por API: TODAS las lineas de la sugerencia (per_page techo 500), filtradas a mis articulos.
		await page.goto('/sugerencias-de-stock/' + contexto.sugerencia_id)
		await esperar_recursos_descargados(page, { abrir_panel: false })
		const res = await api_get(page, 'stock-suggestion/' + contexto.sugerencia_id + '/articles?per_page=500')
		expect(res.__error, 'no se pudieron leer las lineas de la sugerencia').toBeUndefined()
		const lineas = res.models.data || []

		const de_martillo = lineas.filter(l => l.article_id === m.id)
		const de_pinza = lineas.filter(l => l.article_id === p.id)
		const de_fantasma = lineas.filter(l => l.article_id === f.id)

		// I3 — el defecto que este test fija: el deposito con min/max y amount NULL es invisible.
		expect(de_fantasma.length,
			'I3: Fantasma NO tenia que aparecer (min sin stock = pivot NULL, la sugerencia lo saltea — defecto conocido)').toBe(0)
		// Pinza esta por encima de su minimo en EXP Norte y Principal no tiene minimo: sin lineas.
		expect(de_pinza.length, 'Pinza no tenia que generar lineas (9 >= min 4)').toBe(0)

		// I4 — la linea de Martillo, con las cuentas hechas a mano:
		//   needed = 6 - 1 = 5; disponible en origen = 3 - 0 = 3; sugerido = min(5, 3) = 3.
		//   velocidad = 3 vendidas / 90 dias = 0.0333; cobertura = round(1 / (3/90), 2) = 30.
		expect(de_martillo.length, 'Martillo tenia que generar exactamente UNA linea').toBe(1)
		const linea = de_martillo[0]
		expect(linea.from_address_id, 'el origen tenia que ser Principal').toBe(contexto.principal_id)
		expect(linea.to_address_id, 'el destino tenia que ser EXP Norte').toBe(contexto.norte_id)
		expect(Number(linea.cantidad), 'la cantidad sugerida tenia que ser 3 (capada por el origen)').toBe(3)
		expect(Number(linea.stock_destino), 'el stock destino tenia que ser 1').toBe(1)
		expect(Number(linea.velocidad_diaria), 'la velocidad tenia que ser 0.0333 (3/90 redondeada a 4)').toBe(0.0333)
		expect(Number(linea.cobertura_dias), 'la cobertura tenia que ser 30 dias exactos').toBe(30)
		contexto.mis_lineas = { martillo: linea }

		// El ranking global: toda linea con cobertura no-null menor a 30 va antes que la de
		// Martillo, y toda linea con cobertura null va despues (sobre base acumulada puede haber
		// lineas de otros articulos: la asercion es sobre el ORDEN, no sobre el numero absoluto).
		const con_cobertura_menor = lineas.filter(l => l.cobertura_dias !== null && Number(l.cobertura_dias) < 30)
		const nulas = lineas.filter(l => l.cobertura_dias === null)
		for (const otra of con_cobertura_menor) {
			expect(Number(otra.prioridad), 'una linea mas urgente tenia que rankear antes que Martillo')
				.toBeLessThan(Number(linea.prioridad))
		}
		for (const nula of nulas) {
			expect(Number(nula.prioridad), 'una linea sin ventas (cobertura infinita) tenia que rankear despues')
				.toBeGreaterThan(Number(linea.prioridad))
		}

		// Y en PANTALLA: la fila de Martillo publica los numeros crudos en data-* y las celdas
		// los muestran formateados (velocidad 2 decimales "0,03"; cobertura 1 decimal "30,0").
		const fila = page.locator(`[data-testid="sugerencia-linea-${linea.stock_suggestion_article_id}"]`)
		// La fila puede estar en otra pagina del server-side paginado: se ordena por prioridad,
		// asi que si no esta visible en la primera, este chequeo visual se saltea sin fallar
		// (la verdad numerica ya quedo afirmada por API).
		if (await fila.count()) {
			// Los data-* llevan el valor CRUDO del backend, que para columnas decimales viene con
			// los decimales del tipo ("3.00"): se acepta el numero con o sin ceros.
			await expect(fila).toHaveAttribute('data-cantidad', /^3(\.0+)?$/)
			await expect(fila).toHaveAttribute('data-stock-destino', /^1(\.0+)?$/)
			await expect(fila).toHaveAttribute('data-cobertura', /^30(\.0+)?$/)
			await expect(fila.locator('td').nth(10), 'la venta diaria en pantalla').toContainText('0,03')
			await expect(fila.locator('td').nth(11), 'la cobertura en pantalla').toContainText('30')
		} else {
			console.log('[aviso] la fila de Martillo quedo en otra pagina del paginado: numeros ya verificados por API')
		}
	})

	test('I4.c: la sugerencia esta completa aunque la IA no escriba, y el bloque cuenta la verdad', async ({ page }) => {
		test.setTimeout(180000)
		await page.goto('/sugerencias-de-stock/' + contexto.sugerencia_id)
		await esperar_recursos_descargados(page, { abrir_panel: false })
		await expect(page.locator('[data-testid="sugerencia-detalle-estado"]'))
			.toHaveAttribute('data-estado', 'terminado', { timeout: 60000 })

		// La promesa central: la IA solo redacta, nunca calcula — la sugerencia queda 'terminado'
		// con su tabla completa pase lo que pase con el resumen. En una base SIN
		// ANTHROPIC_API_KEY el estado queda null y el bloque ni se dibuja; CON credenciales que
		// fallan (el caso real de esta base de testing el 3/9/2026: services.anthropic.api_key
		// seteada y el job fallo) el estado queda 'error' y el bloque muestra el aviso discreto
		// con su boton Reintentar. Los dos finales son legitimos; lo que NUNCA puede pasar es que
		// el resumen frene la sugerencia o que haya texto sin estado 'listo'.
		const res = await api_get(page, 'stock-suggestion/' + contexto.sugerencia_id)
		const estado_resumen = res.model.resumen_ia_estado
		expect(res.model.status, 'la sugerencia tenia que estar terminada, con o sin resumen').toBe('terminado')
		expect(['error', 'listo', null], 'el resumen solo puede quedar null (sin IA), listo o error')
			.toContain(estado_resumen)

		const bloque = page.locator('[data-testid="sugerencia-resumen-ia"]')
		if (estado_resumen === null) {
			expect(res.model.resumen_ia, 'sin credenciales no tenia que haber texto de resumen').toBeNull()
			await expect(bloque).toHaveAttribute('data-estado', 'sin-ia')
			await expect(bloque.locator('.card'), 'sin IA el bloque no dibuja ninguna card').toHaveCount(0)
		} else if (estado_resumen === 'error') {
			expect(res.model.resumen_ia, 'con el resumen fallado no tenia que haber texto').toBeNull()
			await expect(bloque).toHaveAttribute('data-estado', 'error')
			await expect(
				bloque.getByRole('button', { name: /Reintentar/ }),
				'el resumen fallado tenia que ofrecer su Reintentar'
			).toBeVisible()
		} else {
			expect(res.model.resumen_ia, 'con estado listo tenia que haber texto').not.toBeNull()
			await expect(bloque).toHaveAttribute('data-estado', 'listo')
		}
	})

	test('I4.b: crear movimientos desde la sugerencia deja un movimiento En proceso y stock intacto', async ({ page }) => {
		test.setTimeout(300000)
		const m = contexto.arts.martillo
		const linea = contexto.mis_lineas.martillo

		await page.goto('/sugerencias-de-stock/' + contexto.sugerencia_id)
		await esperar_recursos_descargados(page, { abrir_panel: false })
		await expect(page.locator('[data-testid="sugerencia-detalle-estado"]'))
			.toHaveAttribute('data-estado', 'terminado', { timeout: 60000 })

		const previa = await foto_stock(page, m.id)

		// Tildar SOLO la linea de Martillo. El checkbox de b-form-checkbox pone el testid en el
		// input; el click va al label hermano si el input no recibe el click directo.
		const check = page.locator(`[data-testid="sugerencia-check-linea-${linea.stock_suggestion_article_id}"]`)
		if (!(await check.count())) {
			test.skip(true, 'la linea de Martillo quedo fuera de la primera pagina: el circuito de crear movimientos ya esta cubierto por API en el spec de movimientos')
		}
		await check.locator('xpath=ancestor::td').click()
		await expect(check, 'el checkbox de la linea tenia que quedar tildado').toBeChecked()

		const [respuesta] = await Promise.all([
			page.waitForResponse(r => r.url().includes('create-deposit-movement') && r.request().method() === 'POST'),
			page.locator('[data-testid="sugerencias-btn-crear-movimientos"]').click(),
		])
		expect(respuesta.ok(), 'el POST de crear movimientos fallo').toBeTruthy()
		const cuerpo = await respuesta.json()

		// Un solo par origen/destino tildado => UN movimiento, En proceso, con el articulo y la
		// cantidad de la linea.
		expect(cuerpo.deposit_movements.length, 'tenia que crearse exactamente un movimiento').toBe(1)
		const mov = cuerpo.deposit_movements[0]
		expect(mov.deposit_movement_status_id, 'el movimiento tenia que nacer En proceso (1)').toBe(1)
		expect(mov.from_address_id, 'origen Principal').toBe(contexto.principal_id)
		expect(mov.to_address_id, 'destino EXP Norte').toBe(contexto.norte_id)
		const articulos_del_mov = (mov.articles || []).map(a => ({ id: a.id, amount: Number(a.pivot.amount) }))
		expect(articulos_del_mov, 'el movimiento tenia que llevar Martillo x3').toEqual([{ id: m.id, amount: 3 }])

		// Y el stock NO se movio: la sugerencia solo dejo el traslado pendiente de recepcion.
		const ahora = await foto_stock(page, m.id)
		expect(ahora, 'crear el movimiento desde la sugerencia no tenia que tocar ningun stock').toEqual(previa)

		// Toast de confirmacion en pantalla.
		await expect(page.locator('.b-toast, .toast').filter({ hasText: /movimiento/ }).first()).toBeVisible()
	})
})
