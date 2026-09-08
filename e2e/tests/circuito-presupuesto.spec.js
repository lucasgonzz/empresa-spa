// Circuito del PRESUPUESTO, de punta a punta y por la interfaz real.
//
// Cuarto archivo del circuito e2e completo, y el segundo del modulo Vender. Cubre el camino largo
// de una venta a cuenta corriente, que empieza sin ser una venta:
//
//   1. Un presupuesto con cliente, guardado desde Vender.
//   2. Encontrarlo, agregarle un articulo y volver a guardarlo.
//   3. Confirmarlo: ahi recien nace la venta y recien ahi se mueve el stock.
//   4. Que esa venta haya ido a la cuenta corriente del cliente.
//   5. Editarla --cantidades y precios-- y que el total se recalcule.
//   6. Aplicarle un descuento y que la cuenta corriente lo siga.
//   7. Cobrarla, y que el pago quede imputado.
//
// Depende del fixture determinista de empresa-api
// (database/seeders/testing/TestingFerreteriaSeeder.php): el cliente "Cliente Cuenta Corriente",
// la caja "Caja Efectivo" abierta, el descuento de venta "Descuento e2e" y los articulos.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// Lo que hay que saber antes de tocar este archivo
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// 🔴 1. Serial y por DIFERENCIA, como el resto de los circuitos. Ningun numero se compara contra
//    un absoluto: el stock y el saldo de la cuenta corriente arrancan en lo que dejo la corrida
//    anterior.
//
// 🔴 2. Un presupuesto NO es una venta y por eso no toca nada: no descuenta stock, no genera
//    movimiento de cuenta corriente y no aparece en el listado de ventas. Todo eso pasa recien al
//    CONFIRMARLO, que es cuando `BudgetHelper::saveSale()` crea la venta. Este archivo verifica las
//    dos mitades por separado justamente porque es facil creer que el presupuesto ya reservo algo.
//
// 🔴 3. El presupuesto **exige un cliente**. Sin cliente elegido, el toggle "Guardar como
//    presupuesto" ni siquiera se dibuja (`GuardarComoPresupuesto.vue` pide `client`), y si se
//    llegara a guardar igual, `BtnGuardar.check()` corta con un toast. No es un dato opcional del
//    circuito: es la precondicion.
//
// 🔴 4. Los tres verbos del presupuesto son endpoints distintos, y conviene esperarlos por
//    separado: `POST budget` lo crea, `PUT budget/{id}` lo actualiza, y
//    `POST budget/{id}/confirmar` lo confirma y genera la venta. Confirmar devuelve el
//    PRESUPUESTO, no la venta -- `Budget::scopeWithAll` no carga la relacion `sale`--, asi que la
//    venta hay que ubicarla aparte. Se hace mirando que id APARECIO en el listado, no agarrando el
//    ultimo: en una base con otras corridas encima, "el ultimo" es cualquier cosa.
//
// 🔴 5. Editar una venta ya guardada se hace desde el modal de la venta, con "Actualizar venta":
//    eso la carga en Vender como `previus_sale` y el boton de guardar pasa a decir "ACTUALIZAR
//    venta". No hay edicion en linea en el listado.

const { test, expect } = require('../fixtures')
const { redondear } = require('../helpers/numeros')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { search_and_select } = require('../helpers/formulario')
const {
	celda_numerica,
	leer_articulos,
	saldo_de_caja,
	abrir_vender,
	agregar_articulo,
	elegir_opcion_que_contenga,
	abrir_etapa_3,
	poner_toggle,
	total_de_la_venta,
	abrir_modulo_del_dia,
	abrir_cuenta_corriente,
} = require('../helpers/vender')

// ── Datos de entrada ─────────────────────────────────────────────────────────────────────────

/** Cliente del fixture que trabaja con cuenta corriente. */
const CLIENTE = 'Cliente Cuenta Corriente'
/** Sucursal del fixture. Sin sucursal elegida la venta no se guarda. */
const DEPOSITO = 'Principal'
/** Caja del fixture, la unica que nace ABIERTA. */
const CAJA = 'Caja Efectivo'
/** Metodo de pago con el que se cobra la venta al final. */
const PAGO_METODO = 'Efectivo'
/** Descuento de venta que siembra el fixture, y su porcentaje. */
const DESCUENTO = 'Descuento e2e'
const DESCUENTO_PORCENTAJE = 15

/** Los dos articulos con los que nace el presupuesto. */
const RENGLONES = [
	{ articulo: 'Pata de cama', cantidad: 3 },
	{ articulo: 'Marco para cama', cantidad: 2 },
]

/** El que se le agrega al presupuesto en el segundo paso. */
const RENGLON_AGREGADO = { articulo: 'Pintura para cama', cantidad: 4 }

/** Todos los renglones con los que nace la venta al confirmarse el presupuesto. */
const TODOS = RENGLONES.concat([RENGLON_AGREGADO])

/**
 * El que se le agrega a la VENTA ya confirmada, al editarla. Es la otra mitad de "actualizar la
 * venta": no alcanza con cambiar cantidades y precios de lo que ya estaba.
 */
const RENGLON_EN_LA_VENTA = { articulo: 'Cuchilla', cantidad: 2 }

// ── Estado compartido entre los tests seriales ───────────────────────────────────────────────

const contexto = {
	/** Id del cliente en el sistema. */
	cliente_id: null,
	/** nombre del articulo -> su id. */
	ids: {},
	/** nombre del articulo -> stock antes de que exista el presupuesto. */
	stock_previo: {},
	/** Modelo del presupuesto tal cual lo devolvio el POST. */
	presupuesto: null,
	/** Total del presupuesto despues de agregarle el tercer articulo. */
	total_presupuesto: null,
	/** Id de la venta que genero la confirmacion. */
	venta_id: null,
	/** Numero de esa venta: es como se la reconoce en la cuenta corriente. */
	venta_num: null,
	/** Total de la venta, actualizado en cada paso que lo cambia. */
	total_venta: null,
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
 * Ubica la venta que genero la confirmacion de un presupuesto.
 *
 * 🔴 No se hace comparando el listado antes y despues. Suena razonable --"la venta nueva es la que
 * aparecio"-- y no funciona: la foto de antes puede salir de una vista distinta a la de despues
 * (el listado se parte por sucursal, y la solapa de una sucursal **no existe** mientras el dia no
 * tenga ninguna venta de esa sucursal), asi que la diferencia da cualquier cosa. Costo una corrida
 * el 31/8/2026, con el rojo diciendo "tenia que generar exactamente UNA venta" y tres de mas.
 *
 * Lo que si es exacto: la venta que sale de un presupuesto guarda su `budget_id`, y el listado ya
 * lo trae. Se lee de la MISMA respuesta que uso la pantalla.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number|string} presupuesto_id
 * @returns {Promise<Object>}
 */
async function venta_del_presupuesto(page, presupuesto_id) {
	let encontrada = null

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

		encontrada = ventas.find(venta => String(venta.budget_id) === String(presupuesto_id))

		expect(
			encontrada,
			`ninguna venta del dia quedo atada al presupuesto ${presupuesto_id}`
		).toBeTruthy()
	}).toPass({ timeout: 90000 })

	return encontrada
}

/**
 * Ubica el movimiento de cuenta corriente de una venta, por su DETALLE.
 *
 * 🔴 No se puede guardar el id del movimiento y reusarlo: **editar la venta lo recrea con otro id**.
 * `SaleHelper::updateCurrentAcountsAndCommissions()` borra el movimiento anterior y crea uno nuevo
 * leyendo `sales.total`, asi que despues de cada edicion el id que uno tenia apunta a una fila que
 * ya no existe. El sintoma es un timeout esperando una celda --`celda-current_acount-debe-<id>`--
 * que nunca va a aparecer, y manda a pensar que la cuenta corriente no se actualizo cuando en
 * realidad se actualizo tan bien que se rehizo entera. Costo una corrida el 31/8/2026.
 *
 * Lo estable es el detalle, que el backend escribe como `Venta N°<num>`
 * (`CurrentAcountFromSaleHelper`). Se busca el id mas alto que lo tenga, por el mismo motivo que en
 * el resto del harness: a partir de la segunda corrida hay varios candidatos.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number|string} cliente_id
 * @param {number|string} venta_num
 * @returns {Promise<string>} Id del movimiento.
 */
async function movimiento_de_la_venta(page, cliente_id, venta_num) {
	await page.goto('/clientes/clientes')
	await esperar_recursos_descargados(page, { abrir_panel: false })
	await abrir_cuenta_corriente(page, cliente_id)

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

		expect(
			movimiento,
			`la cuenta corriente del cliente no tiene el movimiento de la venta N° ${venta_num}`
		).not.toBeNull()
	}).toPass({ timeout: 30000 })

	return movimiento
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
 * Carga la venta guardada en Vender para editarla.
 *
 * 🔴 El unico camino es el modal de la venta: click en la fila -> "Actualizar venta". Eso la deja
 * en Vender como `previus_sale` y cambia el boton de guardar a "ACTUALIZAR venta" (mismo testid).
 *
 * @param {import('@playwright/test').Page} page
 * @param {number|string} venta_id
 * @returns {Promise<void>}
 */
async function abrir_venta_para_editar(page, venta_id) {
	await abrir_ventas_del_dia(page)

	// El modo seleccion tiene que estar apagado para que el click abra la venta en vez de
	// seleccionarla. Ver la nota del circuito de venta de mostrador.
	const modo_seleccion = page.locator('[data-testid="btn-modo-seleccion"]')
	await expect(modo_seleccion).toBeVisible()

	if (await modo_seleccion.getAttribute('data-activo') === 'si') {
		await modo_seleccion.click()
	}

	await page.locator(`[data-testid="sale-row-${venta_id}"]`).click()

	const btn = page.locator('[data-testid="btn-actualizar-venta"]')
	await expect(btn, 'el modal de la venta tenia que ofrecer "Actualizar venta"').toBeVisible()
	await btn.click()

	// Vender montado y con la venta adentro: el renglon del primer articulo tiene que estar.
	await expect(
		page.locator(`[data-testid="venta-item-cantidad-${contexto.ids[TODOS[0].articulo]}"]`),
		'la venta tenia que quedar cargada en Vender'
	).toBeVisible()
}

/**
 * Guarda lo que haya en Vender y devuelve el modelo que contesto el servidor.
 *
 * @param {import('@playwright/test').Page} page
 * @param {RegExp|string} ruta Parte de la URL que identifica al endpoint esperado.
 * @param {string} metodo
 * @returns {Promise<Object>}
 */
async function guardar_en_vender(page, ruta, metodo) {
	const [respuesta] = await Promise.all([
		page.waitForResponse(res => {
			const coincide = typeof ruta === 'string' ? res.url().includes(ruta) : ruta.test(res.url())
			return coincide && res.request().method() === metodo
		}),
		page.locator('[data-testid="btn-guardar-venta"]').click(),
	])

	expect(respuesta.ok(), `el ${metodo} a ${ruta} no salio bien`).toBeTruthy()

	const cuerpo = await respuesta.json()
	return cuerpo.model
}

// ─────────────────────────────────────────────────────────────────────────────────────────────

test.describe.serial('Presupuesto: alta, actualizacion, confirmacion, cuenta corriente y cobro', () => {

	test('linea de base: el cliente y el stock de los articulos', async ({ page }) => {
		contexto.cliente_id = await id_del_cliente(page, CLIENTE)

		const { ids, stock } = await leer_articulos(
			page,
			TODOS.concat([RENGLON_EN_LA_VENTA]).map(r => r.articulo)
		)
		contexto.ids = ids
		contexto.stock_previo = stock

		console.log(`[presupuesto] cliente "${CLIENTE}" id ${contexto.cliente_id}`)
		console.log('[presupuesto] stock previo: ' + JSON.stringify(stock))
	})

	test('crea un presupuesto con cliente y dos articulos', async ({ page }) => {
		await abrir_vender(page)

		// El cliente va PRIMERO: sin el no se dibuja el toggle de presupuesto.
		await search_and_select(page, 'select_client_vender', CLIENTE)

		for (const renglon of RENGLONES) {
			await agregar_articulo(page, renglon.articulo, contexto.ids[renglon.articulo], renglon.cantidad)
		}

		// 🔴 El toggle es un checkbox oculto detras de su label: ver `poner_toggle()`. Antes se
		//    verifica que EXISTA, porque sin la extencion `budgets` o sin cliente no se dibuja.
		await expect(
			page.locator('[data-testid="venta-guardar-presupuesto"]'),
			'con un cliente elegido tenia que existir el toggle "Guardar como presupuesto" (¿esta la extencion budgets?)'
		).toBeAttached()
		await poner_toggle(page, 'venta-guardar-presupuesto')

		await elegir_opcion_que_contenga(page, 'venta-sucursal', DEPOSITO)

		contexto.presupuesto = await guardar_en_vender(page, '/budget', 'POST')

		expect(
			contexto.presupuesto && contexto.presupuesto.id,
			'el POST del presupuesto no devolvio un modelo con id'
		).toBeTruthy()

		console.log(`[presupuesto] N° ${contexto.presupuesto.id} - total ${contexto.presupuesto.total}`)
	})

	test('el presupuesto todavia no toca el stock', async ({ page }) => {
		// Es la mitad que se olvida: hasta que no se confirma, un presupuesto no reserva nada.
		const { stock } = await leer_articulos(page, TODOS.map(r => r.articulo))

		for (const renglon of TODOS) {
			expect(
				stock[renglon.articulo],
				`el presupuesto no tenia que tocar el stock de "${renglon.articulo}"`
			).toBe(contexto.stock_previo[renglon.articulo])
		}
	})

	test('se le agrega un articulo al presupuesto y el total sube', async ({ page }) => {
		await abrir_presupuestos_del_dia(page)

		const fila = page.locator(`[data-testid="budget-row-${contexto.presupuesto.id}"]`)
		await expect(fila, 'el presupuesto tenia que aparecer en el listado del dia').toBeVisible()
		await fila.click()

		const btn = page.locator('[data-testid="btn-actualizar-presupuesto"]')
		await expect(btn, 'el modal del presupuesto tenia que ofrecer "Actualizar en VENDER"').toBeVisible()
		await btn.click()

		// Vender con el presupuesto adentro.
		await expect(
			page.locator(`[data-testid="venta-item-cantidad-${contexto.ids[RENGLONES[0].articulo]}"]`),
			'el presupuesto tenia que quedar cargado en Vender'
		).toBeVisible()

		const total_antes = await total_de_la_venta(page)

		await agregar_articulo(
			page,
			RENGLON_AGREGADO.articulo,
			contexto.ids[RENGLON_AGREGADO.articulo],
			RENGLON_AGREGADO.cantidad
		)

		const total_despues = await total_de_la_venta(page)
		expect(
			total_despues,
			'agregar un articulo tenia que subir el total del presupuesto'
		).toBeGreaterThan(total_antes)

		const modelo = await guardar_en_vender(page, '/budget/', 'PUT')
		contexto.total_presupuesto = redondear(Number(modelo.total))

		expect(
			contexto.total_presupuesto,
			'el presupuesto guardado tenia que quedar con el total que mostraba Vender'
		).toBe(redondear(total_despues))

		console.log(`[presupuesto] total tras agregar "${RENGLON_AGREGADO.articulo}": ${contexto.total_presupuesto}`)
	})

	test('confirmar el presupuesto genera la venta y descuenta el stock', async ({ page }) => {
		await abrir_presupuestos_del_dia(page)

		const boton = page.locator(`[data-testid="btn-presupuesto-accion-${contexto.presupuesto.id}"]`)
		await expect(boton, 'el presupuesto tenia que ofrecer su boton de accion').toBeVisible()
		await expect(
			boton,
			'el presupuesto tenia que estar SIN confirmar (si dice "anular", quedo confirmado de una corrida anterior)'
		).toHaveAttribute('data-accion', 'confirmar')

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/confirmar') && res.request().method() === 'POST'),
			boton.click(),
		])
		expect(respuesta.ok(), 'la confirmacion del presupuesto no salio bien').toBeTruthy()

		// El boton se da vuelta solo: es la señal en pantalla de que quedo confirmado.
		await expect(boton, 'confirmado, el boton tenia que pasar a ofrecer "anular"').toHaveAttribute('data-accion', 'anular')

		// La venta que genero la confirmacion, ubicada por su `budget_id`.
		const venta = await venta_del_presupuesto(page, contexto.presupuesto.id)
		contexto.venta_id = venta.id
		contexto.venta_num = venta.num

		expect(
			redondear(Number(venta.total)),
			'la venta generada tenia que nacer con el total del presupuesto'
		).toBe(contexto.total_presupuesto)

		// Y recien ahora se mueve el stock, por las cantidades de los tres renglones.
		const { stock } = await leer_articulos(page, TODOS.map(r => r.articulo))

		for (const renglon of TODOS) {
			expect(
				redondear(contexto.stock_previo[renglon.articulo] - stock[renglon.articulo]),
				`confirmar el presupuesto tenia que descontar ${renglon.cantidad} de "${renglon.articulo}"`
			).toBe(renglon.cantidad)
		}

		console.log(`[presupuesto] confirmado -> venta id ${contexto.venta_id}`)
	})

	test('la venta quedo como deuda en la cuenta corriente del cliente', async ({ page }) => {
		const movimiento = await movimiento_de_la_venta(page, contexto.cliente_id, contexto.venta_num)

		expect(
			await celda_numerica(page, 'current_acount', 'debe', movimiento),
			'el movimiento tenia que deber exactamente el total del presupuesto confirmado'
		).toBe(contexto.total_presupuesto)

		contexto.total_venta = contexto.total_presupuesto

		console.log(`[presupuesto] movimiento de cuenta corriente ${movimiento} por ${contexto.total_venta}`)
	})

	test('editar cantidades y precios de la venta recalcula el total', async ({ page }) => {
		await abrir_venta_para_editar(page, contexto.venta_id)

		const primero = contexto.ids[TODOS[0].articulo]
		const segundo = contexto.ids[TODOS[1].articulo]

		const cantidad = page.locator(`[data-testid="venta-item-cantidad-${primero}"]`)
		const precio = page.locator(`[data-testid="venta-item-precio-${segundo}"]`)

		await expect(cantidad).toBeVisible()
		await expect(precio).toBeVisible()

		// Se duplica la cantidad del primero y se lleva el precio del segundo a un numero redondo:
		// las dos cosas que el pedido pide verificar juntas.
		const cantidad_nueva = TODOS[0].cantidad * 2
		const precio_nuevo = 1000

		await cantidad.fill(String(cantidad_nueva))
		await cantidad.press('Tab')
		await precio.fill(String(precio_nuevo))
		await precio.press('Tab')

		// Y se le AGREGA un renglon que la venta no tenia. Editar una venta no es solo retocar lo
		// que ya estaba: el buscador de articulos sigue disponible en modo edicion y el renglon
		// nuevo entra igual que en una venta nueva --pendiente de cantidad incluido--.
		await agregar_articulo(
			page,
			RENGLON_EN_LA_VENTA.articulo,
			contexto.ids[RENGLON_EN_LA_VENTA.articulo],
			RENGLON_EN_LA_VENTA.cantidad
		)

		// El total que muestra Vender es la referencia: lo recalcula el front y lo tiene que
		// respetar el backend.
		const total_en_pantalla = await total_de_la_venta(page)

		const modelo = await guardar_en_vender(page, /\/api\/sale\//, 'PUT')
		contexto.total_venta = redondear(Number(modelo.total))

		expect(
			contexto.total_venta,
			'la venta guardada tenia que quedar con el total que mostraba Vender despues de editarla'
		).toBe(redondear(total_en_pantalla))

		expect(
			contexto.total_venta,
			'cambiar cantidades y precios y agregar un renglon tenia que cambiar el total de la venta'
		).not.toBe(contexto.total_presupuesto)

		// El renglon agregado tiene que haber quedado guardado, no solo dibujado.
		const guardados = (modelo.articles || []).map(articulo => String(articulo.id))
		expect(
			guardados.includes(String(contexto.ids[RENGLON_EN_LA_VENTA.articulo])),
			`"${RENGLON_EN_LA_VENTA.articulo}" tenia que quedar guardado en la venta actualizada`
		).toBeTruthy()

		console.log(`[presupuesto] venta actualizada: total ${contexto.total_venta}`)
	})

	test('aplicar un descuento baja el total y la cuenta corriente lo sigue', async ({ page }) => {
		await abrir_venta_para_editar(page, contexto.venta_id)

		const total_antes = await total_de_la_venta(page)

		// 🔴 Los descuentos viven en la etapa 3, que arranca PLEGADA: hay que desplegarla antes de
		//    tocar nada. Ver `abrir_etapa_3()`.
		await abrir_etapa_3(page)

		// El toggle del descuento se ubica por su NOMBRE, no por su id: el id lo pone el fixture y
		// cambia entre bases. Cada toggle publica `venta-descuento-<id>` y su fila lleva el texto
		// "<nombre> <porcentaje>%".
		const descuento_id = await page.evaluate(nombre => {
			const entrada = [...document.querySelectorAll('[data-testid^="venta-descuento-"]')]
				.find(input => {
					const fila = input.closest('.vender-toggle-row') || input.parentElement
					return fila && fila.innerText.includes(nombre)
				})
			return entrada ? entrada.dataset.testid.replace('venta-descuento-', '') : null
		}, DESCUENTO)

		expect(descuento_id, `Vender no ofrece el descuento "${DESCUENTO}" (lo siembra el fixture)`).not.toBeNull()

		await poner_toggle(page, `venta-descuento-${descuento_id}`)

		// El descuento de venta si baja el total en pantalla (a diferencia del descuento por metodo
		// de pago, que lo resuelve el backend: ver el circuito de venta de mostrador).
		const esperado = redondear(total_antes * (100 - DESCUENTO_PORCENTAJE) / 100)

		await expect(async () => {
			expect(
				redondear(await total_de_la_venta(page)),
				`el descuento del ${DESCUENTO_PORCENTAJE}% tenia que bajar el total en pantalla`
			).toBe(esperado)
		}).toPass({ timeout: 15000 })

		const modelo = await guardar_en_vender(page, /\/api\/sale\//, 'PUT')
		const total_con_descuento = redondear(Number(modelo.total))

		expect(
			total_con_descuento,
			'la venta guardada tenia que quedar con el total ya descontado'
		).toBe(esperado)

		// Y la cuenta corriente tiene que haber seguido el cambio. 🔴 El movimiento se vuelve a
		// buscar: editar la venta lo RECREA con otro id (ver `movimiento_de_la_venta`).
		const movimiento = await movimiento_de_la_venta(page, contexto.cliente_id, contexto.venta_num)

		expect(
			await celda_numerica(page, 'current_acount', 'debe', movimiento),
			'el movimiento de cuenta corriente tenia que quedar con el total nuevo de la venta'
		).toBe(total_con_descuento)

		contexto.total_venta = total_con_descuento

		console.log(`[presupuesto] total con descuento: ${contexto.total_venta}`)
	})

	test('el pago del cliente se imputa en la cuenta corriente y entra a la caja', async ({ page }) => {
		// 🔴 El saldo de la caja se lee ACA, antes de abrir la cuenta corriente: `saldo_de_caja()`
		//    navega a /caja y destruiria el modal de pago si se llamara en el medio.
		const saldo_caja_antes = await saldo_de_caja(page, CAJA)

		const movimiento = await movimiento_de_la_venta(page, contexto.cliente_id, contexto.venta_num)

		const filas = page.locator('[data-testid^="current_acount-row-"]')
		const fila_venta = page.locator(`[data-testid="current_acount-row-${movimiento}"]`)
		await expect(fila_venta).toBeVisible()

		// El saldo ACUMULADO hasta la venta, que es contra lo que se mide el pago.
		const saldo_antes = await celda_numerica(page, 'current_acount', 'saldo', movimiento)

		// Con el movimiento seleccionado, el boton de pago precarga el importe con su saldo: es la
		// forma de cobrar "el total de esta venta" sin tipear un numero.
		await fila_venta.click()
		const boton_pago = page.locator('[data-testid="btn-registrar-pago"]')
		await expect(boton_pago).toHaveAttribute('data-precargado', 'si')
		await boton_pago.click()

		await expect(page.locator('[data-testid="pago-monto-0"]')).toHaveValue(String(contexto.total_venta))

		await page.locator('[data-testid="pago-metodo-0"]').selectOption({ label: PAGO_METODO })
		await page.locator('[data-testid="pago-caja-0"]').selectOption({ label: CAJA })

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/current-acount/pago') && res.request().method() === 'POST'),
			page.locator('[data-testid="btn-confirmar-pago"]').click(),
		])
		expect(respuesta.ok(), 'el POST del pago no salio bien').toBeTruthy()

		// La imputacion: el movimiento del pago tiene que bajar el saldo acumulado exactamente en
		// el total de la venta. Se busca por el id mas alto, por lo mismo que arriba.
		await expect(async () => {
			const cantidad = await filas.count()
			let fila_del_pago = null

			for (let i = 0; i < cantidad; i++) {
				const id = (await filas.nth(i).getAttribute('data-testid')).replace('current_acount-row-', '')
				if (await celda_numerica(page, 'current_acount', 'haber', id) === contexto.total_venta) {
					if (fila_del_pago === null || Number(id) > Number(fila_del_pago)) {
						fila_del_pago = id
					}
				}
			}

			expect(fila_del_pago, `ningun movimiento con haber = ${contexto.total_venta}`).not.toBeNull()
			expect(
				await celda_numerica(page, 'current_acount', 'saldo', fila_del_pago),
				'el pago tenia que bajar el saldo acumulado exactamente en el total de la venta'
			).toBe(redondear(saldo_antes - contexto.total_venta))
		}).toPass({ timeout: 20000 })

		// Y la plata tiene que haber ENTRADO a la caja: un cobro a cliente es un ingreso, al reves
		// que el pago a un proveedor.
		expect(
			redondear(await saldo_de_caja(page, CAJA) - saldo_caja_antes),
			'el cobro al cliente tenia que entrar a la caja por su importe completo'
		).toBe(contexto.total_venta)
	})
})
