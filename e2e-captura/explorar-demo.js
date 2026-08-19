// Exploracion puntual, NO parte de la captura final: entra a demo.comerciocity.com, abre el
// modal de "Crear articulo" y vuelca su HTML + una captura a disco para decidir selectores antes
// de tocar grabar-precio.js. Se borra o se ignora despues -- no es parte del guion.
//
// Credenciales: SIEMPRE desde variables de entorno, nunca hardcodeadas (mismo patron que
// e2e/auth.setup.js). Si faltan, falla explicito.

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'https://demo.comerciocity.com'
const OUT_DIR = path.join(__dirname, 'salida-exploracion')

async function main() {
	const doc_number = process.env.EMPRESA_DEMO_DOC_NUMBER
	const password = process.env.EMPRESA_DEMO_PASSWORD
	if (!doc_number || !password) {
		throw new Error('Faltan EMPRESA_DEMO_DOC_NUMBER y/o EMPRESA_DEMO_PASSWORD en el entorno.')
	}

	fs.mkdirSync(OUT_DIR, { recursive: true })

	const browser = await chromium.launch()
	const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
	const page = await context.newPage()
	global.__page = page

	await page.goto(`${BASE_URL}/login`)
	// La build de demo NO tiene data-testid en el login (version vieja, sin el prompt 617):
	// usa dusk="doc_number" / dusk="password" y el boton solo tiene name="login".
	await page.locator('#doc_number').fill(doc_number)
	await page.locator('#password').fill(password)
	await page.locator('button[name="login"]').click()
	await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 })
	console.log('Login OK, URL actual:', page.url())

	await page.waitForTimeout(1000)
	await page.screenshot({ path: path.join(OUT_DIR, '0-post-login.png'), fullPage: false })

	// El menu lateral es div-based (sin <a href>): se clickea por texto.
	await page.locator('.route', { hasText: 'Listado' }).first().click()
	await page.waitForTimeout(2500)
	console.log('URL tras click en Listado:', page.url())
	await page.screenshot({ path: path.join(OUT_DIR, '2-listado.png'), fullPage: false })

	// Esperar a que el panel de recursos (viejo, sin data-testid) diga "N de N listos" con N>0.
	await page.waitForFunction(
		() => {
			const el = document.querySelector('.recursos-panel__subtitulo')
			if (!el) return false
			const m = el.textContent.match(/(\d+)\s+de\s+(\d+)\s+listos/)
			return m && m[1] === m[2] && Number(m[2]) > 0
		},
		{ timeout: 60000 }
	).catch((e) => console.log('No llego a "listos" en 60s, sigo igual:', e.message))
	const estado_recursos = await page.locator('.recursos-panel__subtitulo').textContent().catch(() => 'no encontrado')
	console.log('Estado recursos:', estado_recursos)

	await page.waitForTimeout(1000)
	await page.screenshot({ path: path.join(OUT_DIR, '3-listado-recursos-listos.png'), fullPage: false })

	// Abrir la fila "Bisagra" clickeando la celda de nombre (no el boton $ / carrito).
	const fila_html = await page.locator('tr', { hasText: 'Bisagra' }).first().evaluate((el) => el.outerHTML.slice(0, 2000))
	fs.writeFileSync(path.join(OUT_DIR, 'fila-bisagra.html'), fila_html)

	await page.locator('tr', { hasText: 'Bisagra' }).first().locator('td', { hasText: 'Bisagra' }).click()
	await page.waitForTimeout(1500)
	await page.screenshot({ path: path.join(OUT_DIR, '4-modal-articulo.png'), fullPage: false })

	const modal = page.locator('.modal.fade.show, .modal.show').first()
	const modal_html = await modal.evaluate((el) => el.outerHTML)
	fs.writeFileSync(path.join(OUT_DIR, 'modal-articulo.html'), modal_html)

	await modal.getByText('Precio', { exact: true }).click()
	await page.waitForTimeout(1000)
	await page.screenshot({ path: path.join(OUT_DIR, '5-modal-precio.png'), fullPage: false })
	const modal_precio_html = await modal.evaluate((el) => el.outerHTML)
	fs.writeFileSync(path.join(OUT_DIR, 'modal-precio.html'), modal_precio_html)

	await context.close()
	await browser.close()
	console.log('Volcado en', OUT_DIR)
}

main().catch(async (err) => {
	console.error(err)
	if (global.__page) {
		try {
			fs.mkdirSync(OUT_DIR, { recursive: true })
			await global.__page.screenshot({ path: path.join(OUT_DIR, 'falla.png'), fullPage: true })
			fs.writeFileSync(path.join(OUT_DIR, 'falla.html'), await global.__page.content())
			fs.writeFileSync(path.join(OUT_DIR, 'falla-url.txt'), global.__page.url())
		} catch (e) {
			console.error('No se pudo volcar el estado de falla:', e.message)
		}
	}
	process.exit(1)
})
