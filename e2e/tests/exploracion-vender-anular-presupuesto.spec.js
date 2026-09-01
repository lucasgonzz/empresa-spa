// Exploracion del modulo Vender: ANULAR un presupuesto ya confirmado.
//
// Sale de la bitacora `pruebas_manuales/exploracion/vender.md`, que dejaba esto primero en la lista
// de lo no explorado: el circuito e2e del 31/8 cubrio CONFIRMAR y no toco el camino inverso.
//
// ⚠️⚠️ ESTE ARCHIVO TODAVIA NO CORRIO ENTERO EN VERDE (1/9/2026). ⚠️⚠️
//
// Llego hasta el segundo paso ("crea el presupuesto TESTIGO") y ahi murio por LENTITUD DE LA
// MAQUINA, no por el sistema: ese dia el equipo estaba con la CPU al 100% y 63 procesos de node de
// otros slots, y un `GET /sanctum/csrf-cookie` --que no toca la base-- tardaba entre 1,2 y 23,9
// segundos. Con `php artisan serve`, que atiende UN request por vez, los 68 catalogos del arranque
// se serializan y cada navegacion cuesta ~40 s. El modal de buscar cliente quedaba dibujando
// esqueletos de carga y `search_and_select` se iba en sus 30 s.
//
// 🔴 Lo que este archivo afirma NO quedo sin verificar: los mismos invariantes se midieron ese dia
//    por PHPUnit, contra la API, en
//    `empresa-api/tests/Feature/Presupuestos/2_Anular_devuelve_stock_y_cuenta_corriente_Test.php`,
//    y los cinco se cumplieron (7 tests, 43 aserciones, verde en 38 s). Lo que falta verificar es
//    lo que SOLO se ve por la interfaz y PHPUnit no alcanza: que el boton se de vuelta, que la
//    columna de estado diga "Sin confirmar", que el `confirm()` nativo se acepte, y que el listado
//    del dia deje de mostrar la venta.
//
// O sea: el que agarre este archivo con la maquina descansada tiene que correrlo y, si queda verde,
// borrar esta advertencia. Si queda rojo, el rojo es informacion nueva -- no lo ajustes para que
// pase.
//
// Anular no es "confirmar al reves" desde el punto de vista del codigo. El borrado normal de una
// venta ofrece un checkbox "Compensar caja" y un cartel que anuncia que se reponen los articulos;
// anular no ofrece ninguno de los dos. O sea que la reversion la decide el servidor solo, sin que
// la pantalla diga que va a revertir -- que es exactamente la forma que tiene un defecto silencioso.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// Que afirma
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// Los cuatro invariantes se predijeron A MANO antes de tocar la interfaz (la prediccion completa
// esta en el informe `informes/20260901-explorar-vender.md`):
//
//   I1 · Anular devuelve el sistema al estado previo: el stock vuelve, la deuda de la cuenta
//        corriente desaparece, y la venta deja de estar en el listado del dia.
//   I2 · Anular y volver a confirmar NO duplica: el stock baja una sola vez (no el doble) y queda
//        exactamente UNA venta atada al presupuesto.
//   I3 · El total no cambia al pasar por anular: la deuda que reaparece es la misma.
//   I4 · El estado del presupuesto sigue al boton: tras anular vuelve a "Sin confirmar".
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// Lo que hay que saber antes de tocar este archivo
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// 🔴 1. Se arman DOS presupuestos y se anula UNO SOLO, y eso no es decoracion. El primero
//    (`PRESUPUESTO_TESTIGO`) queda confirmado y quieto toda la corrida, y cumple dos funciones que
//    no se pueden conseguir de otra forma:
//
//      a) Es el CONTROL de que anular no borra de mas. Sin el, "la cuenta corriente ya no tiene el
//         movimiento" tambien seria cierta si anular hubiera vaciado la cuenta entera.
//      b) Deja la cuenta corriente con al menos una fila SIEMPRE. `abrir_cuenta_corriente()` del
//         helper compartido espera a que haya filas dibujadas; con un solo presupuesto, el momento
//         posterior a anular deja la cuenta VACIA y ese helper se va en timeout de 45 s por una
//         razon que no tiene nada que ver con lo que el test vino a verificar.
//
// 🔴 2. Anular pregunta con un `confirm()` NATIVO (`BtnConfirmarAnular.anular()`). Playwright
//    descarta los dialogos por defecto: sin un `page.on('dialog')` que acepte, el click no hace
//    absolutamente nada, no sale ningun pedido, y el rojo aparece recien varias aserciones despues
//    diciendo que el stock no volvio. Confirmar, en cambio, NO pregunta.
//
// 🔴 3. Al re-confirmar nace una venta con OTRO numero. El movimiento de cuenta corriente se ubica
//    por su detalle (`Venta N°<num>`), asi que el numero hay que releerlo: guardarse el de la
//    primera confirmacion y buscar por el no encuentra nada, y parece que la cuenta corriente no se
//    actualizo cuando lo que paso es que la venta es otra.
//
// 🔴 4. Todo por DIFERENCIA, como el resto del harness. La base del slot se acumula entre corridas:
//    el stock y el saldo de la cuenta corriente arrancan en lo que dejo la corrida anterior.
//
// 🔴 5. Un `test()` por NAVEGACION, y por eso son doce pasos para un recorrido que se cuenta en
//    cinco frases. Cada `page.goto()` arrastra la descarga de los 68 catalogos del arranque, que
//    medida en este slot el 1/9/2026 cuesta ~40 s -- el doble de los 15-20 s que anota el README,
//    porque la maquina corre varios slots a la vez. Un test que encadena cinco navegaciones se come
//    los 240 s de `playwright.config.js` sin que nada este mal, y el rojo aparece en la ultima
//    maniobra: la primera version de este archivo murio asi, con la cuenta corriente ya escrita
//    correctamente en la base. Partir es la unica forma honesta de arreglarlo -- inflar el timeout
//    solo corre el problema mas lejos.
//
// Depende del fixture determinista de empresa-api
// (database/seeders/testing/TestingFerreteriaSeeder.php): el cliente "Cliente Cuenta Corriente"
// --con su cuenta corriente ya creada por `CreditAccountHelper`--, la sucursal "Principal", la
// extencion `budgets` habilitada y los articulos del catalogo.

const { test, expect } = require('../fixtures')
const { redondear } = require('../helpers/numeros')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { search_and_select } = require('../helpers/formulario')
const {
	celda_numerica,
	leer_articulos,
	abrir_vender,
	agregar_articulo,
	elegir_opcion_que_contenga,
	poner_toggle,
	abrir_modulo_del_dia,
	abrir_cuenta_corriente,
} = require('../helpers/vender')

// ── Datos de entrada ─────────────────────────────────────────────────────────────────────────

/** Cliente del fixture que trabaja con cuenta corriente. */
const CLIENTE = 'Cliente Cuenta Corriente'
/** Sucursal del fixture. Sin sucursal elegida la venta no se guarda. */
const DEPOSITO = 'Principal'

/**
 * El presupuesto que se confirma y se deja QUIETO. Es el control: nada de lo que se le hace al otro
 * puede tocarlo. Ver la nota 1 del encabezado.
 */
const PRESUPUESTO_TESTIGO = [
	{ articulo: 'Cuchilla', cantidad: 1 },
]

/** El presupuesto que se confirma, se anula y se vuelve a confirmar. */
const PRESUPUESTO_ANULADO = [
	{ articulo: 'Pata de cama', cantidad: 3 },
	{ articulo: 'Marco para cama', cantidad: 2 },
]

/** Todos los articulos que toca la corrida, para la foto de stock. */
const ARTICULOS = PRESUPUESTO_TESTIGO.concat(PRESUPUESTO_ANULADO).map(r => r.articulo)

// ── Estado compartido entre los tests seriales ───────────────────────────────────────────────

const contexto = {
	/** Id del cliente en el sistema. */
	cliente_id: null,
	/** nombre del articulo -> su id. */
	ids: {},
	/** nombre del articulo -> stock antes de que exista ningun presupuesto. */
	stock_previo: {},
	/** El presupuesto de control, y los datos de su venta. */
	testigo: { presupuesto: null, venta_num: null, total: null, movimiento: null },
	/** El presupuesto que se anula, y los datos de su venta en cada vuelta. */
	anulado: { presupuesto: null, venta_id: null, venta_num: null, total: null },
}

// ── Helpers de este archivo ──────────────────────────────────────────────────────────────────

/**
 * Busca el id de un cliente por su nombre, en el listado de clientes.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} nombre
 * @returns {Promise<string>}
 */
async function id_del_cliente(page, nombre) {
	await page.goto('/clientes/clientes')
	await esperar_recursos_descargados(page, { abrir_panel: false })
	await expect(page.locator('[data-testid^="celda-client-name-"]').first()).toBeVisible()

	const id = await page.evaluate(texto => {
		const celda = [...document.querySelectorAll('[data-testid^="celda-client-name-"]')]
			.find(c => c.innerText.trim() === texto)
		return celda ? celda.dataset.testid.replace('celda-client-name-', '') : null
	}, nombre)

	expect(id, `no encontre al cliente "${nombre}" en el listado`).not.toBeNull()

	return id
}

/**
 * Abre el listado de presupuestos del dia.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function abrir_presupuestos_del_dia(page) {
	await abrir_modulo_del_dia(page, '/presupuestos')
}

/**
 * Abre el listado de ventas del dia, en la solapa de la sucursal del fixture.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function abrir_ventas_del_dia(page) {
	await abrir_modulo_del_dia(page, '/ventas/todas', { solapa: DEPOSITO })
}

/**
 * Arma un presupuesto en Vender y lo guarda.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Array<{articulo: string, cantidad: number}>} renglones
 * @returns {Promise<Object>} El presupuesto tal cual lo devolvio el POST.
 */
async function crear_presupuesto(page, renglones) {
	await abrir_vender(page)

	// El cliente va PRIMERO: sin el no se dibuja el toggle "Guardar como presupuesto".
	await search_and_select(page, 'select_client_vender', CLIENTE)

	for (const renglon of renglones) {
		await agregar_articulo(page, renglon.articulo, contexto.ids[renglon.articulo], renglon.cantidad)
	}

	await expect(
		page.locator('[data-testid="venta-guardar-presupuesto"]'),
		'con un cliente elegido tenia que existir el toggle "Guardar como presupuesto"'
	).toBeAttached()
	await poner_toggle(page, 'venta-guardar-presupuesto')

	await elegir_opcion_que_contenga(page, 'venta-sucursal', DEPOSITO)

	const [respuesta] = await Promise.all([
		page.waitForResponse(res => res.url().includes('/budget') && res.request().method() === 'POST'),
		page.locator('[data-testid="btn-guardar-venta"]').click(),
	])

	expect(respuesta.ok(), 'el POST del presupuesto no salio bien').toBeTruthy()

	const modelo = (await respuesta.json()).model
	expect(modelo && modelo.id, 'el POST del presupuesto no devolvio un modelo con id').toBeTruthy()

	return modelo
}

/**
 * Aprieta el boton de accion del presupuesto (confirmar o anular) y espera su respuesta.
 *
 * 🔴 Anular pregunta con un `confirm()` nativo y Playwright los DESCARTA por defecto: sin aceptar
 * el dialogo el click no hace nada y no sale ningun pedido. Ver la nota 2 del encabezado.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number|string} presupuesto_id
 * @param {'confirmar'|'anular'} accion
 * @returns {Promise<Object>} El presupuesto que devolvio el servidor.
 */
async function accionar_presupuesto(page, presupuesto_id, accion) {
	const boton = page.locator(`[data-testid="btn-presupuesto-accion-${presupuesto_id}"]`)
	await expect(boton, 'el presupuesto tenia que ofrecer su boton de accion').toBeVisible()
	await expect(
		boton,
		`el presupuesto tenia que estar en condiciones de "${accion}"`
	).toHaveAttribute('data-accion', accion)

	const aceptar_dialogo = dialogo => dialogo.accept()
	page.on('dialog', aceptar_dialogo)

	try {
		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes(`/${accion}`) && res.request().method() === 'POST'),
			boton.click(),
		])

		expect(respuesta.ok(), `el POST de ${accion} no salio bien`).toBeTruthy()

		return (await respuesta.json()).model
	} finally {
		page.off('dialog', aceptar_dialogo)
	}
}

/**
 * Devuelve todas las ventas del dia atadas a un presupuesto, leidas de la MISMA respuesta que uso
 * la pantalla.
 *
 * Se devuelve la LISTA, no la primera: parte de lo que este archivo afirma es que hay exactamente
 * una (y, despues de anular, que no hay ninguna).
 *
 * @param {import('@playwright/test').Page} page
 * @param {number|string} presupuesto_id
 * @returns {Promise<Array<Object>>}
 */
async function ventas_del_presupuesto(page, presupuesto_id) {
	let encontradas = []

	// Se reintenta la navegacion entera: el listado dispara mas de un pedido --uno al montarse y
	// otro al cargar el dia-- y quedarse con el primero que pase puede agarrar el de antes.
	await expect(async () => {
		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/sale/from-date/') && res.request().method() === 'GET'),
			abrir_ventas_del_dia(page),
		])

		expect(respuesta.ok(), 'el listado de ventas del dia no cargo').toBeTruthy()

		const cuerpo = await respuesta.json()
		const ventas = cuerpo.models || cuerpo.sales || []

		encontradas = ventas.filter(venta => String(venta.budget_id) === String(presupuesto_id))
	}).toPass({ timeout: 90000 })

	return encontradas
}

/**
 * Ids de los movimientos de cuenta corriente de una venta, ubicados por su DETALLE.
 *
 * 🔴 Devuelve la lista, no uno: este archivo afirma tanto que hay UNO (tras confirmar) como que no
 * hay NINGUNO (tras anular), y las dos cosas se leen del mismo lugar.
 *
 * El detalle es lo estable: el backend lo escribe como `Venta N°<num>`
 * (`CurrentAcountFromSaleHelper`). El id del movimiento NO sirve de ancla -- editar la venta lo
 * recrea con otro id.
 *
 * Asume que el modal de la cuenta corriente ya esta abierto.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number|string} venta_num
 * @returns {Promise<string[]>}
 */
async function movimientos_de_la_venta(page, venta_num) {
	const filas = page.locator('[data-testid^="current_acount-row-"]')
	const cantidad = await filas.count()
	const encontrados = []

	for (let i = 0; i < cantidad; i++) {
		const id = (await filas.nth(i).getAttribute('data-testid')).replace('current_acount-row-', '')
		const detalle = page.locator(`[data-testid="celda-current_acount-detalle-${id}"]`)

		if (await detalle.count() === 0) {
			continue
		}

		if ((await detalle.innerText()).includes(`Venta N°${venta_num}`)) {
			encontrados.push(id)
		}
	}

	return encontrados
}

/**
 * Abre la cuenta corriente del cliente del fixture.
 *
 * 🔴 Siempre hay al menos una fila --la del presupuesto testigo-- y por eso se puede usar el helper
 * compartido tal cual. Ver la nota 1 del encabezado.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function abrir_cuenta_corriente_del_cliente(page) {
	await page.goto('/clientes/clientes')
	await esperar_recursos_descargados(page, { abrir_panel: false })
	await abrir_cuenta_corriente(page, contexto.cliente_id)
}

// ─────────────────────────────────────────────────────────────────────────────────────────────


test.describe.serial('Presupuesto: anular la confirmacion y volver a confirmar', () => {

	// ── Preparacion: el testigo, que se confirma y se deja quieto ────────────────────────────

	test('linea de base: el cliente y el stock de los articulos', async ({ page }) => {
		contexto.cliente_id = await id_del_cliente(page, CLIENTE)

		const { ids, stock } = await leer_articulos(page, ARTICULOS)
		contexto.ids = ids
		contexto.stock_previo = stock

		console.log(`[anular] cliente "${CLIENTE}" id ${contexto.cliente_id}`)
		console.log('[anular] stock previo: ' + JSON.stringify(stock))
	})

	test('crea el presupuesto TESTIGO', async ({ page }) => {
		contexto.testigo.presupuesto = await crear_presupuesto(page, PRESUPUESTO_TESTIGO)

		console.log(`[anular] testigo: presupuesto ${contexto.testigo.presupuesto.id}`)
	})

	test('confirma el TESTIGO y ubica su venta', async ({ page }) => {
		await abrir_presupuestos_del_dia(page)
		await accionar_presupuesto(page, contexto.testigo.presupuesto.id, 'confirmar')

		const ventas = await ventas_del_presupuesto(page, contexto.testigo.presupuesto.id)
		expect(ventas.length, 'el presupuesto testigo tenia que generar exactamente una venta').toBe(1)

		contexto.testigo.venta_num = ventas[0].num
		contexto.testigo.total = redondear(Number(ventas[0].total))

		console.log(`[anular] testigo: venta N° ${contexto.testigo.venta_num} por ${contexto.testigo.total}`)
	})

	test('el TESTIGO dejo su deuda en la cuenta corriente', async ({ page }) => {
		await abrir_cuenta_corriente_del_cliente(page)

		const movimientos = await movimientos_de_la_venta(page, contexto.testigo.venta_num)

		expect(
			movimientos.length,
			'la venta del presupuesto testigo tenia que dejar un movimiento en la cuenta corriente'
		).toBe(1)

		contexto.testigo.movimiento = movimientos[0]

		expect(
			await celda_numerica(page, 'current_acount', 'debe', contexto.testigo.movimiento),
			'el movimiento del testigo tenia que deber el total de su venta'
		).toBe(contexto.testigo.total)
	})

	// ── El presupuesto que se anula ──────────────────────────────────────────────────────────

	test('crea el presupuesto que se va a anular', async ({ page }) => {
		contexto.anulado.presupuesto = await crear_presupuesto(page, PRESUPUESTO_ANULADO)

		console.log(`[anular] a anular: presupuesto ${contexto.anulado.presupuesto.id}`)
	})

	test('confirmarlo genera la venta', async ({ page }) => {
		await abrir_presupuestos_del_dia(page)
		await accionar_presupuesto(page, contexto.anulado.presupuesto.id, 'confirmar')

		const ventas = await ventas_del_presupuesto(page, contexto.anulado.presupuesto.id)
		expect(ventas.length, 'el presupuesto tenia que generar exactamente una venta').toBe(1)

		contexto.anulado.venta_id = ventas[0].id
		contexto.anulado.venta_num = ventas[0].num
		contexto.anulado.total = redondear(Number(ventas[0].total))

		console.log(`[anular] a anular: venta N° ${contexto.anulado.venta_num} por ${contexto.anulado.total}`)
	})

	test('y descuenta el stock de sus renglones', async ({ page }) => {
		// El stock baja por los dos renglones de este presupuesto, y por el del testigo, que se
		// confirmo antes: los dos se miden contra la MISMA foto previa.
		const { stock } = await leer_articulos(page, ARTICULOS)

		for (const renglon of PRESUPUESTO_ANULADO.concat(PRESUPUESTO_TESTIGO)) {
			expect(
				redondear(contexto.stock_previo[renglon.articulo] - stock[renglon.articulo]),
				`confirmar tenia que descontar ${renglon.cantidad} de "${renglon.articulo}"`
			).toBe(renglon.cantidad)
		}
	})

	// ── I1 · Anular devuelve el sistema al estado previo ─────────────────────────────────────

	test('I1 · anular devuelve el stock', async ({ page }) => {
		await abrir_presupuestos_del_dia(page)
		await accionar_presupuesto(page, contexto.anulado.presupuesto.id, 'anular')

		const { stock } = await leer_articulos(page, ARTICULOS)

		// Los renglones anulados vuelven EXACTO a la foto previa: diferencia 0.
		for (const renglon of PRESUPUESTO_ANULADO) {
			expect(
				redondear(stock[renglon.articulo] - contexto.stock_previo[renglon.articulo]),
				`anular tenia que devolver las ${renglon.cantidad} unidades de "${renglon.articulo}"`
			).toBe(0)
		}

		// Y el testigo NO se toca: sigue descontado. Es el control de que anular no borro de mas.
		for (const renglon of PRESUPUESTO_TESTIGO) {
			expect(
				redondear(contexto.stock_previo[renglon.articulo] - stock[renglon.articulo]),
				`anular el otro presupuesto no tenia que devolver el stock de "${renglon.articulo}"`
			).toBe(renglon.cantidad)
		}
	})

	test('I1 · anular borra la venta del listado', async ({ page }) => {
		const ventas = await ventas_del_presupuesto(page, contexto.anulado.presupuesto.id)

		expect(ventas.length, 'anular tenia que borrar la venta que genero el presupuesto').toBe(0)
	})

	test('I1 · anular borra la deuda y no toca la del testigo', async ({ page }) => {
		await abrir_cuenta_corriente_del_cliente(page)

		expect(
			(await movimientos_de_la_venta(page, contexto.anulado.venta_num)).length,
			'anular tenia que sacar de la cuenta corriente la deuda de la venta borrada'
		).toBe(0)

		// El control: el movimiento del testigo sigue vivo y con su importe intacto.
		const testigo = await movimientos_de_la_venta(page, contexto.testigo.venta_num)

		expect(
			testigo.length,
			'anular un presupuesto no tenia que tocar el movimiento de OTRA venta'
		).toBe(1)

		expect(
			await celda_numerica(page, 'current_acount', 'debe', testigo[0]),
			'el movimiento del testigo tenia que quedar con su importe intacto'
		).toBe(contexto.testigo.total)
	})

	// ── I4 · El estado sigue al boton ────────────────────────────────────────────────────────

	test('I4 · el presupuesto anulado vuelve a "Sin confirmar"', async ({ page }) => {
		await abrir_presupuestos_del_dia(page)

		// El boton se da vuelta: es la señal en pantalla de que se puede volver a confirmar.
		await expect(
			page.locator(`[data-testid="btn-presupuesto-accion-${contexto.anulado.presupuesto.id}"]`),
			'anulado, el boton tenia que volver a ofrecer "confirmar"'
		).toHaveAttribute('data-accion', 'confirmar')

		// Y la columna de estado tiene que decir lo mismo que el boton. El manual promete que el
		// estado solo lo mueven Confirmar y Anular, asi que las dos lecturas no pueden diferir.
		await expect(
			page.locator(`[data-testid="celda-budget-budget_status_id-${contexto.anulado.presupuesto.id}"]`),
			'el estado del presupuesto anulado tenia que volver a "Sin confirmar"'
		).toContainText('Sin confirmar')

		// El testigo, en cambio, sigue confirmado.
		await expect(
			page.locator(`[data-testid="celda-budget-budget_status_id-${contexto.testigo.presupuesto.id}"]`),
			'el presupuesto testigo tenia que seguir confirmado'
		).toContainText('Confirmado')
	})

	// ── I2 e I3 · Volver a confirmar no duplica ni recalcula ─────────────────────────────────

	test('I2 · volver a confirmar deja UNA venta, con el mismo total', async ({ page }) => {
		await abrir_presupuestos_del_dia(page)
		await accionar_presupuesto(page, contexto.anulado.presupuesto.id, 'confirmar')

		const ventas = await ventas_del_presupuesto(page, contexto.anulado.presupuesto.id)

		expect(
			ventas.length,
			'confirmar de nuevo tenia que dejar UNA venta atada al presupuesto, no dos'
		).toBe(1)

		// I3 · anular + confirmar es un viaje de ida y vuelta, no una oportunidad de recalcular a
		// otro precio.
		expect(
			redondear(Number(ventas[0].total)),
			'la venta re-confirmada tenia que nacer con el mismo total que la primera'
		).toBe(contexto.anulado.total)

		contexto.anulado.venta_num = ventas[0].num
	})

	test('I2 · y descuenta el stock UNA sola vez', async ({ page }) => {
		const { stock } = await leer_articulos(page, ARTICULOS)

		for (const renglon of PRESUPUESTO_ANULADO) {
			expect(
				redondear(contexto.stock_previo[renglon.articulo] - stock[renglon.articulo]),
				`pasar por anular no tenia que descontar "${renglon.articulo}" dos veces`
			).toBe(renglon.cantidad)
		}
	})

	test('I2 · y deja UN solo movimiento de cuenta corriente', async ({ page }) => {
		await abrir_cuenta_corriente_del_cliente(page)

		const movimientos = await movimientos_de_la_venta(page, contexto.anulado.venta_num)

		expect(
			movimientos.length,
			'la venta re-confirmada tenia que dejar exactamente un movimiento de cuenta corriente'
		).toBe(1)

		expect(
			await celda_numerica(page, 'current_acount', 'debe', movimientos[0]),
			'la deuda que reaparece tenia que ser la misma de antes de anular'
		).toBe(contexto.anulado.total)
	})
})
