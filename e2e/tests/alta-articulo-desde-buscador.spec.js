// Test end to end 2 (prompt 617): alta de un articulo nuevo desde el buscador de articulos,
// dentro de la carga de una compra. Es el flujo que mas se rompe en la practica: escribir un
// nombre que no existe, confirmar que no encuentra nada, apretar Enter de nuevo y verificar que
// el articulo se crea y queda agregado a la compra con la cantidad y el costo cargados.
//
// Usa un nombre unico con timestamp para que el test se pueda repetir sin chocar con una corrida
// anterior (un articulo con ese nombre nunca deberia existir ya en la base).
const { test, expect } = require('@playwright/test')

const AMOUNT = '3'
const COST = '150'

test.describe('Compras: alta de articulo desde el buscador', () => {
	test('crea un articulo nuevo desde el buscador y lo agrega a la compra en carga', async ({ page }) => {
		const unique_article_name = `E2E Articulo Nuevo ${Date.now()}`

		// 1. Abrir una compra nueva (proveedor Rosario, no hace falta mas que eso para este flujo).
		await page.goto('/proveedores/compras')
		await page.locator('[data-testid="btn-crear-provider_order"]').click()

		await page.locator('[data-testid="provider_order-provider_id"]').click()
		const provider_modal_input = page.locator('[data-testid="provider_order-provider_id-search-modal-input"]')
		await provider_modal_input.fill('Rosario')
		await provider_modal_input.press('Enter')
		await page.locator('[data-testid="search-result-row"]').first().click()

		// 2. Escribir en el buscador de articulos un nombre que no existe.
		await page.locator('[data-testid="provider_order-articles"]').click()
		const articles_modal_input = page.locator('[data-testid="provider_order-articles-search-modal-input"]')
		await articles_modal_input.fill(unique_article_name)

		// Primer Enter: dispara la busqueda. Auto-espera de Playwright a que aparezca el aviso,
		// sin waitForTimeout: si no aparece dentro del timeout default, el test falla mostrando
		// justo lo que fallo (no encontro el aviso, no un timeout ciego).
		await articles_modal_input.press('Enter')
		await expect(page.locator('[data-testid="search-no-results"]')).toBeVisible()

		const rows_before = await page.locator('[data-testid^="article-amount-"]').count()

		// Segundo Enter: crea el articulo (create_if_not_exist / save_if_not_exist del modelo
		// provider_order.js) y lo agrega a la compra. El modal se cierra solo al terminar.
		await articles_modal_input.press('Enter')

		// 3. Verificar que el articulo quedo agregado (nueva fila al final de la tabla de articulos).
		const amount_inputs = page.locator('[data-testid^="article-amount-"]')
		await expect(amount_inputs).toHaveCount(rows_before + 1)
		const new_row_amount_input = amount_inputs.last()
		const row_testid = await new_row_amount_input.getAttribute('data-testid')
		const row_id = row_testid.replace('article-amount-', '')

		// La fila debe mostrar el nombre recien creado (lectura de contenido sobre un elemento
		// ya ubicado por data-testid, no una seleccion por texto).
		const row = page.locator(`tr:has([data-testid="article-amount-${row_id}"])`)
		await expect(row).toContainText(unique_article_name)

		// 4. Cargar cantidad y costo del articulo recien creado.
		await new_row_amount_input.fill(AMOUNT)
		await page.locator(`[data-testid="article-cost-${row_id}"]`).fill(COST)

		// 5. El articulo debe quedar agregado a la compra con esos valores (verificacion en pantalla,
		// sin guardar: el guardado de punta a punta ya lo cubre el test de "alta de compra completa").
		await expect(new_row_amount_input).toHaveValue(AMOUNT)
		await expect(page.locator(`[data-testid="article-cost-${row_id}"]`)).toHaveValue(COST)
	})
})
