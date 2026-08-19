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
/**
 * Convierte a numero un importe tal como lo muestra la pantalla, en formato es-AR: simbolo de
 * moneda adelante, punto como separador de miles y coma como decimal ("$40.527,50" -> 40527.5).
 *
 * @param {string} texto
 * @returns {number}
 */
function numero_de_pantalla(texto) {
	const limpio = String(texto)
		// Se queda con digitos, separadores y el signo; saca "$" y espacios.
		.replace(/[^\d.,-]/g, '')
		// El punto es separador de miles: se descarta.
		.replace(/\./g, '')
		// La coma es el separador decimal.
		.replace(',', '.')
	return Number(limpio)
}

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
 * Por que sigue habiendo un reintento, y por que esto no es un sleep disfrazado.
 *
 * La causa grande ya no esta: hasta el 15/8/2026 el watch de selected_index de TableComponent
 * levantaba la guarda `is_from_keydown` por 500 ms enteros y onRowSelected() descartaba el evento
 * entero mientras tanto, asi que el click sobre el resultado no seleccionaba nada y el modal
 * quedaba abierto. Eso se arreglo de raiz (la guarda ahora se baja en el $nextTick, que es cuando
 * ya paso la emision que tenia que tapar) y hoy el modal cierra al PRIMER click.
 *
 * Lo que queda es una ventana mas corta: setFirstSelectedRow() de search/Modal.vue prende
 * no_hacer_seleccion y la baja recien 200 ms despues, junto con la autoseleccion. Un click que cae
 * ahi adentro se sigue perdiendo. El reintento cubre eso, y ademas cubre que la busqueda pegue a la
 * API y la fila aparezca antes de que los datos esten renderizados.
 *
 * Lo de aca NO tapa el sintoma con un timeout mas largo: espera la condicion observable correcta
 * (modal cerrado) y, si no se cumple, repite la MISMA accion.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} field_testid data-testid del input principal del campo search.
 * @returns {Promise<void>}
 */
async function elegir_primer_resultado(page, field_testid) {
	const modal = page.locator(`#${field_testid}-search-modal`)
	// 🔴 La fila se busca DENTRO del modal, no en todo el documento. Un
	// page.locator('[data-testid="search-result-row"]') suelto agarra la primera del DOM, que no
	// tiene por que ser un resultado de busqueda: hasta el 15/8/2026 display/table/Tr.vue le ponia
	// ese mismo testid a cualquier tabla de seleccion simple, y la grilla de articulos de la compra
	// esta ANTES en el DOM que el modal. Con un articulo ya cargado, el click caia sobre la fila de
	// la compra --tapada por el modal abierto-- y se iba en timeout sin tocar el resultado. El
	// testid ya se corrigio del lado del producto; acotar el selector es lo que evita que la
	// proxima colision de nombres vuelva a leerse como un bug de la aplicacion.
	const fila = modal.locator('[data-testid="search-result-row"]').first()
	await expect(async () => {
		await fila.click()
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
		//
		// Se compara el NUMERO, no el string formateado. Antes se exigia que el texto contuviera
		// el total con dos decimales (toLocaleString es-AR), y eso fijaba un detalle de
		// presentacion que este test nunca quiso fijar: price() --common-vue/mixins/dates.js--
		// recorta los decimales A PROPOSITO cuando son ",00", asi que un total redondo se muestra
		// "$40.527" y la asercion fallaba con la pantalla y el servidor perfectamente de acuerdo.
		// Lo que este paso verifica, y lo dice su propio encabezado, es COHERENCIA entre pantalla y
		// servidor. Comparar el numero la mantiene estricta --un total distinto sigue poniendo el
		// test en rojo-- sin atarla a si la app imprime o no los centavos.
		await abrir_pestania(page, 'Total')
		const total_text = await page.locator('[data-testid="compra-total"]').innerText()
		const total_from_server = Number(saved_model.total)
		// El total se redondea a 2 decimales porque es lo maximo que la pantalla puede mostrar.
		expect(numero_de_pantalla(total_text)).toBe(Number(total_from_server.toFixed(2)))

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
