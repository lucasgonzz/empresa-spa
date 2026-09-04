// Helpers del formulario generico (common-vue/components/model/ModelForm.vue): abrir una pestaña y
// usar un campo "search".
//
// Nacen extraidos tal cual de e2e/tests/alta-compra.spec.js (prompt 617), que fue el primero en
// escribirlos. Se sacaron de ahi cuando un segundo spec los necesito: son las dos maniobras que
// TODO test que cargue un modelo por el formulario generico tiene que hacer, y las dos tienen una
// trampa que ya costo una corrida entera cada una. Duplicarlas es garantizar que una de las dos
// copias envejezca sola.
const { expect } = require('@playwright/test')

/**
 * Abre una pestaña del formulario generico (ModelForm).
 *
 * Desde que ModelForm reparte sus campos en grupos, un formulario grande es un conjunto de
 * PESTAÑAS y solo se renderizan los campos del grupo activo: los demas NO estan en el DOM. Este
 * helper hace lo mismo que un humano —clickear la pestaña— antes de tocar un campo que vive en
 * otro grupo.
 *
 * Se acota al modal del modelo a proposito: la nav del modulo que quedo detras del modal usa el
 * mismo componente y los mismos data-testid.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} model_name Nombre del modelo (ej: "provider_order"), para acotar al modal.
 * @param {string} nombre Titulo del grupo, tal cual lo declara src/models/<model_name>.js.
 * @returns {Promise<void>}
 */
async function abrir_pestania(page, model_name, nombre) {
	await page.locator('#' + model_name + '___BV_modal_outer_')
		.locator(`[data-testid="nav-item-${nombre}"]`)
		.click()
}

/**
 * Clickea el primer resultado del modal de busqueda y espera la SEÑAL REAL de que la seleccion
 * ocurrio: que el modal se haya cerrado. Si no se cerro, vuelve a clickear.
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
	// la compra --tapada por el modal abierto-- y se iba en timeout sin tocar el resultado.
	const fila = modal.locator('[data-testid="search-result-row"]').first()
	await expect(async () => {
		await fila.click()
		await expect(modal).toBeHidden({ timeout: 1500 })
	}).toPass({ timeout: 30000 })
}

/**
 * Abre el buscador de un campo "search" generico de ModelForm, escribe la query dentro del modal
 * de busqueda y clickea el primer resultado.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} field_testid data-testid del input principal (ej: "provider_order-provider_id").
 * @param {string} query texto a buscar.
 * @returns {Promise<void>}
 */
async function search_and_select(page, field_testid, query) {
	await page.locator(`[data-testid="${field_testid}"]`).click()
	const modal_input = page.locator(`[data-testid="${field_testid}-search-modal-input"]`)
	// Tecleo real, caracter por caracter: fill() escribe el valor directo en el DOM y emite
	// input, pero NINGUN keydown, que no es lo que hace un usuario. pressSequentially emite
	// keydown/keypress/keyup por cada caracter, como un humano. El fill('') previo es necesario
	// porque pressSequentially AGREGA al final de lo que ya haya en el input, no reemplaza.
	//
	// 🔴 Ojo si venis leyendo este helper de antes del 4/9/2026: el motivo escrito aca era otro.
	// Decia que fill() dejaba ya_se_busco en true y que por eso el Enter de abajo creaba el modelo
	// al vuelo en vez de buscar. Eso ya no pasa: desde la mision de la precarga de resultados,
	// onModalShow() baja ya_se_busco en CADA apertura (src/common-vue/components/search/Modal.vue),
	// asi que el primer Enter busca siempre, se haya tecleado o no. El tecleo real se mantiene
	// porque es lo que hace el usuario, no porque sin el el test se rompa.
	await modal_input.fill('')
	await modal_input.pressSequentially(query)
	// Primer Enter: busca. El segundo, si no hubo resultados, es el que crea el modelo al vuelo.
	await modal_input.press('Enter')
	// Auto-espera: el primer resultado tarda lo que tarde en filtrar/renderizar, sin waitForTimeout.
	await elegir_primer_resultado(page, field_testid)
}

/**
 * Crea un modelo al vuelo desde el buscador de un campo "search": escribe un nombre que no existe,
 * verifica que la busqueda haya corrido y no haya encontrado nada, y recien ahi confirma el alta.
 *
 * Los DOS Enter son el flujo real y ninguno sobra:
 *   - el primero dispara la busqueda (por eso el tecleo tiene que ser real, ver search_and_select);
 *   - el segundo, ya con `busqueda_realizada` en true, crea el modelo (create_if_not_exist /
 *     save_if_not_exist del model) y lo agrega a la relacion.
 *
 * La asercion del medio no es decorativa: distingue "search-no-results" (busqueda terminada sin
 * resultados) de "search-sin-criterio" (modal recien abierto). Sin ella, el test podria estar
 * creando el modelo con el primer Enter y pasar por el motivo equivocado.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} field_testid data-testid del input principal del campo search.
 * @param {string} nombre Nombre del modelo nuevo. Tiene que no existir en la base.
 * @returns {Promise<void>}
 */
async function crear_desde_buscador(page, field_testid, nombre) {
	await page.locator(`[data-testid="${field_testid}"]`).click()
	const modal_input = page.locator(`[data-testid="${field_testid}-search-modal-input"]`)
	await modal_input.fill('')
	await modal_input.pressSequentially(nombre)

	await modal_input.press('Enter')
	await expect(page.locator('[data-testid="search-no-results"]')).toBeVisible()

	await modal_input.press('Enter')
}

/**
 * Escribe un valor en un campo del formulario generico y NO sigue hasta que el campo lo tiene.
 *
 * 🔴 Un `fill()` a secas no alcanza, y esto no es paranoia. Los inputs de ModelForm
 * (common-vue/components/model/form/FieldTextInput.vue) son controlados: `local_value` es un
 * computed que lee de la prop `value` y emite `input`; no guarda estado propio. Si el modal
 * todavia esta terminando de cargar el modelo cuando se escribe, el valor tipeado se pisa con el
 * que viene del store y el input vuelve solo al valor viejo, sin ningun error.
 *
 * El sintoma es cruel: el formulario se guarda, el PUT sale bien, y el servidor devuelve el valor
 * ANTERIOR. La asercion falla veinte lineas mas abajo ("esperaba 3, recibi 3.5") y nada apunta al
 * fill. Paso el 19/8/2026 con la alicuota del impuesto sobre ventas.
 *
 * Reintenta la MISMA accion hasta que la condicion observable se cumple, igual que
 * elegir_primer_resultado: no es un timeout mas largo.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} testid data-testid del input.
 * @param {string|number} valor Valor a dejar en el campo.
 * @returns {Promise<void>}
 */
async function completar_campo(page, testid, valor) {
	const campo = page.locator(`[data-testid="${testid}"]`)
	await expect(campo).toBeVisible()

	await expect(async () => {
		await campo.fill(String(valor))
		await expect(campo).toHaveValue(String(valor), { timeout: 1500 })
	}).toPass({ timeout: 20000 })
}

module.exports = {
	abrir_pestania,
	completar_campo,
	elegir_primer_resultado,
	search_and_select,
	crear_desde_buscador,
}
