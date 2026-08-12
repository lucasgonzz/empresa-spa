// Test end to end de la mision 39: un cambio en los criterios del buscador general tiene que
// invalidar la busqueda anterior.
//
// El defecto que cubre, reportado por Lucas el 12/8/2026: el modal de busqueda tiene el atajo del
// segundo Enter --despues de buscar, el Enter siguiente selecciona el resultado en vez de volver a
// buscar-- y ese atajo solo se apagaba tipeando en el campo de texto. Agregar un filtro fijo o
// cambiarle el valor no es tipear ahi, asi que el Enter siguiente seleccionaba el resultado VIEJO,
// calculado sin ese filtro. La lupa, que comparte camino con el Enter, hacia lo mismo.
//
// Casos cubiertos (criterio de aceptacion de la mision): 1, 2, 3 y 4.
//
// COMO SE MIDE, y por que no alcanza con mirar la pantalla:
//   - "volvio a buscar" = sale UN POST a `global-search/<modelo>`, contado desde justo antes de la
//     tecla. No "el contador subio en algun momento": el contador global se resetea antes de cada
//     accion, porque una espera de 60 segundos sobre un contador monotono la satisface cualquier
//     POST por cualquier causa.
//   - "selecciono" = el modal se cerro Y el campo quedo con el proveedor elegido. Lo segundo no es
//     redundante: `seleccionar_resultado()` tambien cierra el modal por la rama `save_if_not_exist`,
//     que CREA un proveedor nuevo en vez de elegir uno. Sin esa asercion, el caso 1 se pondria
//     verde justo cuando el atajo NO funciono (y encima dejaria proveedores "Rosario" duplicados en
//     la base, que es lo que busca alta-compra.spec.js).
//
// El filtro fijo que se usa es NUMERICO (`percentage_gain`) y no una relacion: el valor se escribe
// en un input, asi que el camino "cambiar el valor de un filtro ya puesto" se ejerce siempre. Con
// una relacion dependeria de que el fixture tenga esa tabla sembrada --y no la tiene--, con lo cual
// esa mitad del criterio no se probaria nunca y el test se degradaria en silencio.
//
// Los tres corren EN SERIE sobre una unica pagina, a proposito: el arranque de la SPA son ~73
// llamadas contra una API servida por `php artisan serve`, que atiende un request por vez (ver el
// estado conocido del README de e2e). Pagar ese arranque una sola vez es la diferencia entre una
// suite que termina y tres tests que mueren esperando la cola. La contra, y queda escrita: si el
// primero falla, los siguientes quedan en skipped; y el orden importa, porque el ultimo cierra el
// modal seleccionando.
const { test, expect } = require('@playwright/test')
const path = require('path')

const PROVEEDOR_DEL_FIXTURE = 'Rosario'
const FILTRO_NUMERICO = 'percentage_gain'

test.describe.configure({ mode: 'serial' })

let page
let busquedas = 0
let altas_al_vuelo = 0

/**
 * Locators del modal del buscador de proveedores de una compra nueva: el `search/Modal.vue` mas
 * barato de alcanzar, porque es el primer campo del formulario y no depende de ningun otro.
 *
 * @returns {Object}
 */
function locators() {
	return {
		campo: page.locator('[data-testid="provider_order-provider_id"]'),
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
	await expect(async () => {
		if (!(await l.input.isVisible())) {
			await l.campo.click()
		}
		await expect(l.input).toBeVisible({ timeout: 5000 })
	}).toPass({ timeout: 60000 })
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

	// setFirstSelectedRow() deja `selected_index` en -1 durante ~200 ms a proposito (dos setTimeout
	// de 100) antes de poner 0. Un Enter que caiga en esa ventana no selecciona: se va por la rama
	// que CREA el modelo. Se espera a que esa ventana pase, que es la unica forma de que el caso 1
	// pruebe lo que dice probar.
	await page.waitForTimeout(700)
}

/**
 * Corre una accion y devuelve cuantas busquedas salieron por ella. Resetea el contador ANTES, para
 * que el numero sea de esta accion y no del acumulado del test.
 *
 * @param {Function} accion
 * @returns {Promise<Number>}
 */
async function busquedas_de(accion) {
	busquedas = 0

	// Se espera la RESPUESTA, no solo el request, y por dos motivos. Uno: una ventana fija seria
	// una carrera contra una API que atiende de a un pedido por vez. Dos, el que importa:
	// `search()` arranca con `if (this.loading) return`, asi que si la busqueda anterior sigue en
	// vuelo, la siguiente accion no dispara nada y el test leeria 0 sin que haya ningun defecto.
	const espera = page.waitForResponse(function (response) {
		return response.request().method() === 'POST' && response.url().includes('/global-search/')
	}, { timeout: 20000 }).catch(function () { return null })

	await accion()
	await espera
	await page.waitForTimeout(500)
	return busquedas
}

test.beforeAll(async ({ browser }) => {
	const context = await browser.newContext({
		storageState: path.join(__dirname, '..', '.auth', 'user.json'),
	})
	page = await context.newPage()
	page.on('request', function (request) {
		if (request.method() !== 'POST') {
			return
		}
		if (request.url().includes('/global-search/')) {
			busquedas++
		}
		// El alta al vuelo del modelo buscado: si esto se dispara, el modal se cerro creando un
		// proveedor, no seleccionando uno.
		if (request.url().includes('/search/save-if-not-exist/')) {
			altas_al_vuelo++
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

	test('agregar un filtro fijo y cambiarle el valor hacen que el Enter vuelva a buscar', async () => {
		await asegurar_modal_abierto()
		const l = locators()
		await buscar_con_enter()

		// --- Alta del filtro fijo: desplegable -> nombre de la propiedad -> elegir el modo ->
		// "Agregar al buscador". El modo hay que elegirlo: para una propiedad numerica el modal
		// abre sin `filter_kind`, y sin eso el filtro se agrega sin control que mostrar.
		await l.modal.locator('[data-testid="buscador-general-props-dropdown"]').click()
		await l.modal.locator('[data-testid="buscador-general-prop-config-'+FILTRO_NUMERICO+'"]').click()
		await page.locator('[data-testid="filtro-fijo-tipo-comparacion"]').click()
		await page.locator('[data-testid="filtro-fijo-agregar"]').click()

		const filtro = l.modal.locator('[data-testid="filtro-fijo-'+FILTRO_NUMERICO+'"]')
		await expect(filtro).toBeVisible({ timeout: 30000 })

		// Criterio 2: con el filtro recien agregado, el Enter BUSCA.
		const por_el_alta = await busquedas_de(async function () {
			await l.input.press('Enter')
		})
		expect(por_el_alta).toBe(1)
		await expect(l.modal).toBeVisible()

		// Criterio 5: cambiarle el VALOR a un filtro ya puesto tambien invalida la busqueda. Es un
		// camino distinto del alta (onInputFiltroFijo contra onAgregarFiltroFijo), por eso se prueba
		// aparte y por eso el filtro es numerico: el valor se escribe, no depende del fixture.
		await filtro.fill('10')
		const por_el_valor = await busquedas_de(async function () {
			await l.input.press('Enter')
		})
		expect(por_el_valor).toBe(1)
		await expect(l.modal).toBeVisible()

		// Criterio 4: quitarlo tambien. Ademas deja la preferencia del usuario como estaba: sin este
		// paso el filtro queda persistido en la base del slot (PUT table-column-preference) y la
		// corrida siguiente arranca con el filtro puesto, probando otra cosa sin avisar.
		await l.modal.locator('[data-testid="filtro-fijo-quitar-'+FILTRO_NUMERICO+'"]').click()
		await expect(filtro).toBeHidden({ timeout: 15000 })
		const por_la_baja = await busquedas_de(async function () {
			await l.input.press('Enter')
		})
		expect(por_la_baja).toBe(1)
		await expect(l.modal).toBeVisible()
	})

	test('la lupa vuelve a buscar siempre, aunque no haya cambiado nada', async () => {
		await asegurar_modal_abierto()
		const l = locators()
		await buscar_con_enter()

		// Sin tocar ningun criterio: la lupa dice "Buscar" y tiene que buscar, no seleccionar.
		const por_la_lupa = await busquedas_de(async function () {
			await l.lupa.click()
		})
		expect(por_la_lupa).toBe(1)
		await expect(l.modal).toBeVisible()
	})

	test('sin cambiar nada, el segundo Enter sigue seleccionando el resultado', async () => {
		await asegurar_modal_abierto()
		const l = locators()
		await buscar_con_enter()
		const altas_antes = altas_al_vuelo

		// Segundo Enter sin tocar nada: selecciona. Va ultimo de los tres porque cierra el modal.
		const por_el_segundo_enter = await busquedas_de(async function () {
			await l.input.press('Enter')
		})
		expect(por_el_segundo_enter).toBe(0)
		await expect(l.modal).toBeHidden({ timeout: 15000 })

		// Y selecciono DE VERDAD: el proveedor quedo cargado en el formulario --se muestra como
		// chip debajo del campo, no adentro del input, que se vacia-- y no se creo ninguno al
		// vuelo. Sin estas dos, el test se pondria verde justo en el caso que mas importa
		// detectar: `seleccionar_resultado()` tambien cierra el modal cuando CREA el modelo.
		await expect(page.locator('#provider_order___BV_modal_outer_'))
			.toContainText(PROVEEDOR_DEL_FIXTURE, { timeout: 15000 })
		expect(altas_al_vuelo).toBe(altas_antes)
	})
})
