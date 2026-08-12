// Test end to end de la mision 39: un cambio en los criterios del buscador general tiene que
// invalidar la busqueda anterior.
//
// El defecto que cubre, reportado por Lucas el 12/8/2026: el modal de busqueda tiene el atajo del
// segundo Enter --despues de buscar, el Enter siguiente selecciona el resultado en vez de volver a
// buscar-- y ese atajo solo se apagaba tipeando en el campo de texto. Agregar un filtro fijo o
// cambiarle el valor no es tipear ahi, asi que el Enter siguiente seleccionaba el resultado VIEJO,
// calculado sin ese filtro. La lupa, que comparte camino con el Enter, hacia lo mismo.
//
// Los tres casos son los del criterio de aceptacion de la mision:
//   1. Sin cambiar nada, el segundo Enter SIGUE seleccionando (el atajo no se rompe).
//   2. Con un filtro fijo agregado, el Enter vuelve a buscar.
//   3. La lupa vuelve a buscar siempre, haya cambiado algo o no.
//
// La señal de "volvio a buscar" no es visual: se cuentan los POST a `global-search/<modelo>`, que es
// lo que dispara search() en common-vue/components/search/Modal.vue. Mirar los resultados no
// alcanzaria --pueden ser los mismos-- y que el modal se cierre es la señal de lo contrario.
//
// Los tres corren EN SERIE sobre una unica pagina, a proposito: el arranque de la SPA son ~73
// llamadas contra una API servida por `php artisan serve`, que atiende un request por vez (ver el
// estado conocido del README de e2e). Pagar ese arranque una sola vez es la diferencia entre una
// suite que termina y tres tests que mueren esperando la cola.
const { test, expect } = require('@playwright/test')
const path = require('path')

const PROVEEDOR_DEL_FIXTURE = 'Rosario'

test.describe.configure({ mode: 'serial' })

let page
let busquedas = 0

/**
 * Modal del buscador de proveedores de una compra nueva: el `search/Modal.vue` mas barato de
 * alcanzar, porque es el primer campo del formulario y no depende de ningun otro.
 *
 * @returns {Object} locators del modal, su input y su lupa
 */
function locators() {
	return {
		modal: page.locator('#provider_order-provider_id-search-modal'),
		input: page.locator('[data-testid="provider_order-provider_id-search-modal-input"]'),
		lupa: page.locator('[data-testid="provider_order-provider_id-search-modal-input-lupa"]'),
	}
}

/**
 * Deja el modal abierto, lo haya cerrado o no el test anterior.
 *
 * @returns {Promise<void>}
 */
async function asegurar_modal_abierto() {
	const l = locators()
	if (await l.modal.isVisible()) {
		return
	}
	await page.locator('[data-testid="provider_order-provider_id"]').click()
	await expect(l.input).toBeVisible({ timeout: 60000 })
}

/**
 * Escribe un criterio y busca con Enter, esperando a que aparezcan resultados.
 *
 * Teclea de verdad y no usa fill(): fill() no emite keydown, y sin keydown el flag del segundo
 * Enter queda prendido desde la busqueda anterior. Es el mismo motivo documentado en
 * alta-compra.spec.js, y aca ademas es parte de lo que se esta probando.
 *
 * @returns {Promise<void>}
 */
async function buscar_con_enter() {
	const l = locators()
	await l.input.fill('')
	await l.input.pressSequentially(PROVEEDOR_DEL_FIXTURE)
	await l.input.press('Enter')
	await expect(page.locator('[data-testid="search-result-row"]').first()).toBeVisible({ timeout: 60000 })
}

test.beforeAll(async ({ browser }) => {
	const context = await browser.newContext({
		storageState: path.join(__dirname, '..', '.auth', 'user.json'),
	})
	page = await context.newPage()
	page.on('request', function (request) {
		if (request.method() === 'POST' && request.url().includes('/global-search/')) {
			busquedas++
		}
	})

	await page.goto('/proveedores/compras')
	await page.locator('[data-testid="btn-crear-provider_order"]').click()
	await asegurar_modal_abierto()
})

test.afterAll(async () => {
	if (page) {
		await page.close()
	}
})

test.describe('Buscador general: un cambio de criterios invalida la busqueda anterior', () => {

	test('con un filtro fijo agregado, el Enter vuelve a buscar en vez de seleccionar', async () => {
		await asegurar_modal_abierto()
		const l = locators()

		await buscar_con_enter()
		const despues_de_buscar = busquedas

		// Agregar la provincia como filtro fijo: desplegable de propiedades -> nombre de la
		// propiedad -> "Agregar al buscador".
		await l.modal.locator('[data-testid="buscador-general-props-dropdown"]').click()
		await l.modal.locator('[data-testid="buscador-general-prop-config-provincia_id"]').click()
		await page.locator('[data-testid="filtro-fijo-agregar"]').click()

		const filtro = l.modal.locator('[data-testid="filtro-fijo-provincia_id"]')
		await expect(filtro).toBeVisible({ timeout: 30000 })

		// Y ademas se le elige un valor, que es el otro cambio que la mision pide cubrir. Si el
		// fixture no tiene provincias cargadas, el alta del filtro ya es el cambio de criterio.
		const opciones = await filtro.locator('option').count()
		if (opciones > 1) {
			await filtro.selectOption({ index: 1 })
		}

		// Enter: tiene que BUSCAR (una request mas) y el modal tiene que seguir abierto.
		await l.input.press('Enter')
		await expect.poll(function () { return busquedas }, { timeout: 60000 }).toBeGreaterThan(despues_de_buscar)
		await expect(l.modal).toBeVisible()
	})

	test('la lupa vuelve a buscar siempre, aunque no haya cambiado nada', async () => {
		await asegurar_modal_abierto()
		const l = locators()

		await buscar_con_enter()
		const despues_de_buscar = busquedas

		// Sin tocar ningun criterio: la lupa dice "Buscar" y tiene que buscar, no seleccionar.
		await l.lupa.click()
		await expect.poll(function () { return busquedas }, { timeout: 60000 }).toBeGreaterThan(despues_de_buscar)
		await expect(l.modal).toBeVisible()
	})

	test('sin cambiar nada, el segundo Enter sigue seleccionando el resultado', async () => {
		await asegurar_modal_abierto()
		const l = locators()

		await buscar_con_enter()
		const despues_de_buscar = busquedas

		// Segundo Enter sin tocar nada: selecciona. El modal se cierra y NO sale otra busqueda.
		// Va ultimo de los tres porque es el que cierra el modal.
		await expect(async () => {
			await l.input.press('Enter')
			await expect(l.modal).toBeHidden({ timeout: 5000 })
		}).toPass({ timeout: 60000 })
		expect(busquedas).toBe(despues_de_buscar)
	})
})
