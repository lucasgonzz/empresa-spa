// Prueba de medicion para decidir parametros del pipeline CDP (NO graba el tutorial).
//
// Objetivo: saber cuantos frames por segundo emite Page.screencast realmente, cuanto pesa cada
// frame y cuanto disco hace falta, ANTES de correr los 77s completos. Con deviceScaleFactor 2 los
// frames salen a 3840x2160 y a 30fps eso puede ser varios GB.
//
// Detalle clave del screencast: NO emite a intervalos fijos. Chrome manda un frame cuando hay algo
// nuevo que mostrar, asi que una pantalla quieta no genera frames. Cada frame trae su timestamp,
// que es lo que despues permite reconstruir el timing exacto en ffmpeg.

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'https://demo.comerciocity.com'
const AUTH_FILE = path.join(__dirname, 'auth-state-demo.json')
const TMP = path.join(process.env.TEMP || '/tmp', 'cdp-prueba')

async function main() {
	const escala = Number(process.argv[2] || 2)
	const calidad = Number(process.argv[3] || 90)

	fs.rmSync(TMP, { recursive: true, force: true })
	fs.mkdirSync(TMP, { recursive: true })

	const browser = await chromium.launch()
	const context = await browser.newContext({
		storageState: AUTH_FILE,
		viewport: { width: 1920, height: 1080 },
		deviceScaleFactor: escala,
	})
	const page = await context.newPage()

	// Preparacion fuera de la medicion.
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

	const cdp = await context.newCDPSession(page)

	// deviceScaleFactor de newContext NO llega al compositor del screencast: medido, los frames
	// salian a 1920x1080 igual. Forzarlo por CDP si que reescala el surface, y es la unica forma
	// de sacar 4K real manteniendo el layout de 1920 CSS (que es lo que necesita Remotion para
	// hacer zoom sin pixelar).
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: 1920,
		height: 1080,
		deviceScaleFactor: escala,
		mobile: false,
	})

	const frames = []
	let n = 0

	cdp.on('Page.screencastFrame', async (evento) => {
		// Ack primero: hasta que no se confirma, Chrome no manda el siguiente.
		try {
			await cdp.send('Page.screencastFrameAck', { sessionId: evento.sessionId })
		} catch (e) {}
		n++
		const archivo = path.join(TMP, `f-${String(n).padStart(6, '0')}.jpg`)
		fs.writeFileSync(archivo, Buffer.from(evento.data, 'base64'))
		frames.push({ n, timestamp: evento.metadata.timestamp, bytes: fs.statSync(archivo).size })
	})

	console.log(`Midiendo con deviceScaleFactor=${escala}, calidad jpeg=${calidad}...`)
	const t0 = Date.now()
	await cdp.send('Page.startScreencast', {
		format: 'jpeg',
		quality: calidad,
		maxWidth: 3840,
		maxHeight: 2160,
		everyNthFrame: 1,
	})

	// Algo con movimiento real: abrir el articulo y tipear.
	const fila = page.locator('tr', { hasText: 'Bisagra' }).first()
	await fila.locator('td', { hasText: 'Bisagra' }).click()
	await page.waitForSelector('.modal.fade.show:has-text("Actualizar articulo")', { timeout: 10000 })
	const modal = page.locator('.modal.fade.show', { hasText: 'Actualizar articulo' })
	await modal.getByText('Precio', { exact: true }).click()
	await page.waitForTimeout(800)
	const margen = modal.locator('input[placeholder="Margen de ganancia"]')
	await margen.click()
	await margen.type('40', { delay: 140 })
	await page.waitForTimeout(2000)
	// Un tramo quieto a proposito, para ver si emite frames sin cambios en pantalla.
	await page.waitForTimeout(3000)

	await cdp.send('Page.stopScreencast')
	const seg = (Date.now() - t0) / 1000
	await page.waitForTimeout(500)

	await context.close()
	await browser.close()

	const bytes = frames.reduce((a, f) => a + f.bytes, 0)
	const dims = frames.length
		? require('child_process')
				.execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path.join(TMP, 'f-000001.jpg')])
				.toString()
				.trim()
		: 'n/a'

	console.log(`\nDuracion medida:   ${seg.toFixed(1)} s`)
	console.log(`Frames emitidos:   ${frames.length}`)
	console.log(`FPS promedio:      ${(frames.length / seg).toFixed(1)}`)
	console.log(`Dimensiones frame: ${dims}`)
	console.log(`Peso promedio:     ${(bytes / frames.length / 1024).toFixed(0)} KB`)
	console.log(`Peso total:        ${(bytes / 1024 / 1024).toFixed(1)} MB`)
	console.log(`Proyeccion a 77 s: ${((bytes / seg) * 77 / 1024 / 1024 / 1024).toFixed(2)} GB`)

	// Separacion entre frames: muestra si el screencast se frena en pantallas quietas.
	if (frames.length > 1) {
		const deltas = frames.slice(1).map((f, i) => (f.timestamp - frames[i].timestamp) * 1000)
		deltas.sort((a, b) => a - b)
		const p = (q) => deltas[Math.floor(deltas.length * q)].toFixed(0)
		console.log(`\nSeparacion entre frames (ms): min=${p(0)} mediana=${p(0.5)} p90=${p(0.9)} max=${deltas[deltas.length - 1].toFixed(0)}`)
	}

	fs.rmSync(TMP, { recursive: true, force: true })
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
