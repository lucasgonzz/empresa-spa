// Test end to end 2 (prompt 617): alta de un articulo nuevo desde el buscador de articulos,
// dentro de la carga de una compra. Es el flujo que mas se rompe en la practica: escribir un
// nombre que no existe, confirmar que no encuentra nada, apretar Enter de nuevo y verificar que
// el articulo se crea y queda agregado a la compra con la cantidad y el costo cargados.
//
// Usa un nombre unico con timestamp para que el test se pueda repetir sin chocar con una corrida
// anterior (un articulo con ese nombre nunca deberia existir ya en la base).
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')

const AMOUNT = '3'
const COST = '150'

test.describe('Compras: alta de articulo desde el buscador', () => {
	test('crea un articulo nuevo desde el buscador y lo agrega a la compra en carga', async ({ page }) => {
		const unique_article_name = `E2E Articulo Nuevo ${Date.now()}`

		// 1. Abrir una compra nueva (proveedor Rosario, no hace falta mas que eso para este flujo).
		await page.goto('/proveedores/compras')
		// Antes de tocar nada: el sistema baja los catalogos del arranque y hasta que no
		// termina esta a medio cargar (ver e2e/helpers/recursos.js). Sin abrir el panel: eso lo
		// verifican auth.setup.js y alta-compra.spec.js.
		await esperar_recursos_descargados(page, { abrir_panel: false })
		await page.locator('[data-testid="btn-crear-provider_order"]').click()

		await page.locator('[data-testid="provider_order-provider_id"]').click()
		const provider_modal_input = page.locator('[data-testid="provider_order-provider_id-search-modal-input"]')
		// Tecleo real, no fill(): ver el comentario largo de search_and_select en
		// alta-compra.spec.js. fill() no emite keydown, ya_se_busco queda en true y el Enter de
		// abajo crearia un proveedor "Rosario" nuevo en vez de buscar el del fixture.
		await provider_modal_input.fill('')
		await provider_modal_input.pressSequentially('Rosario')
		await provider_modal_input.press('Enter')
		// Click con reintento hasta que el modal se cierre, que es la señal real de que la seleccion
		// ocurrio. Mismo motivo que el helper elegir_primer_resultado de alta-compra.spec.js: durante
		// los primeros 500 ms despues de la busqueda, TableComponent descarta el click por su guarda
		// is_from_keydown y el modal queda abierto. No es un timeout mas largo: es esperar la
		// condicion correcta y repetir la misma accion si no se cumplio.
		const provider_search_modal = page.locator('#provider_order-provider_id-search-modal')
		await expect(async () => {
			await page.locator('[data-testid="search-result-row"]').first().click()
			await expect(provider_search_modal).toBeHidden({ timeout: 1500 })
		}).toPass({ timeout: 30000 })

		// 2. Escribir en el buscador de articulos un nombre que no existe.
		// El buscador de articulos vive en la pestaña "Articulos" del formulario generico: desde que
		// ModelForm reparte sus campos en grupos, solo se renderizan los del grupo activo, y el que
		// abre por defecto es "Configuracion". Sin este click el campo no existe en el DOM.
		await page.locator('#provider_order___BV_modal_outer_')
			.locator('[data-testid="nav-item-Articulos"]')
			.click()
		await page.locator('[data-testid="provider_order-articles"]').click()
		const articles_modal_input = page.locator('[data-testid="provider_order-articles-search-modal-input"]')
		// Tecleo real: es lo que deja ya_se_busco en false y hace que el PRIMER Enter busque. Con
		// fill() este test pasaba por el motivo equivocado — el primer Enter creaba el articulo
		// directamente, sin haber verificado nunca que la busqueda no encontraba nada, que es la
		// mitad de lo que dice probar.
		await articles_modal_input.fill('')
		await articles_modal_input.pressSequentially(unique_article_name)

		// Primer Enter: dispara la busqueda. Auto-espera de Playwright a que aparezca el aviso,
		// sin waitForTimeout: si no aparece dentro del timeout default, el test falla mostrando
		// justo lo que fallo (no encontro el aviso, no un timeout ciego).
		// El testid distingue los dos estados vacios del modal: "search-sin-criterio" es el modal
		// recien abierto y "search-no-results" es una busqueda ya terminada sin resultados
		// (busqueda_realizada, que solo se pone en true dentro de finishSearch). O sea que esta
		// asercion prueba que la busqueda ocurrio de verdad.
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

		// La fila debe mostrar el nombre recien creado.
		//
		// 🔴 Se lee el VALOR de la celda, no el texto de la fila, y no es un rodeo: un articulo
		// recien creado desde el buscador nace con status 'inactive', y props_to_show declara el
		// nombre con show_in_input_if: ['status', '=', 'inactive'] (src/models/provider_order.js),
		// asi que la celda es un textarea editable para poder completar el articulo sin salir de la
		// compra. Eso es lo correcto y es lo que se ve en pantalla. Lo que estaba mal era la
		// asercion: toContainText sobre el <tr> lee texto, y el value de un input no es texto, asi
		// que el test daba rojo con la interfaz andando bien (README, corrida del 15/8/2026).
		// El data-testid con sufijo "-editable" lo emite Tr.vue para estas celdas.
		const name_cell = page.locator(`[data-testid="article-name-${row_id}-editable"]`)
		await expect(name_cell).toHaveValue(unique_article_name)

		// Agregado el articulo, el foco tiene que quedar solo en el primer campo del pivote
		// --Cantidad--: es lo que deja seguir cargando con el teclado, y ademas es lo unico que
		// trae esa columna a la parte visible de la tabla, que arranca scrolleada a la izquierda.
		// Lo hace setTableFocus en common-vue/components/model/ModelForm.vue.
		await expect(new_row_amount_input).toBeFocused()

		// 4. Cargar cantidad y costo del articulo recien creado.
		await new_row_amount_input.fill(AMOUNT)
		await page.locator(`[data-testid="article-cost-${row_id}"]`).fill(COST)

		// 5. El articulo debe quedar agregado a la compra con esos valores (verificacion en pantalla,
		// sin guardar: el guardado de punta a punta ya lo cubre el test de "alta de compra completa").
		await expect(new_row_amount_input).toHaveValue(AMOUNT)
		await expect(page.locator(`[data-testid="article-cost-${row_id}"]`)).toHaveValue(COST)
	})
})
