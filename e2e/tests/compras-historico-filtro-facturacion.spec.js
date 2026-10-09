// Test end to end de la mision compras-historico-filtro-y-rango (9/10/2026): en Compras, modo
// Historico, el select "Con y sin factura / Solo CON FACTURA / Solo SIN FACTURA" tiene que filtrar la
// tabla y TOTAL COMPRADO tiene que sumar lo que se ve. Y el chip del rango de ControlFecha tiene que
// nombrar el mes del principio.
//
// Los dos defectos los midio Lucas el 9/10/2026 en demo2 (4.3.8) filmando el T5.18.
//
// DEFECTO 1: EL SELECT DE FACTURACION NO FILTRABA EN HISTORICO.
//   Historico (y el buscador) cargan state.provider_order.filtered y ponen is_filtered en true
//   (runListadoPorDefecto -> runGlobalSearch). El display (common-vue/components/display/Index.vue,
//   computed models_to_show) con is_filtered en true IGNORA la prop `models_to_show` que le pasa
//   Compras y dibuja `filtered`. Compras filtraba por facturacion en el mixin
//   mixins/provider_order/models_to_show.js, pero sobre `state.provider_order.models` (la lista de
//   "Por fecha", el ultimo dia mirado) y no sobre `filtered`: el select no tenia ningun efecto sobre
//   la tabla, y TOTAL COMPRADO (que suma esa misma lista) mostraba el total de un dia que ni estaba
//   en pantalla.
//   Arreglo: el mixin arranca de `filtered` cuando is_filtered, y orders/Index.vue le pasa al
//   view-component `mostrar_models_que_vinienen_por_prop_siempre` mientras el select filtra, para que
//   el display use la lista del modulo (mismo patron que Ventas).
//
// DEFECTO 2: EL CHIP DEL RANGO NO DECIA EL MES DEL PRINCIPIO.
//   ControlFecha.vue::texto_rango imprimia "D – D MMM": del 1/8 al 9/10 se leia "1 – 9 oct.".
//   Ahora: mismo mes "1 – 30 sep.", distinto mes "1 ago. – 9 oct.", distinto año
//   "28 dic. 2025 – 3 ene. 2026".
//
// POR QUE ESTE SPEC NO DEPENDE DE LOS DATOS SEMBRADOS:
//   Los casos del filtro calculan lo esperado leyendo el propio store (state.provider_order.filtered:
//   las compras con y sin provider_order_afip_tickets) y lo comparan con lo que la tabla dibuja y con
//   lo que suma el chip. Si el listado de Historico no tiene compras de algun tipo, ese caso se
//   saltea con test.skip y un motivo: no se da por bueno en vacio. Los casos del chip commitean el
//   rango directo al store, sin pedir compras, y solo leen el texto.
//
// SELECTOR DE LAS FILAS DE COMPRAS:
//   `tr[data-testid^="provider_order-row-"]`. common-vue/components/display/table/Tr.vue le pone a
//   cada fila de dato `<model_name>-row-<id>` (salvo en el modal de busqueda, que usa
//   `search-result-row`). Asi quedan afuera las filas de titulo de grupo ("En proceso", "Recibido":
//   `tr.list-title`) y las del esqueleto de carga (`tr.skeleton-row`), que no llevan ese testid. El
//   prefijo `provider_order-row-` no choca con el de otros modelos (`provider_order_afip_ticket-row-`
//   tiene un guion bajo antes del `-row-`).
//
// TOTAL COMPRADO:
//   Lo muestra orders/nav/Total.vue en `.compras-total__value`; no tiene testid propio (es un chip de
//   un solo lugar) y es la unica ocurrencia en la pantalla. Se lee con numero_de_pantalla (es-AR).
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { aislar_broadcasts } = require('../helpers/entorno')
const { numero_de_pantalla } = require('../helpers/numeros')
const path = require('path')

test.describe.configure({ mode: 'serial' })

let page

/** Filas de dato de la tabla de compras (ver el encabezado: no incluye titulos de grupo ni esqueleto). */
const FILAS_DE_COMPRAS = 'tr[data-testid^="provider_order-row-"]'
/** Prefijo del testid de una fila, para sacarle el id. */
const PREFIJO_FILA = 'provider_order-row-'
/** Chip TOTAL COMPRADO (orders/nav/Total.vue). */
const TOTAL_COMPRADO = '.compras-total__value'

/** Predicado de la respuesta del buscador general de Compras (lo que dispara Historico). */
const es_la_busqueda_general_de_compras = response =>
	response.request().method() === 'POST' && /\/api\/global-search\/provider-order(\?|$)/.test(response.url())

/**
 * Fecha de hoy en YYYY-MM-DD, en la zona horaria del navegador (mismo criterio que
 * compras-carrera-fecha-busqueda.spec.js).
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
 * Lee del store las compras del listado de Historico (`filtered`), con lo justo para calcular lo
 * esperado: id, total y si tienen factura.
 *
 * @returns {Promise<Array<{id: number, total: number, con_factura: boolean}>>}
 */
async function compras_del_listado() {
	return page.evaluate(function () {
		const store = document.querySelector('#app').__vue__.$store
		return store.state.provider_order.filtered.map(function (compra) {
			return {
				id: compra.id,
				total: Number(compra.total),
				con_factura: (compra.provider_order_afip_tickets || []).length > 0,
			}
		})
	})
}

/**
 * Ids de las compras que la tabla esta dibujando, ordenados para poder compararlos con toEqual.
 *
 * @returns {Promise<number[]>}
 */
async function ids_de_la_tabla() {
	const testids = await page.locator(FILAS_DE_COMPRAS).evaluateAll(function (filas) {
		return filas.map(function (fila) {
			return fila.getAttribute('data-testid')
		})
	})
	return testids
		.map(function (testid) {
			return Number(testid.slice(PREFIJO_FILA.length))
		})
		.sort(function (a, b) {
			return a - b
		})
}

/**
 * Ids ordenados de una lista de compras.
 *
 * @param {Array<{id: number}>} compras
 * @returns {number[]}
 */
function ids_ordenados(compras) {
	return compras
		.map(function (compra) {
			return compra.id
		})
		.sort(function (a, b) {
			return a - b
		})
}

/**
 * Suma de los totales de una lista de compras.
 *
 * @param {Array<{total: number}>} compras
 * @returns {number}
 */
function sumar_totales(compras) {
	return compras.reduce(function (acumulado, compra) {
		return acumulado + compra.total
	}, 0)
}

/**
 * Elige una opcion del select de facturacion del nav de compras (el visible, no el store).
 * Se lo ubica por una de sus opciones porque `select.toolbar-select` es una clase compartida por
 * todos los selects de barra.
 *
 * @param {'con-y-sin-factura'|'solo-con-factura'|'solo-sin-factura'} valor
 * @returns {Promise<void>}
 */
async function elegir_facturacion(valor) {
	// `:visible`: en algunos anchos el nav de compras deja montada una copia oculta del mismo select.
	const select = page.locator('select.toolbar-select:has(option[value="solo-con-factura"]):visible').first()
	await select.selectOption(valor)
}

/**
 * Pasa a modo Historico y espera a que el listado haya llegado: la respuesta del buscador, el store
 * con is_filtered en true y la tabla sin el esqueleto de carga.
 *
 * @returns {Promise<void>}
 */
async function ir_a_historico() {
	const respuesta = page.waitForResponse(es_la_busqueda_general_de_compras, { timeout: 30000 })
	await page.locator('[data-testid="control-fecha-modo-historico"]').click()
	await respuesta

	await expect.poll(async function () {
		return page.evaluate(function () {
			const state = document.querySelector('#app').__vue__.$store.state.provider_order
			return state.is_filtered === true && state.loading === false
		})
	}, { timeout: 30000, message: 'Historico tenia que dejar is_filtered en true y terminar de cargar' }).toBe(true)

	await expect(page.locator('tr.skeleton-row')).toHaveCount(0, { timeout: 30000 })
}

/**
 * Elige la facturacion y comprueba que la tabla y TOTAL COMPRADO muestran exactamente `esperadas`.
 *
 * @param {string} valor Valor del select.
 * @param {Array<{id: number, total: number}>} esperadas Compras que tienen que verse.
 * @returns {Promise<void>}
 */
async function verificar_facturacion(valor, esperadas) {
	await elegir_facturacion(valor)

	await expect.poll(ids_de_la_tabla, {
		timeout: 15000,
		message: 'con "' + valor + '" la tabla tenia que mostrar exactamente ' + esperadas.length + ' compras',
	}).toEqual(ids_ordenados(esperadas))

	await expect.poll(async function () {
		return numero_de_pantalla(await page.locator(TOTAL_COMPRADO).first().innerText())
	}, {
		timeout: 15000,
		message: 'con "' + valor + '" TOTAL COMPRADO tenia que sumar solo las compras que se ven',
	}).toBeCloseTo(sumar_totales(esperadas), 1)
}

/**
 * Commitea un rango al store (sin pedir compras al servidor) y devuelve el texto del chip, con los
 * espacios normalizados.
 *
 * @param {string} desde YYYY-MM-DD
 * @param {string} hasta YYYY-MM-DD
 * @returns {Promise<string>}
 */
async function texto_del_chip(desde, hasta) {
	await page.evaluate(function (rango) {
		const store = document.querySelector('#app').__vue__.$store
		store.commit('provider_order/setFromDate', rango.desde)
		store.commit('provider_order/setUntilDate', rango.hasta)
	}, { desde, hasta })

	const chip = page.locator('[data-testid="control-fecha-rango"]')
	await expect(chip).toBeVisible()
	return (await chip.innerText()).replace(/\s+/g, ' ').trim()
}

test.beforeAll(async ({ browser }) => {
	const context = await browser.newContext({
		storageState: path.join(__dirname, '..', '.auth', 'user.json'),
	})
	page = await context.newPage()
	// Este spec arma su propia pagina, asi que el fixture de e2e/fixtures.js no la toca: el
	// aislamiento de broadcasts hay que pedirlo a mano.
	await aislar_broadcasts(page)

	await page.goto('/proveedores/compras')
	await esperar_recursos_descargados(page, { abrir_panel: false })

	// Los modulos que se ven por fecha no cargan nada hasta que se elige un dia (ver el README):
	// hoy es el unico dia que siempre se puede clickear. Deja la tabla y el store en "Por fecha".
	await page.locator('[data-testid="control-fecha-dia"][data-fecha="' + fecha_de_hoy() + '"]').click()
})

test.afterAll(async () => {
	if (page) {
		// No contaminar los specs que siguen: el select vuelve a "Con y sin factura" y el modo a
		// "Por fecha". El estado del store sobrevive a un spec que lo deja mal puesto.
		try {
			await page.evaluate(function () {
				const store = document.querySelector('#app').__vue__.$store
				store.commit('provider_order/setAfipTicketShowOption', 'con-y-sin-factura')
			})
			await page.locator('[data-testid="control-fecha-modo-por-fecha"]').click()
		} catch (error) {
			// Si la pagina ya no esta, no hay nada que limpiar.
		}
		await page.close()
	}
})

test.describe('Compras, Historico: el select de facturacion filtra la tabla y el total', () => {

	test('Historico: "Solo SIN FACTURA" muestra solo las compras sin factura, tabla y total', async () => {
		await ir_a_historico()

		const compras = await compras_del_listado()
		const sin_factura = compras.filter(function (compra) {
			return !compra.con_factura
		})
		// Si TODAS fueran sin factura, el filtro no discrimina y el caso pasaria igual sin el arreglo.
		// Total 0 tambien se saltea: price(0) pinta "-" y no hay numero que comparar.
		test.skip(sin_factura.length === 0 || sin_factura.length === compras.length || sumar_totales(sin_factura) === 0,
			'el listado de Historico necesita compras con y sin factura (y con total) para que el filtro discrimine')

		await verificar_facturacion('solo-sin-factura', sin_factura)
	})

	test('Historico: "Solo CON FACTURA" muestra solo las compras con factura, tabla y total', async () => {
		const compras = await compras_del_listado()
		const con_factura = compras.filter(function (compra) {
			return compra.con_factura
		})
		test.skip(con_factura.length === 0 || con_factura.length === compras.length || sumar_totales(con_factura) === 0,
			'el listado de Historico necesita compras con y sin factura (y con total) para que el filtro discrimine')

		await verificar_facturacion('solo-con-factura', con_factura)
	})

	test('Historico: volver a "Con y sin factura" trae todas las compras del listado', async () => {
		const compras = await compras_del_listado()
		test.skip(compras.length === 0 || sumar_totales(compras) === 0, 'el listado de Historico no tiene compras con total')

		await verificar_facturacion('con-y-sin-factura', compras)
	})

	test('con Solo SIN FACTURA elegido, Historico y volver a Por fecha no dejan el total pegado a otra lista', async () => {
		// Regresion del "Por fecha": el select sigue filtrando la lista del dia (la que sale de
		// `models`) y el total sigue a esa lista, no a la de Historico.
		await elegir_facturacion('solo-sin-factura')

		await page.locator('[data-testid="control-fecha-modo-por-fecha"]').click()
		await page.locator('[data-testid="control-fecha-dia"][data-fecha="' + fecha_de_hoy() + '"]').click()
		await expect.poll(function () {
			return page.evaluate(function () {
				const state = document.querySelector('#app').__vue__.$store.state.provider_order
				return state.loading === false && state.is_filtered === false
			})
		}, { timeout: 60000, message: 'la lista del dia no termino de cargar' }).toBe(true)

		const del_dia = await page.evaluate(function () {
			const store = document.querySelector('#app').__vue__.$store
			return store.state.provider_order.models.map(function (compra) {
				return {
					id: compra.id,
					total: Number(compra.total),
					con_factura: (compra.provider_order_afip_tickets || []).length > 0,
				}
			})
		})
		const esperadas = del_dia.filter(function (compra) {
			return !compra.con_factura
		})

		// Sin compras sin factura hoy, o con todas sin factura, el caso no discrimina nada (y con total 0
		// el chip pinta "-").
		if (esperadas.length === 0 || esperadas.length === del_dia.length || sumar_totales(esperadas) === 0) {
			await elegir_facturacion('con-y-sin-factura')
			test.skip(true, 'hoy no hay compras con y sin factura en la lista de Por fecha: no hay nada que filtrar')
		}

		await expect.poll(ids_de_la_tabla, {
			timeout: 15000,
			message: 'en Por fecha con "Solo SIN FACTURA" la tabla tenia que mostrar solo las compras sin factura del dia',
		}).toEqual(ids_ordenados(esperadas))
		await expect.poll(async function () {
			return numero_de_pantalla(await page.locator(TOTAL_COMPRADO).first().innerText())
		}, { timeout: 15000 }).toBeCloseTo(sumar_totales(esperadas), 1)

		await elegir_facturacion('con-y-sin-factura')
	})
})

test.describe('ControlFecha: el chip del rango nombra el mes del principio', () => {

	test.beforeAll(async () => {
		// El chip se dibuja en "Por fecha"; los rangos se commitean al store sin pedir compras.
		await page.locator('[data-testid="control-fecha-modo-por-fecha"]').click()
	})

	test.afterAll(async () => {
		// Saca el rango y vuelve al dia de hoy, para no dejar un chip puesto.
		await page.evaluate(function () {
			const store = document.querySelector('#app').__vue__.$store
			store.commit('provider_order/setUntilDate', '')
		})
		await page.locator('[data-testid="control-fecha-dia"][data-fecha="' + fecha_de_hoy() + '"]').click()
	})

	test('mismo mes: "D – D MMM", como siempre', async () => {
		expect(await texto_del_chip('2026-09-01', '2026-09-30')).toMatch(/^1 – 30 sep\.?$/i)
	})

	test('dos meses del mismo año: "D MMM – D MMM"', async () => {
		expect(await texto_del_chip('2026-08-01', '2026-10-09')).toMatch(/^1 ago\.? – 9 oct\.?$/i)
	})

	test('dos años distintos: "D MMM YYYY – D MMM YYYY"', async () => {
		expect(await texto_del_chip('2025-12-28', '2026-01-03')).toMatch(/^28 dic\.? 2025 – 3 ene\.? 2026$/i)
	})
})
