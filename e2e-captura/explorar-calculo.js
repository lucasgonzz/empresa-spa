// Exploracion puntual: como esta armado y como se cierra el modal "Calculo del precio" en la
// build vieja de demo (en refractor era un popover; aca es un b-modal apilado).

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'https://demo.comerciocity.com'
const OUT_DIR = path.join(__dirname, 'salida-exploracion')
const AUTH_FILE = path.join(__dirname, 'auth-state-demo.json')

async function main() {
	fs.mkdirSync(OUT_DIR, { recursive: true })
	const browser = await chromium.launch()
	const context = await browser.newContext({ storageState: AUTH_FILE, viewport: { width: 1920, height: 1080 } })
	const page = await context.newPage()

	await page.goto(`${BASE_URL}/reportes/generales`)
	await page.waitForTimeout(1000)
	await page.locator('.route', { hasText: 'Listado' }).first().click()
	await page.waitForURL((url) => url.pathname.includes('listado-de-articulos'), { timeout: 15000 })
	await page.waitForFunction(
		() => document.querySelector('.recursos-panel__subtitulo')?.textContent.includes('Todo listo'),
		undefined,
		{ timeout: 60000 }
	)
	await page.waitForTimeout(800)

	const fila = page.locator('tr', { hasText: 'Bisagra' }).first()
	await fila.locator('td', { hasText: 'Bisagra' }).click()
	await page.waitForSelector('.modal.fade.show:has-text("Actualizar articulo")', { timeout: 10000 })
	const modal = page.locator('.modal.fade.show', { hasText: 'Actualizar articulo' })
	await modal.getByText('Precio', { exact: true }).click()
	await page.waitForTimeout(600)

	// Cargar margen para que el precio final tenga desglose interesante.
	const margen = modal.locator('input[placeholder="Margen de ganancia"]')
	await margen.click()
	await margen.type('40', { delay: 60 })
	await page.waitForTimeout(800)

	await modal.locator('button:has-text("?")').first().click()
	await page.waitForTimeout(1500)
	await page.screenshot({ path: path.join(OUT_DIR, 'calculo-abierto.png') })

	const calculo = page.locator('#final-price-description___BV_modal_outer_')
	const html = await calculo.evaluate((el) => el.outerHTML).catch(() => 'NO ENCONTRADO')
	fs.writeFileSync(path.join(OUT_DIR, 'calculo.html'), html)
	console.log('HTML del calculo volcado, largo:', html.length)

	// Que botones tiene adentro.
	const botones = await page
		.locator('#final-price-description___BV_modal_outer_ button')
		.evaluateAll((els) => els.map((el) => ({ clase: el.className, texto: el.textContent.trim().slice(0, 40), aria: el.getAttribute('aria-label') })))
	console.log('Botones dentro del calculo:', JSON.stringify(botones, null, 2))

	// Cuantos modales .show hay apilados.
	const cuantos = await page.locator('.modal.show').count()
	console.log('Modales .show apilados:', cuantos)

	await context.close()
	await browser.close()
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
