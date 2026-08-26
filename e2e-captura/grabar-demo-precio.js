// Prueba de calidad de video contra demo.comerciocity.com (NO el guion final del tutorial,
// eso sigue en grabar-precio.js para cuando Lucas actualice la demo a la version nueva).
//
// Flujo minimo pedido: listado -> abrir un articulo -> cambiar el margen de ganancia en la tab
// Precio -> Guardar y cerrar. El objetivo es solo ver como queda el video, no seguir el guion
// completo de 6 beats.
//
// demo.comerciocity.com corre una build vieja (sin data-testid, "version de devlog" segun
// Lucas): los selectores de abajo usan id/dusk/texto, NO data-testid como el resto de la familia.
// Confirmado a mano con explorar-demo.js antes de escribir esto.
//
// Credenciales: SIEMPRE desde variables de entorno, nunca hardcodeadas (mismo patron que
// e2e/auth.setup.js). EMPRESA_DEMO_DOC_NUMBER / EMPRESA_DEMO_PASSWORD son de un LOGIN MAESTRO
// (soporte ComercioCity), no de un usuario normal del cliente demo -- por eso aparece el banner
// "Login maestro detectado" y hay que navegar al listado por el menu (la URL directa
// /listado-de-articulos rebota a /reportes/generales bajo esta cuenta).

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'https://demo.comerciocity.com'
const OUT_DIR = path.join(__dirname, 'salida-demo')
const AUTH_FILE = path.join(__dirname, 'auth-state-demo.json')
const RESOLUCION = { width: 1920, height: 1080 }

async function resaltar(locator) {
	await locator.first().evaluate((el) => {
		el.style.outline = '4px solid #ff5722'
		el.style.outlineOffset = '2px'
		el.style.transition = 'outline-color 0.3s'
	})
}

async function asegurar_sesion() {
	if (fs.existsSync(AUTH_FILE)) return

	const doc_number = process.env.EMPRESA_DEMO_DOC_NUMBER
	const password = process.env.EMPRESA_DEMO_PASSWORD
	if (!doc_number || !password) {
		throw new Error('Faltan EMPRESA_DEMO_DOC_NUMBER y/o EMPRESA_DEMO_PASSWORD en el entorno.')
	}

	const browser = await chromium.launch()
	const context = await browser.newContext()
	const page = await context.newPage()
	await page.goto(`${BASE_URL}/login`)
	await page.locator('#doc_number').fill(doc_number)
	await page.locator('#password').fill(password)
	await page.locator('button[name="login"]').click()
	await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 })
	await page.waitForTimeout(1500)
	await context.storageState({ path: AUTH_FILE })
	await context.close()
	await browser.close()
	console.log('Sesion (demo) guardada en', AUTH_FILE)
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

	// --- Beat 1: entrar y navegar al listado por el menu (la URL directa rebota bajo login maestro) ---
	marcar(1)
	await page.goto(`${BASE_URL}/reportes/generales`)
	await page.waitForTimeout(1000)
	await page.locator('.route', { hasText: 'Listado' }).first().click()
	await page.waitForURL((url) => url.pathname.includes('listado-de-articulos'), { timeout: 15000 })

	// El panel de recursos (viejo, sin data-testid) termina en el texto "Todo listo".
	await page.waitForFunction(
		() => document.querySelector('.recursos-panel__subtitulo')?.textContent.includes('Todo listo'),
		undefined,
		{ timeout: 60000 }
	)
	await page.waitForTimeout(800)

	// --- Beat 2: abrir el articulo (fila "Bisagra", clic en la celda de nombre) ---
	marcar(2)
	const fila = page.locator('tr', { hasText: 'Bisagra' }).first()
	await fila.scrollIntoViewIfNeeded()
	await resaltar(fila)
	await page.waitForTimeout(600)
	await fila.locator('td', { hasText: 'Bisagra' }).click()
	await page.waitForSelector('.modal.fade.show:has-text("Actualizar articulo")', { timeout: 10000 })
	const modal = page.locator('.modal.fade.show', { hasText: 'Actualizar articulo' })
	await page.waitForTimeout(800)

	// --- Beat 3: ir a la tab Precio, resaltar el costo ---
	marcar(3)
	await modal.getByText('Precio', { exact: true }).click()
	await page.waitForTimeout(600)
	const costo = modal.locator('#article-cost')
	await resaltar(costo)
	await page.waitForTimeout(1200)

	// --- Beat 4: cargar margen de ganancia -> precio final se recalcula solo ---
	marcar(4)
	const margen = modal.locator('input[placeholder="Margen de ganancia"]')
	await margen.scrollIntoViewIfNeeded()
	await resaltar(margen)
	await margen.click()
	await margen.type('40', { delay: 90 })
	await page.waitForTimeout(1800)

	// --- Beat 5: guardar y cerrar ---
	marcar(5)
	const guardar = modal.locator('[dusk="btn_guardar_article"]')
	await resaltar(guardar)
	await page.waitForTimeout(800)
	await guardar.click()
	await page.waitForSelector('.modal.fade.show:has-text("Actualizar articulo")', { state: 'detached', timeout: 10000 })
	await page.waitForTimeout(1000)

	await context.close()
	await browser.close()

	fs.writeFileSync(path.join(OUT_DIR, 'beats.json'), JSON.stringify(beats, null, 2))
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
