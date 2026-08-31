// Circuito completo de una COMPRA, de punta a punta y por la interfaz real.
//
// Es el primero de los cinco archivos del circuito e2e completo del sistema. Cubre lo que una
// compra mueve cuando se la carga como la carga una persona:
//
//   1. El alta: proveedor con bonificaciones, articulos que ya existen, un articulo creado al
//      vuelo desde el propio buscador, costos cambiados a mano, y las tres opciones irreversibles.
//   2. La regla de cantidad PEDIDA vs RECIBIDA, en sus tres caminos (ver abajo).
//   3. El flete: que se prorratee entre los articulos en proporcion al subtotal de cada renglon.
//   4. La cuenta corriente del proveedor.
//   5. Editar la compra subiendo la cantidad recibida: total, cuenta corriente y stock.
//   6. El pago de esa deuda, su imputacion y la salida de la caja.
//
// Depende del fixture determinista de empresa-api
// (database/seeders/testing/TestingFerreteriaSeeder.php).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// Decisiones de diseño que conviene leer antes de tocar este archivo
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// 🔴 1. Los tests son SERIALES y comparten estado (`test.describe.serial`), por la misma razon que
//    en compra-costeo-facturacion.spec.js: el circuito ES secuencial. No se puede verificar la
//    cuenta corriente de una compra que todavia no existe. Si un test falla, los que siguen se
//    saltean, que es lo correcto: reportarian fallas derivadas y taparian la causa.
//
//    Y por eso NO es un solo test gigante: el trace, la captura y el timeout de Playwright son POR
//    TEST. Un unico test de sesenta maniobras deja, cuando se rompe, una linea roja y un trace
//    enorme sin decir cual de las cincuenta aserciones anteriores es la regresion.
//
// 🔴 2. Todo lo acumulativo se verifica por DIFERENCIA, nunca por valor absoluto. El stock de un
//    articulo del fixture y el saldo del proveedor arrancan en un valor que la corrida ANTERIOR
//    ya movio. El primer test saca la foto previa y todas las aserciones son sobre el delta. Sin
//    eso, la segunda corrida sobre la misma base daria rojo sin que haya nada roto (y peor: la
//    primera pasaria, escondiendo el problema).
//
// 🔴 3. El flete se carga DESPUES de guardar la compra, y no es una preferencia de estilo. Un
//    has_many sobre una compra que todavia no tiene id se descarta EN SILENCIO: el modal anidado
//    deja completar todo, "Guardar y cerrar" no hace nada, el modal queda abierto y la tabla sigue
//    diciendo "No hay Costos Extra". Sin error de consola y sin toast. Medido el 31/8/2026.
//
// 🔴 4. Los articulos se identifican por el testid de su fila, nunca por posicion. El id real de un
//    articulo creado al vuelo no se conoce de antemano, asi que la fila recien agregada se ubica
//    con `.last()` sobre `[data-testid^="article-amount-"]` (las filas se agregan al final).
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { abrir_pestania, completar_campo, search_and_select, crear_desde_buscador } = require('../helpers/formulario')
const { numero_de_pantalla, numero_de_dato, redondear } = require('../helpers/numeros')
const { escribir_excel_de_compra } = require('../helpers/excel')

// ── Datos de entrada ─────────────────────────────────────────────────────────────────────────

/** Proveedor del fixture con bonificaciones cargadas (10% y 5%). */
const PROVEEDOR = 'Buenos Aires'
/** Deposito del fixture, destino del stock de esta compra. */
const DEPOSITO = 'Principal'
/** Bonificaciones que el fixture tiene en el proveedor y que la compra hereda sola. */
const BONIFICACIONES = [10, 5]
/** Alicuota de IVA con la que se cargan los articulos de esta compra. */
const IVA = 21
/** Importe del costo extra de transporte que se prorratea entre los articulos. */
const FLETE = 10000

/**
 * Articulo del fixture que NO entra en el alta y que el Excel agrega despues. Prueba el camino
 * "existe en el sistema pero no en la compra", que es distinto de "no existe".
 */
const ARTICULO_A_AGREGAR = 'Cuchilla'

/** Cantidad y costo con los que el Excel PISA el renglon de Pinza que ya estaba cargado. */
const PINZA_IMPORTADA = { cantidad: 12, costo: 1300 }

/** Metodo de pago y caja con los que se paga la compra. Los dos existen en el fixture. */
const PAGO_METODO = 'Efectivo'
const CAJA = 'Caja Efectivo'

/**
 * Los cuatro renglones de la compra. Cada uno ejercita un camino distinto y ninguno sobra:
 *
 * | renglon   | que prueba                                                              |
 * |-----------|-------------------------------------------------------------------------|
 * | Pinza     | articulo que YA existe, sin cantidad recibida -> el stock usa la PEDIDA  |
 * | Martillo  | cantidad recibida MENOR que la pedida -> el stock usa la RECIBIDA        |
 * | Alicate   | cantidad recibida en CERO EXPLICITO -> el stock no se mueve              |
 * | (nuevo)   | articulo creado al vuelo desde el buscador, con costo asignado ahi mismo |
 *
 * 🔴 El caso del cero explicito es el unico que puede romperse sin que los otros dos se enteren:
 * `NewProviderOrderHelper::interpretar_cantidad_real()` usa `received` si fue completado a mano
 * INCLUIDO el 0, y cae a `amount` solo si es null o ''. Un `if ($received)` en vez de un
 * `is_null($received)` haria que el cero se comporte como "no indicado" y sume la cantidad pedida.
 */
const RENGLONES = [
	{ alias: 'pinza',    articulo: 'Pinza',          costo: 1200, pedida: 10, recibida: null },
	{ alias: 'martillo', articulo: 'Martillo acero', costo: 2500, pedida: 8,  recibida: 5 },
	{ alias: 'alicate',  articulo: 'Alicate',        costo: 300,  pedida: 6,  recibida: 0 },
	{ alias: 'nuevo',    articulo: null,             costo: 700,  pedida: 4,  recibida: null },
]

// ── Estado compartido entre los tests seriales ───────────────────────────────────────────────

const contexto = {
	/** Nombre del articulo que este circuito crea al vuelo. Unico por corrida. */
	articulo_nuevo: `E2E Compra ${Date.now()}`,
	/**
	 * Nombre del articulo que da de alta la IMPORTACION del Excel. Tambien unico por corrida: si
	 * se repitiera, la segunda corrida lo encontraria existente y estaria probando la actualizacion
	 * en vez del alta, sin que nada lo avise.
	 */
	articulo_importado: `E2E Importado ${Date.now()}`,
	/** Modelo de la compra tal cual lo devolvio el POST (id, num, totales). */
	compra: null,
	/** alias -> id del articulo en el sistema. */
	ids: {},
	/** alias -> stock del articulo ANTES de la compra. */
	stock_previo: {},
	/** alias -> cuantos movimientos de stock tenia el articulo ANTES de la compra. */
	movimientos_previos: {},
	/** Saldo de la cuenta corriente del proveedor antes de la compra, y su id de credit_account. */
	proveedor: {},
	/** Cuanto subio el total de la compra al recibir mas mercaderia. */
	aumento_del_total: null,
}

// ── Cuentas esperadas ────────────────────────────────────────────────────────────────────────

/**
 * Cantidad que efectivamente mueve un renglon: la recibida si fue completada (incluido el 0), y
 * si no, la pedida. Es la misma regla que `interpretar_cantidad_real()` en el backend, escrita a
 * mano a proposito: si el test importara la logica del sistema no probaria nada.
 *
 * @param {{pedida: number, recibida: number|null}} renglon
 * @returns {number}
 */
function cantidad_efectiva(renglon) {
	return renglon.recibida === null ? renglon.pedida : renglon.recibida
}

/**
 * Subtotal BRUTO de un renglon: costo por cantidad efectiva, sin bonificaciones.
 *
 * @param {{costo: number, pedida: number, recibida: number|null}} renglon
 * @returns {number}
 */
function subtotal_bruto(renglon) {
	return renglon.costo * cantidad_efectiva(renglon)
}

/**
 * Costo real de un articulo: el costo bruto con las bonificaciones del proveedor aplicadas EN
 * CASCADA (cada una sobre lo que dejo la anterior), que es como las aplica
 * `ArticlePricesHelper::aplicar_descuentos`.
 *
 * @param {number} costo Costo bruto por unidad.
 * @param {number[]} descuentos Porcentajes, en el orden en que estan cargados.
 * @returns {number}
 */
function costo_con_bonificaciones(costo, descuentos) {
	return descuentos.reduce((acumulado, porcentaje) => acumulado - acumulado * porcentaje / 100, costo)
}

/**
 * Recargo UNITARIO de transporte que le toca a un renglon por el prorrateo del flete.
 *
 * La cuenta es la de `NewProviderOrderHelper::aplicar_costos_extra_a_recargos_articulos()`:
 *
 *     monto del item = flete x (subtotal bruto del item / subtotal bruto de la compra)
 *     unitario       = monto del item / cantidad efectiva
 *
 * 🔴 Un renglon con cantidad efectiva 0 NO recibe recargo: el backend lo saltea con un `continue`
 * antes de tocarlo (su subtotal es 0, asi que el prorrateo seria una division por cero). Es una
 * consecuencia no obvia del cero explicito y este archivo la verifica aparte.
 *
 * @param {{costo: number, pedida: number, recibida: number|null}} renglon
 * @param {number} sub_total_compra Subtotal bruto de toda la compra.
 * @returns {number} 0 si el renglon no participa del prorrateo.
 */
function recargo_unitario_esperado(renglon, sub_total_compra) {
	const cantidad = cantidad_efectiva(renglon)

	if (cantidad <= 0) {
		return 0
	}

	return FLETE * subtotal_bruto(renglon) / sub_total_compra / cantidad
}

// ── Helpers de este archivo ──────────────────────────────────────────────────────────────────

/**
 * Fecha de hoy en YYYY-MM-DD, en la zona horaria del navegador (la misma de la aplicacion y la
 * base). Es la que consume `[data-testid="control-fecha-dia"][data-fecha="..."]`.
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
 * Entra al modulo de compras y deja el listado del dia CARGADO.
 *
 * 🔴 El click en el dia no sobra. Los modulos que se ven por fecha --compras, ventas, pedidos,
 * gastos, cheques, presupuestos-- NO disparan el listado al montarse: `view/Index.vue` los saltea
 * a proposito (`disparar_listado_por_defecto()`) porque su flujo es entrar por dia/rango. Sin este
 * click la tabla dice "No hay Compras" con las compras en la base, y el test se va en timeout
 * apuntando al selector de la fila, que no tiene nada de malo.
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
 * Abre el formulario de alta de una compra, REINTENTANDO hasta que el modal exista.
 *
 * 🔴 El reintento no es un sleep disfrazado y no sobra. `BtnCreate.create()` llama a `setModel()`,
 * que adentro de un `setTimeout(..., 30)` hace `$bvModal.show('provider_order')`. Si el `<model>`
 * --componente async-- todavia no cargo su chunk, ese `show()` es un NO-OP SILENCIOSO de
 * BootstrapVue: pedirle mostrar un id que nadie registro no tira error. El sintoma es un boton que
 * se clickea bien y no abre nada, sin un solo error de consola. Medido el 31/8/2026.
 *
 * Se espera la condicion observable correcta (el modal existe) y, si no se cumple, se repite la
 * MISMA accion. Igual que `elegir_primer_resultado` en helpers/formulario.js.
 *
 * ⚠️ La condicion es la EXISTENCIA del outer, no su visibilidad: un `.modal` de Bootstrap tiene
 * `position: fixed` y para un elemento fijo `offsetParent` es siempre null, asi que cualquier
 * chequeo de visibilidad basado en eso da un falso negativo.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function abrir_alta_de_compra(page) {
	const modal = page.locator('#provider_order___BV_modal_outer_')

	await expect(async () => {
		await page.locator('[data-testid="btn-crear-provider_order"]').click()
		await expect(modal).toBeAttached({ timeout: 3000 })
	}).toPass({ timeout: 30000 })
}

/**
 * Abre la cuenta corriente de un proveedor y NO sigue hasta que la lista de movimientos esta
 * dibujada.
 *
 * 🔴 El reintento cubre el mismo no-op silencioso que `abrir_alta_de_compra`:
 * `BtnCurrentAcounts` hace `$bvModal.show('current-acounts')`, y si el componente del modal
 * --async-- todavia no cargo su chunk, ese show no hace nada y no tira ningun error. El sintoma es
 * un rojo veinte lineas mas abajo diciendo "no encontre el movimiento de la compra", que manda a
 * buscar el problema en la cuenta corriente cuando en realidad el modal nunca se abrio.
 *
 * Se vuelve a clickear SOLO si el modal no esta: repetir el click con el modal abierto lo cerraria.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number|string} provider_id
 * @param {number} [moneda_id=1] 1 es pesos.
 * @returns {Promise<void>}
 */
async function abrir_cuenta_corriente(page, provider_id, moneda_id = 1) {
	const modal = page.locator('#current-acounts___BV_modal_outer_')
	const filas = page.locator('[data-testid^="current_acount-row-"]')

	await expect(async () => {
		if (await modal.count() === 0) {
			await page.locator(`[data-testid="btn-current-acount-${provider_id}-${moneda_id}"]`).click()
		}
		await expect(filas.first()).toBeVisible({ timeout: 5000 })
	}).toPass({ timeout: 45000 })
}

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

	// Toda celda de la interfaz se imprime en es-AR desde el 21/8/2026 (miles ".", decimal ",").
	// Los valores de DATO --inputValue() y atributos data-*-- van con punto y se leen con
	// numero_de_dato.
	return numero_de_pantalla(await celda.innerText())
}

/**
 * Stock actual de un articulo, leido del listado.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number|string} id
 * @returns {Promise<number>}
 */
async function stock_de(page, id) {
	return celda_numerica(page, 'article', 'stock', id)
}

/**
 * Saldo actual de una caja, leido del modulo de cajas.
 *
 * Se resuelve la caja por NOMBRE (constante del fixture) y no por id: el fixture no garantiza los
 * ids, y es el mismo contrato que usan los tests de PHPUnit contra las constantes del seeder.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} nombre Nombre de la caja, tal cual lo siembra el fixture.
 * @returns {Promise<number>}
 */
async function saldo_de_caja(page, nombre) {
	await page.goto('/cajas')
	await esperar_recursos_descargados(page, { abrir_panel: false })

	const id = await page.evaluate(texto => {
		const celdas = [...document.querySelectorAll('[data-testid^="celda-caja-name-"]')]
		const celda = celdas.find(c => c.innerText.trim() === texto)
		return celda ? celda.dataset.testid.replace('celda-caja-name-', '') : null
	}, nombre)

	expect(id, `no encontre la caja "${nombre}" en el modulo de cajas`).not.toBeNull()

	return celda_numerica(page, 'caja', 'saldo', id)
}

/**
 * Cuenta los movimientos de stock con concepto "Compra a proveedor" que tiene un articulo, abriendo
 * y cerrando su modal de movimientos.
 *
 * Se cuenta por CONCEPTO y se compara contra una linea de base, en vez de afirmar "no hay ningun
 * movimiento": el articulo puede traer movimientos de corridas anteriores, y una asercion absoluta
 * daria rojo en la segunda corrida sin que haya nada roto.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number|string} id
 * @returns {Promise<number>}
 */
async function contar_movimientos_de_compra(page, id) {
	await page.locator(`[data-testid="btn-stock-movements-${id}"]`).click()

	const estado = page.locator('[data-testid="estado-movimientos-stock"]')
	const de_compra = page.locator('[data-testid="stock-movement-row"][data-concepto="Compra a proveedor"]')

	// 🔴 No se puede contar apenas se abre el modal: mientras carga se dibuja un esqueleto y no hay
	// ninguna fila, o sea que "todavia no llegaron" y "no hay ninguno" se ven igual. La condicion
	// estable es data-estado="listo", que es lo que publica el propio componente.
	await expect(estado).toHaveAttribute('data-estado', 'listo')

	const total = await de_compra.count()

	await page.keyboard.press('Escape')
	await expect(estado).toHaveCount(0)

	return total
}

/**
 * Busca un articulo en el listado por nombre y devuelve su id, leyendolo del testid de una celda
 * de su fila.
 *
 * Se resuelve por NOMBRE y no por id hardcodeado porque el fixture no garantiza los ids: es el
 * mismo contrato que usan los tests de PHPUnit contra las constantes del seeder.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} nombre
 * @returns {Promise<string>}
 */
async function id_de_articulo(page, nombre) {
	const id = await page.evaluate(texto => {
		const celdas = [...document.querySelectorAll('[data-testid^="celda-article-name-"]')]
		const celda = celdas.find(c => c.innerText.trim() === texto)
		return celda ? celda.dataset.testid.replace('celda-article-name-', '') : null
	}, nombre)

	expect(id, `no encontre el articulo "${nombre}" en el listado`).not.toBeNull()

	return id
}

// ─────────────────────────────────────────────────────────────────────────────────────────────

test.describe.serial('Compra: alta, cantidad recibida, flete, cuenta corriente y pago', () => {

	test('linea de base: se anota el stock de los articulos del fixture antes de comprar', async ({ page }) => {
		// Este test no verifica nada y no es un test vacio: es lo que hace que el archivo entero se
		// pueda correr dos veces sobre la misma base. El stock de un articulo del fixture arranca
		// en lo que dejo la corrida anterior, asi que lo unico que este circuito puede afirmar es
		// cuanto SUMO, no cuanto hay.
		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		for (const renglon of RENGLONES) {
			if (!renglon.articulo) {
				continue
			}

			const id = await id_de_articulo(page, renglon.articulo)
			contexto.ids[renglon.alias] = id
			contexto.stock_previo[renglon.alias] = await stock_de(page, id)
			contexto.movimientos_previos[renglon.alias] = await contar_movimientos_de_compra(page, id)
		}

		console.log('[base] stock previo: ' + JSON.stringify(contexto.stock_previo))
		console.log('[base] movimientos de compra previos: ' + JSON.stringify(contexto.movimientos_previos))
	})

	test('carga la compra con articulos existentes, uno creado al vuelo y las tres opciones irreversibles', async ({ page }) => {
		await abrir_compras_del_dia(page)
		await abrir_alta_de_compra(page)

		// 1. Proveedor. Al elegirlo, el formulario precarga solo sus bonificaciones como descuentos
		//    editables de esta compra (prefill_has_many_on_select en src/models/provider_order.js).
		await search_and_select(page, 'provider_order-provider_id', PROVEEDOR)

		// 2. Deposito: a donde va el stock cuando se generen los movimientos.
		await page.locator('[data-testid="provider_order-address_id"]').selectOption({ label: DEPOSITO })

		// 3. "Los costos que cargo son BRUTOS" DESACTIVADO: los costos de RENGLONES son netos.
		//    Se verifica en vez de tocarlo porque el valor viene precargado del proveedor
		//    (prefill_prop_on_select): si el fixture cambiara ese default, esta asercion lo dice en
		//    vez de dejar pasar una compra con IVA incluido, que guardaria otro costo.
		await expect(page.locator('[data-testid="provider_order-precios_incluyen_iva"]')).not.toBeChecked()

		// 4. Las tres opciones que hacen que la compra impacte fuera de si misma. Son irreversibles
		//    (no_se_puede_desactivar en el model): una vez guardada con alguna activada, esa opcion
		//    queda bloqueada. El control visible es el label; el estado lo tiene el input.
		await page.locator('[data-testid="provider_order-update_prices-toggle"]').click()
		await expect(page.locator('[data-testid="provider_order-update_prices"]')).toBeChecked()

		await page.locator('[data-testid="provider_order-update_stock-toggle"]').click()
		await expect(page.locator('[data-testid="provider_order-update_stock"]')).toBeChecked()

		// "Generar movimiento en Cuenta Corriente" viene PRENDIDA por defecto (value: 1 en el
		// model). Se verifica, no se clickea: clickearla la APAGARIA.
		await expect(page.locator('[data-testid="provider_order-generate_current_acount"]')).toBeChecked()

		// 5. Las bonificaciones del proveedor ya tienen que estar precargadas en la compra.
		await abrir_pestania(page, 'provider_order', 'Descuentos y recargos')
		const descuentos = page.locator('[data-testid="provider_order-provider_order_discounts"]')
		await expect(descuentos.locator('[data-testid^="provider_order_discount-row-"]')).toHaveCount(BONIFICACIONES.length)

		// 6. Los renglones. Primero el que NO existe: se crea desde el propio buscador, con los dos
		//    Enter (el primero busca, el segundo crea). Va primero para que su fila quede en una
		//    posicion conocida cuando se agreguen las demas.
		await abrir_pestania(page, 'provider_order', 'Articulos')

		const filas_cantidad = page.locator('[data-testid^="article-amount-"]')

		for (const [indice, renglon] of RENGLONES.entries()) {
			if (renglon.articulo) {
				await search_and_select(page, 'provider_order-articles', renglon.articulo)
			} else {
				await crear_desde_buscador(page, 'provider_order-articles', contexto.articulo_nuevo)
			}

			await expect(filas_cantidad).toHaveCount(indice + 1)

			// La fila recien agregada es la ultima: ModelForm las agrega siempre al final. Es la
			// unica forma de ubicar un articulo creado al vuelo, cuyo id no se conoce de antemano.
			const id = (await filas_cantidad.last().getAttribute('data-testid')).replace('article-amount-', '')
			contexto.ids[renglon.alias] = id

			// completar_campo y no fill(): los inputs de ModelForm son controlados (local_value es
			// un computed sobre la prop), asi que un fill() que caiga mientras el modal termina de
			// cargar el modelo se pisa solo con el valor del store, sin ningun error. El sintoma
			// aparece veinte lineas mas abajo, en una asercion que no tiene nada que ver.
			await completar_campo(page, `article-amount-${id}`, renglon.pedida)
			await completar_campo(page, `article-cost-${id}`, renglon.costo)

			if (renglon.recibida !== null) {
				await completar_campo(page, `article-received-${id}`, renglon.recibida)
			}

			// El IVA se elige por su porcentaje, que es el texto de la opcion (el select muestra
			// ivas.percentage). No es una seleccion por texto de interfaz: 21 ES el dato.
			await page.locator(`[data-testid="article-iva_id-${id}"]`).selectOption({ label: String(IVA) })
		}

		// El articulo creado al vuelo nace con status 'inactive', asi que su nombre se muestra en un
		// textarea editable (show_in_input_if en el model). Se lee con toHaveValue: el value de un
		// input no es texto y una asercion sobre la fila lo veria vacio.
		await expect(page.locator(`[data-testid="article-name-${contexto.ids.nuevo}-editable"]`))
			.toHaveValue(contexto.articulo_nuevo)

		// 7. Guardar, quedandose con la respuesta del servidor: de ella salen el id y el numero de
		//    la compra que usan todos los tests siguientes.
		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/provider-order') && res.request().method() === 'POST'),
			page.locator('[data-testid="btn-guardar-provider_order"]').click(),
		])
		const cuerpo = await respuesta.json()
		contexto.compra = cuerpo.model
		expect(contexto.compra && contexto.compra.id, 'el POST de la compra no devolvio un modelo con id').toBeTruthy()

		// 8. El subtotal bruto de la compra. Esta asercion es la que prueba, a nivel de TOTALES,
		//    que la cantidad que manda es la efectiva y no la pedida: con la pedida el subtotal
		//    seria 36.600 y con la efectiva es 27.300. Son dos numeros que no se pueden confundir.
		const bruto = RENGLONES.reduce((suma, renglon) => suma + subtotal_bruto(renglon), 0)
		expect(
			redondear(Number(contexto.compra.sub_total)),
			'el subtotal tiene que calcularse con la cantidad RECIBIDA cuando esta completada (incluido el 0)'
		).toBe(redondear(bruto))

		const neto = RENGLONES.reduce(
			(suma, renglon) => suma + costo_con_bonificaciones(renglon.costo, BONIFICACIONES) * cantidad_efectiva(renglon),
			0
		)
		expect(redondear(Number(contexto.compra.descuentos_compra)), 'las bonificaciones del proveedor').toBe(redondear(bruto - neto))
		expect(redondear(Number(contexto.compra.total_iva)), 'el IVA de la compra').toBe(redondear(neto * IVA / 100))
		expect(redondear(Number(contexto.compra.total)), 'el total de la compra').toBe(redondear(neto + neto * IVA / 100))

		console.log(`[compra] N° ${contexto.compra.num} (id ${contexto.compra.id}) - bruto ${bruto} - neto ${neto} - total ${contexto.compra.total}`)

		// 9. Y el total que muestra la pantalla tiene que ser el que devolvio el servidor. Se
		//    compara el NUMERO y no el texto: price() recorta los decimales cuando son ",00".
		const fila = page.locator(`[data-testid="provider_order-row-${contexto.compra.id}"]`)
		await expect(fila).toBeVisible()
		await fila.click()
		await abrir_pestania(page, 'provider_order', 'Total')
		expect(numero_de_pantalla(await page.locator('[data-testid="compra-total"]').innerText()))
			.toBe(redondear(Number(contexto.compra.total)))
	})

	test('el stock entra por la cantidad recibida, y por la pedida solo cuando no se indico ninguna', async ({ page }) => {
		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		for (const renglon of RENGLONES) {
			const id = contexto.ids[renglon.alias]
			const esperado = cantidad_efectiva(renglon)

			if (renglon.articulo) {
				// Articulo del fixture: solo se puede afirmar el DELTA, porque ya tenia stock.
				const ahora = await stock_de(page, id)
				expect(
					redondear(ahora - contexto.stock_previo[renglon.alias]),
					`el stock de "${renglon.articulo}" tenia que subir ${esperado} (pedida ${renglon.pedida}, recibida ${renglon.recibida})`
				).toBe(esperado)
			} else {
				// El creado al vuelo nace sin stock, asi que su stock ES lo comprado.
				expect(await stock_de(page, id), 'el stock del articulo creado al vuelo').toBe(esperado)
			}
		}

		// Y el movimiento que dejo cada uno. El del cero explicito es el caso interesante: NO tiene
		// que haber movimiento de esta compra, porque no entro nada.
		for (const renglon of RENGLONES) {
			const id = contexto.ids[renglon.alias]
			const esperado = cantidad_efectiva(renglon)
			await page.locator(`[data-testid="btn-stock-movements-${id}"]`).click()

			const estado = page.locator('[data-testid="estado-movimientos-stock"]')
			await expect(estado).toHaveAttribute('data-estado', 'listo')

			const de_compra = page.locator('[data-testid="stock-movement-row"][data-concepto="Compra a proveedor"]')
			const previos = contexto.movimientos_previos[renglon.alias] || 0

			// 🔴 Cuantos movimientos de compra AGREGO esta compra, no cuantos hay. Un articulo del
			//    fixture llega con los que dejo la corrida anterior, asi que el numero absoluto solo
			//    seria correcto la primera vez.
			expect(
				await de_compra.count() - previos,
				esperado > 0
					? `"${renglon.articulo || contexto.articulo_nuevo}" tenia que dejar UN movimiento de compra`
					: 'un renglon con cantidad recibida 0 no tiene que dejar movimiento de stock'
			).toBe(esperado > 0 ? 1 : 0)

			if (esperado > 0) {
				// La tabla trae los movimientos del mas nuevo al mas viejo, asi que el de esta
				// compra es el primero.
				const movimiento = de_compra.first()
				await expect(movimiento).toHaveAttribute('data-deposito-destino', DEPOSITO)
				// 🔴 data-cantidad y data-stock-resultante llevan el valor CRUDO del modelo
				//    ("10.00"): el punto es DECIMAL, no separador de miles, y por eso se leen con
				//    numero_de_dato y no con numero_de_pantalla. Hasta el 31/8/2026 el componente
				//    los publicaba ya formateados en es-AR ("10,00") y esta misma linea leia MIL.
				expect(numero_de_dato(await movimiento.getAttribute('data-cantidad'))).toBe(esperado)
			}

			await page.keyboard.press('Escape')
			await expect(estado).toHaveCount(0)
		}
	})

	test('el flete se prorratea entre los articulos en proporcion al subtotal de cada renglon', async ({ page }) => {
		await abrir_compras_del_dia(page)
		await page.locator(`[data-testid="provider_order-row-${contexto.compra.id}"]`).click()

		// 🔴 El costo extra se carga ACA y no en el alta: un has_many sobre una compra sin id se
		//    descarta en silencio (ver la nota 3 del encabezado).
		await abrir_pestania(page, 'provider_order', 'Descuentos y recargos')
		await page.locator('[data-testid="btn-agregar-has-many-provider_order_extra_costs"]').click()

		await completar_campo(page, 'provider_order_extra_cost-description', 'Flete E2E')
		await completar_campo(page, 'provider_order_extra_cost-value', FLETE)
		// El tipo viene en "transporte", que es uno de los tres que prorratean (junto con seguro y
		// arancel_importacion). "otro" NO prorratea, y es la causa mas comun de "cargue el flete y
		// no me modifico el costo". Se verifica en vez de setearlo: si el default cambiara, este
		// test tiene que decirlo en vez de tapar el cambio.
		await expect(page.locator('[data-testid="provider_order_extra_cost-tipo"]')).toHaveValue('transporte')
		await page.locator('[data-testid="btn-guardar-provider_order_extra_cost"]').click()

		// Guardar la compra es lo que dispara el prorrateo: corre en el confirmado del pedido, y
		// solo si "Actualizar precios" esta activada (que lo esta desde el alta).
		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/provider-order') && res.request().method() === 'PUT'),
			page.locator('[data-testid="btn-guardar-provider_order"]').click(),
		])
		expect(respuesta.ok(), 'el PUT de la compra con el flete no salio bien').toBeTruthy()

		// El costo real de cada articulo tiene que ser el costo bonificado MAS el recargo unitario
		// que le toco del flete.
		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		const sub_total = RENGLONES.reduce((suma, renglon) => suma + subtotal_bruto(renglon), 0)

		for (const renglon of RENGLONES) {
			const esperado = redondear(
				costo_con_bonificaciones(renglon.costo, BONIFICACIONES) + recargo_unitario_esperado(renglon, sub_total)
			)

			// 🔴 Se redondean LOS DOS lados. La columna "Costo Real" del listado imprime hasta 6
			//    decimales (`variable_decimals` en src/models/article.js), y el prorrateo de un
			//    flete casi nunca da un numero redondo: el reparto de Pinza da 1465,56044. Comparar
			//    contra un esperado ya redondeado y un leido sin redondear falla por el quinto
			//    decimal sin que haya nada mal.
			expect(
				redondear(await celda_numerica(page, 'article', 'costo_real', contexto.ids[renglon.alias])),
				`el costo real de "${renglon.articulo || contexto.articulo_nuevo}" con el flete prorrateado`
			).toBe(esperado)
		}

		// 🔴 Y la contracara del cero explicito: el renglon con cantidad efectiva 0 NO participa del
		//    reparto. El backend lo saltea antes de tocarlo, asi que su costo real queda sin
		//    recargo. Si algun dia participara, el flete de los otros tres bajaria sin que nada lo
		//    avise: esta asercion es la que lo denuncia.
		const alicate = RENGLONES.find(renglon => renglon.alias === 'alicate')
		expect(recargo_unitario_esperado(alicate, sub_total), 'el renglon en cero no recibe recargo').toBe(0)
	})

	test('la compra queda como deuda en la cuenta corriente del proveedor', async ({ page }) => {
		await page.goto('/proveedores/proveedores')
		await esperar_recursos_descargados(page, { abrir_panel: false })

		// El boton C/C solo existe si el proveedor tiene credit_account, que es justo lo que crea
		// la compra al generar el movimiento de cuenta corriente. La moneda 1 es pesos.
		await abrir_cuenta_corriente(page, contexto.compra.provider_id)

		// 🔴 La fila se ubica por el numero de comprobante con la expresion regular anclada, no por
		//    `hasText: 'N°3'`: ese hasText es una coincidencia por substring y con la compra N°13 en
		//    pantalla tambien matchearia. En cuanto este archivo corre por segunda vez, el proveedor
		//    tiene historia y el substring deja de alcanzar.
		const filas = page.locator('[data-testid^="current_acount-row-"]')
		const fila_compra = filas.filter({ hasText: new RegExp(`N°${contexto.compra.num}(?!\\d)`) }).first()
		await expect(fila_compra, 'la compra tenia que aparecer en la cuenta corriente del proveedor').toBeVisible()

		const id_movimiento = (await fila_compra.getAttribute('data-testid')).replace('current_acount-row-', '')
		contexto.proveedor.movimiento_compra = id_movimiento

		// El debe del movimiento es el total de la compra CON el flete: el costo extra suma siempre
		// al total, prorratee o no.
		const total_con_flete = redondear(Number(contexto.compra.total) + FLETE)
		expect(
			await celda_numerica(page, 'current_acount', 'debe', id_movimiento),
			'el debe de la compra tiene que incluir el costo extra'
		).toBe(total_con_flete)

		contexto.proveedor.total_adeudado = total_con_flete
		contexto.proveedor.saldo_con_la_compra = await celda_numerica(page, 'current_acount', 'saldo', id_movimiento)
	})

	test('el Excel actualiza los articulos que ya estaban cargados y agrega los que faltaban', async ({ page }) => {
		// El archivo se arma en el momento. Tres filas, y cada una prueba un camino distinto del
		// matcheo de `ProviderOrderArticleImport` (bar_code -> provider_code -> name, y si no
		// encuentra nada, ALTA):
		//
		//   - "Pinza"    ya existe Y ya esta en la compra  -> ACTUALIZA su renglon
		//   - "Cuchilla" ya existe pero NO esta en la compra -> la AGREGA a la compra
		//   - el tercero no existe en el sistema           -> lo CREA y lo agrega
		//
		// Las tres traen solo el nombre (sin codigo de barras ni codigo de proveedor), que es el
		// ultimo criterio de matcheo y el unico que un Excel de proveedor real siempre tiene.
		const ruta = escribir_excel_de_compra([
			{ name: 'Pinza', cantidad: PINZA_IMPORTADA.cantidad, costo: PINZA_IMPORTADA.costo },
			{ name: ARTICULO_A_AGREGAR, cantidad: 7, costo: 600 },
			{ name: contexto.articulo_importado, cantidad: 3, costo: 900 },
		], 'compra-e2e.xlsx')

		await abrir_compras_del_dia(page)

		// El boton de importar vive en la FILA de la compra, no en el formulario: la importacion es
		// una accion sobre una compra que ya existe.
		await page.locator(`[data-testid="btn-importar-excel-${contexto.compra.id}"]`).click()

		// Los dos radios se dejan en su default a proposito, que es justo lo que se quiere probar:
		//   - Tipo de importacion: "Importar pedido" (la columna 4 es la cantidad PEDIDA).
		//   - Modo: "Actualizar lista de articulos", que agrega/actualiza y CONSERVA los articulos
		//     de la compra que no esten en el archivo. El otro modo ("Sobreescribir") los borraria.
		// "Fila desde" viene en 2, que es lo correcto para un archivo con encabezado.
		await expect(page.locator('[data-testid="import-fila-desde"]')).toHaveValue('2')

		await page.locator('[data-testid="input-excel-provider_order"]').setInputFiles(ruta)

		// El import corre SINCRONICO: ProviderOrderController@import_excel_articles llama a
		// Excel::import() derecho (el dispatch a la cola esta comentado), asi que no hace falta
		// ningun worker y la respuesta ya trae el resultado.
		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/provider-order/excel/import')),
			page.locator('[data-testid="btn-confirmar-importacion"]').click(),
		])
		expect(respuesta.ok(), 'el POST de la importacion no salio bien').toBeTruthy()

		// La compra tiene que haber pasado de 4 renglones a 6: uno actualizado (Pinza) y dos nuevos.
		await abrir_compras_del_dia(page)
		await page.locator(`[data-testid="provider_order-row-${contexto.compra.id}"]`).click()
		await abrir_pestania(page, 'provider_order', 'Articulos')

		const filas = page.locator('[data-testid^="article-amount-"]')
		await expect(
			filas,
			'el modo "Actualizar lista" agrega los dos del Excel y conserva los cuatro que ya estaban'
		).toHaveCount(RENGLONES.length + 2)

		// El renglon actualizado: mismo articulo, cantidad y costo nuevos. Se lee con
		// numero_de_dato porque es el value de un input, no el texto de una celda.
		const id_pinza = contexto.ids.pinza
		expect(numero_de_dato(await page.locator(`[data-testid="article-amount-${id_pinza}"]`).inputValue()))
			.toBe(PINZA_IMPORTADA.cantidad)
		expect(numero_de_dato(await page.locator(`[data-testid="article-cost-${id_pinza}"]`).inputValue()))
			.toBe(PINZA_IMPORTADA.costo)

		// 🔴 Y lo que el Excel NO tenia que tocar: la cantidad recibida de Pinza. El archivo trae la
		//    columna de cantidad PEDIDA (tipo "pedido"), asi que la recibida tiene que seguir vacia.
		//    Si el importador la pisara, el stock de esta compra se recalcularia solo y sin aviso.
		expect(await page.locator(`[data-testid="article-received-${id_pinza}"]`).inputValue())
			.toBe('')
	})

	test('subir la cantidad recibida actualiza el total de la compra, el stock y la cuenta corriente', async ({ page }) => {
		const id_martillo = contexto.ids.martillo
		const renglon = RENGLONES.find(r => r.alias === 'martillo')

		// Cuanto stock tiene AHORA, antes de recibir mas. No se recalcula desde la linea de base:
		// entre medio corrio la importacion, y lo que se quiere afirmar es el efecto de ESTE cambio.
		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })
		const stock_antes = await stock_de(page, id_martillo)

		const total_antes = redondear(Number(contexto.compra.total))

		await abrir_compras_del_dia(page)
		await page.locator(`[data-testid="provider_order-row-${contexto.compra.id}"]`).click()
		await abrir_pestania(page, 'provider_order', 'Articulos')

		// Se recibe el resto de lo pedido: de 5 sobre 8 pedidas, pasa a 8.
		await completar_campo(page, `article-received-${id_martillo}`, renglon.pedida)

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/provider-order') && res.request().method() === 'PUT'),
			page.locator('[data-testid="btn-guardar-provider_order"]').click(),
		])
		const cuerpo = await respuesta.json()
		const compra_actualizada = cuerpo.model
		expect(compra_actualizada && compra_actualizada.id, 'el PUT no devolvio el modelo').toBeTruthy()

		// 🔴 El stock se mueve por la DIFERENCIA, no por la nueva cantidad entera. El backend lleva
		//    el `last_received` de cada articulo justamente para esto: si sumara las 8 de nuevo,
		//    entrarian 13 unidades por una compra de 8. Es el error que esta asercion vigila.
		const recibidas_de_mas = renglon.pedida - renglon.recibida

		await page.goto('/listado-de-articulos')
		await esperar_recursos_descargados(page, { abrir_panel: false })
		expect(
			redondear(await stock_de(page, id_martillo) - stock_antes),
			'recibir mas tiene que sumar solo la diferencia, no la cantidad entera de nuevo'
		).toBe(recibidas_de_mas)

		// El total de la compra sube. Cuanto subio queda anotado: el test que sigue verifica que la
		// cuenta corriente se haya movido por ESE mismo importe.
		const total_despues = redondear(Number(compra_actualizada.total))
		expect(total_despues, 'el total de la compra tenia que subir').toBeGreaterThan(total_antes)

		contexto.compra = compra_actualizada
		contexto.aumento_del_total = redondear(total_despues - total_antes)
	})

	/*
	 * 🔴 Esto es un test aparte y no la cola del anterior por una razon medida, no por prolijidad.
	 * Junto, el paso se pasaba del timeout de 4 minutos: hacia CUATRO navegaciones completas
	 * (listado -> compras -> listado -> proveedores) y cada `page.goto` arrastra su descarga de
	 * recursos del arranque, que sola se lleva entre 20 y 40 segundos. Partido en tres navegaciones
	 * + una, los dos entran holgados.
	 *
	 * Es la misma regla que ordena todo el archivo: un paso, un test. Cuando un paso no entra en el
	 * presupuesto, la respuesta es partirlo, no subir el timeout -- subirlo esconde que el recorrido
	 * se hizo mas lento.
	 */
	test('y la cuenta corriente del proveedor se mueve por ese mismo importe', async ({ page }) => {
		await page.goto('/proveedores/proveedores')
		await esperar_recursos_descargados(page, { abrir_panel: false })
		await abrir_cuenta_corriente(page, contexto.compra.provider_id)

		const debe_ahora = await celda_numerica(page, 'current_acount', 'debe', contexto.proveedor.movimiento_compra)
		expect(
			redondear(debe_ahora - contexto.proveedor.total_adeudado),
			'la deuda tiene que seguir al total de la compra, peso por peso'
		).toBe(contexto.aumento_del_total)

		contexto.proveedor.total_adeudado = debe_ahora
	})

	test('el pago de la compra se imputa en la cuenta corriente y sale de la caja', async ({ page }) => {
		// 🔴 El saldo de la caja se lee ACA, antes de tocar nada. `saldo_de_caja()` navega a
		//    /cajas, asi que llamarla con el modal de pago abierto lo destruiria: la lectura tiene
		//    que pasar antes de entrar a la cuenta corriente, no en el medio.
		const saldo_caja_antes = await saldo_de_caja(page, CAJA)

		await page.goto('/proveedores/proveedores')
		await esperar_recursos_descargados(page, { abrir_panel: false })
		await abrir_cuenta_corriente(page, contexto.compra.provider_id)

		const filas = page.locator('[data-testid^="current_acount-row-"]')
		const fila_compra = page.locator(`[data-testid="current_acount-row-${contexto.proveedor.movimiento_compra}"]`)
		await expect(fila_compra).toBeVisible()

		// El saldo ACUMULADO hasta la compra: es la referencia contra la que se mide el pago. No se
		// puede asumir que sea igual al total de la compra -- el proveedor puede tener movimientos
		// anteriores, y los tiene en cuanto este archivo se corre dos veces.
		const saldo_antes = await celda_numerica(page, 'current_acount', 'saldo', contexto.proveedor.movimiento_compra)
		const total = await celda_numerica(page, 'current_acount', 'debe', contexto.proveedor.movimiento_compra)

		// Con un movimiento seleccionado, el boton de pago precarga el importe con el saldo de ESE
		// movimiento. Es la forma en que el sistema deja pagar "el total de esta compra" sin tipear.
		await fila_compra.click()
		const boton_pago = page.locator('[data-testid="btn-registrar-pago"]')
		await expect(boton_pago).toHaveAttribute('data-precargado', 'si')
		await boton_pago.click()

		// El importe precargado lo escribe un setTimeout de 500 ms, por eso se espera el VALOR
		// (toHaveValue reintenta) en vez de leerlo una sola vez.
		await expect(page.locator('[data-testid="pago-monto-0"]')).toHaveValue(String(total))

		// Metodo de pago y caja: es lo que hace que la plata salga de algun lado. Sin caja elegida,
		// el pago se registra en la cuenta corriente y no deja movimiento de caja.
		await page.locator('[data-testid="pago-metodo-0"]').selectOption({ label: PAGO_METODO })
		await page.locator('[data-testid="pago-caja-0"]').selectOption({ label: CAJA })

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/current-acount/pago') && res.request().method() === 'POST'),
			page.locator('[data-testid="btn-confirmar-pago"]').click(),
		])
		expect(respuesta.ok(), 'el POST del pago no salio bien').toBeTruthy()

		// 🔴 Dos cosas que la columna "saldo" NO es, y que ya costaron un rojo cada una:
		//    1. No es el saldo pendiente de ese movimiento: es el saldo ACUMULADO hasta el. La fila
		//       de la compra sigue mostrando su saldo despues de pagada; la que baja es la del pago.
		//    2. No arranca en cero: si el proveedor ya tenia movimientos, el pago no deja la cuenta
		//       en 0, la deja en lo que habia antes de esta compra.
		//    Por eso se verifica la DIFERENCIA, que es la afirmacion real: "el pago cancelo
		//    exactamente el total de esta compra".
		await expect(async () => {
			const cantidad = await filas.count()

			let fila_del_pago = null
			for (let i = 0; i < cantidad; i++) {
				const id = (await filas.nth(i).getAttribute('data-testid')).replace('current_acount-row-', '')
				if (await celda_numerica(page, 'current_acount', 'haber', id) === total) {
					fila_del_pago = id
					break
				}
			}

			expect(fila_del_pago, `ningun movimiento de la cuenta corriente con haber = ${total}`).not.toBeNull()
			expect(
				await celda_numerica(page, 'current_acount', 'saldo', fila_del_pago),
				'el pago tenia que bajar el saldo acumulado exactamente en el total de la compra'
			).toBe(redondear(saldo_antes - total))
		}).toPass({ timeout: 20000 })

		// Y la plata tiene que haber SALIDO de la caja elegida: un pago a proveedor es un egreso.
		expect(
			redondear(saldo_caja_antes - await saldo_de_caja(page, CAJA)),
			'el pago al proveedor tenia que salir de la caja por su importe completo'
		).toBe(total)
	})
})
