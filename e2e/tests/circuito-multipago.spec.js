// Circuito de una venta COBRADA CON VARIOS METODOS DE PAGO, cada uno con su caja.
//
// Quinto archivo del circuito e2e completo, y el tercero del modulo Vender. Lo que verifica es una
// sola afirmacion, pero es la que ningun test unitario alcanza: que **la plata de cada metodo cae
// en la caja que le corresponde**, y no toda junta en la primera.
//
//   1. Venta con cliente, OMITIDA de la cuenta corriente --por eso se cobra en el acto--,
//      repartida entre dos metodos de pago con dos cajas distintas.
//   2. Que cada caja se haya movido por su parte.
//   3. Que borrarla saque la plata de las dos cajas y devuelva el stock.
//
// Depende del fixture determinista de empresa-api
// (database/seeders/testing/TestingFerreteriaSeeder.php), y en particular de que `abrir_cajas()`
// deje ABIERTAS "Caja Efectivo" y "Caja Mercado Pago". Con una sola caja abierta este circuito no
// tiene como existir.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// Lo que hay que saber antes de tocar este archivo
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// 🔴 1. Serial y por DIFERENCIA, como el resto de los circuitos.
//
// 🔴 2. El reparto en varios metodos es un modal aparte ("payment-method-modal"), que se abre con
//    el boton verde al lado del selector de metodo de pago. Adentro, cada fila publica sus tres
//    controles con el INDICE de la fila: `pago-metodo-0`, `pago-monto-0`, `pago-caja-0`, y la
//    segunda fila con el 1. La fila se agrega con "Agregar método de pago".
//
// 🔴 3. El modal es de DOS PASOS cuando la cuenta tiene algun descuento por metodo de pago
//    configurado --y el fixture tiene uno, el 10% de "Efectivo"--. La condicion mira los
//    descuentos CONFIGURADOS EN LA CUENTA, no los metodos elegidos en esta venta: aunque se cobre
//    con dos metodos que no tienen descuento, igual aparece "Calcular" antes que "Listo".
//
//    Y "Calcular" **borra los importes** (`Buttons.calcular()` arma las filas de nuevo con
//    `amount: ''`). O sea que hay que cargarlos, apretar Calcular, y cargarlos OTRA VEZ antes de
//    apretar Listo. Sin eso el segundo paso se queda con el reparto en cero y "Listo" no hace nada:
//    `chequear_total_repartido()` corta en silencio y el modal se queda abierto, que es el sintoma
//    que manda a buscar el problema en el boton.
//
// 🔴 4. Hay dos carpetas de componentes de multipago que NO se usan
//    (`modals/payment-methods/select-payment-methods/` y `.../payment-methods-with-discounts/`):
//    nadie las importa desde afuera, solo se referencian entre ellas. El modal vivo es
//    `modals/payment-methods/Index.vue`, que arma la lista con
//    `common/payment-methods/PaymentMethodsStep.vue`. Buscar los testids en las otras es tiempo
//    perdido.
//
// 🔴 5. Se cobra con "Transferencia" y "Mercado Pago" a proposito: son metodos SIN descuento, asi
//    que el importe que se reparte es el que se cobra. El descuento por metodo de pago ya lo
//    verifica circuito-venta-contado.spec.js, y mezclarlo aca haria que este archivo no pueda
//    afirmar limpiamente cuanto tenia que entrar a cada caja.

const { test, expect } = require('../fixtures')
const { redondear } = require('../helpers/numeros')
const { search_and_select } = require('../helpers/formulario')
const {
	leer_articulos,
	saldo_de_caja,
	abrir_vender,
	agregar_articulo,
	elegir_opcion_que_contenga,
	cargar_reparto,
	poner_toggle,
	total_de_la_venta,
	abrir_modulo_del_dia,
} = require('../helpers/vender')

// ── Datos de entrada ─────────────────────────────────────────────────────────────────────────

/** Cliente del fixture. La venta lo nombra pero NO va a su cuenta corriente. */
const CLIENTE = 'Cliente Cuenta Corriente'
/** Sucursal del fixture. Sin sucursal elegida la venta no se guarda. */
const DEPOSITO = 'Principal'

/**
 * El reparto: cada metodo de pago con SU caja. Los dos metodos existen en el catalogo de
 * `CurrentAcountPaymentMethodSeeder` y ninguno tiene descuento configurado en el fixture.
 */
const REPARTO = [
	{ metodo: 'Transferencia', caja: 'Caja Efectivo' },
	{ metodo: 'Mercado Pago', caja: 'Caja Mercado Pago' },
]

/**
 * Los renglones de la venta.
 *
 * 🔴 Sin caracteres especiales en el nombre a proposito. El buscador del listado se teclea
 * caracter por caracter (ver `leer_articulos`), y "Clavos N° 2" llegaba al input como **`°` a
 * secas**: el resto se perdia. Con el input mostrando un solo caracter, la busqueda no encuentra
 * nada y el rojo habla del articulo.
 */
const RENGLONES = [
	{ articulo: 'Cuchilla', cantidad: 5 },
	{ articulo: 'Martillo acero', cantidad: 2 },
]

// ── Estado compartido entre los tests seriales ───────────────────────────────────────────────

const contexto = {
	/** nombre del articulo -> su id. */
	ids: {},
	/** nombre del articulo -> stock antes de vender. */
	stock_previo: {},
	/** nombre de la caja -> saldo antes de vender. */
	saldo_previo: {},
	/** Modelo de la venta tal cual lo devolvio el POST. */
	venta: null,
	/** nombre de la caja -> importe que le tocaba de esta venta. */
	repartido: {},
}

// ── Helpers de este archivo ──────────────────────────────────────────────────────────────────

/**
 * Abre el listado de ventas del dia, en la solapa de la sucursal del fixture.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function abrir_ventas_del_dia(page) {
	await abrir_modulo_del_dia(page, '/ventas/todas', { solapa: DEPOSITO })
}

// ─────────────────────────────────────────────────────────────────────────────────────────────

test.describe.serial('Venta multipago: una caja por metodo de pago, y su reversion', () => {

	test('linea de base: stock de los articulos y saldo de las dos cajas', async ({ page }) => {
		const { ids, stock } = await leer_articulos(page, RENGLONES.map(r => r.articulo))
		contexto.ids = ids
		contexto.stock_previo = stock

		for (const fila of REPARTO) {
			contexto.saldo_previo[fila.caja] = await saldo_de_caja(page, fila.caja)
		}

		console.log('[multipago] stock previo: ' + JSON.stringify(stock))
		console.log('[multipago] saldos previos: ' + JSON.stringify(contexto.saldo_previo))
	})

	test('crea la venta repartiendo el cobro entre dos metodos con dos cajas', async ({ page }) => {
		await abrir_vender(page)

		await search_and_select(page, 'select_client_vender', CLIENTE)

		for (const renglon of RENGLONES) {
			await agregar_articulo(page, renglon.articulo, contexto.ids[renglon.articulo], renglon.cantidad)
		}

		// 🔴 Con un cliente elegido, la venta se va por defecto a su CUENTA CORRIENTE y no pide
		//    caja. Omitirla es lo que la convierte en una venta cobrada en el acto, que es la
		//    precondicion de todo este circuito.
		await poner_toggle(page, 'venta-omitir-cuenta-corriente')

		await elegir_opcion_que_contenga(page, 'venta-sucursal', DEPOSITO)

		expect(
			await total_de_la_venta(page),
			'la venta tenia que tener un total mayor a cero'
		).toBeGreaterThan(0)

		await page.locator('[data-testid="venta-btn-metodos-pago"]').click()

		// 🔴 El importe que hay que repartir lo dice el MODAL, y no es el que muestra Vender antes
		//    de abrirlo: abrirlo descarta el descuento del metodo de pago por defecto. Por eso
		//    `cargar_reparto()` lo lee adentro y devuelve lo que cargo. Ver su comentario.
		await cargar_reparto(page, REPARTO, { armar_filas: true })

		// Primer paso. Ver la nota 3: existe porque la CUENTA tiene un descuento configurado, no
		// porque estos metodos lo tengan.
		await page.locator('[data-testid="venta-multipago-calcular"]').click()

		// Y segundo, releyendo el total: Calcular borra los importes y puede haberlo cambiado.
		const importes = await cargar_reparto(page, REPARTO)
		REPARTO.forEach((fila, i) => { contexto.repartido[fila.caja] = importes[i] })

		await page.locator('[data-testid="venta-multipago-listo"]').click()

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/sale') && res.request().method() === 'POST'),
			page.locator('[data-testid="btn-guardar-venta"]').click(),
		])
		expect(respuesta.ok(), 'el POST de la venta no salio bien').toBeTruthy()

		const cuerpo = await respuesta.json()
		contexto.venta = cuerpo.model
		expect(contexto.venta && contexto.venta.id, 'el POST no devolvio un modelo con id').toBeTruthy()

		// La venta tiene que haber quedado con los DOS metodos, no con uno solo por el total.
		const metodos = contexto.venta.current_acount_payment_methods || []
		expect(
			metodos.length,
			'la venta tenia que quedar con los dos metodos de pago adjuntos'
		).toBe(REPARTO.length)

		console.log(`[multipago] N° ${contexto.venta.num} (id ${contexto.venta.id}) - total ${contexto.venta.total}`)
		console.log('[multipago] reparto: ' + JSON.stringify(contexto.repartido))
	})

	test('cada caja recibio exactamente su parte', async ({ page }) => {
		// Esta es la afirmacion del archivo: no alcanza con que entre el total, tiene que entrar
		// PARTIDO y en las cajas correctas.
		for (const fila of REPARTO) {
			expect(
				redondear(await saldo_de_caja(page, fila.caja) - contexto.saldo_previo[fila.caja]),
				`"${fila.caja}" tenia que recibir la parte cobrada con "${fila.metodo}"`
			).toBe(contexto.repartido[fila.caja])
		}
	})

	test('y el stock bajo por lo vendido', async ({ page }) => {
		const { stock } = await leer_articulos(page, RENGLONES.map(r => r.articulo))

		for (const renglon of RENGLONES) {
			expect(
				redondear(contexto.stock_previo[renglon.articulo] - stock[renglon.articulo]),
				`el stock de "${renglon.articulo}" tenia que bajar ${renglon.cantidad}`
			).toBe(renglon.cantidad)
		}
	})

	test('borrarla saca la plata de las dos cajas y devuelve el stock', async ({ page }) => {
		await abrir_ventas_del_dia(page)

		// El modo seleccion apagado: con el prendido el click selecciona la fila en vez de abrir la
		// venta, y el borrado de UNA venta solo existe dentro de su modal.
		const modo_seleccion = page.locator('[data-testid="btn-modo-seleccion"]')
		await expect(modo_seleccion).toBeVisible()

		if (await modo_seleccion.getAttribute('data-activo') === 'si') {
			await modo_seleccion.click()
		}

		await page.locator(`[data-testid="sale-row-${contexto.venta.id}"]`).click()

		const btn_eliminar = page.locator('[data-testid="btn-eliminar-sale"]')
		await expect(btn_eliminar, 'el modal de la venta tenia que ofrecer Eliminar').toBeVisible()
		await btn_eliminar.click()

		const compensar = page.locator('[data-testid="confirm-compensar-caja"]')
		await expect(
			compensar,
			'la venta se cobro con metodos con caja, asi que el confirm tenia que ofrecer compensarlas'
		).toBeVisible()
		await expect(compensar, 'el checkbox de compensar caja viene tildado por defecto').toBeChecked()

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => /\/api\/sale\/\d+/.test(res.url()) && res.request().method() === 'DELETE'),
			page.locator('[data-testid="btn-confirmar-delete-sale"]').click(),
		])
		expect(respuesta.ok(), 'el borrado de la venta no salio bien').toBeTruthy()

		// 🔴 La compensacion se hace caja por caja: el helper de borrado recorre los metodos de pago
		//    de la venta y arma un movimiento inverso en la caja de cada uno. Por eso se verifican
		//    las dos y no la suma -- una compensacion que mandara todo a la primera caja daria bien
		//    en total y mal en cada una.
		for (const fila of REPARTO) {
			expect(
				await saldo_de_caja(page, fila.caja),
				`"${fila.caja}" tenia que volver al saldo que tenia antes de la venta`
			).toBe(contexto.saldo_previo[fila.caja])
		}

		const { stock } = await leer_articulos(page, RENGLONES.map(r => r.articulo))

		for (const renglon of RENGLONES) {
			expect(
				stock[renglon.articulo],
				`el stock de "${renglon.articulo}" tenia que volver al valor de antes de la venta`
			).toBe(contexto.stock_previo[renglon.articulo])
		}
	})
})
