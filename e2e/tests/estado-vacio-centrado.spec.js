// Estado vacío de las tablas del display: tiene que verse SIEMPRE, esté donde esté el scroll
// horizontal (misión 37).
//
// El defecto que estos tests protegen no es estético: el mensaje "No hay ..." vive en un <td> con
// colspan completo, o sea centrado sobre el ancho REAL de la tabla. En un módulo con muchas columnas
// —Presupuestos mide ~3000px— el mensaje quedaba dibujado fuera de lo visible: el usuario veía una
// tabla en blanco sin ninguna explicación y solo lo encontraba si se le ocurría scrollear de costado.
//
// Por eso la aserción es "está dentro del viewport" y no "existe en el DOM": existir en el DOM es
// justo lo que ya pasaba cuando el defecto estaba presente.
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { aislar_broadcasts } = require('../helpers/entorno')

/**
 * Módulo que queda vacío con el fixture del harness y que tiene scroll horizontal de sobra.
 * Ventas no sirve para esto: el fixture le siembra 57 ventas.
 */
/*
 * 🔴 El estado vacio se PROVOCA, no se busca.
 *
 * Hasta el 1/9/2026 este archivo entraba a un modulo que "estaba vacio" --`/presupuestos`-- y
 * asumia que iba a seguir estandolo. Dejo de estarlo en cuanto `circuito-presupuesto.spec.js`
 * empezo a cargar presupuestos, y el rojo no habla de datos: es un timeout de 240 s esperando
 * `.display-empty-state`, que manda a pensar que la SPA no arranco. Buscar otro modulo vacio solo
 * corre el problema unos meses.
 *
 * Lo estable es entrar al listado de articulos --que tiene tabla ancha, que es lo que este archivo
 * mide-- y buscar algo que no existe. El resultado vacio es un hecho de la busqueda, no del estado
 * de la base.
 */
const RUTA_VACIA = '/listado-de-articulos'

/** Termino de busqueda que no puede matchear nada. */
const BUSQUEDA_SIN_RESULTADOS = 'zzz-no-existe-este-articulo-zzz'

/**
 * Página compartida por los tres tests.
 *
 * Serial y con UNA sola página a propósito: el arranque de la SPA descarga ~73 recursos contra una
 * API servida por `php artisan serve`, que atiende un request por vez. Con una página por test ese
 * arranque se paga tres veces y la corrida muere por timeout sin que haya nada roto — medido el
 * 12/8/2026: 11 minutos para cuatro tests, dos de ellos muertos esperando el login.
 *
 * @type {import('@playwright/test').Page}
 */
let page = null

test.describe.configure({ mode: 'serial' })

test.describe('Estado vacío de las tablas', () => {
	test.setTimeout(300000)

	test.beforeAll(async ({ browser }, testInfo) => {
		// El setTimeout de arriba NO cubre los hooks: beforeAll tiene su propio presupuesto y se queda
		// con el del config (2 minutos), que es menos de lo que tarda el arranque de la SPA en un slot.
		testInfo.setTimeout(420000)

		page = await browser.newPage()
		page.setDefaultTimeout(180000)
		// Este spec arma su propia pagina, asi que el fixture de e2e/fixtures.js no la toca: el
		// aislamiento de broadcasts hay que pedirlo a mano y antes de navegar.
		await aislar_broadcasts(page)

		await page.goto('/login')

		// Loguea si hace falta. El .catch está porque el formulario puede desaparecer en el medio: si
		// el storageState ya traía sesión, la app redirige sola mientras se completan los campos y el
		// click queda sin destino. Eso no es un fallo — lo que importa es la espera de abajo.
		const hay_login = await page.locator('[data-testid="login-doc-number"]').isVisible().catch(() => false)
		if (hay_login) {
			await page.locator('[data-testid="login-doc-number"]').fill(process.env.E2E_EMAIL || '')
				.then(() => page.locator('[data-testid="login-password"]').fill(process.env.E2E_PASSWORD || ''))
				.then(() => page.locator('[data-testid="login-submit"]').click())
				.catch(() => null)
		}
		await page.waitForURL(url => !/\/login/.test(url.toString()), { timeout: 240000 })

		// Entrar no es llegar a una URL: recien cuando terminan de bajar los catalogos del arranque
		// las tablas saben con que columnas se arman, que es justo lo que este spec mide.
		await esperar_recursos_descargados(page, { abrir_panel: false })

		// Navegación por el router: un goto() recarga la SPA, y con eso se pierde la sesión (vive en
		// memoria) y se vuelve a pagar el arranque entero.
		await page.evaluate((ruta) => {
			const app = document.querySelector('#app')
			if (app && app.__vue__ && app.__vue__.$router) {
				app.__vue__.$router.push(ruta).catch(() => {})
			}
		}, RUTA_VACIA)

		// Se provoca el vacio: tecleo real (un `fill()` no lo registra el componente) y la LUPA, que
		// es lo que dispara la busqueda. Ver `helpers/vender.js` para el detalle de las dos trampas.
		const buscador = page.locator('[data-testid="buscador-general"]')
		await buscador.waitFor({ state: 'visible', timeout: 120000 })
		await buscador.click()
		await buscador.fill('')
		await buscador.pressSequentially(BUSQUEDA_SIN_RESULTADOS, { delay: 20 })
		await page.locator('[data-testid="buscador-general-lupa"]').click()

		await page.waitForSelector('.display-empty-state', { timeout: 240000 })
		await page.waitForTimeout(1500)
	})

	test.afterAll(async () => {
		if (!page) {
			return
		}

		// 🔴 Se limpia la busqueda antes de cerrar. El listado la RECUERDA --no vive en la pagina,
		//    la restaura el sistema al entrar-- y sobrevive a la corrida: sin esto, el proximo spec
		//    que abra el listado de articulos se lo encuentra vacio y falla diciendo que no hay
		//    filas. Le paso a circuito-listado el 1/9/2026, y es la misma regla que ya estaba
		//    escrita en el README: el que ensucia limpia.
		try {
			const reiniciar = page.locator('[data-testid="btn-reiniciar-filtros"]')

			if (await reiniciar.count() > 0) {
				await reiniciar.click()
			}
		} catch (error) {
			console.log('[estado-vacio] no se pudo limpiar la busqueda del listado: ' + error.message)
		}

		await page.close()
	})

	/**
	 * Deja el scroll horizontal de la tabla en la posición pedida.
	 *
	 * @param {string} posicion 'izq' | 'medio' | 'der'
	 * @returns {Promise<void>}
	 */
	function scrollear(posicion) {
		return page.evaluate((pos) => {
			const cont = document.querySelector('.cont-table')
			if (!cont) {
				return
			}
			if (pos === 'izq') {
				cont.scrollLeft = 0
			} else if (pos === 'der') {
				cont.scrollLeft = cont.scrollWidth
			} else {
				cont.scrollLeft = Math.round(cont.scrollWidth / 2)
			}
		}, posicion).then(() => page.waitForTimeout(500))
	}

	test('se ve dentro de la pantalla en los dos extremos del scroll y en el medio', async () => {
		await page.setViewportSize({ width: 1440, height: 900 })
		const empty_state = page.locator('.display-empty-state').first()
		await expect(empty_state).toBeVisible()

		// Sin scroll horizontal el test no probaría nada: se declara como precondición.
		const hay_scroll = await page.evaluate(() => {
			const cont = document.querySelector('.cont-table')
			return cont.scrollWidth > cont.clientWidth + 1
		})
		expect(hay_scroll, 'la tabla tiene que tener scroll horizontal para que este test signifique algo').toBe(true)

		// Extremo izquierdo: donde arranca la tabla, y donde el mensaje se veía incluso con el defecto.
		await scrollear('izq')
		await expect(empty_state).toBeInViewport()

		// En el medio y en el extremo derecho es donde el defecto se veía: el mensaje quedaba dibujado
		// a mitad del ancho real de la tabla, o sea fuera de la pantalla.
		await scrollear('medio')
		await expect(empty_state).toBeInViewport()

		await scrollear('der')
		await expect(empty_state).toBeInViewport()
	})

	test('en teléfono también se ve en los dos extremos del scroll', async () => {
		// En 375px de ancho TODA tabla tiene scroll horizontal, así que es el ancho donde el defecto
		// estaba siempre presente.
		await page.setViewportSize({ width: 375, height: 812 })
		await page.waitForTimeout(1000)

		const empty_state = page.locator('.display-empty-state').first()
		await expect(empty_state).toBeVisible()

		await scrollear('izq')
		await expect(empty_state).toBeInViewport()

		await scrollear('der')
		await expect(empty_state).toBeInViewport()
	})

	test('el fondo de la fila vacía cubre todo el ancho real de la tabla', async () => {
		// El envoltorio del mensaje es sticky, pero la celda que lo contiene NO: si alguien moviera el
		// sticky al <td>, el fondo se desplazaría con el mensaje y al scrollear quedaría un tramo
		// transparente al costado. Esto lo mide comparando el ancho del td contra el de la tabla.
		await page.setViewportSize({ width: 1440, height: 900 })
		await page.waitForTimeout(1000)

		const medidas = await page.locator('tr.empty-state-row td').first().evaluate(td => {
			const tabla = td.closest('table')
			return {
				ancho_celda: td.getBoundingClientRect().width,
				ancho_tabla: tabla.getBoundingClientRect().width,
				radio_abajo_izq: getComputedStyle(td).borderBottomLeftRadius,
			}
		})

		// Con colspan completo, la celda mide casi lo mismo que la tabla (la diferencia son los bordes).
		expect(Math.abs(medidas.ancho_celda - medidas.ancho_tabla)).toBeLessThanOrEqual(4)

		// Y las esquinas inferiores redondeadas siguen aplicando: el overflow: visible que necesita el
		// sticky no se las llevó puestas.
		expect(medidas.radio_abajo_izq).not.toBe('0px')
	})
})
