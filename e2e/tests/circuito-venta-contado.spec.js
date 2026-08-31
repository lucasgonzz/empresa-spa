// Circuito de una VENTA DE MOSTRADOR, de punta a punta y por la interfaz real.
//
// Tercero de los archivos del circuito e2e completo, y el primero del modulo Vender. Cubre la
// venta mas simple que existe --sin cliente, cobrada en el acto-- y despues la deshace:
//
//   1. Venta sin cliente, con metodo de pago y caja.
//   2. Que el descuento del metodo de pago quede aplicado en la venta.
//   3. Que la plata entre a la caja y el stock baje.
//   4. Que borrar la venta devuelva las dos cosas: la plata sale de la caja y el stock vuelve.
//
// Depende del fixture determinista de empresa-api
// (database/seeders/testing/TestingFerreteriaSeeder.php), y en particular de tres cosas que ese
// fixture siembra: el descuento del 10% para "Efectivo", la caja "Caja Efectivo" **abierta**, y
// los articulos del catalogo.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// Lo que hay que saber antes de tocar este archivo
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// 🔴 1. Serial y por DIFERENCIA, igual que el resto de los circuitos: el stock de un articulo y el
//    saldo de una caja arrancan en lo que dejo la corrida anterior.
//
// 🔴 2. El selector de caja ofrece SOLO las cajas abiertas (`cajas_abiertas` en
//    src/mixins/vender/cajas.js). Con las cajas cerradas el select se dibuja habilitado y VACIO, y
//    Playwright lo reporta como "did not find some options" --que manda a mirar el nombre de la
//    caja--. El fixture deja "Caja Efectivo" abierta justamente por esto.
//
// 🔴 3. El descuento por metodo de pago **no baja el total que muestra Vender** cuando se elige un
//    metodo con el selector simple. `mixins/vender_set_total.js` solo agrega una linea a la
//    descripcion del total; el descuento se aplica de verdad por dos caminos:
//      - el reparto en varios metodos de pago (el boton verde -> "Calcular"), o
//      - el backend, que lo resuelve solo al guardar
//        (`SaleHelper::resolver_descuento_recargo_metodo_pago`) y lo deja guardado en el pivote de
//        la venta con el metodo de pago.
//    Este archivo verifica el segundo camino, que es el que corre en una venta de mostrador comun.
//    El primero lo verifica circuito-multipago-devolucion.spec.js.
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { search_and_select, completar_campo } = require('../helpers/formulario')
const { numero_de_pantalla, numero_de_dato, redondear } = require('../helpers/numeros')

// ── Datos de entrada ─────────────────────────────────────────────────────────────────────────

/** Metodo de pago del fixture que tiene descuento configurado. */
const METODO_PAGO = 'Efectivo'
/** Porcentaje de ese descuento, tal cual lo siembra el fixture (DESCUENTO_EFECTIVO). */
const DESCUENTO_METODO = 10
/** Caja del fixture, la unica que nace ABIERTA. */
const CAJA = 'Caja Efectivo'

/**
 * Los renglones de la venta. Se eligen articulos del fixture que no toca ningun otro circuito con
 * expectativas absolutas: "Pinza" queda reservada para compra-costeo-facturacion.spec.js.
 */
const RENGLONES = [
	{ articulo: 'Alicate', cantidad: 2 },
	{ articulo: 'Cuchilla', cantidad: 3 },
]

// ── Estado compartido entre los tests seriales ───────────────────────────────────────────────

const contexto = {
	/** Modelo de la venta tal cual lo devolvio el POST. */
	venta: null,
	/** nombre del articulo -> su id en el sistema. */
	ids: {},
	/** nombre del articulo -> stock ANTES de vender. */
	stock_previo: {},
	/** Saldo de la caja antes de la venta. */
	saldo_caja_previo: null,
	/** Lo que efectivamente se cobro con el metodo de pago (sale del pivote de la venta). */
	cobrado: null,
}

// ── Helpers de este archivo ──────────────────────────────────────────────────────────────────

/**
 * Lee una celda numerica de una tabla por su testid de solo lectura.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} model_name
 * @param {string} key
 * @param {number|string} id
 * @returns {Promise<number>}
 */
async function celda_numerica(page, model_name, key, id) {
	const celda = page.locator(`[data-testid="celda-${model_name}-${key}-${id}"]`)
	await expect(celda).toBeVisible()

	return numero_de_pantalla(await celda.innerText())
}

/**
 * Entra al listado de articulos y devuelve, por nombre, el id y el stock de cada uno.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string[]} nombres
 * @returns {Promise<{ids: Object, stock: Object}>}
 */
async function leer_articulos(page, nombres) {
	await page.goto('/listado-de-articulos')
	await esperar_recursos_descargados(page, { abrir_panel: false })
	await expect(page.locator('[data-testid^="celda-article-name-"]').first()).toBeVisible()

	const ids = {}
	const stock = {}

	for (const nombre of nombres) {
		const id = await page.evaluate(texto => {
			const celda = [...document.querySelectorAll('[data-testid^="celda-article-name-"]')]
				.find(c => c.innerText.trim() === texto)
			return celda ? celda.dataset.testid.replace('celda-article-name-', '') : null
		}, nombre)

		expect(id, `no encontre el articulo "${nombre}" en el listado`).not.toBeNull()

		ids[nombre] = id
		stock[nombre] = await celda_numerica(page, 'article', 'stock', id)
	}

	return { ids, stock }
}

/**
 * Saldo de una caja, leido del modulo de tesoreria.
 *
 * 🔴 La ruta es `/caja`, en SINGULAR. `router/routes.js` declara el item del menu con
 * `path: '/cajas'` --eso es lo que ve el menu-- pero la que el router registra es
 * `/caja/:view?/:sub_view?`. Entrar a `/cajas` no matchea ninguna ruta y deja la pagina en blanco:
 * sin error de consola, sin 404, y con `$route.matched` vacio.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} nombre
 * @returns {Promise<number>}
 */
async function saldo_de_caja(page, nombre) {
	await page.goto('/caja')
	await esperar_recursos_descargados(page, { abrir_panel: false })

	const id = await page.evaluate(texto => {
		const celda = [...document.querySelectorAll('[data-testid^="celda-caja-name-"]')]
			.find(c => c.innerText.trim() === texto)
		return celda ? celda.dataset.testid.replace('celda-caja-name-', '') : null
	}, nombre)

	expect(id, `no encontre la caja "${nombre}" en el modulo de tesoreria`).not.toBeNull()

	return celda_numerica(page, 'caja', 'saldo', id)
}

/**
 * Entra a Vender con los recursos del arranque ya descargados.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function abrir_vender(page) {
	await page.goto('/vender')
	await esperar_recursos_descargados(page, { abrir_panel: false })
	// El selector de metodo de pago es de la etapa 1, que arranca abierta: es la señal de que la
	// pantalla ya se monto.
	await expect(page.locator('[data-testid="venta-metodo-pago"]')).toBeVisible()
}

/**
 * Agrega un articulo a la venta por el buscador por nombre y le pone la cantidad.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} nombre
 * @param {string} id Id del articulo, para ubicar su renglon.
 * @param {number} cantidad
 * @returns {Promise<void>}
 */
async function agregar_articulo(page, nombre, id, cantidad) {
	// El buscador de articulos de Vender es el `search-component` generico con `id="search-article"`,
	// asi que publica su testid solo y `search_and_select` sirve tal cual: click, tecleo real,
	// Enter que BUSCA, y click en el primer resultado.
	await search_and_select(page, 'search-article', nombre)

	// completar_campo y no fill(): el input de la cantidad es controlado y un fill que caiga
	// mientras la fila se termina de dibujar se pisa solo, sin ningun error.
	await completar_campo(page, `venta-item-cantidad-${id}`, cantidad)
}

/**
 * Total que muestra Vender, leido del `data-monto` y no del texto.
 *
 * `price()` recorta los decimales cuando son ",00", asi que del texto no siempre se puede sacar el
 * numero. Mismo criterio que los renglones de Posicion Fiscal.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
async function total_de_la_venta(page) {
	const total = page.locator('[data-testid="venta-total"]')
	await expect(total).toBeVisible()

	return numero_de_dato(await total.getAttribute('data-monto'))
}

/**
 * Fecha de hoy en YYYY-MM-DD, para el control de fechas de los modulos que se ven por dia.
 *
 * @returns {string}
 */
function fecha_de_hoy() {
	const hoy = new Date()
	return [
		hoy.getFullYear(),
		String(hoy.getMonth() + 1).padStart(2, '0'),
		String(hoy.getDate()).padStart(2, '0'),
	].join('-')
}

/**
 * Entra al listado de ventas y deja el dia de hoy CARGADO.
 *
 * 🔴 Ventas es uno de los modulos que se ven por fecha, y esos NO disparan el listado al montarse
 * (`disparar_listado_por_defecto()` en view/Index.vue). Sin el click en el dia, la tabla dice "No
 * hay Ventas" con las ventas en la base.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function abrir_ventas_del_dia(page) {
	await page.goto('/ventas')
	await esperar_recursos_descargados(page, { abrir_panel: false })

	const hoy = page.locator(`[data-testid="control-fecha-dia"][data-fecha="${fecha_de_hoy()}"]`)
	await expect(hoy, 'el control de fechas tenia que ofrecer el dia de hoy').toBeVisible()
	await hoy.click()
}

// ─────────────────────────────────────────────────────────────────────────────────────────────

test.describe.serial('Venta de mostrador: cobro con descuento, caja, y su reversion al borrarla', () => {

	test('linea de base: stock de los articulos y saldo de la caja antes de vender', async ({ page }) => {
		// No verifica nada: saca la foto previa. Es lo que permite correr el archivo dos veces
		// sobre la misma base.
		const { ids, stock } = await leer_articulos(page, RENGLONES.map(r => r.articulo))
		contexto.ids = ids
		contexto.stock_previo = stock

		contexto.saldo_caja_previo = await saldo_de_caja(page, CAJA)

		console.log('[venta] stock previo: ' + JSON.stringify(stock))
		console.log(`[venta] saldo previo de "${CAJA}": ${contexto.saldo_caja_previo}`)
	})

	test('crea una venta sin cliente, con metodo de pago con descuento y caja', async ({ page }) => {
		await abrir_vender(page)

		// Sin cliente: es una venta de mostrador. No se toca el buscador de clientes, y por eso
		// tampoco existen los toggles de "guardar como presupuesto" ni "omitir en cuenta corriente"
		// --los dos se dibujan solo con un cliente elegido--.
		for (const renglon of RENGLONES) {
			await agregar_articulo(page, renglon.articulo, contexto.ids[renglon.articulo], renglon.cantidad)
		}

		const total_en_pantalla = await total_de_la_venta(page)
		expect(total_en_pantalla, 'la venta tenia que tener un total mayor a cero').toBeGreaterThan(0)

		await page.locator('[data-testid="venta-metodo-pago"]').selectOption({ label: METODO_PAGO })
		// 🔴 Si este selectOption falla con "did not find some options", la caja esta CERRADA: el
		//    select solo ofrece las abiertas. No es que falte la caja.
		await page.locator('[data-testid="venta-caja"]').selectOption({ label: CAJA })

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/sale') && res.request().method() === 'POST'),
			page.locator('[data-testid="btn-guardar-venta"]').click(),
		])
		expect(respuesta.ok(), 'el POST de la venta no salio bien').toBeTruthy()

		const cuerpo = await respuesta.json()
		contexto.venta = cuerpo.model
		expect(contexto.venta && contexto.venta.id, 'el POST de la venta no devolvio un modelo con id').toBeTruthy()

		console.log(`[venta] N° ${contexto.venta.num} (id ${contexto.venta.id}) - total ${contexto.venta.total}`)
	})

	test('el descuento del metodo de pago queda guardado en la venta', async ({ page }) => {
		// El descuento no baja el total que muestra Vender (ver la nota 3 del encabezado): lo
		// resuelve el backend al guardar y lo deja en el pivote de la venta con el metodo de pago.
		await abrir_ventas_del_dia(page)

		const fila = page.locator(`[data-testid="sale-row-${contexto.venta.id}"]`)
		await expect(fila, 'la venta tenia que aparecer en el listado del dia').toBeVisible()

		// Se lee del modelo que devolvio el servidor, que es donde vive el pivote.
		const metodos = contexto.venta.current_acount_payment_methods || []
		expect(metodos.length, 'la venta tenia que quedar con un metodo de pago adjunto').toBe(1)

		const pivote = metodos[0].pivot
		expect(
			redondear(Number(pivote.discount_percentage)),
			`el metodo "${METODO_PAGO}" tiene un descuento configurado y la venta tenia que registrarlo`
		).toBe(DESCUENTO_METODO)

		// Lo que efectivamente se cobro con ese metodo: es contra esto que se mide la caja.
		contexto.cobrado = redondear(Number(pivote.amount))
		expect(contexto.cobrado, 'el importe cobrado tenia que ser mayor a cero').toBeGreaterThan(0)

		console.log(`[venta] cobrado ${contexto.cobrado} con ${METODO_PAGO} (descuento ${pivote.discount_percentage}%)`)
	})

	test('la plata entra a la caja y el stock baja por lo vendido', async ({ page }) => {
		expect(
			redondear(await saldo_de_caja(page, CAJA) - contexto.saldo_caja_previo),
			'la caja tenia que recibir exactamente lo que la venta dice que se cobro con ese metodo'
		).toBe(contexto.cobrado)

		const { stock } = await leer_articulos(page, RENGLONES.map(r => r.articulo))

		for (const renglon of RENGLONES) {
			expect(
				redondear(contexto.stock_previo[renglon.articulo] - stock[renglon.articulo]),
				`el stock de "${renglon.articulo}" tenia que bajar ${renglon.cantidad}`
			).toBe(renglon.cantidad)
		}
	})

	test('borrar la venta devuelve la plata a la caja y el stock a los articulos', async ({ page }) => {
		await abrir_ventas_del_dia(page)

		// Se selecciona la venta y se borra por el dropdown de la SELECCION (no el de filtrados).
		await page.locator(`[data-testid="sale-row-${contexto.venta.id}"]`).click()

		await page.locator('[data-testid="masiva-dropdown-seleccion"]').click()
		await page.locator('[data-testid="masiva-opcion-eliminar-seleccion"]').click()

		// 🔴 "Compensar caja" NO viene tildado, y sin el la plata NO sale de la caja: la venta se
		//    borra igual pero el movimiento queda. Es lo que hace que el saldo de la caja y las
		//    ventas del dia dejen de coincidir, y es justo lo que este test vino a verificar.
		const compensar = page.locator('[data-testid="confirm-compensar-caja"]')
		await expect(compensar, 'el borrado tenia que ofrecer compensar la caja').toBeVisible()
		await compensar.check()

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/sale') && res.request().method() === 'DELETE'),
			page.locator('[data-testid="btn-confirmar-sale-delete-models"]').click(),
		])
		expect(respuesta.ok(), 'el DELETE de la venta no salio bien').toBeTruthy()

		// La plata vuelve a salir de la caja: el saldo tiene que quedar como estaba antes de vender.
		await expect(async () => {
			expect(
				await saldo_de_caja(page, CAJA),
				'la caja tenia que volver al saldo que tenia antes de la venta'
			).toBe(contexto.saldo_caja_previo)
		}).toPass({ timeout: 60000 })

		// Y el stock vuelve. El propio cartel de confirmacion lo promete: "Se repondran los
		// articulos".
		const { stock } = await leer_articulos(page, RENGLONES.map(r => r.articulo))

		for (const renglon of RENGLONES) {
			expect(
				stock[renglon.articulo],
				`el stock de "${renglon.articulo}" tenia que volver al valor de antes de la venta`
			).toBe(contexto.stock_previo[renglon.articulo])
		}
	})
})
