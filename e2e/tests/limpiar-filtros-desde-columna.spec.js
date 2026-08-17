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
// Selectores: se usan los que ya existen en el DOM (.th-filter-btn de BtnFilter.vue, el id del
// b-modal que arma table/Index.vue como 'filter-modal-' + model_name, y las clases del footer de
// FilterModal.vue). No se agrego ningun data-testid nuevo para este test.
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

		// Abrir el filtro de la columna Nombre desde su lupa. La lupa es el primer .th-filter-btn
		// del th (el segundo, .th-filter-btn--danger, es el de limpiar esa columna).
		await page.locator('th', { hasText: 'Nombre' }).first()
			.locator('.th-filter-btn').first()
			.click()

		const modal_filtro = page.locator('#filter-modal-article')
		await expect(modal_filtro).toBeVisible()

		await modal_filtro.locator('input').first().fill('a')
		await modal_filtro.locator('.filter-modal-btn--primary').click()

		// Ahora si: la vista esta filtrada y NO es el listado por defecto, asi que el boton se monta.
		await expect(btn_limpiar).toBeVisible()

		// Y el camino de vuelta: apretarlo devuelve el listado completo y el boton se va.
		await btn_limpiar.click()
		await expect(btn_limpiar).toBeHidden()
	})
})
