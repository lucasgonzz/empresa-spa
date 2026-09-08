// Test end to end (tarea 21, punto 2): filtrar desde la lupa de una columna del Listado tiene que
// dejar visible el boton de limpiar filtros, igual que si el filtro hubiera venido del buscador
// general.
//
// El sintoma que reporto Lucas el 11/8/2026: con el buscador general el boton aparecia, con un
// filtro de columna no aparecia nunca, y sin ese boton la unica salida era ir columna por columna
// limpiando cada una a mano.
//
// La causa vivia en el store, no en el boton: filtrar() dispatchea runGlobalSearch({ page: 1 }) sin
// `props`, con lo cual la rama que apaga `listado_por_defecto` no corria y el v-if de
// BtnRestartFilter (is_filtered && !listado_por_defecto) daba false. Por eso este test entra por la
// lupa y no por el buscador: el camino del buscador ya funcionaba y no habria detectado nada.
//
// Selectores: desde el 31/8/2026 usa los `data-testid` de la lupa (`btn-abrir-filtro-<key>`) y del
// footer del modal (`btn-modal-filtrar`), que antes no existian. La version original ubicaba la
// columna por TEXTO VISIBLE (`hasText: 'Nombre'`), que es justo lo que la convencion del harness
// prohibe, y clickeaba la lupa por clase de Bootstrap.
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')

test.describe('Listado: limpiar filtros con un filtro de columna', () => {
	test('el boton de limpiar filtros aparece al filtrar desde la lupa de una columna', async ({ page }) => {
		await page.goto('/listado-de-articulos')
		// Antes de tocar nada: el sistema baja los catalogos del arranque y hasta que no
		// termina esta a medio cargar (ver e2e/helpers/recursos.js). Sin abrir el panel: eso lo
		// verifican auth.setup.js y alta-compra.spec.js.
		await esperar_recursos_descargados(page, { abrir_panel: false })

		// El boton no tiene que estar antes de filtrar: al entrar al modulo lo que se ve es el
		// listado por defecto. Esta primera asercion es la mitad del test -- sin ella, una version
		// que mostrara el boton siempre pasaria igual.
		const btn_limpiar = page.locator('#btn_restart_filter')
		await expect(btn_limpiar).toBeHidden()

		// Abrir el filtro de la columna Nombre desde su lupa.
		//
		// 🔴 El `hover` sobre el encabezado NO SOBRA, y su ausencia es lo que tuvo este test en rojo
		//    desde el 15/8/2026. La lupa vive en un contenedor con `max-width: 0`, `opacity: 0` y
		//    `pointer-events: none`, y la unica regla que lo abre es `th:hover` (ver
		//    display/table/Index.vue). O sea que el boton esta en el DOM, Playwright lo ve
		//    "visible", y es inclickeable.
		//
		//    El mensaje de error engaña: dice que `<div class="cont-th">` intercepta el puntero, y
		//    `.cont-th` es el ANCESTRO del propio boton --no hay nada encima--. La nota vieja de
		//    e2e/README.md culpaba al cartel de progreso `#offline-articles-progress`; no era eso.
		const lupa = page.locator('[data-testid="btn-abrir-filtro-name"]')
		await page.locator('th').filter({ has: lupa }).hover()
		await lupa.click()

		const modal_filtro = page.locator('#filter-modal-article')
		await expect(modal_filtro).toBeVisible()

		await modal_filtro.locator('input').first().fill('a')

		// 🔴 Y hay que apretar "Filtrar": elegir/escribir el criterio NO filtra. El otro boton del
		//    footer, "Agregar filtro", guarda el criterio y tampoco busca.
		await page.locator('[data-testid="btn-modal-filtrar"]').click()

		// Ahora si: la vista esta filtrada y NO es el listado por defecto, asi que el boton se monta.
		await expect(btn_limpiar).toBeVisible()

		// Y el camino de vuelta: apretarlo devuelve el listado completo y el boton se va.
		await btn_limpiar.click()
		await expect(btn_limpiar).toBeHidden()
	})
})
