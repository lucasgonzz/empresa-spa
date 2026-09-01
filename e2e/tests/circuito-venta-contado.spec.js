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
//
// 🔴 4. Una venta se puede borrar por DOS caminos, y no hacen lo mismo:
//      - **desde el modal de la venta** (click en la fila -> "Eliminar"): ofrece el checkbox
//        "Compensar caja", tildado por defecto, y manda `DELETE /api/sale/{id}?compensar_caja=1`.
//        Devuelve el stock **y** saca la plata de la caja. Es el que verifica este archivo, y el
//        que describe el pedido original.
//      - **desde el listado, por seleccion o por filtro**: va por `PUT delete/sale`, encola un
//        job y termina en `DeleteModelsHelper`, que llama al destroy() sin Request. Ahi
//        `compensar_caja` queda en false: el stock vuelve pero la plata se queda en la caja, que
//        es lo unico que promete el cartel ("Se repondran los articulos").
//    Hasta el 31/8/2026 ese segundo camino ni siquiera borraba: `SaleController::destroy()` pide
//    (Request, $id) y el helper le pasaba solo el id, asi que reventaba con un TypeError y
//    devolvia 500 sin tocar nada. Lo encontro este circuito.
const { test, expect } = require('../fixtures')
const { redondear } = require('../helpers/numeros')
const {
	leer_articulos,
	saldo_de_caja,
	abrir_vender,
	agregar_articulo,
	elegir_opcion_que_contenga,
	total_de_la_venta,
	abrir_modulo_del_dia,
} = require('../helpers/vender')

// ── Datos de entrada ─────────────────────────────────────────────────────────────────────────

/** Metodo de pago del fixture que tiene descuento configurado. */
const METODO_PAGO = 'Efectivo'
/** Porcentaje de ese descuento, tal cual lo siembra el fixture (DESCUENTO_EFECTIVO). */
const DESCUENTO_METODO = 10
/** Caja del fixture, la unica que nace ABIERTA. */
const CAJA = 'Caja Efectivo'
/** Sucursal del fixture. Sin sucursal elegida la venta no se guarda. */
const DEPOSITO = 'Principal'

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

		// 🔴 La SUCURSAL frena el guardado si no se elige, y no lo dice con un error: el boton de
		//    guardar simplemente no dispara ningun pedido y el test se va en timeout esperando un
		//    POST que nunca sale. El checklist de la derecha de la pantalla lo muestra --"Sucursal"
		//    queda en gris mientras "Pago" y "Articulos" ya tienen tilde-- pero hay que saber
		//    mirarlo. Es uno de los controles que lista manual_sistema/vender/armar-una-venta.md.
		await elegir_opcion_que_contenga(page, 'venta-sucursal', DEPOSITO)

		await elegir_opcion_que_contenga(page, 'venta-metodo-pago', METODO_PAGO)
		// 🔴 Si el select de caja no ofrece ninguna opcion, la caja esta CERRADA: solo ofrece las
		//    abiertas. No es que falte la caja.
		await elegir_opcion_que_contenga(page, 'venta-caja', CAJA)

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
		await abrir_modulo_del_dia(page, '/ventas/todas', { solapa: DEPOSITO })

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

	test('borrar la venta devuelve el stock y saca la plata de la caja', async ({ page }) => {
		await abrir_modulo_del_dia(page, '/ventas/todas', { solapa: DEPOSITO })

		// 🔴 El modo seleccion tiene que estar APAGADO. Con el prendido, el click sobre la fila la
		//    agrega a la seleccion en vez de abrir la venta (`Tr.onRowSelected`), y el modal --que
		//    es el unico lugar desde donde se borra UNA venta-- no se abre nunca.
		const modo_seleccion = page.locator('[data-testid="btn-modo-seleccion"]')
		await expect(modo_seleccion, 'el listado tenia que ofrecer el modo seleccion').toBeVisible()

		if (await modo_seleccion.getAttribute('data-activo') === 'si') {
			await modo_seleccion.click()
		}
		await expect(modo_seleccion).toHaveAttribute('data-activo', 'no')

		await page.locator(`[data-testid="sale-row-${contexto.venta.id}"]`).click()

		const btn_eliminar = page.locator('[data-testid="btn-eliminar-sale"]')
		await expect(
			btn_eliminar,
			'el modal de la venta tenia que ofrecer Eliminar (no lo ofrece si la venta ya esta facturada)'
		).toBeVisible()
		await btn_eliminar.click()

		// 🔴 El checkbox de compensar caja se dibuja SOLO si la venta tiene metodos de pago con
		//    caja (`SaleModal.confirm_compensar_caja`), y viene tildado por defecto
		//    (`sale.compensar_caja_delete`). Es lo que hace que la plata salga: sin el, el backend
		//    recibe `compensar_caja=0` y deja el movimiento de caja en su lugar.
		const compensar = page.locator('[data-testid="confirm-compensar-caja"]')
		await expect(
			compensar,
			'la venta se cobro con un metodo con caja, asi que el confirm tenia que ofrecer compensarla'
		).toBeVisible()
		await expect(compensar, 'el checkbox de compensar caja viene tildado por defecto').toBeChecked()

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => /\/api\/sale\/\d+/.test(res.url()) && res.request().method() === 'DELETE'),
			page.locator('[data-testid="btn-confirmar-delete-sale"]').click(),
		])
		expect(respuesta.ok(), 'el borrado de la venta no salio bien').toBeTruthy()

		// El pedido tiene que llevar el flag: es la unica prueba de que se pidio compensar.
		expect(
			new URL(respuesta.url()).searchParams.get('compensar_caja'),
			'el DELETE tenia que viajar con compensar_caja=1'
		).toBe('1')

		// El stock vuelve a lo de antes de la venta.
		const { stock } = await leer_articulos(page, RENGLONES.map(r => r.articulo))

		for (const renglon of RENGLONES) {
			expect(
				stock[renglon.articulo],
				`el stock de "${renglon.articulo}" tenia que volver al valor de antes de la venta`
			).toBe(contexto.stock_previo[renglon.articulo])
		}

		// Y la plata sale de la caja: el saldo vuelve exactamente al de la linea de base.
		expect(
			await saldo_de_caja(page, CAJA),
			'la caja tenia que quedar como antes de la venta: el movimiento inverso cancela el cobro'
		).toBe(contexto.saldo_caja_previo)
	})
})
