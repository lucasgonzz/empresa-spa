// Captura por CDP (Page.screencast) en vez de context.recordVideo. Alternativa de mayor calidad
// al pipeline de grabar-demo-timeado.js -- mismos beats, mismo timing, distinta camara.
//
// Por que es mejor que recordVideo (medido, no supuesto):
//   - recordVideo: VP8, 25 fps FIJOS, sin control de bitrate ni calidad. Techo duro de la API.
//   - screencast:  JPEG calidad 100 por frame, ~31 fps durante el movimiento, y el encode final
//                  lo hacemos nosotros con ffmpeg eligiendo crf.
//
// Dos cosas medidas que explican las decisiones de abajo:
//
// 1. El screencast NO emite frames a intervalos fijos: Chrome manda uno cuando hay algo nuevo que
//    mostrar. En una pantalla quieta deja de emitir (medido: mediana 33ms entre frames, p90 525ms).
//    Por eso cada frame se guarda con su timestamp y el video se arma con duraciones variables,
//    que ffmpeg convierte a tasa constante al final. Sin esto, los tramos quietos se acelerarian.
//
// 2. deviceScaleFactor NO llega a las dimensiones del screencast: los frames salen a 1920x1080
//    igual (probado tambien forzando Emulation.setDeviceMetricsOverride). Pero SI afecta lo que se
//    renderiza: el peso por frame sube ~15%, o sea que hay supersampling real adentro del frame.
//    Se deja en 2 por eso. Para 4K de verdad hay que ir por page.screenshot(), que si lo respeta
//    (3840x2160 confirmado) -- por eso ademas se guarda un screenshot 4K por beat, que es el
//    material que S7 pide para los tramos estaticos con zoom en Remotion.

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')

const BASE_URL = 'https://demo.comerciocity.com'
const OUT_DIR = path.join(__dirname, 'salida-cdp')
const FRAMES_DIR = path.join(OUT_DIR, 'frames')
const FOTOS_DIR = path.join(OUT_DIR, 'fotos-4k')
const AUTH_FILE = path.join(__dirname, 'auth-state-demo.json')
const DURACIONES = path.join(__dirname, 'salida-audio', 'duraciones.json')

const VIEWPORT = { width: 1920, height: 1080 }
const ESCALA = 2
const CALIDAD = 100
const FPS_SALIDA = 30

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

async function preparar_articulo() {
	const browser = await chromium.launch()
	const context = await browser.newContext({ storageState: AUTH_FILE, viewport: VIEWPORT })
	const page = await context.newPage()
	await ir_al_listado(page)
	const fila = page.locator('tr', { hasText: 'Bisagra' }).first()
	await fila.locator('td', { hasText: 'Bisagra' }).click()
	await page.waitForSelector('.modal.fade.show:has-text("Actualizar articulo")', { timeout: 10000 })
	const modal = page.locator('.modal.fade.show', { hasText: 'Actualizar articulo' })
	await modal.getByText('Precio', { exact: true }).click()
	await page.waitForTimeout(600)
	const margen = modal.locator('input[placeholder="Margen de ganancia"]')
	const valor = await margen.inputValue()
	if (valor.trim() !== '') {
		console.log(`Preparacion: margen tenia "${valor}", lo vacio y guardo.`)
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
	fs.rmSync(OUT_DIR, { recursive: true, force: true })
	fs.mkdirSync(FRAMES_DIR, { recursive: true })
	fs.mkdirSync(FOTOS_DIR, { recursive: true })

	const dur = JSON.parse(fs.readFileSync(DURACIONES, 'utf8'))
	const seg = (n) => dur.find((d) => d.beat === n).segundos

	await preparar_articulo()

	const browser = await chromium.launch()
	const context = await browser.newContext({
		storageState: AUTH_FILE,
		viewport: VIEWPORT,
		deviceScaleFactor: ESCALA,
	})
	const page = await context.newPage()
	global.__page = page

	await ir_al_listado(page)

	// El screencast arranca DESPUES de toda la preparacion, asi el frame 1 es el frame 1 del
	// beat 1 y no hay que recortar nada despues (a diferencia del pipeline de recordVideo, que
	// graba desde que se crea el contexto y obliga a calcular un offset).
	const cdp = await context.newCDPSession(page)
	const frames = []
	let n = 0
	// t_arranque se define despues de startScreencast, asi que los primeros frames pueden caer
	// antes del beat 1 (ms_local negativo). Se resuelve al armar la lista, no aca.
	let t_arranque = null
	cdp.on('Page.screencastFrame', async (evento) => {
		try {
			await cdp.send('Page.screencastFrameAck', { sessionId: evento.sessionId })
		} catch (e) {}
		n++
		const archivo = path.join(FRAMES_DIR, `f-${String(n).padStart(6, '0')}.jpg`)
		fs.writeFileSync(archivo, Buffer.from(evento.data, 'base64'))
		frames.push({
			archivo: path.basename(archivo),
			timestamp: evento.metadata.timestamp,
			ms_local: t_arranque === null ? null : Date.now() - t_arranque,
		})
	})

	await cdp.send('Page.startScreencast', {
		format: 'jpeg',
		quality: CALIDAD,
		maxWidth: 1920,
		maxHeight: 1080,
		everyNthFrame: 1,
	})

	t_arranque = Date.now()
	const beats = []
	let acumulado = 0

	/** Foto 4K del estado del beat: material para el zoom de Remotion (S7). */
	async function foto(n) {
		await page.screenshot({ path: path.join(FOTOS_DIR, `beat-${String(n).padStart(2, '0')}.png`) })
	}

	async function cerrar_beat(nro) {
		acumulado += seg(nro) * 1000
		const falta = acumulado - (Date.now() - t_arranque)
		if (falta > 0) await page.waitForTimeout(falta)
		else console.log(`⚠ beat ${nro} tardo ${Math.round(-falta)}ms de mas`)
		beats.push({ beat: nro, fin_ms: Date.now() - t_arranque, objetivo_ms: Math.round(acumulado) })
	}

	// --- Beat 1 ---
	const fila = page.locator('tr', { hasText: 'Bisagra' }).first()
	await fila.scrollIntoViewIfNeeded()
	await resaltar(fila)
	await page.waitForTimeout(1200)
	await fila.locator('td', { hasText: 'Bisagra' }).click()
	await page.waitForSelector('.modal.fade.show:has-text("Actualizar articulo")', { timeout: 10000 })
	const modal = page.locator('.modal.fade.show', { hasText: 'Actualizar articulo' })
	await page.waitForTimeout(600)
	await cerrar_beat(1)

	// --- Beat 2 ---
	await modal.getByText('Precio', { exact: true }).click()
	await page.waitForTimeout(600)
	const costo = modal.locator('#article-cost')
	await costo.scrollIntoViewIfNeeded()
	await resaltar(costo)
	await foto(2)
	await cerrar_beat(2)

	// --- Beat 3 ---
	await quitar_resaltes(page)
	await resaltar(modal.locator('#article-iva_id'))
	await page.waitForTimeout(900)
	await resaltar(modal.locator('label:has-text("APLICAR IVA"), .custom-switch').first())
	await foto(3)
	await cerrar_beat(3)

	// --- Beat 4 ---
	await quitar_resaltes(page)
	const margen = modal.locator('input[placeholder="Margen de ganancia"]')
	await margen.scrollIntoViewIfNeeded()
	await resaltar(margen)
	await margen.click()
	await margen.type('40', { delay: 140 })
	await page.waitForTimeout(900)
	await quitar_resaltes(page)
	await resaltar(page.locator('.modal.fade.show').getByText('$', { exact: false }).last())
	await foto(4)
	await cerrar_beat(4)

	// --- Beat 5 ---
	await quitar_resaltes(page)
	const boton_calculo = modal.locator('button:has-text("?")').first()
	await resaltar(boton_calculo)
	await page.waitForTimeout(700)
	await boton_calculo.click()
	await page.waitForTimeout(1200)
	await foto(5)
	await cerrar_beat(5)

	// --- Beat 6 ---
	await page.locator('#final-price-description___BV_modal_outer_ button.close').click()
	await page.waitForSelector('#final-price-description___BV_modal_outer_ .modal.show', { state: 'detached', timeout: 8000 })
	await page.waitForTimeout(600)
	await quitar_resaltes(page)
	const precio_manual = modal.locator('input[placeholder="Precio manual"]')
	await precio_manual.scrollIntoViewIfNeeded()
	await precio_manual.first().evaluate((el) => {
		el.style.outline = '5px solid #e53935'
		el.style.outlineOffset = '3px'
		el.style.background = '#ffebee'
	})
	await foto(6)
	await cerrar_beat(6)

	await cdp.send('Page.stopScreencast')
	await page.waitForTimeout(500)
	await context.close()
	await browser.close()

	console.log(`\nFrames capturados: ${frames.length}`)
	const total_s = frames.length ? frames[frames.length - 1].timestamp - frames[0].timestamp : 0
	console.log(`Tramo cubierto por el screencast: ${total_s.toFixed(2)}s`)
	console.log(`FPS promedio: ${(frames.length / total_s).toFixed(1)}`)

	// Lista para el demuxer concat: cada frame dura hasta el siguiente. Asi los tramos quietos
	// --donde el screencast deja de emitir-- duran lo que tienen que durar en vez de acelerarse.
	//
	// Dos anclajes que no se pueden saltear:
	//  - Los frames anteriores al beat 1 (ms_local negativo o null) se descartan, salvo el ultimo,
	//    que pasa a ser el frame de t=0.
	//  - El ultimo frame se estira hasta completar la duracion de la narracion. Sin esto el video
	//    termina cuando Chrome dejo de emitir: medido, 50.4s de 77s, porque el beat 6 es casi todo
	//    pantalla quieta.
	const total_ms = dur.reduce((a, d) => a + d.segundos, 0) * 1000
	const previos = frames.filter((f) => f.ms_local === null || f.ms_local <= 0)
	const utiles = frames.filter((f) => f.ms_local !== null && f.ms_local > 0)
	if (previos.length) utiles.unshift({ ...previos[previos.length - 1], ms_local: 0 })

	const lineas = []
	for (let i = 0; i < utiles.length; i++) {
		const fin = i < utiles.length - 1 ? utiles[i + 1].ms_local : total_ms
		const dur_frame = (fin - utiles[i].ms_local) / 1000
		if (dur_frame <= 0) continue
		lineas.push(`file '${path.join(FRAMES_DIR, utiles[i].archivo).replace(/\\/g, '/')}'`)
		lineas.push(`duration ${dur_frame.toFixed(6)}`)
	}
	lineas.push(`file '${path.join(FRAMES_DIR, utiles[utiles.length - 1].archivo).replace(/\\/g, '/')}'`)
	const lista = path.join(OUT_DIR, 'lista-frames.txt')
	fs.writeFileSync(lista, lineas.join('\n'))
	console.log(`Frames usables: ${utiles.length} (descartados ${frames.length - utiles.length} previos al beat 1)`)

	// Se guardan los timestamps de todos los frames: permite re-armar la lista y re-encodear con
	// otros parametros sin volver a grabar (una corrida contra la demo son ~2 minutos).
	fs.writeFileSync(
		path.join(OUT_DIR, 'beats.json'),
		JSON.stringify(
			{ escala: ESCALA, calidad: CALIDAD, fps_salida: FPS_SALIDA, total_ms, beats, frames },
			null,
			2
		)
	)

	console.log('\nBeats (fin real / objetivo, ms):')
	for (const b of beats) console.log(`  beat ${b.beat}: ${b.fin_ms} / ${b.objetivo_ms}`)

	// Encode a tasa constante. crf 14 = practicamente sin perdida visible sobre el JPEG de origen.
	const mudo = path.join(OUT_DIR, 'video-mudo.mp4')
	console.log('\nEncodeando a CFR', FPS_SALIDA, 'fps (crf 14)...')
	execFileSync(
		'ffmpeg',
		[
			'-v', 'error', '-y',
			'-f', 'concat', '-safe', '0', '-i', lista,
			'-vf', `fps=${FPS_SALIDA}`,
			'-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p',
			mudo,
		],
		{ stdio: 'inherit' }
	)
	console.log('Video mudo:', mudo)
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
