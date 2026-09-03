// Exploracion de depositos (3/9/2026) — parte 1: el movimiento de deposito mueve stock por
// ESTADO, no por existencia.
//
// Que afirma este archivo, todo predicho a mano ANTES de tocar la interfaz (el archivo de
// predicciones esta en la bitacora de la exploracion):
//
//   I2 — El seteo directo de stock por sucursal (boton verde de la columna Stock del listado)
//        es una DIFERENCIA auditada: cada guardado con cambio deja un stock_movement con
//        concepto "Creacion de deposito" (primera vez) o "Actualizacion de deposito", y el
//        stock global del articulo siempre queda igual a la suma de los depositos.
//        Setear solo min/max de una sucursal sin stock deja el pivot con amount NULL (no 0):
//        esa diferencia es la que despues hace invisible al deposito para las sugerencias
//        (ver exploracion-depositos-sugerencias.spec.js).
//
//   I1 — Un movimiento de deposito "En proceso" NO toca ningun stock. El stock se mueve al
//        pasar a "Recibido" (DepositMovementHelper::check_status), y ahi si: resta el pivot
//        del origen, suma el del destino, el global no cambia, y queda un stock_movement
//        "Mov entre depositos" por articulo.
//
//   I1.b — La recepcion SE CONFIRMA desde el modal del listado: elegir "Recibido" y guardar
//        dispara el traslado, y recien al REABRIR el movimiento ya Recibido la proteccion de
//        se_puede_modificar esconde guardar/borrar (el form edita una copia; el store conserva
//        el estado con el que se abrio). 🔴 La prediccion original decia lo contrario (que el
//        boton desaparecia al elegir Recibido) y la MEDICION del 3/9/2026 la desmintio: quedo
//        como leccion en la bitacora — una cadena de codigo convincente no reemplaza verlo.
//
//   I1.e (defecto latente, verificado contra el codigo Y medido) — El endpoint
//        PUT deposit-movement/{id} re-ejecuta el traslado en CADA save de un movimiento ya
//        Recibido: la guarda is_null(recibido_at) esta comentada en
//        DepositMovementHelper::check_status() (linea ~50). Desde la UI no se llega (la
//        proteccion de reedicion de I1.b esconde el guardar), pero cualquier caller del
//        endpoint duplica stock. Este test fija el comportamiento REAL (duplica): el dia que
//        se arregle, la asercion se pone roja y hay que invertirla.
//
// Depende del fixture TestingFerreteriaSeeder solo para el login y la sucursal "Principal".
// Los articulos son propios de la corrida (sufijo por timestamp) y la sucursal "EXP Norte"
// se crea una sola vez y se reusa entre corridas. Todo lo demas se mide por diferencia.
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { search_and_select, completar_campo, abrir_pestania, crear_desde_buscador } = require('../helpers/formulario')
const { buscar_articulo } = require('../helpers/vender')

/** Sucursal del fixture: origen de los traslados. */
const PRINCIPAL = 'Principal'
/** Sucursal propia de la exploracion: destino. Se crea si no existe y se reusa. */
const NORTE = 'EXP Norte'

const contexto = {
	sufijo: String(Date.now()),
	api: null,
	/** { martillo: {id, nombre}, pinza: {id, nombre} } */
	arts: {},
	/** id de la sucursal EXP Norte */
	norte_id: null,
	/** id de la sucursal Principal */
	principal_id: null,
	/** id del movimiento creado En proceso (I1.a) */
	mov_en_proceso_id: null,
	/** mapa id -> nombre de conceptos de stock movement */
	conceptos: null,
}

// ── Helpers de API (fetch con la sesion del navegador; la API responde por cookie) ──────────

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

async function api_send(page, metodo, ruta, cuerpo) {
	return page.evaluate(async ({ api, metodo, ruta, cuerpo }) => {
		const r = await fetch(api + '/api/' + ruta, {
			method: metodo,
			credentials: 'include',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			body: JSON.stringify(cuerpo),
		})
		if (!r.ok) return { __error: r.status, __texto: await r.text() }
		const texto = await r.text()
		return texto ? JSON.parse(texto) : {}
	}, { api: contexto.api, metodo, ruta, cuerpo })
}

/** Pivots de un articulo como mapa address_id -> {amount, stock_min, stock_max}, mas el global. */
async function foto_stock(page, article_id) {
	const res = await api_get(page, 'article/' + article_id)
	expect(res.__error, 'no se pudo leer el articulo ' + article_id).toBeUndefined()
	const model = res.model
	const pivots = {}
	for (const a of (model.addresses || [])) {
		pivots[a.id] = {
			amount: a.pivot.amount === null ? null : Number(a.pivot.amount),
			stock_min: a.pivot.stock_min === null ? null : Number(a.pivot.stock_min),
			stock_max: a.pivot.stock_max === null ? null : Number(a.pivot.stock_max),
		}
	}
	return { global: model.stock === null ? null : Number(model.stock), pivots }
}

/** Movimientos de stock del articulo, mas nuevos primero, con el nombre del concepto resuelto. */
async function movimientos_de(page, article_id, cuantos = 50) {
	if (!contexto.conceptos) {
		const res = await api_get(page, 'concepto-stock-movement')
		contexto.conceptos = {}
		for (const c of (res.models || [])) contexto.conceptos[c.id] = c.name
	}
	const res = await api_get(page, 'stock-movement/' + article_id + '/' + cuantos + '/0')
	expect(res.__error, 'no se pudieron leer los movimientos de ' + article_id).toBeUndefined()
	return (res.models || []).map(m => ({
		id: m.id,
		amount: Number(m.amount),
		concepto: contexto.conceptos[m.concepto_stock_movement_id] || String(m.concepto_stock_movement_id),
		from_address_id: m.from_address_id,
		to_address_id: m.to_address_id,
		deposit_movement_id: m.deposit_movement_id,
	}))
}

/** Entra al listado con todo cargado. */
async function abrir_listado(page) {
	await page.goto('/listado-de-articulos')
	await esperar_recursos_descargados(page, { abrir_panel: false })
	await page.locator('tbody tr').first().waitFor({ timeout: 90000 })
}

/**
 * Deja visible la fila del articulo. Los articulos de esta corrida son los mas nuevos y el
 * listado por defecto ordena por id DESC: casi siempre la fila YA esta en la primera pagina y
 * buscar es un round-trip caro de mas (la busqueda global puede tardar >60s con la maquina
 * cargada y colgo una corrida entera el 3/9/2026). Se busca solo si no esta.
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
 * Aprieta el boton de guardar del form generico abierto y espera el POST/PUT del modelo.
 *
 * El boton de guardar de estos forms NO lleva data-testid en todos los modulos (en el ABM de
 * sucursales el unico testid btn-crear-address es el del header, y el boton real dice
 * "Guardar y cerrar"), asi que se busca primero el testid convencional y si no esta se cae al
 * texto, siempre DENTRO del ultimo modal visible para no agarrar el boton "Crear" del header.
 */
async function guardar_form_modal(page, model_name, url_regex, metodo) {
	const modal = page.locator('.modal.show').last()
	let boton = modal.locator(`[data-testid="btn-crear-${model_name}"], [data-testid="btn-guardar-${model_name}"]`).last()
	if (await boton.count() === 0 || !(await boton.isVisible().catch(() => false))) {
		boton = modal.getByRole('button', { name: /Guardar/ }).last()
	}
	const [respuesta] = await Promise.all([
		page.waitForResponse(r => r.url().match(url_regex) && r.request().method() === metodo),
		boton.click(),
	])
	return respuesta
}

/**
 * Edita el stock por sucursal de una fila con el boton verde (seteo directo). `valores` es un
 * mapa address_id -> {stock, min, max}; solo se tocan los campos presentes.
 *
 * 🔴 Los inputs Min y Max del inline comparten el MISMO id ("input-address-stock-stock-min-<id>",
 * copy-paste en EditAddressStock.vue), asi que no se puede ubicar Max por id: se navega por el
 * input-group con el prepend visible ("Stock" / "Min" / "Max") dentro del bloque de la sucursal.
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
		// El bloque de la sucursal: el contenedor de los tres inputs cuyo input de Stock lleva
		// el id de la address. Min y Max se ubican por el texto del prepend.
		const bloque = fila.locator('.cont-inputs-stock').filter({
			has: page.locator(`#input-address-stock-${address_id}`),
		})
		await expect(bloque, `no aparecio el bloque inline de la sucursal ${address_id}`).toBeVisible()

		// 🔴 fill + verificacion + reintento por campo: son inputs con v-model directo al pivot
		// y un re-render de la fila (el loadModel de un guardado anterior) puede pisar el valor
		// tipeado sin ningun error — la trampa de "Un fill() puede perderse" del README. Paso el
		// 3/9/2026: la segunda pasada seguida sobre el mismo articulo llego al PUT con los
		// campos de la sucursal nueva vacios.
		const campos = [
			[v.stock, 'Stock', /^Stock/],
			[v.min, 'Min', /^Min/],
			[v.max, 'Max', /^Max/],
		]
		for (const [valor, nombre, patron] of campos) {
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
	// Diagnostico de la exploracion: que addresses viajaron y como volvieron.
	const payload = respuesta.request().postDataJSON()
	console.log('[seteo] PUT addresses=' + JSON.stringify((payload.addresses || []).map(a => ({
		id: a.id, amount: a.pivot && a.pivot.amount, min: a.pivot && a.pivot.stock_min, max: a.pivot && a.pivot.stock_max,
	}))))
	// La señal real de que la edicion cerro y la fila se refresco: el boton verde de editar
	// vuelve a estar (la edicion inline desaparecio).
	await expect(fila.locator('[dusk="btn_editar_depositos"]')).toBeVisible({ timeout: 15000 })
	await page.waitForTimeout(400)
}

test.describe.serial('exploracion depositos: movimiento por estado', () => {

	test('preparacion: sucursal EXP Norte y dos articulos propios', async ({ page }) => {
		test.setTimeout(300000)

		// El origin de la API se pesca de la propia pagina (primer request a /api/ que pase).
		const promesa_api = page.waitForResponse(res => res.url().includes('/api/'), { timeout: 60000 })
		await page.goto('/listado-de-articulos')
		contexto.api = new URL((await promesa_api).url()).origin
		await esperar_recursos_descargados(page, { abrir_panel: false })

		// La sucursal EXP Norte se crea por interfaz UNA vez y se reusa entre corridas.
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
			const respuesta = await guardar_form_modal(page, 'address', /\/address$/, 'POST')
			expect(respuesta.ok(), 'el POST de la sucursal fallo').toBeTruthy()
			res = await api_get(page, 'address')
			norte = (res.models || []).find(a => a.street === NORTE)
		}
		expect(norte, 'EXP Norte tenia que existir despues de crearla').toBeTruthy()
		contexto.norte_id = norte.id

		// Dos articulos propios de la corrida, con el alta real del listado.
		//
		// 🔴 El nombre de un articulo NUEVO no es un campo de texto: es un BUSCADOR (dos Enter,
		// ver circuito-listado.spec.js y manual_sistema/listado/identificacion.md). Un fill()
		// directo deja query_value vacio y el POST manda name="" sin validacion — el articulo
		// se crea SIN NOMBRE y nada avisa (medido el 3/9/2026, dos fantasmas borrados a mano).
		// crear_desde_buscador ya tiene el flujo resuelto con sus trampas.
		await abrir_listado(page)
		for (const [clave, dato] of Object.entries({
			martillo: { nombre: `EXPD ${contexto.sufijo} Martillo`, costo: 1000 },
			pinza: { nombre: `EXPD ${contexto.sufijo} Pinza`, costo: 500 },
		})) {
			await page.locator('[data-testid="btn-crear-article"]').first().click()
			await crear_desde_buscador(page, 'article-name', dato.nombre)
			// El costo vive en la pestaña "Precio"; ModelForm solo monta el grupo activo.
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

		console.log('[preparacion] norte_id=' + contexto.norte_id + ' arts=' + JSON.stringify(contexto.arts))
	})

	test('I2: el seteo directo mueve por diferencia y deja rastro', async ({ page }) => {
		test.setTimeout(300000)
		const m = contexto.arts.martillo
		const p = contexto.arts.pinza
		await abrir_listado(page)

		// I2.a — Martillo: Principal = 10 (primera vez: "Creacion de deposito", +10).
		await posicionar_fila(page, m.id, m.nombre)
		await setear_stock_directo(page, m.id, { [contexto.principal_id]: { stock: 10 } })
		let foto = await foto_stock(page, m.id)
		expect(foto.pivots[contexto.principal_id].amount, 'I2.a: el pivot Principal tenia que quedar en 10').toBe(10)
		expect(foto.global, 'I2.a: el global tenia que ser la suma de depositos (10)').toBe(10)
		let movs = await movimientos_de(page, m.id, 5)
		expect(movs[0].concepto, 'I2.a: el primer seteo tenia que dejar "Creacion de deposito"').toBe('Creacion de deposito')
		expect(movs[0].amount, 'I2.a: el movimiento tenia que ser de +10').toBe(10)
		expect(movs[0].to_address_id, 'I2.a: el destino tenia que ser Principal').toBe(contexto.principal_id)

		// I2.b — Martillo: Principal = 7 (segunda vez: "Actualizacion de deposito", -3).
		await setear_stock_directo(page, m.id, { [contexto.principal_id]: { stock: 7 } })
		foto = await foto_stock(page, m.id)
		expect(foto.pivots[contexto.principal_id].amount, 'I2.b: el pivot Principal tenia que bajar a 7').toBe(7)
		expect(foto.global, 'I2.b: el global tenia que seguir a la suma (7)').toBe(7)
		movs = await movimientos_de(page, m.id, 5)
		expect(movs[0].concepto, 'I2.b: el reseteo tenia que dejar "Actualizacion de deposito"').toBe('Actualizacion de deposito')
		expect(movs[0].amount, 'I2.b: el movimiento tenia que ser la DIFERENCIA (-3)').toBe(-3)

		// I2.d — Martillo: EXP Norte solo min/max, stock vacio: pivot con amount NULL, sin movimiento.
		const movs_antes = (await movimientos_de(page, m.id, 50)).length
		await setear_stock_directo(page, m.id, { [contexto.norte_id]: { min: 6, max: 8 } })
		foto = await foto_stock(page, m.id)
		expect(foto.pivots[contexto.norte_id], 'I2.d: el pivot de EXP Norte tenia que existir').toBeTruthy()
		expect(foto.pivots[contexto.norte_id].amount, 'I2.d: amount tenia que quedar NULL (no 0)').toBeNull()
		expect(foto.pivots[contexto.norte_id].stock_min, 'I2.d: min tenia que quedar en 6').toBe(6)
		expect(foto.pivots[contexto.norte_id].stock_max, 'I2.d: max tenia que quedar en 8').toBe(8)
		expect(foto.global, 'I2.d: el global no tenia que moverse (NULL no suma)').toBe(7)
		const movs_despues = (await movimientos_de(page, m.id, 50)).length
		expect(movs_despues, 'I2.d: setear solo min/max no tenia que dejar movimiento').toBe(movs_antes)

		// I2.c/I2.f — Pinza: Principal = 10, y EXP Norte con stock 2 + min 4 + max 6.
		await posicionar_fila(page, p.id, p.nombre)
		await setear_stock_directo(page, p.id, { [contexto.principal_id]: { stock: 10 } })
		await setear_stock_directo(page, p.id, { [contexto.norte_id]: { stock: 2, min: 4, max: 6 } })
		foto = await foto_stock(page, p.id)
		expect(foto.pivots[contexto.principal_id].amount, 'I2.f: Principal tenia que quedar en 10').toBe(10)
		expect(foto.pivots[contexto.norte_id].amount, 'I2.f: EXP Norte tenia que quedar en 2').toBe(2)
		expect(foto.pivots[contexto.norte_id].stock_min, 'I2.f: min de EXP Norte tenia que ser 4').toBe(4)
		expect(foto.global, 'I2.f: el global tenia que ser 12 (10+2)').toBe(12)
		movs = await movimientos_de(page, p.id, 5)
		expect(movs[0].concepto, 'I2.f: la primera vez de EXP Norte tenia que ser "Creacion de deposito"').toBe('Creacion de deposito')
		expect(movs[0].amount, 'I2.f: +2 a EXP Norte').toBe(2)
		expect(movs[0].to_address_id, 'I2.f: destino EXP Norte').toBe(contexto.norte_id)
	})

	test('I1.a: un movimiento "En proceso" no toca ningun stock', async ({ page }) => {
		test.setTimeout(300000)
		const m = contexto.arts.martillo
		const p = contexto.arts.pinza
		await abrir_listado(page)

		const previa_m = await foto_stock(page, m.id)
		const previa_p = await foto_stock(page, p.id)

		// Abrir el dropdown de Depositos y el modal de movimientos.
		const drop = page.locator('.toolbar-btn--tinte-violeta').filter({ has: page.locator('.bi-hdd-stack') })
		await drop.locator('button').first().click()
		await page.locator('[dusk="btn_deposit_movements"]').click()
		await expect(page.locator('#deposit-movements')).toBeVisible()

		// "Crear" abre el form del movimiento nuevo.
		await page.locator('#deposit-movements').getByRole('button', { name: /Crear/ }).click()
		await expect(page.locator('[data-testid="deposit_movement-from_address_id"]')).toBeVisible()

		// Origen Principal, destino EXP Norte. El estado NO se toca: default "En proceso".
		await page.locator('[data-testid="deposit_movement-from_address_id"]').selectOption({ label: PRINCIPAL })
		await page.locator('[data-testid="deposit_movement-to_address_id"]').selectOption({ label: NORTE })

		// Los dos articulos con su cantidad en el pivote.
		await search_and_select(page, 'deposit_movement-articles', m.nombre)
		await page.locator(`[data-testid="article-amount-${m.id}"]`).fill('4')
		await search_and_select(page, 'deposit_movement-articles', p.nombre)
		await page.locator(`[data-testid="article-amount-${p.id}"]`).fill('5')

		const respuesta = await guardar_form_modal(page, 'deposit_movement', /\/deposit-movement$/, 'POST')
		expect(respuesta.ok(), 'el POST del movimiento fallo').toBeTruthy()
		const cuerpo = await respuesta.json()
		contexto.mov_en_proceso_id = cuerpo.model.id
		expect(cuerpo.model.deposit_movement_status_id, 'el movimiento tenia que nacer En proceso (1)').toBe(1)

		// La prediccion central: CERO cambios de stock.
		const ahora_m = await foto_stock(page, m.id)
		const ahora_p = await foto_stock(page, p.id)
		expect(ahora_m, 'I1.a: el stock de Martillo no tenia que moverse').toEqual(previa_m)
		expect(ahora_p, 'I1.a: el stock de Pinza no tenia que moverse').toEqual(previa_p)
	})

	test('I1.b: la recepcion se confirma desde el modal y traslada el stock; un Recibido no se reedita', async ({ page }) => {
		test.setTimeout(300000)
		const m = contexto.arts.martillo
		const p = contexto.arts.pinza
		await abrir_listado(page)

		const previa_m = await foto_stock(page, m.id)
		const previa_p = await foto_stock(page, p.id)

		const drop = page.locator('.toolbar-btn--tinte-violeta').filter({ has: page.locator('.bi-hdd-stack') })
		await drop.locator('button').first().click()
		await page.locator('[dusk="btn_deposit_movements"]').click()
		await expect(page.locator('#deposit-movements')).toBeVisible()

		// La tabla del modal NO dispara el listado al abrirse (mismo patron que Compras/Ventas:
		// se entra por dia). "Historico" trae todo sin filtro de fecha. Y sin el catalogo de
		// estados sembrado la tabla no dibuja NI UNA fila aunque los movimientos esten en el
		// store (agrupa por order_list_by="deposit_movement_status"): ver el arreglo del fixture
		// en TestingFerreteriaSeeder del 3/9/2026.
		await Promise.all([
			page.waitForResponse(r => r.url().includes('deposit-movement') && r.request().method() === 'GET'),
			page.locator('#deposit-movements [data-testid="control-fecha-modo-historico"]').click(),
		])

		// Abrir el movimiento creado en I1.a.
		await page.locator(`[data-testid="deposit_movement-row-${contexto.mov_en_proceso_id}"]`).click()
		const estado = page.locator('[data-testid="deposit_movement-deposit_movement_status_id"]')
		await expect(estado).toBeVisible()

		// Con el movimiento En proceso, el boton de guardar esta (no tiene testid: se ubica por
		// texto dentro del ultimo modal visible, que es el form del movimiento).
		const guardar = page.locator('.modal.show').last().getByRole('button', { name: /Guardar/ })
		await expect(guardar, 'con el movimiento En proceso el guardar tenia que estar').toBeVisible()

		// 🔴 MEDIDO el 3/9/2026, y desmintio la prediccion: el boton de guardar SIGUE VISIBLE al
		// elegir Recibido. La hipotesis previa ("se_puede_modificar mira el modelo del store que
		// el form muta en vivo y esconde el guardar") era falsa: el form edita una COPIA, el store
		// conserva el estado con el que se abrio (En proceso), y se_puede_modificar recien ve el
		// status nuevo DESPUES de guardar. O sea: la recepcion SI se confirma desde este modal, y
		// la proteccion "un Recibido no se toca" recien bloquea al REABRIRLO. El diseño esta bien.
		await estado.selectOption({ label: 'Recibido' })
		await expect(guardar, 'I1.b: el boton de guardar tenia que SEGUIR al elegir Recibido').toBeVisible()

		// Guardar: el PUT del form es el que dispara el traslado (check_status ve "Recibido").
		const [respuesta] = await Promise.all([
			page.waitForResponse(r => r.url().match(/\/deposit-movement\/\d+$/) && r.request().method() === 'PUT'),
			guardar.click(),
		])
		expect(respuesta.ok(), 'el PUT de la recepcion fallo').toBeTruthy()

		// El traslado exacto de lo declarado en I1.a: Martillo 4 y Pinza 5, Principal -> EXP Norte.
		// El pivot de Martillo en EXP Norte nacio NULL en I2.d: NULL + 4 = 4.
		const ahora_m = await foto_stock(page, m.id)
		const ahora_p = await foto_stock(page, p.id)
		expect(ahora_m.pivots[contexto.principal_id].amount, 'I1.b: Principal de Martillo -4')
			.toBe(previa_m.pivots[contexto.principal_id].amount - 4)
		expect(ahora_m.pivots[contexto.norte_id].amount, 'I1.b: EXP Norte de Martillo NULL -> 4').toBe(4)
		expect(ahora_m.global, 'I1.b: el global de Martillo no cambia').toBe(previa_m.global)
		expect(ahora_p.pivots[contexto.principal_id].amount, 'I1.b: Principal de Pinza -5')
			.toBe(previa_p.pivots[contexto.principal_id].amount - 5)
		expect(ahora_p.pivots[contexto.norte_id].amount, 'I1.b: EXP Norte de Pinza +5')
			.toBe(previa_p.pivots[contexto.norte_id].amount + 5)
		expect(ahora_p.global, 'I1.b: el global de Pinza no cambia').toBe(previa_p.global)

		const movs = await movimientos_de(page, m.id, 5)
		expect(movs[0].concepto, 'I1.b: tenia que quedar "Mov entre depositos"').toBe('Mov entre depositos')

		// Reabrir el movimiento YA Recibido: aca si actua se_puede_modificar (el store ahora
		// tiene status 2 desde el arranque del form) y guardar/borrar no estan. Es la proteccion
		// que evita re-guardar un Recibido desde la UI — y es la que hoy tapa la duplicacion del
		// endpoint (ver I1.e).
		await page.waitForTimeout(1200)
		await page.locator(`[data-testid="deposit_movement-row-${contexto.mov_en_proceso_id}"]`).click()
		await expect(page.locator('[data-testid="deposit_movement-deposit_movement_status_id"]')).toBeVisible()
		await expect(
			page.locator('.modal.show').last().getByRole('button', { name: /Guardar/ }),
			'I1.b: un movimiento ya Recibido no tenia que ofrecer guardar'
		).toBeHidden()
		await page.keyboard.press('Escape')
	})

	test('I1.c: crear un movimiento directamente Recibido SI mueve el stock', async ({ page }) => {
		test.setTimeout(300000)
		const p = contexto.arts.pinza
		await abrir_listado(page)

		const previa = await foto_stock(page, p.id)

		const drop = page.locator('.toolbar-btn--tinte-violeta').filter({ has: page.locator('.bi-hdd-stack') })
		await drop.locator('button').first().click()
		await page.locator('[dusk="btn_deposit_movements"]').click()
		await page.locator('#deposit-movements').getByRole('button', { name: /Crear/ }).click()
		await expect(page.locator('[data-testid="deposit_movement-from_address_id"]')).toBeVisible()

		await page.locator('[data-testid="deposit_movement-from_address_id"]').selectOption({ label: PRINCIPAL })
		await page.locator('[data-testid="deposit_movement-to_address_id"]').selectOption({ label: NORTE })
		// En un modelo NUEVO (sin id) el boton de crear no se esconde al elegir Recibido:
		// este es el unico camino de UI que efectivamente traslada stock.
		await page.locator('[data-testid="deposit_movement-deposit_movement_status_id"]').selectOption({ label: 'Recibido' })

		await search_and_select(page, 'deposit_movement-articles', p.nombre)
		await page.locator(`[data-testid="article-amount-${p.id}"]`).fill('2')

		const respuesta = await guardar_form_modal(page, 'deposit_movement', /\/deposit-movement$/, 'POST')
		expect(respuesta.ok(), 'el POST del movimiento Recibido fallo').toBeTruthy()

		const ahora = await foto_stock(page, p.id)
		expect(ahora.pivots[contexto.principal_id].amount, 'I1.c: Principal tenia que bajar 2 (10->8)')
			.toBe(previa.pivots[contexto.principal_id].amount - 2)
		expect(ahora.pivots[contexto.norte_id].amount, 'I1.c: EXP Norte tenia que subir 2 (2->4)')
			.toBe(previa.pivots[contexto.norte_id].amount + 2)
		expect(ahora.global, 'I1.c: el global no tenia que cambiar').toBe(previa.global)

		const movs = await movimientos_de(page, p.id, 5)
		expect(movs[0].concepto, 'I1.c: tenia que quedar "Mov entre depositos"').toBe('Mov entre depositos')
		expect(movs[0].amount, 'I1.c: por 2 unidades').toBe(2)
		expect(movs[0].from_address_id, 'I1.c: desde Principal').toBe(contexto.principal_id)
		expect(movs[0].to_address_id, 'I1.c: hacia EXP Norte').toBe(contexto.norte_id)
	})

	test('I1.e (defecto latente): re-guardar un movimiento Recibido DUPLICA el traslado', async ({ page }) => {
		test.setTimeout(300000)
		const m = contexto.arts.martillo
		const p = contexto.arts.pinza
		await abrir_listado(page)

		const previa_m = await foto_stock(page, m.id)
		const previa_p = await foto_stock(page, p.id)

		// PUT identico al que el form mando en I1.b, sobre un movimiento que YA esta Recibido
		// (desde la UI no se llega: la proteccion de reedicion esconde el guardar). La guarda
		// is_null(recibido_at) de DepositMovementHelper::check_status() esta comentada, asi que
		// el traslado se re-ejecuta entero. Este test fija ese comportamiento REAL: el dia que
		// se arregle (re-guardar NO deberia mover nada), estas aserciones se ponen rojas —
		// invertirlas a "toEqual(previa)" y cerrar el hallazgo en la bitacora.
		const res = await api_get(page, 'deposit-movement/' + contexto.mov_en_proceso_id)
		const mov = res.model
		const payload = {
			from_address_id: mov.from_address_id,
			to_address_id: mov.to_address_id,
			employee_id: mov.employee_id,
			deposit_movement_status_id: 2,
			recibido_at: mov.recibido_at,
			notes: mov.notes,
			articles: (mov.articles || []).map(a => ({
				id: a.id,
				pivot: { amount: a.pivot.amount, article_variant_id: a.pivot.article_variant_id },
			})),
		}
		const puesto = await api_send(page, 'PUT', 'deposit-movement/' + contexto.mov_en_proceso_id, payload)
		expect(puesto.__error, 'el PUT repetido fallo').toBeUndefined()

		const ahora_m = await foto_stock(page, m.id)
		const ahora_p = await foto_stock(page, p.id)
		expect(ahora_m.pivots[contexto.principal_id].amount, 'I1.e: Martillo Principal volvio a bajar 4 (duplicacion)')
			.toBe(previa_m.pivots[contexto.principal_id].amount - 4)
		expect(ahora_m.pivots[contexto.norte_id].amount, 'I1.e: Martillo EXP Norte volvio a subir 4 (duplicacion)')
			.toBe(previa_m.pivots[contexto.norte_id].amount + 4)
		expect(ahora_p.pivots[contexto.principal_id].amount, 'I1.e: Pinza Principal volvio a bajar 5 (duplicacion)')
			.toBe(previa_p.pivots[contexto.principal_id].amount - 5)

		// Se deja la base coherente: un movimiento inverso Recibido devuelve el duplicado.
		const reversa = await api_send(page, 'POST', 'deposit-movement', {
			from_address_id: contexto.norte_id,
			to_address_id: contexto.principal_id,
			employee_id: mov.employee_id,
			deposit_movement_status_id: 2,
			recibido_at: null,
			notes: 'Reversa del duplicado medido por la exploracion de depositos (I1.e)',
			articles: [
				{ id: m.id, pivot: { amount: 4, article_variant_id: null } },
				{ id: p.id, pivot: { amount: 5, article_variant_id: null } },
			],
		})
		expect(reversa.__error, 'la reversa del duplicado fallo').toBeUndefined()

		const final_m = await foto_stock(page, m.id)
		const final_p = await foto_stock(page, p.id)
		expect(final_m.pivots[contexto.principal_id].amount, 'la reversa tenia que dejar Martillo Principal como antes del duplicado')
			.toBe(previa_m.pivots[contexto.principal_id].amount)
		expect(final_p.pivots[contexto.principal_id].amount, 'la reversa tenia que dejar Pinza Principal como antes del duplicado')
			.toBe(previa_p.pivots[contexto.principal_id].amount)
	})
})
