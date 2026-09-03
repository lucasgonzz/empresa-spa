// Exploración del módulo Alertas — pestaña COBROS (3/9/2026).
//
// Qué afirma este archivo:
//
//   1. La coherencia interna de la pestaña: el badge de la nav, la cantidad de tarjetas y el
//      contador del toolbar hablan siempre del mismo conjunto (badge == tarjetas; contador ==
//      tarjetas CON cliente — la fila "sin cliente" cuenta para el badge y no para el contador).
//   2. La cascada de días por rol: una venta a cuenta corriente hecha HOY no alerta (el fixture
//      configura 1 día), y el filtro "Ventas de hace más de N días" la trae con 0, la esconde
//      con 3, y al vaciarlo vuelve la cascada.
//   3. 🔴 El umbral de $300 de `pagandose` (VentasSinCobrarHelper::query_de_ventas): un cobro
//      parcial que deja el resto POR ENCIMA de 300 mantiene la venta en la alerta con el resto
//      como monto; el que deja el resto EN O BAJO 300 la saca de la alerta AUNQUE LA DEUDA SIGA
//      EXISTIENDO. Este test fija el comportamiento real del producto: si algún día el umbral
//      se hace configurable o se elimina, este archivo se pone rojo — que es la señal buscada.
//      Una venta `sin_pagar`, en cambio, alerta desde cualquier monto.
//
// De qué depende del fixture: el cliente "Cliente Contado" (con credit_account en pesos), el
// artículo "Cuchara", la sucursal "Principal", la "Caja Efectivo" abierta, y la cascada de días
// en 1 (`users.dias_alertar_administradores_ventas_no_cobradas`, UserSeeder).
//
// Trampas que ya costaron una corrida en otros specs y acá se esquivan:
//   - Todo por diferencia: la base acumula ventas sin cobrar de corridas anteriores (el circuito
//     de presupuesto deja una cada vez). Nada afirma cantidades absolutas de tarjetas.
//   - El monto se lee del `data-monto` (crudo, punto decimal), nunca del texto es-AR.
//   - El total de la venta se toma del POST, no se recalcula a mano (README: "refrescá el
//     contexto con lo que devolvió el servidor").
//   - Los cobros parciales se hacen sobre la venta QUE ESTE SPEC CREA (con el filtro en 0 para
//     que sea alertable hoy): usar una venta vieja del fixture rompería la segunda corrida,
//     porque el primer cobro la dejaría fuera de la alerta para siempre.

const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { search_and_select } = require('../helpers/formulario')
const { redondear } = require('../helpers/numeros')
const {
	abrir_vender,
	agregar_articulo,
	elegir_opcion_que_contenga,
	leer_articulos,
	abrir_cuenta_corriente,
} = require('../helpers/vender')

const CLIENTE = 'Cliente Contado'
const ARTICULO = 'Cuchara'
const CANTIDAD = 5
const DEPOSITO = 'Principal'
const CAJA = 'Caja Efectivo'
const PAGO_METODO = 'Efectivo'

// El primer cobro deja este resto (> 300: la venta tiene que SEGUIR alertando).
const RESTO_QUE_SIGUE = 400
// El segundo cobro achica el resto a este valor (<= 300: la venta tiene que DESAPARECER).
const RESTO_QUE_DESAPARECE = 250

const contexto = {
	/** nombre -> id de los artículos que usa el spec. */
	ids: {},
	/** Cantidad de tarjetas de la foto previa (filtro por defecto). */
	tarjetas_previas: null,
	/** Modelo de la venta creada, tal cual lo devolvió el POST. */
	venta: null,
	/** Id del cliente de la venta. */
	cliente_id: null,
}

/**
 * Entra a la pestaña Cobros de Alertas con los recursos descargados.
 *
 * Entrar a /alertas ya refresca la lista: la nav emite el setSelected inicial y Alertas.vue
 * despacha `sale/ventas_sin_cobrar/getModels` cuando la vista activa es cobros.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function abrir_cobros(page) {
	await page.goto('/alertas/cobros')
	await esperar_recursos_descargados(page, { abrir_panel: false })
	await expect(page.locator('[data-testid="alertas-cobros-dias"]')).toBeVisible()
}

/**
 * Aplica el filtro de días y espera la respuesta del endpoint.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} dias Texto a poner en el input ('' = vaciar, volver a la cascada).
 * @returns {Promise<void>}
 */
async function aplicar_dias(page, dias) {
	const input = page.locator('[data-testid="alertas-cobros-dias"]')
	await input.fill(String(dias))

	const [respuesta] = await Promise.all([
		page.waitForResponse(res => res.url().includes('sales-ventas-sin-cobrar') && res.request().method() === 'GET'),
		page.locator('[data-testid="alertas-cobros-aplicar-dias"]').click(),
	])
	expect(respuesta.ok(), 'el GET de ventas sin cobrar no salió bien').toBeTruthy()
}

/**
 * Lee el estado visible de la pestaña: tarjetas, tarjetas con cliente, badge y contador.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{tarjetas: number, con_cliente: number, badge: number, contador: number}>}
 */
async function estado_de_cobros(page) {
	return page.evaluate(() => {
		const tarjetas = [...document.querySelectorAll('[data-testid="alertas-cobros-cliente"]')]
		const con_cliente = tarjetas.filter(t => t.dataset.clienteId !== 'sin-cliente')

		// El badge es el b-badge de la pestaña; con 0 alertas no se dibuja.
		const item = document.querySelector('[data-testid="nav-item-Cobros"]')
		const badge = item ? item.querySelector('.badge') : null

		const contador = document.querySelector('[data-testid="alertas-cobros-contador"]')

		return {
			tarjetas: tarjetas.length,
			con_cliente: con_cliente.length,
			badge: badge ? Number(badge.innerText.trim()) : 0,
			contador: contador ? Number(contador.dataset.clientes) : null,
		}
	})
}

/**
 * La coherencia interna que la pestaña tiene que sostener SIEMPRE, con cualquier dato.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} momento Para el mensaje del rojo.
 * @returns {Promise<Object>} El estado leído, para encadenarle más aserciones.
 */
async function afirmar_coherencia(page, momento) {
	const estado = await estado_de_cobros(page)

	expect(estado.badge, `(${momento}) el badge de la pestaña tiene que contar las tarjetas`).toBe(estado.tarjetas)
	expect(estado.contador, `(${momento}) el contador del toolbar cuenta solo tarjetas con cliente`).toBe(estado.con_cliente)

	return estado
}

/**
 * Registra un cobro parcial IMPUTADO a la venta del spec, seleccionando su movimiento.
 *
 * 🔴 La fila se selecciona a propósito, y esto lo enseñó un rojo (3/9/2026): sin fila, el pago
 * va al débito MÁS VIEJO del cliente (CurrentAcountPagoHelper carga los pendientes por
 * antigüedad), y este archivo DEJA una deuda viva en cada corrida — el test final saca la venta
 * de la alerta con un resto de $250 sin saldarla. En la segunda corrida ese resto viejo era el
 * débito más viejo, el cobro se repartía entre las dos ventas, y el resto de la venta nueva no
 * daba lo esperado. Con la fila seleccionada el pago viaja con `to_pay_id` y se imputa entero a
 * la venta de ESTA corrida. El movimiento se busca por su detalle ("Venta N°<num>") con el id
 * más alto, el patrón de siempre para valores que se repiten entre corridas.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} cliente_id
 * @param {string|number} venta_num Número de la venta del spec.
 * @param {number} monto
 * @returns {Promise<void>}
 */
async function cobrar_parcial(page, cliente_id, venta_num, monto) {
	await page.goto('/clientes/clientes')
	await esperar_recursos_descargados(page, { abrir_panel: false })
	await abrir_cuenta_corriente(page, cliente_id)

	// El movimiento de la venta del spec, por detalle y con el id más alto.
	const filas = page.locator('[data-testid^="current_acount-row-"]')
	let movimiento = null

	await expect(async () => {
		const cantidad = await filas.count()
		movimiento = null

		for (let i = 0; i < cantidad; i++) {
			const id = (await filas.nth(i).getAttribute('data-testid')).replace('current_acount-row-', '')
			const detalle = page.locator(`[data-testid="celda-current_acount-detalle-${id}"]`)

			if (await detalle.count() === 0) {
				continue
			}

			if ((await detalle.innerText()).includes(`Venta N°${venta_num}`)) {
				if (movimiento === null || Number(id) > Number(movimiento)) {
					movimiento = id
				}
			}
		}

		expect(movimiento, `la cuenta no tiene el movimiento de la venta N° ${venta_num}`).not.toBeNull()
	}).toPass({ timeout: 30000 })

	await page.locator(`[data-testid="current_acount-row-${movimiento}"]`).click()

	const boton_pago = page.locator('[data-testid="btn-registrar-pago"]')
	await expect(boton_pago).toHaveAttribute('data-precargado', 'si')
	await boton_pago.click()

	// 🔴 El importe precargado se pisa con TIPEO REAL (Ctrl+A + teclas), no con fill():
	// medido el 3/9/2026 — el fill dejaba el input MOSTRANDO el parcial, completar_campo lo
	// daba por bueno leyendo inputValue, y el POST igual salía con el importe precargado
	// (16.408,94 en vez de 16.008,94): el modelo interno del modal nunca se enteró de la
	// edición y la venta quedó PAGADA entera. Es la variante inversa de la trampa "un fill()
	// puede perderse" del README: acá lo que se pierde no es lo que se ve, sino lo que viaja.
	const monto_input = page.locator('[data-testid="pago-monto-0"]')
	await monto_input.click()
	await monto_input.press('Control+a')
	await monto_input.pressSequentially(String(monto), { delay: 25 })
	await expect(monto_input).toHaveValue(String(monto))
	await page.locator('[data-testid="pago-metodo-0"]').selectOption({ label: PAGO_METODO })
	await page.locator('[data-testid="pago-caja-0"]').selectOption({ label: CAJA })

	const [respuesta] = await Promise.all([
		page.waitForResponse(res => res.url().includes('/current-acount/pago') && res.request().method() === 'POST'),
		page.locator('[data-testid="btn-confirmar-pago"]').click(),
	])
	expect(respuesta.ok(), 'el POST del cobro parcial no salió bien').toBeTruthy()
}

// ─────────────────────────────────────────────────────────────────────────────────────────────

test.describe.serial('Alertas · Cobros: cascada de días, filtro y el umbral de $300', () => {

	test('línea de base: la pestaña es coherente consigo misma', async ({ page }) => {
		const { ids } = await leer_articulos(page, [ARTICULO])
		contexto.ids = ids

		await abrir_cobros(page)

		const estado = await afirmar_coherencia(page, 'foto previa')
		contexto.tarjetas_previas = estado.tarjetas

		console.log(`[alertas-cobros] foto previa: ${estado.tarjetas} tarjetas, badge ${estado.badge}`)
	})

	test('una venta a cuenta corriente de HOY no alerta con la cascada del fixture (1 día)', async ({ page }) => {
		await abrir_vender(page)

		await search_and_select(page, 'select_client_vender', CLIENTE)
		await agregar_articulo(page, ARTICULO, contexto.ids[ARTICULO], CANTIDAD)
		await elegir_opcion_que_contenga(page, 'venta-sucursal', DEPOSITO)

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/sale') && res.request().method() === 'POST'),
			page.locator('[data-testid="btn-guardar-venta"]').click(),
		])
		expect(respuesta.ok(), 'el POST de la venta no salió bien').toBeTruthy()

		contexto.venta = (await respuesta.json()).model
		contexto.cliente_id = contexto.venta.client_id

		expect(contexto.venta && contexto.venta.id, 'el POST no devolvió la venta').toBeTruthy()
		console.log(`[alertas-cobros] venta ${contexto.venta.id} por ${contexto.venta.total} al cliente ${contexto.cliente_id}`)

		// La deuda existe desde ya — pero la alerta rige por antigüedad: hoy no está.
		await abrir_cobros(page)
		await afirmar_coherencia(page, 'venta de hoy, filtro por defecto')
		await expect(
			page.locator(`[data-testid="alertas-cobros-venta-falta-${contexto.venta.id}"]`),
			'la venta de HOY no puede alertar con la cascada en 1 día'
		).toHaveCount(0)
	})

	test('con el filtro en 0 la venta aparece, con el monto completo adeudado', async ({ page }) => {
		await abrir_cobros(page)
		await aplicar_dias(page, '0')

		const falta = page.locator(`[data-testid="alertas-cobros-venta-falta-${contexto.venta.id}"]`)
		await expect(falta, 'con 0 días la venta de hoy tiene que estar').toBeVisible()

		expect(
			redondear(Number(await falta.getAttribute('data-monto'))),
			'lo que falta cobrar tiene que ser el total de la venta (no hay cobros todavía)'
		).toBe(redondear(Number(contexto.venta.total)))

		// Y la tarjeta es la del cliente de la venta.
		const tarjeta = page.locator(`[data-testid="alertas-cobros-cliente"][data-cliente-id="${contexto.cliente_id}"]`)
		await expect(tarjeta, 'la tarjeta tiene que ser la del cliente de la venta').toBeVisible()

		await afirmar_coherencia(page, 'filtro en 0')
	})

	test('con el filtro en 3 la venta de hoy desaparece; al vaciarlo vuelve la cascada', async ({ page }) => {
		await abrir_cobros(page)

		await aplicar_dias(page, '3')
		await expect(
			page.locator(`[data-testid="alertas-cobros-venta-falta-${contexto.venta.id}"]`),
			'con 3 días de umbral una venta de hoy no puede estar'
		).toHaveCount(0)
		await afirmar_coherencia(page, 'filtro en 3')

		// Vaciar el input NO es pedir "0 días": es volver al comportamiento de siempre.
		await aplicar_dias(page, '')
		await expect(
			page.locator(`[data-testid="alertas-cobros-venta-falta-${contexto.venta.id}"]`),
			'con el filtro vacío rige la cascada (1 día) y la venta de hoy no está'
		).toHaveCount(0)
		await afirmar_coherencia(page, 'filtro vacío')
	})

	test('un cobro parcial que deja el resto ARRIBA de $300 mantiene la venta alertando, por el resto', async ({ page }) => {
		const total = Number(contexto.venta.total)
		const cobro = redondear(total - RESTO_QUE_SIGUE)

		expect(cobro, `la venta (${total}) tiene que superar los ${RESTO_QUE_SIGUE} para poder cobrar de menos`).toBeGreaterThan(0)

		await cobrar_parcial(page, contexto.cliente_id, contexto.venta.num, cobro)

		await abrir_cobros(page)
		await aplicar_dias(page, '0')

		const falta = page.locator(`[data-testid="alertas-cobros-venta-falta-${contexto.venta.id}"]`)
		await expect(
			falta,
			`con un resto de ${RESTO_QUE_SIGUE} (> 300) la venta tiene que seguir en la alerta`
		).toBeVisible()

		expect(
			redondear(Number(await falta.getAttribute('data-monto'))),
			'el monto de la tarjeta tiene que ser lo que FALTA, no el total original'
		).toBe(RESTO_QUE_SIGUE)

		await afirmar_coherencia(page, 'cobro parcial, resto > 300')
	})

	test('🔴 el cobro que deja el resto EN O BAJO $300 saca la venta de la alerta, con la deuda viva', async ({ page }) => {
		// Fija el comportamiento real: el umbral de 300 está hardcodeado en
		// VentasSinCobrarHelper::query_de_ventas() y solo rige para el estado `pagandose`.
		// El operador no ve este recorte en ninguna pantalla — está documentado en el manual.
		const cobro = RESTO_QUE_SIGUE - RESTO_QUE_DESAPARECE

		await cobrar_parcial(page, contexto.cliente_id, contexto.venta.num, cobro)

		await abrir_cobros(page)
		await aplicar_dias(page, '0')

		await expect(
			page.locator(`[data-testid="alertas-cobros-venta-falta-${contexto.venta.id}"]`),
			`con un resto de ${RESTO_QUE_DESAPARECE} (<= 300) la venta desaparece de la alerta aunque la deuda siga`
		).toHaveCount(0)

		await afirmar_coherencia(page, 'cobro parcial, resto <= 300')
	})
})
