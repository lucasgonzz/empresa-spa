// Script standalone de captura para el tutorial "01 - Cambiar el precio de un articulo".
// NO es parte del harness e2e/ oficial (ese es para tests). Esto es una camara: graba video
// real con context.recordVideo mientras ejecuta los beats del guion contra el entorno propio
// del slot (empresa.local:8108 / :8188, base empresa_testing_s8).
//
// Prueba de principio a fin (POC): sin zoom ni cursor sintetico -- eso es trabajo de Remotion
// en la composicion final (produccion_videos.md S7). Aca solo se valida que Playwright puede
// grabar los beats con los tiempos que despues va a fijar la duracion real de Eleven Labs.
//
// Convenciones para TODO video de esta familia (ver produccion_videos.md S7, nota agregada):
// 1. Login una sola vez: se guarda storageState en AUTH_FILE y las corridas siguientes lo
//    reusan, asi que cada grabacion arranca derecho en la pantalla del tutorial.
// 2. Nunca se toca el sistema hasta que [data-testid="recursos-estado"] tenga
//    data-estado="listo" (ver src/common-vue/components/download-resources/Index.vue). Esperar
//    a que aparezca contenido en pantalla NO alcanza: el listado ya se ve con la descarga de
//    catalogos/IVAs/etc. todavia en curso, y tocar algo ahi da datos a medio cargar.

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://empresa.local:8188'
const OUT_DIR = path.join(__dirname, 'salida')
const BEATS_LOG = path.join(OUT_DIR, 'beats.json')
const AUTH_FILE = path.join(__dirname, 'auth-state.json')
// 1920x1080: el techo util real. recordVideo de Playwright no tiene control de bitrate/FPS --
// captura frames a intervalos fijos con compresion VP8 fija -- asi que subir la resolucion mas
// alla de esto no mejora nitidez, solo pesa mas. La fluidez de verdad la pone Remotion despues,
// componiendo sobre este material crudo (produccion_videos.md S7).
const RESOLUCION = { width: 1920, height: 1080 }

// Recibe un Locator de Playwright (no un selector CSS crudo) para poder usar los selectores
// extendidos (:has-text, etc.) que document.querySelector no entiende.
async function resaltar(locator) {
	await locator.first().evaluate((el) => {
		el.style.outline = '4px solid #ff5722'
		el.style.outlineOffset = '2px'
		el.style.transition = 'outline-color 0.3s'
	})
}

async function asegurar_sesion() {
	if (fs.existsSync(AUTH_FILE)) return

	const browser = await chromium.launch()
	const context = await browser.newContext()
	const page = await context.newPage()
	await page.goto(`${BASE_URL}/login`)
	await page.locator('[data-testid="login-doc-number"]').fill('1234')
	await page.locator('[data-testid="login-password"]').fill('1234')
	await page.locator('[data-testid="login-submit"]').click()
	await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 })
	await page.waitForTimeout(1500)
	await context.storageState({ path: AUTH_FILE })
	await context.close()
	await browser.close()
	console.log('Sesion guardada en', AUTH_FILE)
}

async function main() {
	fs.mkdirSync(OUT_DIR, { recursive: true })
	await asegurar_sesion()

	const browser = await chromium.launch()
	const context = await browser.newContext({
		storageState: AUTH_FILE,
		recordVideo: { dir: OUT_DIR, size: RESOLUCION },
		viewport: RESOLUCION,
	})
	const page = await context.newPage()
	global.__page = page

	const beats = []
	const t0 = Date.now()
	const marcar = (n) => beats.push({ beat: n, ms_desde_inicio: Date.now() - t0 })

	// --- Beat 1: listado-de-articulos -> abrir la ficha del articulo ---
	// Ruta real: /listado-de-articulos (NO /listado, que no mapea a nada). Confirmado a mano
	// con el MCP de Playwright antes de escribir este script.
	marcar(1)
	await page.goto(`${BASE_URL}/listado-de-articulos`)
	// La navegacion completa a veces rebota por /login?redirect=... mientras revalida la sesion
	// (visto a mano con el MCP): no importa, esperamos el contenido real, no la URL.
	// state: 'attached', no 'visible' (default) -- este div es un contenedor de datos, no se
	// pinta en pantalla, asi que "visible" nunca se cumple y el wait explota igual con los
	// recursos ya descargados.
	await page.waitForSelector('[data-testid="recursos-estado"]', { state: 'attached', timeout: 30000 })
	// El unico wait que vale: el estado de la descarga de recursos, no que aparezca contenido en
	// pantalla. El listado ya muestra filas con la descarga de catalogos/IVAs/etc. todavia en
	// curso, y tocar algo ahi trabaja con datos a medio cargar.
	await page.waitForFunction(
		() => document.querySelector('[data-testid="recursos-estado"]')?.getAttribute('data-estado') === 'listo',
		{ timeout: 90000 }
	)
	await page.waitForTimeout(500)
	// Clic nativo (no via locator de rol) porque las celdas con prop.button llevan @click.stop:
	// un click "de accesibilidad" sobre una celda equivocada no burbujea al <tr> y el modal no abre.
	await page.evaluate(() => document.querySelector('[data-testid="article-row-11"]').click())
	await page.waitForSelector('.modal.fade.show:has-text("Actualizar articulo")', { timeout: 10000 })
	// El modal abre en la tab "Datos generales": hay que ir a "Precio".
	await page.evaluate(() => document.querySelector('[data-testid="nav-item-Precio"]').click())
	await page.waitForSelector('.modal.fade.show:has-text("Costo base")', { timeout: 10000 })
	const modal = page.locator('.modal.fade.show', { hasText: 'Costo base' })
	await page.waitForTimeout(800)

	// --- Beat 2: seccion Precio, campo Costo (ya viene sembrado en 10000, se resalta) ---
	marcar(2)
	const costo = modal.locator('input[type="text"]').nth(0)
	await costo.scrollIntoViewIfNeeded()
	await resaltar(costo)
	await costo.click()
	await page.waitForTimeout(1500)

	// --- Beat 3: IVA activo (checkbox forzado, no se toca) + 21% ya seleccionado ---
	marcar(3)
	await resaltar(modal.locator('select'))
	await page.waitForTimeout(2500)

	// --- Beat 4: margen de ganancia 40% -> precio final se recalcula solo ---
	marcar(4)
	const margen = modal.locator('input[placeholder="Margen de ganancia"]')
	await margen.scrollIntoViewIfNeeded()
	await margen.click()
	await margen.type('40', { delay: 90 })
	await page.waitForTimeout(1500)
	await resaltar(modal.locator('button:has-text("?")'))
	await page.waitForTimeout(1500)

	// --- Beat 5: boton verde "?" -> abre el calculo completo del precio ---
	marcar(5)
	const boton_calculo = modal.locator('button:has-text("?")')
	await boton_calculo.click()
	await page.waitForTimeout(2000)

	// --- Beat 6: el calculo del beat 5 es un popover (no un modal apilado -- Escape o un boton
	// "cerrar" ahi se lo llevaban puesto al modal entero). Se cierra solo con un click afuera.
	// Resaltar precio manual (deshabilitado por tener margen cargado). ---
	marcar(6)
	await margen.click()
	await page.waitForTimeout(500)
	await resaltar(modal.locator('input[placeholder="Precio manual"]'))
	await page.waitForTimeout(2000)

	await context.close()
	await browser.close()

	fs.writeFileSync(BEATS_LOG, JSON.stringify(beats, null, 2))
	console.log('Beats:', beats)
	console.log('Video guardado en', OUT_DIR)
}

main().catch(async (err) => {
	console.error(err)
	if (global.__page) {
		try {
			await global.__page.screenshot({ path: path.join(OUT_DIR, 'falla.png'), fullPage: true })
		} catch (e) {}
	}
	process.exit(1)
})
