// Test end to end 1 (prompt 617): alta de una compra completa a proveedor, tal como la carga
// Lucas a mano. Depende del fixture determinista del prompt 613
// (database/seeders/testing/TestingFerreteriaSeeder.php en empresa-api):
//   - Proveedores: "Buenos Aires" (bonificaciones 10% y 5%) y "Rosario" (sin bonificaciones).
//   - Deposito: "Principal".
//   - 10 articulos ya sembrados y asignados 5/5 a cada proveedor (ver e2e/README.md).
//
// No se hardcodea el total esperado: eso ya lo verifican los tests PHPUnit de los prompts 614-616.
// Aca se verifica COHERENCIA entre lo que muestra la pantalla y lo que persistio el servidor.
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')
// abrir_pestania / search_and_select / elegir_primer_resultado nacieron en este archivo y se
// mudaron a e2e/helpers/formulario.js cuando un segundo spec los necesito (mision del 19/8/2026).
// El codigo es el mismo, con los comentarios que explican las dos trampas del modal de busqueda.
const { abrir_pestania, search_and_select } = require('../helpers/formulario')
// numero_de_pantalla tambien vivia aca; se mudo a helpers/numeros.js con la misma implementacion
// (es-AR: punto de miles, coma decimal). El helper ademas documenta por que hace falta una segunda
// funcion para las columnas con decimales variables, que este spec no lee.
const { numero_de_pantalla } = require('../helpers/numeros')

/**
 * Articulos del fixture (prompt 613) con su costo base y el proveedor al que pertenecen.
 * A los dos marcados con "increased_cost" se les carga un costo mas alto (simulando un aumento)
 * y una cantidad recibida parcial (8 de 10 pedidos); al resto se les respeta el costo actual y
 * se deja la cantidad recibida vacia.
 */
const ARTICLES_BUENOS_AIRES = [
	{ name: 'Martillo acero', cost: 2000, increased_cost: 2200 },
	{ name: 'Pinza', cost: 1000 },
	{ name: 'Alicate', cost: 300 },
	{ name: 'Cuchilla', cost: 500 },
	{ name: 'Cuchara', cost: 100 },
]

const ARTICLES_ROSARIO = [
	{ name: 'Pata de cama', cost: 50 },
	{ name: 'Marco para cama', cost: 50 },
	{ name: 'Clavos N 2', cost: 50 },
	{ name: 'Pintura para cama', cost: 50 },
	{ name: 'Martillo', cost: 1000, increased_cost: 1100 },
]

const ALL_ARTICLES = ARTICLES_BUENOS_AIRES.concat(ARTICLES_ROSARIO)

const AMOUNT_PEDIDO = '10'
const RECEIVED_CON_AUMENTO = '8'

test.describe('Compras: alta de compra completa', () => {
	// El alta de una compra depende de catalogos que la aplicacion baja al arrancar: el buscador de
	// proveedores, el select de deposito, los tipos de precio y las preferencias de columnas de la
	// grilla de articulos. Entrar y empezar a clickear mientras eso todavia esta en vuelo da
	// selects vacios y filas sin columnas, que se lee como un test roto sin que haya nada roto.
	// Por eso: se entra, se despliega el panel de recursos desde la tarjeta, y recien cuando dice
	// "Todo listo" empieza el test. Ver e2e/helpers/recursos.js.
	test.beforeEach(async ({ page }) => {
		// El aislamiento de broadcasts ya viene puesto por el fixture de e2e/fixtures.js.
		await page.goto('/proveedores/compras')
		await esperar_recursos_descargados(page)
	})

	test('carga una compra con 10 articulos, costos actualizados y facturacion automatica', async ({ page }) => {
		// 1. Abrir el alta (ya estamos en el modulo de compras, ver el beforeEach).
		await page.locator('[data-testid="btn-crear-provider_order"]').click()

		// 2. Proveedor Buenos Aires y deposito Principal. Los dos viven en la pestaña
		// "Configuracion", que es la que el formulario abre por defecto.
		await search_and_select(page, 'provider_order-provider_id', 'Buenos Aires')
		await page.locator('[data-testid="provider_order-address_id"]').selectOption({ label: 'Principal' })

		// 3. "Los precios ya incluyen IVA" (pestaña "Configuracion") y facturacion automatica
		// (pestaña "Facturacion"). Se hace en ese orden porque cambiar de pestaña desmonta los
		// campos de la anterior: el toggle se marca mientras su grupo todavia esta en pantalla.
		// El toggle se clickea por su label (el input del checkbox esta oculto por CSS: el control
		// visible es el label). El estado se verifica sobre el input, que es el que lo tiene.
		await page.locator('[data-testid="provider_order-precios_incluyen_iva-toggle"]').click()
		await expect(page.locator('[data-testid="provider_order-precios_incluyen_iva"]')).toBeChecked()
		await abrir_pestania(page, 'provider_order', 'Facturacion')
		await page.locator('[data-testid="provider_order-modo_facturacion"]').selectOption('automatico')

		// 4. Cargar los 10 articulos del fixture (5 de Buenos Aires + 5 de Rosario).
		await abrir_pestania(page, 'provider_order', 'Articulos')
		for (const article of ALL_ARTICLES) {
			const rows_before = await page.locator('[data-testid^="article-amount-"]').count()

			await search_and_select(page, 'provider_order-articles', article.name)

			// La fila recien seleccionada se agrega siempre al final (ver e2e/README.md).
			const amount_input = page.locator('[data-testid^="article-amount-"]')
			await expect(amount_input).toHaveCount(rows_before + 1)
			const last_amount_input = amount_input.last()
			const row_testid = await last_amount_input.getAttribute('data-testid')
			// row_testid tiene forma "article-amount-<id>": derivamos el id de fila para
			// construir los selectores de "received" y "cost" de la MISMA fila.
			const row_id = row_testid.replace('article-amount-', '')

			await last_amount_input.fill(AMOUNT_PEDIDO)

			if (article.increased_cost) {
				// Simula un aumento: se sobreescribe el costo prefildeado con uno mayor.
				await page.locator(`[data-testid="article-cost-${row_id}"]`).fill(String(article.increased_cost))
				await page.locator(`[data-testid="article-received-${row_id}"]`).fill(RECEIVED_CON_AUMENTO)
			}
			// Si no tiene increased_cost: se deja el costo prefildeado (costo actual del articulo)
			// y "received" vacio, tal como pide el prompt.
		}

		// 5. Guardar y capturar la respuesta real del servidor para comparar contra la pantalla.
		const [save_response] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/provider-order') && res.request().method() === 'POST'),
			page.locator('[data-testid="btn-guardar-provider_order"]').click(),
		])
		const saved_body = await save_response.json()
		const saved_model = saved_body.model
		expect(saved_model && saved_model.id).toBeTruthy()

		// 6. Reabrir la compra recien creada desde el listado y verificar coherencia con el servidor.
		const row = page.locator(`[data-testid="provider_order-row-${saved_model.id}"]`)
		await expect(row).toBeVisible()
		await row.click()

		// El total mostrado en pantalla debe coincidir con el total que devolvio la API.
		// El total vive en la pestaña "Total" del formulario.
		//
		// Se compara el NUMERO, no el string formateado. Antes se exigia que el texto contuviera
		// el total con dos decimales (toLocaleString es-AR), y eso fijaba un detalle de
		// presentacion que este test nunca quiso fijar: price() --common-vue/mixins/dates.js--
		// recorta los decimales A PROPOSITO cuando son ",00", asi que un total redondo se muestra
		// "$40.527" y la asercion fallaba con la pantalla y el servidor perfectamente de acuerdo.
		// Lo que este paso verifica, y lo dice su propio encabezado, es COHERENCIA entre pantalla y
		// servidor. Comparar el numero la mantiene estricta --un total distinto sigue poniendo el
		// test en rojo-- sin atarla a si la app imprime o no los centavos.
		await abrir_pestania(page, 'provider_order', 'Total')
		const total_text = await page.locator('[data-testid="compra-total"]').innerText()
		const total_from_server = Number(saved_model.total)
		// El total se redondea a 2 decimales porque es lo maximo que la pantalla puede mostrar.
		expect(numero_de_pantalla(total_text)).toBe(Number(total_from_server.toFixed(2)))

		// Los descuentos del proveedor (10% y 5%) deben haber quedado precargados en la compra.
		// Se lee el texto del contenedor de descuentos (ubicado por data-testid, no por clase):
		// no es una seleccion por texto, es una aserción de contenido sobre un elemento ya ubicado.
		await abrir_pestania(page, 'provider_order', 'Descuentos y recargos')
		const discounts_container = page.locator('[data-testid="provider_order-provider_order_discounts"]')
		const discounts_text = await discounts_container.innerText()
		expect(discounts_text).toContain('10')
		expect(discounts_text).toContain('5')

		// Los 2 articulos con recibida 8 deben seguir mostrando esa cantidad al reabrir.
		await abrir_pestania(page, 'provider_order', 'Articulos')
		let count_received_8 = 0
		const all_received = page.locator('[data-testid^="article-received-"]')
		const total_received_inputs = await all_received.count()
		for (let i = 0; i < total_received_inputs; i++) {
			const value = await all_received.nth(i).inputValue()
			if (value === RECEIVED_CON_AUMENTO) {
				count_received_8 += 1
			}
		}
		expect(count_received_8).toBe(2)
	})
})
