// Paso 3 del pipeline de familia B (produccion_videos.md S7): captura con los beats dimensionados
// a la duracion REAL que devolvio ElevenLabs, no a tiempos inventados.
//
// Las duraciones salen de salida-audio/duraciones.json (medidas con ffprobe sobre los mp3 del
// paso 2). Cada beat dura exactamente lo que dura su narracion, asi el merge de ffmpeg es un
// pegado directo sin estirar ni recortar nada.
//
// PRUEBA DE CALIDAD: deviceScaleFactor 2. El viewport sigue siendo 1920x1080 CSS, pero el buffer
// interno se renderiza a 3840x2160 y baja a 1080p -- supersampling. recordVideo sigue sin control
// de bitrate/FPS (VP8 fijo, techo documentado en S7), pero el texto de una tabla densa de ERP
// tiene que salir mas limpio que en la corrida anterior.
//
// La preparacion (login, navegar al listado, dejar el margen vacio) corre en un contexto SIN
// video, para que el material crudo arranque directo en el beat 1.
//
// Credenciales: SIEMPRE de variables de entorno. Ver grabar-demo-precio.js para el detalle del
// login maestro y de por que esta build vieja no tiene data-testid.

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'https://demo.comerciocity.com'
const OUT_DIR = path.join(__dirname, 'salida-demo-timeada')
const AUTH_FILE = path.join(__dirname, 'auth-state-demo.json')
const DURACIONES = path.join(__dirname, 'salida-audio', 'duraciones.json')

const RESOLUCION = { width: 1920, height: 1080 }
const ESCALA = 2

async function resaltar(locator) {
	await locator.first().evaluate((el) => {
		el.style.outline = '4px solid #ff5722'
		el.style.outlineOffset = '2px'
		el.style.transition = 'outline-color 0.3s'
	})
}

async function quitar_resaltes(page) {
	await page.evaluate(() => {
		document.querySelectorAll('[style*="outline"]').forEach((el) => {
			el.style.outline = ''
			el.style.outlineOffset = ''
		})
	})
}

async function ir_al_listado(page) {
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
}

async function abrir_articulo_en_precio(page) {
	const fila = page.locator('tr', { hasText: 'Bisagra' }).first()
	await fila.scrollIntoViewIfNeeded()
	await fila.locator('td', { hasText: 'Bisagra' }).click()
	await page.waitForSelector('.modal.fade.show:has-text("Actualizar articulo")', { timeout: 10000 })
	const modal = page.locator('.modal.fade.show', { hasText: 'Actualizar articulo' })
	await modal.getByText('Precio', { exact: true }).click()
	await page.waitForTimeout(600)
	return modal
}

/**
 * Deja el articulo con el margen vacio, que es el estado que el guion necesita para arrancar
 * (el beat 4 tipea el margen, y el beat 6 muestra Precio manual habilitandose al vaciarlo).
 * Corre en su propio contexto, sin video.
 */
async function preparar_articulo() {
	const browser = await chromium.launch()
	const context = await browser.newContext({ storageState: AUTH_FILE, viewport: RESOLUCION })
	const page = await context.newPage()

	await ir_al_listado(page)
	const modal = await abrir_articulo_en_precio(page)
	const margen = modal.locator('input[placeholder="Margen de ganancia"]')
	const valor = await margen.inputValue()
	if (valor.trim() !== '') {
		console.log(`Preparacion: el margen tenia "${valor}", lo vacio y guardo.`)
		await margen.fill('')
		await page.waitForTimeout(500)
		await modal.locator('[dusk="btn_guardar_article"]').click()
		await page.waitForSelector('.modal.fade.show:has-text("Actualizar articulo")', { state: 'detached', timeout: 10000 })
	} else {
		console.log('Preparacion: el margen ya estaba vacio.')
	}

	await context.close()
	await browser.close()
}

async function main() {
	fs.mkdirSync(OUT_DIR, { recursive: true })
	if (!fs.existsSync(AUTH_FILE)) throw new Error(`Falta ${AUTH_FILE}. Corre primero grabar-demo-precio.js.`)
	if (!fs.existsSync(DURACIONES)) throw new Error(`Falta ${DURACIONES}. Corre primero medir-duraciones.`)

	const dur = JSON.parse(fs.readFileSync(DURACIONES, 'utf8'))
	const seg = (n) => dur.find((d) => d.beat === n).segundos
	console.log('Duraciones objetivo por beat (s):', dur.map((d) => `${d.beat}=${d.segundos.toFixed(2)}`).join(' '))

	await preparar_articulo()

	const browser = await chromium.launch()
	const context = await browser.newContext({
		storageState: AUTH_FILE,
		recordVideo: { dir: OUT_DIR, size: RESOLUCION },
		viewport: RESOLUCION,
		deviceScaleFactor: ESCALA,
	})
	const page = await context.newPage()
	global.__page = page

	await ir_al_listado(page)

	// A partir de aca corre el material que se usa. t0 marca el frame 0 del beat 1: ffmpeg
	// despues recorta todo lo anterior usando recorte_desde_ms.
	const t_arranque = Date.now()
	const beats = []
	let acumulado = 0

	/** Cierra el beat n esperando lo que falte para completar su duracion de narracion. */
	async function cerrar_beat(n) {
		acumulado += seg(n) * 1000
		const falta = acumulado - (Date.now() - t_arranque)
		if (falta > 0) {
			await page.waitForTimeout(falta)
		} else {
			console.log(`⚠ El beat ${n} tardo ${Math.round(-falta)}ms MAS que su narracion.`)
		}
		beats.push({ beat: n, fin_ms: Date.now() - t_arranque, objetivo_ms: Math.round(acumulado) })
	}

	// --- Beat 1: el listado, y se abre el articulo ---
	const fila = page.locator('tr', { hasText: 'Bisagra' }).first()
	await fila.scrollIntoViewIfNeeded()
	await resaltar(fila)
	await page.waitForTimeout(1200)
	await fila.locator('td', { hasText: 'Bisagra' }).click()
	await page.waitForSelector('.modal.fade.show:has-text("Actualizar articulo")', { timeout: 10000 })
	const modal = page.locator('.modal.fade.show', { hasText: 'Actualizar articulo' })
	await page.waitForTimeout(600)
	await cerrar_beat(1)

	// --- Beat 2: seccion Precio, el campo Costo ---
	await modal.getByText('Precio', { exact: true }).click()
	await page.waitForTimeout(600)
	const costo = modal.locator('#article-cost')
	await costo.scrollIntoViewIfNeeded()
	await resaltar(costo)
	await cerrar_beat(2)

	// --- Beat 3: Aplicar IVA (no se toca) y el campo IVA en 21 ---
	await quitar_resaltes(page)
	await resaltar(modal.locator('#article-iva_id'))
	await page.waitForTimeout(900)
	await resaltar(modal.locator('label:has-text("APLICAR IVA"), .custom-switch').first())
	await cerrar_beat(3)

	// --- Beat 4: margen 40% -> el precio final se recalcula solo ---
	await quitar_resaltes(page)
	const margen = modal.locator('input[placeholder="Margen de ganancia"]')
	await margen.scrollIntoViewIfNeeded()
	await resaltar(margen)
	await margen.click()
	await margen.type('40', { delay: 140 })
	// Pausa antes de llevar la atencion al precio final: el recalculo es instantaneo y sin esta
	// pausa el cambio pasa antes de que la narracion lo nombre (riesgo 1 del guion).
	await page.waitForTimeout(900)
	await quitar_resaltes(page)
	await resaltar(page.locator('.modal.fade.show').getByText('$', { exact: false }).last())
	await cerrar_beat(4)

	// --- Beat 5: el boton verde abre el calculo completo ---
	await quitar_resaltes(page)
	const boton_calculo = modal.locator('button:has-text("?")').first()
	await resaltar(boton_calculo)
	await page.waitForTimeout(700)
	await boton_calculo.click()
	await page.waitForTimeout(1200)
	await cerrar_beat(5)

	// --- Beat 6: cerrar el calculo y mostrar Precio manual deshabilitado ---
	// 🔴 Diferencia con refractor: alla el calculo es un POPOVER y se cierra clickeando afuera.
	// En esta build de demo es un b-modal APILADO (#final-price-description) que intercepta los
	// clicks -- clickear afuera no lo cierra y el click nunca llega al campo de abajo. Se cierra
	// con su propio boton .close.
	await page.locator('#final-price-description___BV_modal_outer_ button.close').click()
	await page.waitForSelector('#final-price-description___BV_modal_outer_ .modal.show', { state: 'detached', timeout: 8000 })
	await page.waitForTimeout(600)
	await quitar_resaltes(page)
	const precio_manual = modal.locator('input[placeholder="Precio manual"]')
	await precio_manual.scrollIntoViewIfNeeded()
	// El estado deshabilitado es gris sobre gris: resalte mas fuerte que el resto (riesgo 4).
	await precio_manual.first().evaluate((el) => {
		el.style.outline = '5px solid #e53935'
		el.style.outlineOffset = '3px'
		el.style.background = '#ffebee'
	})
	await cerrar_beat(6)

	await context.close()
	await browser.close()

	const salida = {
		recorte_desde_ms: 0,
		escala_de_render: ESCALA,
		resolucion: RESOLUCION,
		beats,
	}
	fs.writeFileSync(path.join(OUT_DIR, 'beats.json'), JSON.stringify(salida, null, 2))
	console.log('\nBeats (fin real vs objetivo, en ms):')
	for (const b of beats) console.log(`  beat ${b.beat}: ${b.fin_ms} / ${b.objetivo_ms}`)
	console.log('\nVideo en', OUT_DIR)
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
