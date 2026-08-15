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
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { aislar_broadcasts } = require('../helpers/entorno')

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
/**
 * Abre una pestaña del formulario generico (ModelForm).
 *
 * Desde que ModelForm reparte sus campos en grupos, el formulario de la compra es un conjunto de
 * PESTAÑAS ("Configuracion", "Articulos", "Facturacion", "Descuentos y recargos", "Total") y solo
 * se renderizan los campos del grupo activo: los demas NO estan en el DOM. Este helper hace lo
 * mismo que un humano —clickear la pestaña— antes de tocar un campo que vive en otro grupo.
 *
 * Se acota al modal de la compra a proposito: la nav del modulo que quedo detras del modal usa el
 * mismo componente y los mismos data-testid ("proveedores", "compras").
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} nombre Titulo del grupo, tal cual lo declara src/models/provider_order.js.
 * @returns {Promise<void>}
 */
async function abrir_pestania(page, nombre) {
	await page.locator('#provider_order___BV_modal_outer_')
		.locator(`[data-testid="nav-item-${nombre}"]`)
		.click()
}

async function search_and_select(page, field_testid, query) {
	await page.locator(`[data-testid="${field_testid}"]`).click()
	const modal_input = page.locator(`[data-testid="${field_testid}-search-modal-input"]`)
	// Tecleo real, caracter por caracter: fill() escribe el valor directo en el DOM y emite
	// input, pero NINGUN keydown. El modal (src/common-vue/components/search/Modal.vue) arranca
	// con ya_se_busco en true y solo lo pasa a false cuando reset_ya_se_busco recibe un keydown
	// de una tecla que no sea Enter ni flecha. pressSequentially emite keydown/keypress/keyup por
	// cada caracter, como un humano. El fill('') previo es necesario porque pressSequentially
	// AGREGA al final de lo que ya haya en el input, no reemplaza.
	await modal_input.fill('')
	await modal_input.pressSequentially(query)
	// Este Enter BUSCA porque el tecleo de arriba dejo ya_se_busco en false. Con fill() este
	// mismo Enter caeria en seleccionar_resultado() y, sin resultados, crearia el modelo al vuelo
	// (el alta al vuelo del segundo Enter): el test terminaria creando un proveedor "Buenos
	// Aires" nuevo en vez de buscarlo. Es la trampa principal de este modal.
	// La busqueda pega a la API (global-search/article): el usuario del fixture tiene
	// download_articles desactivado, asi que search_from_api_in_provider_order (definida en
	// src/mixins/model_functions.js) da true. El filtrado en memoria contra el store es el
	// camino alternativo, para usuarios con los articulos descargados o sin conexion.
	await modal_input.press('Enter')
	// Auto-espera: el primer resultado tarda lo que tarde en filtrar/renderizar, sin waitForTimeout.
	await elegir_primer_resultado(page, field_testid)
}

/**
 * Clickea el primer resultado del modal y espera la SEÑAL REAL de que la seleccion ocurrio: que el
 * modal se haya cerrado. Si no se cerro, vuelve a clickear.
 *
 * Por que hace falta reintentar, y por que esto no es un sleep disfrazado: cuando la busqueda
 * termina, el modal autoselecciona la primera fila (selected_index), y ese watch de TableComponent
 * levanta una guarda `is_from_keydown` que se baja con un setTimeout de 500 ms. Mientras la guarda
 * esta arriba, TableComponent::onRowSelected() descarta el evento entero: el click en la fila no
 * emite nada, no seleccciona y el modal queda abierto tapando el formulario. Playwright clickea
 * apenas la fila aparece, o sea casi siempre DENTRO de esos 500 ms. Medido el 10/8/2026: tras el
 * click el modal seguia con clase "modal fade show" a los 12 segundos, y en la consola salian los
 * dos "onRowSelected items:" de TableComponent sin un solo "onRowSelected para SEARCH MODAL".
 *
 * Es un bug real del producto y le pasa igual a una persona que clickee rapido; quedo registrado
 * como hallazgo y escalado, porque arreglarlo de raiz cambia el comportamiento de la navegacion por
 * teclado para todos los usuarios. Lo de aca NO tapa el sintoma con un timeout mas largo: espera la
 * condicion observable correcta (modal cerrado) y, si no se cumple, repite la MISMA accion.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} field_testid data-testid del input principal del campo search.
 * @returns {Promise<void>}
 */
async function elegir_primer_resultado(page, field_testid) {
	const modal = page.locator(`#${field_testid}-search-modal`)
	await expect(async () => {
		await page.locator('[data-testid="search-result-row"]').first().click()
		await expect(modal).toBeHidden({ timeout: 1500 })
	}).toPass({ timeout: 30000 })
}

test.describe('Compras: alta de compra completa', () => {
	// El alta de una compra depende de catalogos que la aplicacion baja al arrancar: el buscador de
	// proveedores, el select de deposito, los tipos de precio y las preferencias de columnas de la
	// grilla de articulos. Entrar y empezar a clickear mientras eso todavia esta en vuelo da
	// selects vacios y filas sin columnas, que se lee como un test roto sin que haya nada roto.
	// Por eso: se entra, se despliega el panel de recursos desde la tarjeta, y recien cuando dice
	// "Todo listo" empieza el test. Ver e2e/helpers/recursos.js.
	test.beforeEach(async ({ page }) => {
		// Antes de navegar: sin esto, un broadcast disparado desde otro entorno de la misma
		// maquina abre un modal encima del formulario a mitad del test. Ver helpers/entorno.js.
		await aislar_broadcasts(page)

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
		await abrir_pestania(page, 'Facturacion')
		await page.locator('[data-testid="provider_order-modo_facturacion"]').selectOption('automatico')

		// 4. Cargar los 10 articulos del fixture (5 de Buenos Aires + 5 de Rosario).
		await abrir_pestania(page, 'Articulos')
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
		await abrir_pestania(page, 'Total')
		const total_text = await page.locator('[data-testid="compra-total"]').innerText()
		const total_from_server = Number(saved_model.total)
		expect(total_text).toContain(
			total_from_server.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
		)

		// Los descuentos del proveedor (10% y 5%) deben haber quedado precargados en la compra.
		// Se lee el texto del contenedor de descuentos (ubicado por data-testid, no por clase):
		// no es una seleccion por texto, es una aserción de contenido sobre un elemento ya ubicado.
		await abrir_pestania(page, 'Descuentos y recargos')
		const discounts_container = page.locator('[data-testid="provider_order-provider_order_discounts"]')
		const discounts_text = await discounts_container.innerText()
		expect(discounts_text).toContain('10')
		expect(discounts_text).toContain('5')

		// Los 2 articulos con recibida 8 deben seguir mostrando esa cantidad al reabrir.
		await abrir_pestania(page, 'Articulos')
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
