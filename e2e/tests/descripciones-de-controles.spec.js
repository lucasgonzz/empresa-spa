// Descripciones de controles: el popover que aparece al dejarle el mouse encima a un boton o a un
// input durante 2 segundos (pedido de Lucas, 1/9/2026).
//
// Que custodia este archivo, que son tres cosas distintas y las tres se pueden romper solas:
//
//   1. LA DEMORA. Dos segundos es el numero que hace que esto no moleste. Si alguien lo baja a 200ms
//      "para que responda mejor", el popover empieza a saltar mientras uno recorre la pantalla y se
//      vuelve exactamente lo que Lucas queria evitar. Por eso se afirma que ANTES de los 2 segundos
//      NO se ve, que es la mitad que se rompe sin que nadie se de cuenta.
//
//   2. LA BUSQUEDA POR PREFIJO NO SE PASA DE LARGO. El diccionario acepta claves con comodin
//      (`pago-monto-*`), y una clave EXACTA no tiene que matchear un testid que la contenga:
//      `buscador-general` esta documentado y `buscador-general-lupa` no, asi que la lupa tiene que
//      quedarse sin popover. Es la misma clase de error que el incidente de prefijos de testid del
//      19/8/2026, que ya tiene su propio checker.
//
//   3. QUE EL DICCIONARIO SIGA ENCHUFADO. `DescripcionDeControl.vue` esta montado una sola vez en
//      App.vue y escucha por delegacion; si alguien lo saca de ahi, nada falla ni avisa: las
//      descripciones simplemente dejan de aparecer en todo el sistema.
//
// 🔴 Este spec NO verifica el CONTENIDO de las descripciones --si lo que dicen es cierto--. Eso lo
// verifican los circuitos, que son los que miden por diferencia. Aca solo se comprueba el mecanismo.
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { aislar_broadcasts } = require('../helpers/entorno')

/** Listado de articulos: tiene el buscador general y el boton de seleccion, los dos documentados. */
const RUTA = '/listado-de-articulos'

/** Un INPUT documentado. Lucas pidio explicitamente que los inputs tambien tengan descripcion. */
const CONTROL_DOCUMENTADO = 'buscador-general'

/**
 * La lupa del mismo buscador: su testid EMPIEZA con el del control documentado, pero no tiene
 * entrada propia. Sirve de caso negativo y, de paso, prueba que una clave exacta no matchee por
 * prefijo.
 */
const CONTROL_SIN_DOCUMENTAR = 'buscador-general-lupa'

/** El popover que dibuja DescripcionDeControl.vue. */
const POPOVER = '.descripcion-de-control-popover'

/**
 * Pagina compartida por los tests. Serial y una sola pagina, por lo mismo que el resto del harness:
 * el arranque de la SPA contra `php artisan serve` se paga una vez, no una por test.
 *
 * @type {import('@playwright/test').Page}
 */
let page = null

test.describe.configure({ mode: 'serial' })

test.describe('Descripciones de controles', () => {
	test.setTimeout(300000)

	test.beforeAll(async ({ browser }, testInfo) => {
		testInfo.setTimeout(420000)

		page = await browser.newPage()
		page.setDefaultTimeout(180000)
		await aislar_broadcasts(page)

		await page.goto('/login')

		const hay_login = await page.locator('[data-testid="login-doc-number"]').isVisible().catch(() => false)
		if (hay_login) {
			await page.locator('[data-testid="login-doc-number"]').fill(process.env.E2E_EMAIL || '')
				.then(() => page.locator('[data-testid="login-password"]').fill(process.env.E2E_PASSWORD || ''))
				.then(() => page.locator('[data-testid="login-submit"]').click())
				.catch(() => null)
		}
		await page.waitForURL(url => !/\/login/.test(url.toString()), { timeout: 240000 })

		await esperar_recursos_descargados(page, { abrir_panel: false })

		await page.evaluate((ruta) => {
			const app = document.querySelector('#app')
			if (app && app.__vue__ && app.__vue__.$router) {
				app.__vue__.$router.push(ruta).catch(() => {})
			}
		}, RUTA)

		await page.locator('[data-testid="' + CONTROL_DOCUMENTADO + '"]').waitFor({ state: 'visible', timeout: 120000 })
	})

	test.afterAll(async () => {
		if (page) {
			await page.close()
		}
	})

	test('antes de los 2 segundos no aparece nada', async () => {
		// Se apoya el mouse y se espera MENOS que la demora. Esta es la mitad de la prueba que se
		// rompe en silencio si alguien acorta el tiempo: el popover apareceria igual, solo que antes.
		await page.hover('[data-testid="' + CONTROL_DOCUMENTADO + '"]')
		await page.waitForTimeout(900)

		await expect(page.locator(POPOVER)).toHaveCount(0)

		// Se saca el mouse para no arrastrar el hover al test siguiente.
		await page.mouse.move(5, 5)
		await page.waitForTimeout(400)
	})

	test('a los 2 segundos aparece, con el titulo y el detalle de la descripcion', async () => {
		await page.hover('[data-testid="' + CONTROL_DOCUMENTADO + '"]')

		const popover = page.locator(POPOVER)
		await expect(popover).toBeVisible({ timeout: 10000 })

		// El titulo sale del diccionario (src/descripciones/listado.js), no de la plantilla.
		await expect(popover).toContainText('Buscador general')

		// Y el cuerpo trae lo que el control hace. Se afirma un fragmento, no el texto entero: el
		// texto se puede reescribir --es para un operador-- sin que el mecanismo cambie.
		await expect(popover).toContainText('Busca en todo el sistema')
	})

	test('al alejar el mouse se cierra', async () => {
		await page.mouse.move(5, 5)

		// No cierra al instante: hay un margen de gracia de 250ms para poder entrar al popover a
		// leerlo. Por eso se espera a que desaparezca en vez de afirmar sobre el estado inmediato.
		await expect(page.locator(POPOVER)).toHaveCount(0, { timeout: 10000 })
	})

	test('un control sin descripcion no abre nada, aunque su testid empiece igual que uno documentado', async () => {
		await page.hover('[data-testid="' + CONTROL_SIN_DOCUMENTAR + '"]')

		// Se espera MAS que la demora: si fuera a aparecer, ya habria aparecido.
		await page.waitForTimeout(3000)

		await expect(page.locator(POPOVER)).toHaveCount(0)

		await page.mouse.move(5, 5)
	})
})
