// Test end to end del circuito completo de una compra: carga -> factura -> costeo en el listado ->
// stock -> cuenta corriente -> Posicion Fiscal.
//
// Es el recorrido que Lucas hace a mano con calculadora cada vez que quiere confirmar que un
// cambio de precios no rompio nada, y toca las CINCO puntas que una compra mueve al confirmarse:
//
//   1. La compra en si (descuentos del proveedor, articulo nuevo creado al vuelo, facturacion
//      automatica).
//   2. La factura que esa compra genera sola, con sus percepciones y retenciones.
//   3. El costeo del articulo en el listado: costo bruto -> descuentos -> costo real -> margen ->
//      impuestos sobre ventas -> IVA -> precio final.
//   4. El stock: que entre al deposito indicado en la compra y que deje su movimiento.
//   5. La plata: la deuda en la cuenta corriente del proveedor, su pago, y como todo eso se ve en
//      Posicion Fiscal (IVA credito, percepciones y retenciones sufridas).
//
// Depende del fixture determinista de empresa-api
// (database/seeders/testing/TestingFerreteriaSeeder.php):
//   - Proveedor "Buenos Aires" con bonificaciones del 10% y del 5%.
//   - Articulo "Pinza" ya existente, de ese proveedor, con costo 1000 e IVA 21%.
//   - Deposito "Principal".
//   - Impuesto sobre ventas "IIBB" (el test lo reconfigura al porcentaje que quiere probar).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// Tres decisiones de diseño que conviene leer antes de tocar este archivo
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// 🔴 1. Los tests son SERIALES y comparten estado. Cada uno continua donde quedo el anterior
//    (`test.describe.serial`), porque el circuito ES secuencial: no se puede verificar la factura
//    de una compra que todavia no existe. Si uno falla, los siguientes se saltean — que es lo
//    correcto: reportarian fallas derivadas y taparian la causa. El estado va en `contexto`, un
//    objeto a nivel de modulo.
//
// 🔴 2. Posicion Fiscal se verifica por DIFERENCIA, no por valor absoluto. Ese reporte suma TODOS
//    los comprobantes del periodo, asi que una segunda corrida sobre la misma base (sin volver a
//    sembrar) vería el doble y el test daria rojo sin que haya nada mal. Por eso el primer test no
//    hace nada: solo anota la linea de base. Todas las aserciones del ultimo son sobre el delta.
//
// 🔴 3. El test APAGA "Aplicar margen de ganancia del proveedor" en los dos articulos, y no es
//    para que la cuenta le de. El proveedor "Buenos Aires" del fixture tiene percentage_gain = 100,
//    y un articulo que nace desde el buscador de una compra queda con
//    apply_provider_percentage_gain = 1 (lo prende check_article_status() en
//    NewProviderOrderHelper cuando el articulo pasa de inactive a active), mientras que "Pinza",
//    que ya existia, lo tiene en 0. O sea que sin apagarlo los dos articulos tendrian precios
//    finales distintos con el mismo costo y el mismo margen, y el numero esperado dependeria de un
//    flag que este test no vino a probar. Apagarlo es una accion de usuario legitima y deja la
//    cadena exactamente en la que se quiere verificar: costo real -> margen del articulo -> IIBB
//    -> IVA.
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { leer_posicion_fiscal } = require('../helpers/reportes')
const { buscar_articulo } = require('../helpers/vender')
const { abrir_pestania, completar_campo, search_and_select, crear_desde_buscador } = require('../helpers/formulario')
const { numero_de_pantalla, numero_de_dato, redondear } = require('../helpers/numeros')

// ── Datos de entrada de la compra ────────────────────────────────────────────────────────────

/** Proveedor del fixture con bonificaciones cargadas (10% y 5%). */
const PROVEEDOR = 'Buenos Aires'
/** Deposito del fixture, destino del stock de esta compra. */
const DEPOSITO = 'Principal'
/** Articulo que YA existe en el fixture, del mismo proveedor. */
const ARTICULO_EXISTENTE = 'Pinza'

/** Costo unitario cargado en la compra para los dos articulos. Sin IVA (ver PRECIOS_INCLUYEN_IVA). */
const COSTO = 1000
/** Unidades compradas de cada articulo. */
const CANTIDAD = 10
/** Alicuota de IVA de los dos articulos de la compra. */
const IVA = 21

/** Alicuota que el test le deja configurada al impuesto sobre ventas (IIBB). */
const IIBB = 3
/** Margen de ganancia que el test le pone a cada articulo en el listado. */
const MARGEN = 40

/**
 * Bonificaciones que el fixture tiene cargadas en el proveedor y que la compra debe heredar.
 * El test verifica que aparezcan; no las carga a mano.
 */
const BONIFICACIONES = [10, 5]

// ── Estado compartido entre los tests seriales ───────────────────────────────────────────────

const contexto = {
	/** Nombre del articulo que este test crea al vuelo. Unico por corrida. */
	articulo_nuevo: `E2E Costeo ${Date.now()}`,
	/** Modelo de la compra tal cual lo devolvio el POST (id, num, totales). */
	compra: null,
	/** Ids de las dos filas de articulo de la compra: {nuevo, existente}. */
	articulos: {},
	/** Importes de la factura que el test carga, derivados de la propia factura. */
	factura: {},
	/** Renglones de Posicion Fiscal ANTES de que este test cargue nada. */
	base_fiscal: null,
}

// ── Cuentas esperadas ────────────────────────────────────────────────────────────────────────

/**
 * Costo real de un articulo: el costo bruto de la compra con las bonificaciones del proveedor
 * aplicadas EN CASCADA (cada una sobre lo que dejo la anterior), que es como las aplica
 * ArticlePricesHelper::aplicar_descuentos ($price -= $price * $pct / 100, en un foreach).
 *
 * Con 1000 y bonificaciones de 10% y 5% da 855, NO 850: la diferencia entre cascada y suma de
 * porcentajes es justo lo que este test verifica.
 *
 * @param {number} costo Costo bruto por unidad cargado en la compra.
 * @param {number[]} descuentos Porcentajes, en el orden en que estan cargados.
 * @returns {number}
 */
function costo_real_esperado(costo, descuentos) {
	return descuentos.reduce((acumulado, porcentaje) => acumulado - acumulado * porcentaje / 100, costo)
}

/**
 * Precio final esperado de un articulo, con la cadena completa del motor de precios para una
 * cuenta Responsable Inscripto:
 *
 *     costo real
 *       x (1 + margen/100)          margen de ganancia del articulo
 *       / (1 - iibb/100)            impuestos sobre ventas: formula de DIVISION, no de suma,
 *                                   porque el impuesto se calcula sobre el precio que ya lo incluye
 *       x (1 + iva/100)             IVA de venta, que en RRII va al final y no al costo
 *
 * El orden importa y es el de ArticleHelper::setFinalPrice: los sale_taxes (Capa 2) van despues
 * del margen y ANTES del IVA.
 *
 * @param {number} costo_real
 * @param {number} margen Margen de ganancia del articulo, en porcentaje.
 * @param {number} iibb Alicuota del impuesto sobre ventas, en porcentaje.
 * @param {number} iva Alicuota de IVA del articulo, en porcentaje.
 * @returns {number}
 */
function precio_final_esperado(costo_real, margen, iibb, iva) {
	const con_margen = costo_real * (1 + margen / 100)
	const con_iibb = con_margen / (1 - iibb / 100)
	return con_iibb * (1 + iva / 100)
}

// ── Helpers de lectura de pantalla ───────────────────────────────────────────────────────────

/**
 * Lee una celda de una tabla del sistema por su data-testid ("celda-<model>-<key>-<id>") y la
 * devuelve como numero, eligiendo el parser segun con que formateador se imprimio esa prop.
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
	const texto = await celda.innerText()

	/*
		Un solo parser para todas las columnas. Hasta el 21/8/2026 habia que elegir: `cost` y
		`costo_real` salian en formato en-US porque price_variable_decimals() no daba vuelta los
		separadores, y `stock` salia crudo ("10.00"). Los tres se corrigieron y hoy toda celda se
		imprime en es-AR. Los valores de DATO (inputValue, data-*) siguen con punto y se leen con
		numero_de_dato.
	*/
	return numero_de_pantalla(texto)
}

/**
 * Entra al modulo de compras y deja el listado del dia CARGADO.
 *
 * 🔴 El click en el dia no sobra. Los modulos que se ven por fecha --compras, ventas, pedidos,
 * gastos, cheques, presupuestos-- no disparan el listado por defecto al montarse: view/Index.vue lo
 * saltea a proposito para ellos (ver disparar_listado_por_defecto()), porque el flujo de esos
 * modulos es "entrar por dia/rango". O sea que entrar a /proveedores/compras y buscar una fila da
 * "No hay Compras" con las compras en la base, y el test se va en timeout de 4 minutos apuntando al
 * lugar equivocado. Pasó (corrida del 19/8/2026) y por eso esto es una funcion con nombre y no dos
 * lineas sueltas.
 *
 * Se clickea el dia de HOY, que es cuando se cargaron las compras de este archivo. Es ademas el
 * unico dia que ControlFecha.clickDia() deja clickear siempre: para los demas exige que ya tengan
 * movimientos.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function abrir_compras_del_dia(page) {
	await page.goto('/proveedores/compras')
	await esperar_recursos_descargados(page, { abrir_panel: false })

	const hoy = page.locator(`[data-testid="control-fecha-dia"][data-fecha="${fecha_de_hoy()}"]`)
	await expect(hoy, 'el control de fechas tenia que ofrecer el dia de hoy').toBeVisible()
	await hoy.click()
}

/**
 * Fecha de hoy en YYYY-MM-DD, en la zona horaria del navegador (que es la de la maquina donde
 * corren la aplicacion y la base).
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

// ─────────────────────────────────────────────────────────────────────────────────────────────

test.describe.serial('Compra: costeo, facturacion, stock, cuenta corriente y posicion fiscal', () => {

	test('linea de base: se anotan los renglones de Posicion Fiscal antes de cargar nada', async ({ page }) => {
		// Este test no verifica nada y no es un test vacio: es lo que hace que TODO el archivo se
		// pueda correr dos veces seguidas sobre la misma base. Posicion Fiscal acumula todos los
		// comprobantes del dia, asi que el unico numero que este circuito puede afirmar es cuanto
		// SUMO, no cuanto hay. Sin esta foto previa, la segunda corrida veria el doble y daria rojo
		// sin que haya nada roto (y peor: la primera corrida pasaria, escondiendo el problema).
		await page.goto('/reportes/posicion-fiscal')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		contexto.base_fiscal = await leer_posicion_fiscal(page)

		console.log('[fiscal] linea de base: ' + JSON.stringify(contexto.base_fiscal))

		// El reporte tiene que traer los seis renglones que este circuito mueve. Si el dia de mañana
		// alguno cambia de nombre, conviene que falle aca --donde el mensaje dice "falta el renglon
		// X"-- y no en el ultimo test, con un delta que da NaN.
		for (const renglon of [
			'iva-credito',
			'percepcion-iva',
			'retencion-iva',
			'percepcion-iibb',
			'retencion-iibb',
			'retencion-ganancias',
		]) {
			expect(contexto.base_fiscal[renglon], `falta el renglon "${renglon}" en Posicion Fiscal`).not.toBeUndefined()
		}
	})

	test('carga la compra con los descuentos del proveedor, un articulo nuevo y facturacion automatica', async ({ page }) => {
		// Para crear no hace falta el listado cargado, pero si para el paso 11 (reabrir la compra
		// desde la fila), asi que se entra igual por el dia.
		await abrir_compras_del_dia(page)

		await page.locator('[data-testid="btn-crear-provider_order"]').click()

		// 1. Proveedor. Al elegirlo, el formulario precarga solo las bonificaciones del proveedor
		//    como descuentos editables de esta compra (prefill_has_many_on_select en
		//    src/models/provider_order.js). Se verifica mas abajo, en la pestaña de descuentos.
		await search_and_select(page, 'provider_order-provider_id', PROVEEDOR)

		// 2. Deposito: es a donde va a ir el stock cuando se generen los movimientos.
		await page.locator('[data-testid="provider_order-address_id"]').selectOption({ label: DEPOSITO })

		// 3. "Los precios ya incluyen IVA" DESACTIVADO: el costo que se carga mas abajo es neto.
		//    Se verifica en vez de tocarlo porque el valor viene precargado del proveedor
		//    (prefill_prop_on_select). Si algun dia el proveedor del fixture cambiara ese default,
		//    esta asercion lo dice en vez de dejar pasar una compra con IVA incluido --que cambiaria
		//    el costo guardado, porque update_cost() le haria el back-out del IVA--.
		await expect(page.locator('[data-testid="provider_order-precios_incluyen_iva"]')).not.toBeChecked()

		// 4. Las tres opciones que hacen que la compra impacte fuera de si misma. Son irreversibles
		//    (no_se_puede_desactivar en el model), por eso se prenden recien aca y no antes.
		//    El control visible es el label; el estado lo tiene el input.
		await page.locator('[data-testid="provider_order-update_prices-toggle"]').click()
		await expect(page.locator('[data-testid="provider_order-update_prices"]')).toBeChecked()

		await page.locator('[data-testid="provider_order-update_stock-toggle"]').click()
		await expect(page.locator('[data-testid="provider_order-update_stock"]')).toBeChecked()

		// "Generar movimiento en Cuenta Corriente" viene en 1 por defecto (value: 1 en el model):
		// se verifica, no se clickea, porque clickearlo lo APAGARIA.
		await expect(page.locator('[data-testid="provider_order-generate_current_acount"]')).toBeChecked()

		// 5. Los descuentos del proveedor ya tienen que estar precargados en la compra.
		//
		//    🔴 En develop no hay ningun cartel de "¿aplicar los descuentos del proveedor?" que haya
		//    que contestar: al elegir el proveedor, ModelForm.prefillHasManyOnSelect() los crea solos
		//    (y el backend hace lo mismo al confirmar, en
		//    NewProviderOrderHelper::precargar_bonificaciones_proveedor). Lo que se puede verificar,
		//    y es lo que importa, es que la compra quedo con las bonificaciones del proveedor y que
		//    son editables.
		await abrir_pestania(page, 'provider_order', 'Descuentos y recargos')
		const descuentos = page.locator('[data-testid="provider_order-provider_order_discounts"]')
		await expect(descuentos.locator('[data-testid^="provider_order_discount-row-"]')).toHaveCount(BONIFICACIONES.length)
		const texto_descuentos = await descuentos.innerText()
		for (const porcentaje of BONIFICACIONES) {
			expect(texto_descuentos, `falta la bonificacion del ${porcentaje}%`).toContain(String(porcentaje))
		}

		// 6. Facturacion automatica: es lo que hace que el sistema genere solo la factura de la
		//    compra, con el IVA por alicuota calculado a partir de los articulos.
		await abrir_pestania(page, 'provider_order', 'Facturacion')
		await page.locator('[data-testid="provider_order-modo_facturacion"]').selectOption('automatico')

		// 7. Articulos. Primero el que NO existe: se crea desde el propio buscador.
		await abrir_pestania(page, 'provider_order', 'Articulos')

		await crear_desde_buscador(page, 'provider_order-articles', contexto.articulo_nuevo)

		const filas_cantidad = page.locator('[data-testid^="article-amount-"]')
		await expect(filas_cantidad).toHaveCount(1)
		contexto.articulos.nuevo = (await filas_cantidad.last().getAttribute('data-testid')).replace('article-amount-', '')

		// El articulo recien creado nace con status 'inactive', asi que su nombre se muestra en un
		// textarea editable (show_in_input_if en el model) y hay que leerlo con toHaveValue: el
		// value de un input no es texto y una asercion sobre la fila lo veria vacio.
		await expect(page.locator(`[data-testid="article-name-${contexto.articulos.nuevo}-editable"]`))
			.toHaveValue(contexto.articulo_nuevo)

		await page.locator(`[data-testid="article-amount-${contexto.articulos.nuevo}"]`).fill(String(CANTIDAD))
		await page.locator(`[data-testid="article-cost-${contexto.articulos.nuevo}"]`).fill(String(COSTO))
		// El IVA se elige por su porcentaje, que es el texto de la opcion (el select muestra
		// ivas.percentage). No es una seleccion por texto de interfaz: 21 ES el dato.
		await page.locator(`[data-testid="article-iva_id-${contexto.articulos.nuevo}"]`).selectOption({ label: String(IVA) })

		// 8. Y ahora el que ya existe, con el mismo costo.
		await search_and_select(page, 'provider_order-articles', ARTICULO_EXISTENTE)
		await expect(filas_cantidad).toHaveCount(2)
		contexto.articulos.existente = (await filas_cantidad.last().getAttribute('data-testid')).replace('article-amount-', '')
		expect(contexto.articulos.existente).not.toBe(contexto.articulos.nuevo)

		await page.locator(`[data-testid="article-amount-${contexto.articulos.existente}"]`).fill(String(CANTIDAD))
		// El costo viene prefildeado con el costo actual del articulo; se escribe igual para que la
		// compra no dependa de que el fixture lo tenga en 1000.
		await page.locator(`[data-testid="article-cost-${contexto.articulos.existente}"]`).fill(String(COSTO))
		await expect(page.locator(`[data-testid="article-iva_id-${contexto.articulos.existente}"]`))
			.toHaveValue(await page.locator(`[data-testid="article-iva_id-${contexto.articulos.nuevo}"]`).inputValue())

		// 9. Guardar, y quedarse con la respuesta del servidor: es contra ella que se verifica la
		//    pantalla, y de ella salen el id y el numero de la compra que usan los tests siguientes.
		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/provider-order') && res.request().method() === 'POST'),
			page.locator('[data-testid="btn-guardar-provider_order"]').click(),
		])
		const cuerpo = await respuesta.json()
		contexto.compra = cuerpo.model
		expect(contexto.compra && contexto.compra.id, 'el POST de la compra no devolvio un modelo con id').toBeTruthy()

		// 10. Los totales de la compra, con la misma cuenta que el costeo del listado va a repetir
		//     articulo por articulo. Se verifican contra el servidor porque son la entrada de todo
		//     lo que sigue: si el neto no es el esperado, la factura, la cuenta corriente y el
		//     reporte fiscal van a estar mal en cadena y conviene que el rojo aparezca aca.
		const bruto = COSTO * CANTIDAD * 2
		const neto = costo_real_esperado(COSTO, BONIFICACIONES) * CANTIDAD * 2
		const iva_compra = neto * IVA / 100

		expect(Number(contexto.compra.sub_total)).toBe(bruto)
		expect(redondear(Number(contexto.compra.descuentos_compra))).toBe(redondear(bruto - neto))
		expect(redondear(Number(contexto.compra.total_iva))).toBe(redondear(iva_compra))
		expect(redondear(Number(contexto.compra.total))).toBe(redondear(neto + iva_compra))

		console.log(`[compra] N° ${contexto.compra.num} (id ${contexto.compra.id}) - neto ${neto} - total ${contexto.compra.total}`)

		// 11. Y el total que muestra la pantalla tiene que ser el mismo que devolvio el servidor.
		//     Se compara el NUMERO y no el texto formateado: price() recorta los decimales cuando
		//     son ",00", asi que un total redondo se imprime sin centavos.
		const fila = page.locator(`[data-testid="provider_order-row-${contexto.compra.id}"]`)
		await expect(fila).toBeVisible()
		await fila.click()
		await abrir_pestania(page, 'provider_order', 'Total')
		const total_en_pantalla = numero_de_pantalla(await page.locator('[data-testid="compra-total"]').innerText())
		expect(total_en_pantalla).toBe(redondear(Number(contexto.compra.total)))
	})

	test('carga percepciones y retenciones en la factura que genero la compra', async ({ page }) => {
		await abrir_compras_del_dia(page)

		await page.locator(`[data-testid="provider_order-row-${contexto.compra.id}"]`).click()
		await abrir_pestania(page, 'provider_order', 'Facturacion')

		// La factura tiene que existir sola: el modo automatico la crea al guardar la compra
		// (ModoFacturacionHelper::check_modo_facturacion), con el IVA por alicuota ya calculado.
		const facturas = page.locator('[data-testid="provider_order-provider_order_afip_tickets"]')
		const filas = facturas.locator('[data-testid^="provider_order_afip_ticket-row-"]')
		await expect(filas, 'la facturacion automatica tenia que dejar exactamente una factura').toHaveCount(1)

		await filas.first().click()

		// Los importes de la factura los pone el sistema; el test los LEE y deriva de ahi las
		// percepciones y retenciones, en vez de hardcodear numeros. Asi siguen siendo "acordes al
		// importe de la factura" aunque mañana cambie el costo o la cantidad de la compra.
		// Es el value de un input: trae el numero crudo del modelo ("20691.00"), sin formatear.
		const total = numero_de_dato(await page.locator('[data-testid="provider_order_afip_ticket-total"]').inputValue())
		expect(redondear(total)).toBe(redondear(Number(contexto.compra.total)))

		const neto = costo_real_esperado(COSTO, BONIFICACIONES) * CANTIDAD * 2
		const iva_facturado = redondear(neto * IVA / 100)

		// Importes con criterios de la operatoria real, todos derivados del comprobante:
		//   - percepcion de IVA:  3% sobre el neto gravado
		//   - percepcion de IIBB: 2% sobre el neto gravado
		//   - retencion de IVA:   50% del IVA facturado (regimen general)
		//   - retencion de IIBB:  2% sobre el neto gravado
		//   - retencion de Ganancias: 2% sobre el neto gravado
		contexto.factura = {
			percepcion_iva: redondear(neto * 3 / 100),
			percepcion_iibb: redondear(neto * 2 / 100),
			retencion_iva: redondear(iva_facturado * 50 / 100),
			retencion_iibb: redondear(neto * 2 / 100),
			retencion_ganancias: redondear(neto * 2 / 100),
		}

		// La fecha de emision es lo que fecha el comprobante para el Libro IVA y para Posicion
		// Fiscal (ContabilidadRepository filtra por issued_at). La factura automatica nace con la
		// fecha de la compra; se verifica que sea hoy porque el ultimo test lee el reporte con su
		// rango por defecto, que es el dia actual.
		await expect(page.locator('[data-testid="provider_order_afip_ticket-issued_at"]')).toHaveValue(fecha_de_hoy())

		// Numero de comprobante: es lo unico que el modo automatico no puede saber.
		await page.locator('[data-testid="provider_order_afip_ticket-code"]').fill(`0001-${String(contexto.compra.num).padStart(8, '0')}`)

		// Retenciones y percepciones viven en dos pestañas distintas del formulario de la factura.
		await abrir_pestania(page, 'provider_order_afip_ticket', 'Retenciones')
		await page.locator('[data-testid="provider_order_afip_ticket-retencion_iva"]').fill(String(contexto.factura.retencion_iva))
		await page.locator('[data-testid="provider_order_afip_ticket-retencion_iibb"]').fill(String(contexto.factura.retencion_iibb))
		await page.locator('[data-testid="provider_order_afip_ticket-retencion_ganancias"]').fill(String(contexto.factura.retencion_ganancias))

		await abrir_pestania(page, 'provider_order_afip_ticket', 'Percepciones')
		await page.locator('[data-testid="provider_order_afip_ticket-percepcion_iva"]').fill(String(contexto.factura.percepcion_iva))
		await page.locator('[data-testid="provider_order_afip_ticket-percepcion_iibb"]').fill(String(contexto.factura.percepcion_iibb))

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => /\/provider-order-afip-ticket\/\d+/.test(res.url()) && res.request().method() === 'PUT'),
			page.locator('[data-testid="btn-guardar-provider_order_afip_ticket"]').click(),
		])
		const guardada = (await respuesta.json()).model

		// Lo guardado tiene que ser lo cargado. Se compara contra la respuesta del servidor y no
		// contra la pantalla: es el dato que despues va a leer Posicion Fiscal.
		expect(redondear(Number(guardada.retencion_iva))).toBe(contexto.factura.retencion_iva)
		expect(redondear(Number(guardada.retencion_iibb))).toBe(contexto.factura.retencion_iibb)
		expect(redondear(Number(guardada.retencion_ganancias))).toBe(contexto.factura.retencion_ganancias)
		expect(redondear(Number(guardada.percepcion_iva))).toBe(contexto.factura.percepcion_iva)
		expect(redondear(Number(guardada.percepcion_iibb))).toBe(contexto.factura.percepcion_iibb)
		// El IVA de la factura no lo toco nadie: lo sigue calculando el modo automatico.
		expect(redondear(Number(guardada.total_iva))).toBe(iva_facturado)

		console.log('[factura] ' + JSON.stringify(contexto.factura))
	})

	test(`configura el impuesto sobre ventas (IIBB) al ${IIBB}%`, async ({ page }) => {
		// Va ANTES de poner los margenes, y el orden no es casual: guardar un sale_tax encola
		// ProcessSetFinalPrices (SaleTaxController), o sea un recalculo masivo en background que en
		// este entorno NO corre --QUEUE_CONNECTION=database y no hay worker levantado--. Lo que si
		// recalcula en el acto es guardar cada articulo (ArticleController::update llama a
		// setFinalPrice), que es lo que hace el test siguiente. Configurando el impuesto primero,
		// el recalculo sincronico de cada articulo ya lo encuentra con la alicuota nueva y el test
		// no depende de ninguna cola.
		await page.goto('/abm/precios/impuestos-sobre-ventas')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		const filas = page.locator('[data-testid^="sale_tax-row-"]')
		await expect(filas, 'el fixture tiene que traer el impuesto IIBB sembrado').toHaveCount(1)
		await filas.first().click()

		// completar_campo y no fill(): el modal puede estar terminando de cargar el modelo y pisar
		// lo tipeado. Ver el comentario del helper -- este campo puntual fue el que lo destapo.
		await completar_campo(page, 'sale_tax-percentage', IIBB)
		// Tiene que aplicar a todos los articulos y estar activo: si no, no entra en el calculo
		// (get_sale_taxes_para_articulo filtra por activo + apply_to_all/pivote).
		await expect(page.locator('[data-testid="sale_tax-apply_to_all"]')).toBeChecked()
		await expect(page.locator('[data-testid="sale_tax-activo"]')).toBeChecked()

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/sale-tax') && res.request().method() === 'PUT'),
			page.locator('[data-testid="btn-guardar-sale_tax"]').click(),
		])
		const guardado = (await respuesta.json()).model
		expect(Number(guardado.percentage)).toBe(IIBB)
		expect(Boolean(Number(guardado.activo))).toBe(true)
		expect(Boolean(Number(guardado.apply_to_all))).toBe(true)
	})

	/**
	 * Nombre del articulo, para poder buscarlo en el listado.
	 *
	 * @param {string} id
	 * @returns {string}
	 */
	function nombre_de_articulo(id) {
		return String(id) === String(contexto.articulos.nuevo)
			? contexto.articulo_nuevo
			: ARTICULO_EXISTENTE
	}

	test('el listado calcula costo real y precio final con descuentos, margen, IIBB e IVA', async ({ page }) => {
		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		const costo_real = redondear(costo_real_esperado(COSTO, BONIFICACIONES))
		const precio_final = redondear(precio_final_esperado(costo_real, MARGEN, IIBB, IVA))

		for (const id of [contexto.articulos.nuevo, contexto.articulos.existente]) {

			// 🔴 Se BUSCA el articulo antes de leerle las celdas. El listado por defecto trae pagina
			//    1 ordenada por id descendente, asi que "Pinza" --que es del fixture y tiene id 2--
			//    se cae de la pantalla en cuanto la base acumula corridas. El rojo que produce es
			//    `celda-article-cost-2 not found`, que manda a pensar que el testid esta mal.
			await buscar_articulo(page, nombre_de_articulo(id))

			// 1. El costo bruto de la compra quedo como costo del articulo (sin tocar), y las
			//    bonificaciones de la compra se materializaron como descuentos del articulo, que es
			//    lo que baja el costo real. La compra tenia "los precios ya incluyen IVA" apagado,
			//    asi que el costo se guarda literal, sin back-out.
			expect(await celda_numerica(page, 'article', 'cost', id), `costo bruto del articulo ${id}`).toBe(COSTO)
			expect(await celda_numerica(page, 'article', 'costo_real', id), `costo real del articulo ${id}`).toBe(costo_real)

			// 2. Margen de ganancia. Se carga desde la ficha del articulo, como lo haria una persona.
			await page.locator(`[data-testid="article-row-${id}"]`).click()

			// Se apaga el margen del proveedor ANTES de tocar el margen del articulo: ver la nota 3
			// del encabezado de este archivo. El toggle vive en "Datos generales", que es la pestaña
			// que el formulario abre por defecto.
			const aplicar_margen_proveedor = page.locator('[data-testid="article-apply_provider_percentage_gain"]')
			if (await aplicar_margen_proveedor.isChecked()) {
				await page.locator('[data-testid="article-apply_provider_percentage_gain-toggle"]').click()
			}
			await expect(aplicar_margen_proveedor).not.toBeChecked()

			await abrir_pestania(page, 'article', 'Precio')
			await completar_campo(page, 'article-percentage_gain', MARGEN)

			const [respuesta] = await Promise.all([
				page.waitForResponse(res => /\/article\/\d+/.test(res.url()) && res.request().method() === 'PUT'),
				page.locator('[data-testid="btn-guardar-article"]').click(),
			])
			const guardado = (await respuesta.json()).model

			// 3. La cuenta, contra lo que devolvio el servidor.
			expect(Number(guardado.percentage_gain), `margen guardado del articulo ${id}`).toBe(MARGEN)
			expect(redondear(Number(guardado.costo_real)), `costo real del articulo ${id}`).toBe(costo_real)
			expect(redondear(Number(guardado.final_price)), `precio final del articulo ${id}`).toBe(precio_final)

			// 4. Y lo mismo en el listado, que es donde el usuario lo mira. La celda tarda en
			//    refrescarse lo que tarde la respuesta en llegar al store: toPass reintenta la
			//    lectura en vez de dormir.
			await expect(async () => {
				expect(await celda_numerica(page, 'article', 'final_price', id)).toBe(precio_final)
			}).toPass({ timeout: 15000 })
		}

		console.log(`[costeo] costo ${COSTO} - bonif ${BONIFICACIONES.join('/')}% -> costo real ${costo_real} - margen ${MARGEN}% + IIBB ${IIBB}% + IVA ${IVA}% -> precio final ${precio_final}`)

		// 5. El IIBB tiene que MOVER el numero esperado. No verifica al sistema --compara dos
		//    cuentas del propio test-- sino a la asercion de arriba: si con IIBB y sin IIBB diera
		//    lo mismo (alicuota 0, impuesto desactivado, un cambio de constantes desafortunado),
		//    "el precio final da bien" no probaria nada sobre los impuestos sobre ventas y este
		//    archivo estaria mintiendo sobre su alcance.
		expect(precio_final, 'con esta combinacion de numeros el IIBB no cambia nada y la asercion de arriba no prueba el impuesto')
			.not.toBe(redondear(precio_final_esperado(costo_real, MARGEN, 0, IVA)))
	})

	test('el stock de la compra entra al deposito indicado y deja su movimiento', async ({ page }) => {
		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		// El articulo nuevo arranca sin stock, asi que su stock es exactamente lo comprado. "Pinza"
		// ya venia con stock del fixture, asi que lo unico que se puede afirmar de el es el DELTA,
		// y ese delta es lo que dice el movimiento: stock_resultante.
		await buscar_articulo(page, contexto.articulo_nuevo)
		expect(await celda_numerica(page, 'article', 'stock', contexto.articulos.nuevo)).toBe(CANTIDAD)

		for (const id of [contexto.articulos.nuevo, contexto.articulos.existente]) {
			// Ver la nota del paso anterior: los articulos del fixture no entran en el listado por
			// defecto, hay que buscarlos.
			await buscar_articulo(page, nombre_de_articulo(id))

			await page.locator(`[data-testid="btn-stock-movements-${id}"]`).click()

			const movimientos = page.locator('[data-testid="stock-movement-row"]')
			await expect(movimientos.first()).toBeVisible()

			// El movimiento de la compra es el ultimo que se hizo, y la tabla los trae del mas
			// nuevo al mas viejo.
			const movimiento = movimientos.first()
			await expect(movimiento).toHaveAttribute('data-concepto', 'Compra a proveedor')
			await expect(movimiento).toHaveAttribute('data-deposito-destino', DEPOSITO)
			// data-cantidad y data-stock-resultante vienen del modelo sin formatear ("10.00"), asi que el
			// punto es DECIMAL, no separador de miles.
			expect(numero_de_dato(await movimiento.getAttribute('data-cantidad'))).toBe(CANTIDAD)

			// El stock que quedo en el articulo tiene que ser el que dejo el movimiento: es lo que
			// une "se movio stock" con "el listado lo muestra".
			const stock_resultante = numero_de_dato(await movimiento.getAttribute('data-stock-resultante'))
			expect(await celda_numerica(page, 'article', 'stock', id)).toBe(stock_resultante)

			await page.keyboard.press('Escape')
			await expect(movimientos.first()).toBeHidden()
		}
	})

	test('la cuenta corriente del proveedor recibe la compra y se le registra el pago total', async ({ page }) => {
		await page.goto('/proveedores/proveedores')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		const total = redondear(Number(contexto.compra.total))
		const proveedor_id = contexto.compra.provider_id

		// El boton C/C solo existe si el proveedor tiene credit_account, que es justo lo que crea la
		// compra al generar el movimiento de cuenta corriente. La moneda 1 es pesos.
		await page.locator(`[data-testid="btn-current-acount-${proveedor_id}-1"]`).click()

		// El movimiento de la compra.
		//
		// 🔴 Se ubica por el detalle EXACTO ("Pedido N°3"), no por `hasText: 'N°3'`. Ese hasText es
		// una coincidencia por substring: con la compra N°1 en pantalla tambien matchearia "Pedido
		// N°13". El detalle completo con la expresion regular anclada al final es lo unico que
		// distingue una compra de otra cuando la cuenta corriente del proveedor ya tiene historia
		// --que es el caso normal, y el caso de la segunda corrida de este mismo archivo--.
		const filas = page.locator('[data-testid^="current_acount-row-"]')
		const fila_compra = filas.filter({ hasText: new RegExp(`N°${contexto.compra.num}(?!\d)`) }).first()
		await expect(fila_compra, 'la compra tenia que aparecer como movimiento de la cuenta corriente').toBeVisible()

		const id_movimiento = (await fila_compra.getAttribute('data-testid')).replace('current_acount-row-', '')
		expect(await celda_numerica(page, 'current_acount', 'debe', id_movimiento), 'el debe de la compra').toBe(total)

		// El saldo acumulado hasta la compra: es la referencia contra la que se mide el pago mas
		// abajo. No se puede asumir que sea igual al total de la compra -- el proveedor puede tener
		// movimientos anteriores, y los tiene en cuanto este archivo se corre dos veces.
		// El saldo acumulado hasta la compra. Ya no se usa como referencia del pago --ver la nota de
		// mas abajo-- pero se deja registrado en la consola: es lo que uno quiere ver cuando este
		// paso se pone en rojo.
		const saldo_hasta_la_compra = await celda_numerica(page, 'current_acount', 'saldo', id_movimiento)
		console.log(`[costeo] saldo del proveedor hasta la compra: ${saldo_hasta_la_compra}`)

		// Se selecciona el movimiento: con uno seleccionado, el boton de pago precarga el importe
		// con el saldo de ESE movimiento (setToPay en BtnPagoNotaCredito.vue). Es la forma en que el
		// sistema deja pagar "el total de esta compra" sin tipear el numero.
		await fila_compra.click()
		const boton_pago = page.locator('[data-testid="btn-registrar-pago"]')
		await expect(boton_pago).toHaveAttribute('data-precargado', 'si')
		await boton_pago.click()

		// El importe precargado tiene que ser el total de la compra, en el total del pago y en el
		// primer metodo de pago. Lo escribe un setTimeout de 500 ms, por eso se espera el VALOR
		// (toHaveValue reintenta) en vez de leerlo una sola vez.
		await expect(page.locator('[data-testid="pago-monto-0"]')).toHaveValue(String(total))
		expect(numero_de_dato(await page.locator('[data-testid="current-acount-pago-total"]').inputValue())).toBe(total)

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/current-acount/pago') && res.request().method() === 'POST'),
			page.locator('[data-testid="btn-confirmar-pago"]').click(),
		])
		expect(respuesta.ok(), 'el POST del pago no salio bien').toBeTruthy()

		// Despues del pago tiene que haber un movimiento nuevo con el haber igual al total de la
		// compra, y ese movimiento tiene que bajar el saldo acumulado EXACTAMENTE en ese total.
		//
		// 🔴 Dos cosas que la columna "saldo" no es, y que ya costaron un rojo cada una:
		//
		//   1. No es el saldo pendiente de ese movimiento: es el saldo ACUMULADO hasta el. La fila
		//      de la compra sigue mostrando su saldo despues de pagada; la que baja es la del pago.
		//   2. No arranca en cero. Si el proveedor ya tenia movimientos --y los tiene en cuanto
		//      este archivo se corre por segunda vez sobre la misma base-- el pago no deja la
		//      cuenta en 0, la deja en lo que habia antes de esta compra.
		//
		// Por eso se verifica la DIFERENCIA (saldo antes - total), que es la afirmacion real:
		// "el pago cancelo exactamente el total de esta compra".
		//
		// Se reintenta la lectura completa porque la lista se recarga sola despues del POST.
		await expect(async () => {
			const cantidad = await filas.count()

			// 🔴 Se busca el pago con el id MAS ALTO, no el primero que aparezca con ese haber.
			//    Este archivo carga siempre la misma compra, asi que su total es identico en todas
			//    las corridas: despues de unas cuantas hay VARIOS pagos con el mismo haber, y
			//    quedarse con el primero agarra el de una corrida vieja, cuyo saldo acumulado es
			//    otro. El rojo dice "el pago tenia que bajar el saldo" con dos numeros que no se
			//    parecen en nada, y manda a revisar la cuenta corriente en vez de la busqueda.
			//    Medido el 31/8/2026, en la primera corrida de la suite completa que llego hasta
			//    aca con historia suficiente.
			let fila_del_pago = null
			for (let i = 0; i < cantidad; i++) {
				const id = (await filas.nth(i).getAttribute('data-testid')).replace('current_acount-row-', '')
				if (await celda_numerica(page, 'current_acount', 'haber', id) === total) {
					if (fila_del_pago === null || Number(id) > Number(fila_del_pago)) {
						fila_del_pago = id
					}
				}
			}

			expect(fila_del_pago, `ningun movimiento de la cuenta corriente con haber = ${total}`).not.toBeNull()

			// 🔴 La referencia es el movimiento INMEDIATAMENTE ANTERIOR AL PAGO, no el de la compra.
			//    Suena equivalente --el pago se hace justo despues de la compra-- y no lo es: el
			//    proveedor "Buenos Aires" lo comparten dos circuitos, y `circuito-compra.spec.js` le
			//    mete su propio movimiento en el medio. Con la compra como referencia, la cuenta da
			//    de menos exactamente por lo que se colo, y el rojo --"el pago tenia que bajar el
			//    saldo"-- manda a revisar el pago, que esta perfecto. Medido el 1/9/2026: entre la
			//    compra de este archivo (20.691,00) y su pago se habia intercalado un pedido de
			//    28.243,22 del otro circuito.
			//
			//    Lo que el paso afirma sigue siendo lo mismo: el pago corre el saldo acumulado
			//    exactamente en el total de la compra.
			let fila_anterior = null
			for (let i = 0; i < cantidad; i++) {
				const id = (await filas.nth(i).getAttribute('data-testid')).replace('current_acount-row-', '')
				if (Number(id) < Number(fila_del_pago)) {
					if (fila_anterior === null || Number(id) > Number(fila_anterior)) {
						fila_anterior = id
					}
				}
			}

			expect(fila_anterior, 'el pago tenia que tener algun movimiento antes').not.toBeNull()

			expect(
				await celda_numerica(page, 'current_acount', 'saldo', fila_del_pago),
				'el pago tenia que bajar el saldo acumulado exactamente en el total de la compra'
			).toBe(redondear(await celda_numerica(page, 'current_acount', 'saldo', fila_anterior) - total))
		}).toPass({ timeout: 20000 })
	})

	test('Posicion Fiscal computa el IVA credito, las percepciones y las retenciones de la compra', async ({ page }) => {
		await page.goto('/reportes/posicion-fiscal')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		const ahora = await leer_posicion_fiscal(page)

		/**
		 * Cuanto sumo este circuito en un renglon del reporte.
		 *
		 * @param {string} renglon
		 * @returns {number}
		 */
		const delta = renglon => redondear(ahora[renglon] - contexto.base_fiscal[renglon])

		const iva_facturado = redondear(costo_real_esperado(COSTO, BONIFICACIONES) * CANTIDAD * 2 * IVA / 100)

		// IVA credito: el IVA de la factura de compra. Es credito fiscal recuperable, por eso la
		// cuenta es Responsable Inscripto y por eso el IVA NO entro al costo del articulo.
		expect(delta('iva-credito'), 'IVA credito').toBe(iva_facturado)

		// Percepciones y retenciones sufridas, tal cual se cargaron en la factura.
		expect(delta('percepcion-iva'), 'percepciones de IVA sufridas').toBe(contexto.factura.percepcion_iva)
		expect(delta('retencion-iva'), 'retenciones de IVA sufridas').toBe(contexto.factura.retencion_iva)
		expect(delta('percepcion-iibb'), 'percepciones de IIBB sufridas').toBe(contexto.factura.percepcion_iibb)
		expect(delta('retencion-iibb'), 'retenciones de IIBB sufridas').toBe(contexto.factura.retencion_iibb)
		expect(delta('retencion-ganancias'), 'retenciones de Ganancias sufridas').toBe(contexto.factura.retencion_ganancias)

		// El saldo de IVA se arma con esos renglones y no es un numero suelto: la compra suma
		// credito y las percepciones/retenciones suman pagos a cuenta, asi que el saldo se corre a
		// favor en la suma de los tres. Verificarlo es lo que prueba que el reporte no solo muestra
		// los renglones sino que los usa.
		const corrimiento_a_favor = redondear(
			iva_facturado + contexto.factura.percepcion_iva + contexto.factura.retencion_iva
		)
		const saldo_iva = signo_del_saldo(ahora, 'saldo-iva')
		const saldo_iva_base = signo_del_saldo(contexto.base_fiscal, 'saldo-iva')
		expect(redondear(saldo_iva_base - saldo_iva), 'corrimiento del saldo de IVA').toBe(corrimiento_a_favor)

		console.log('[fiscal] deltas: ' + JSON.stringify({
			iva_credito: delta('iva-credito'),
			percepcion_iva: delta('percepcion-iva'),
			retencion_iva: delta('retencion-iva'),
			percepcion_iibb: delta('percepcion-iibb'),
			retencion_iibb: delta('retencion-iibb'),
			retencion_ganancias: delta('retencion-ganancias'),
		}))
	})
})

/**
 * Saldo fiscal con signo: el reporte publica el monto SIEMPRE positivo y dice aparte si es a pagar
 * o a favor (data-tipo), porque asi lo quiere leer un contador. Para poder restar dos mediciones
 * hay que devolverle el signo: a pagar es positivo, a favor es negativo.
 *
 * @param {Object<string, number>} renglones Renglones leidos con leer_posicion_fiscal().
 * @param {string} nombre Renglon de saldo (ej. "saldo-iva").
 * @returns {number}
 */
function signo_del_saldo(renglones, nombre) {
	const monto = renglones[nombre]
	return renglones[nombre + '__tipo'] === 'a_favor' ? -monto : monto
}
