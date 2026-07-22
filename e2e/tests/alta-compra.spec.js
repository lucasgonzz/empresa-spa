// Test end to end 1 (prompt 617): alta de una compra completa a proveedor, tal como la carga
// Lucas a mano. Depende del fixture determinista del prompt 613
// (database/seeders/testing/TestingFerreteriaSeeder.php en empresa-api):
//   - Proveedores: "Buenos Aires" (bonificaciones 10% y 5%) y "Rosario" (sin bonificaciones).
//   - Deposito: "Principal".
//   - 10 articulos ya sembrados y asignados 5/5 a cada proveedor (ver e2e/README.md).
//
// No se hardcodea el total esperado: eso ya lo verifican los tests PHPUnit de los prompts 614-616.
// Aca se verifica COHERENCIA entre lo que muestra la pantalla y lo que persistio el servidor.
const { test, expect } = require('@playwright/test')

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

/**
 * Abre el buscador de un campo "search" generico de ModelForm, escribe la query dentro del
 * modal de busqueda y clickea el primer resultado. Reusable para el proveedor y para cada
 * articulo (ambos son campos type="search").
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} field_testid data-testid del input principal (ej: "provider_order-provider_id").
 * @param {string} query texto a buscar.
 * @returns {Promise<void>}
 */
async function search_and_select(page, field_testid, query) {
	await page.locator(`[data-testid="${field_testid}"]`).click()
	const modal_input = page.locator(`[data-testid="${field_testid}-search-modal-input"]`)
	await modal_input.fill(query)
	// Dispara la busqueda contra los modelos ya cargados en el store (no golpea la API).
	await modal_input.press('Enter')
	// Auto-espera: el primer resultado tarda lo que tarde en filtrar/renderizar, sin waitForTimeout.
	await page.locator('[data-testid="search-result-row"]').first().click()
}

test.describe('Compras: alta de compra completa', () => {
	test('carga una compra con 10 articulos, costos actualizados y facturacion automatica', async ({ page }) => {
		// 1. Entrar al modulo de compras y abrir el alta.
		await page.goto('/proveedores/compras')
		await page.locator('[data-testid="btn-crear-provider_order"]').click()

		// 2. Proveedor Buenos Aires y deposito Principal.
		await search_and_select(page, 'provider_order-provider_id', 'Buenos Aires')
		await page.locator('[data-testid="provider_order-address_id"]').selectOption({ label: 'Principal' })

		// 3. Facturacion automatica + "los precios ya incluyen IVA" activado.
		await page.locator('[data-testid="provider_order-modo_facturacion"]').selectOption('automatico')
		await page.locator('[data-testid="provider_order-precios_incluyen_iva"]').check()

		// 4. Cargar los 10 articulos del fixture (5 de Buenos Aires + 5 de Rosario).
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
		const total_text = await page.locator('[data-testid="compra-total"]').innerText()
		const total_from_server = Number(saved_model.total)
		expect(total_text).toContain(
			total_from_server.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
		)

		// Los descuentos del proveedor (10% y 5%) deben haber quedado precargados en la compra.
		// Se lee el texto del contenedor de descuentos (ubicado por data-testid, no por clase):
		// no es una seleccion por texto, es una aserción de contenido sobre un elemento ya ubicado.
		const discounts_container = page.locator('[data-testid="provider_order-provider_order_discounts"]')
		const discounts_text = await discounts_container.innerText()
		expect(discounts_text).toContain('10')
		expect(discounts_text).toContain('5')

		// Los 2 articulos con recibida 8 deben seguir mostrando esa cantidad al reabrir.
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
