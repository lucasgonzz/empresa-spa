// Captura del clip 0.1 de la demo — "Bienvenida y mapa del sistema".
//
// Adaptado de grabar-cdp.js (piloto del 19/8, tutorial de precios). Se mantiene todo el motor:
// CDP Page.screencast, un frame por cambio con su timestamp, lista de duraciones variables y
// encode final a CFR. Lo que cambia son tres cosas, y las tres por lo que pide ESTE guion:
//
//  1. SESION DE LEAD, no storageState. El panel de la demo solo monta en una sesion de lead
//     (magic link con plan congelado) y el panel es la mitad de este clip. Ademas el magic link
//     SOLO funciona con sesion limpia: con una sesion previa entra sin panel y sin avisar. Por
//     eso el contexto se crea de cero, sin storageState.
//
//  2. CURSOR SINTETICO ANIMADO. El piloto resaltaba elementos con outline; este guion dice
//     "el puntero acompaña la voz" y "el puntero pasando por una tarjeta". En headless no hay
//     cursor renderizado, asi que se inyecta uno en el DOM que sigue los mousemove reales de
//     Playwright. El mismo movimiento dispara el :hover de verdad (el menu lateral se despliega
//     solo al pasar el mouse) y ademas se ve en la captura.
//
//  3. LA TIENDA EN UNA SEGUNDA PAGINA. El beat 3 muestra la tienda. Navegar la misma pagina
//     obligaria a recargar el sistema entero para volver, con flash blanco en el medio. En vez
//     de eso la tienda se precarga en otra pagina durante los beats 1-2 y en el beat 3 se pasa
//     el screencast a esa pagina. El sistema nunca se recarga.
//     En la captura no se ve ninguna barra del navegador —el screencast toma solo el viewport—,
//     asi que "otra pestaña" del guion se ve identico a esto.

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')

const MAGIC = process.env.DEMO_MAGIC_LINK
const API = 'https://api-demo.comerciocity.com'
const TIENDA = 'https://tienda.comerciocity.store/inicio/ultimos-ingresados'
const OUT_DIR = path.join(__dirname, 'salida-clip-0-1')
const FRAMES_DIR = path.join(OUT_DIR, 'frames')
const FOTOS_DIR = path.join(OUT_DIR, 'fotos-4k')
const DURACIONES = path.join(__dirname, 'salida-audio', 'duraciones.json')

const VIEWPORT = { width: 1920, height: 1080 }
const ESCALA = 2
const CALIDAD = 100
const FPS_SALIDA = 30

if (!MAGIC) {
	console.error('Falta DEMO_MAGIC_LINK en el entorno.')
	process.exit(1)
}

/**
 * Suelta el candado de sesion unica del sistema.
 *
 * 🔴 SIN ESTO, CADA CORRIDA DEJA LA DEMO BLOQUEADA PARA LA SIGUIENTE.
 *
 * AuthHelper::checkUserLastActivity() guarda `session_id` y `last_activity` en el usuario: si
 * llega un pedido de otra sesion, devuelve false y /api/user contesta 403 aunque el magic link
 * haya validado bien (POST /api/demo/ingreso igual da 200 ok:true — por eso el sintoma engaña).
 * El candado se libera con POST /logout (ruta de web.php, sin prefijo /api), que llama a
 * removeUserLastActivity(). Si no, hay que esperar el tiempo de inactividad del usuario
 * (USER_ACTIVITY_MINUTES, 60 min por defecto).
 *
 * Medido el 26/8/2026: tres entradas seguidas -> la primera ENTRO, las otras dos 403.
 */
async function soltar_candado(page) {
	try {
		const r = await page.evaluate(async (api) => {
			const xsrf = decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || '')
			const res = await fetch(api + '/logout', {
				method: 'POST',
				credentials: 'include',
				headers: { 'X-XSRF-TOKEN': xsrf, Accept: 'application/json' },
			})
			return res.status
		}, API)
		console.log('Candado de sesion liberado (logout ' + r + ').')
	} catch (e) {
		console.log('! No se pudo soltar el candado: ' + String(e.message).slice(0, 80))
		console.log('  La proxima corrida puede dar 403 hasta que venza la inactividad.')
	}
}

/** Cursor sintetico: sigue los mousemove reales, asi el :hover del sistema funciona igual. */
const CURSOR = () => {
	if (document.getElementById('__cursor_captura')) return
	const c = document.createElement('div')
	c.id = '__cursor_captura'
	c.style.cssText = [
		'position:fixed', 'left:-100px', 'top:-100px', 'width:28px', 'height:28px',
		'z-index:2147483647', 'pointer-events:none', 'will-change:left,top',
	].join(';')
	c.innerHTML =
		'<svg width="28" height="28" viewBox="0 0 28 28" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,.45))">' +
		'<path d="M6 3 L6 22 L11 17.5 L14.2 24.5 L17.6 23 L14.4 16.2 L21 16 Z" ' +
		'fill="#ffffff" stroke="#1a1a1a" stroke-width="1.6" stroke-linejoin="round"/></svg>'
	document.body.appendChild(c)
	document.addEventListener('mousemove', function (e) {
		c.style.left = e.clientX + 'px'
		c.style.top = e.clientY + 'px'
	}, true)
	window.__pulso = function () {
		const r = document.createElement('div')
		r.style.cssText = [
			'position:fixed', 'width:14px', 'height:14px', 'border-radius:50%',
			'border:2px solid #2979ff', 'z-index:2147483646', 'pointer-events:none',
			'left:' + (parseFloat(c.style.left || 0) + 2) + 'px',
			'top:' + (parseFloat(c.style.top || 0) + 2) + 'px',
			'transition:transform .5s ease-out, opacity .5s ease-out',
		].join(';')
		document.body.appendChild(r)
		requestAnimationFrame(function () {
			r.style.transform = 'scale(3.2)'
			r.style.opacity = '0'
		})
		setTimeout(function () { r.remove() }, 600)
	}
}

async function main() {
	fs.rmSync(OUT_DIR, { recursive: true, force: true })
	fs.mkdirSync(FRAMES_DIR, { recursive: true })
	fs.mkdirSync(FOTOS_DIR, { recursive: true })

	const dur = JSON.parse(fs.readFileSync(DURACIONES, 'utf8'))
	const seg = (n) => dur.find((d) => d.beat === n).segundos

	const browser = await chromium.launch()
	const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: ESCALA })
	const sistema = await context.newPage()
	global.__page = sistema

	// --- Entrada como lead. Contexto nuevo = sesion limpia, que es lo que el magic link exige.
	console.log('Entrando con el magic link...')
	await sistema.goto(MAGIC)
	await sistema.waitForURL((u) => u.pathname.includes('estado-de-resultados'), { timeout: 45000 })
	await sistema.waitForSelector('text=Tu recorrido', { timeout: 30000 })
	await sistema.waitForTimeout(2500)
	await sistema.evaluate(CURSOR)
	await sistema.mouse.move(960, 620)
	console.log('Adentro, con panel.')

	// --- La tienda se precarga aca, mientras nadie la mira. En el beat 3 ya esta lista.
	const tienda = await context.newPage()
	await tienda.goto(TIENDA, { waitUntil: 'domcontentloaded' }).catch(() => {})
	await tienda.waitForTimeout(3500)
	await tienda.evaluate(CURSOR).catch(() => {})
	await sistema.bringToFront()

	// --- Screencast
	const frames = []
	let n = 0
	let t_arranque = null
	let cdp = null

	function enganchar(sesion) {
		sesion.on('Page.screencastFrame', async (evento) => {
			try { await sesion.send('Page.screencastFrameAck', { sessionId: evento.sessionId }) } catch (e) {}
			n++
			const archivo = path.join(FRAMES_DIR, 'f-' + String(n).padStart(6, '0') + '.jpg')
			fs.writeFileSync(archivo, Buffer.from(evento.data, 'base64'))
			frames.push({
				archivo: path.basename(archivo),
				timestamp: evento.metadata.timestamp,
				ms_local: t_arranque === null ? null : Date.now() - t_arranque,
			})
		})
	}

	async function camara_a(page) {
		if (cdp) { try { await cdp.send('Page.stopScreencast') } catch (e) {} }
		await page.bringToFront()
		cdp = await context.newCDPSession(page)
		enganchar(cdp)
		await cdp.send('Page.startScreencast',
			{ format: 'jpeg', quality: CALIDAD, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 })
	}

	await camara_a(sistema)
	t_arranque = Date.now()

	const beats = []
	let acumulado = 0
	const transcurrido = () => Date.now() - t_arranque

	/** Mueve el puntero con suavidad. Dispara mousemove reales: el :hover del sistema anda. */
	async function mover(page, x, y, ms) {
		const pasos = Math.max(12, Math.round((ms || 900) / 16))
		await page.mouse.move(x, y, { steps: pasos })
	}

	/** Espera hasta el instante `ms` DENTRO del beat en curso. */
	async function en(ms_del_beat, page) {
		const falta = acumulado + ms_del_beat - transcurrido()
		if (falta > 0) await (page || sistema).waitForTimeout(falta)
	}

	async function cerrar_beat(nro, page) {
		acumulado += seg(nro) * 1000
		const falta = acumulado - transcurrido()
		if (falta > 0) await (page || sistema).waitForTimeout(falta)
		else console.log('  ! beat ' + nro + ' se paso ' + Math.round(-falta) + 'ms')
		beats.push({ beat: nro, fin_ms: transcurrido(), objetivo_ms: Math.round(acumulado) })
		console.log('  beat ' + nro + ' cerrado')
	}

	async function foto(nro, page) {
		await (page || sistema).screenshot({ path: path.join(FOTOS_DIR, 'beat-' + String(nro).padStart(2, '0') + '.png') })
	}

	// ===================== BEAT 1 — donde estas parado (14,9 s) =========================
	// "el sistema recien abierto, quieto, con el panel visible a la derecha. Sin clics."
	console.log('BEAT 1 - el sistema quieto')
	await foto(1)
	await en(9000)
	await mover(sistema, 1180, 560, 1400)   // deriva minima: da vida sin distraer
	await cerrar_beat(1)

	// ===================== BEAT 2 — el mapa de modulos (49,2 s) =========================
	// Tiempos sacados de los timestamps por palabra de la locucion ya producida
	// (_video/clip-0.1/PLAN-DE-CAPTURA.txt), relativos al arranque de este beat.
	console.log('BEAT 2 - recorrido por el menu')
	// 🔴 COLAPSADO el menu solo ocupa hasta x=56: esta corrido -164px y asoman los iconos. Hay que
	// entrar AHI para disparar el :hover; a x=120 el puntero pasa por al lado y no se abre nunca.
	// Costo de equivocarse: los 49 s del bloque mas largo del clip filmados con el menu cerrado,
	// que es exactamente lo que paso en la primera corrida del 26/8.
	await mover(sistema, 26, 300, 900)
	await sistema.waitForTimeout(600)               // la transicion del menu son 0,22 s
	await mover(sistema, 110, 400, 500)             // ya adentro del menu abierto, lo mantiene

	const items = await sistema.evaluate(() => {
		const out = {}
		const nodos = document.querySelectorAll('.nav-vertical .route, .nav-vertical a, .nav-vertical li, .nav-vertical [class*="route"]')
		nodos.forEach((el) => {
			const t = (el.innerText || '').trim().split('\n')[0].trim()
			const r = el.getBoundingClientRect()
			if (t && r.height > 10 && r.width > 40 && !out[t]) {
				out[t] = { x: Math.round(r.left + 90), y: Math.round(r.top + r.height / 2) }
			}
		})
		return out
	})
	console.log('  items del menu: ' + Object.keys(items).join(', '))
	fs.writeFileSync(path.join(OUT_DIR, 'items-menu.json'), JSON.stringify(items, null, 2))

	// Guarda contra la falla de arriba: si el menu no se abrio, las coordenadas salen negativas
	// (el nav vive en left=-164) y el recorrido entero se filma contra la nada. Mejor cortar y
	// perder una corrida de dos minutos que descubrirlo mirando el video.
	const muestra = items['Listado']
	if (!muestra || muestra.x < 40) {
		throw new Error('El menu no se desplego (Listado en x=' + (muestra ? muestra.x : '?') +
			'). Sin esto el beat 2 se filma con el menu cerrado.')
	}

	// Pedido de Lucas (26/8/2026): ENTRAR a cada modulo, no solo señalarlo — "para que el video
	// sea un poco mas dinamico y no aburra". Sobrescribe la indicacion del guion, que decia
	// "sin entrar a ninguno".
	//
	// Cada parada es el mismo ciclo: entrar al menu (se despliega solo), pararse en el item, hacer
	// clic cuando la voz lo nombra, y SALIR del menu — que se repliega y deja ver el modulo entero.
	// Sin ese ultimo paso el menu abierto tapa media pantalla y no se ve a donde entraste.
	//
	// Medido antes de escribir esto: los seis modulos navegan directo (155-230 ms), ninguno abre
	// submenu, y el panel del lead sobrevive a todas las navegaciones.
	//
	// "Compras" NO esta en el menu: vive como PESTAÑA dentro de Proveedores. Por eso esa parada no
	// clickea el nav sino la pestaña. El texto del guion no se toca: ya esta grabado.
	const PARADAS = [
		{ ms: 8460, item: 'Listado' },
		{ ms: 13160, item: 'Vender' },
		{ ms: 20340, item: 'Ventas' },
		{ ms: 22320, item: 'Clientes' },      // "En Clientes y en Proveedores estan las cuentas
		{ ms: 25200, item: 'Proveedores' },   // corrientes": se entra a los dos, uno y despues otro
		{ ms: 27820, pestana: 'Compras' },    // "En Compras cargas lo que compras"
		{ ms: 33200, item: 'Tesoreria' },
		{ ms: 37220, item: 'Reportes' },
	]

	/** Clic en una pestaña de la pantalla actual, buscandola por texto en vivo. */
	async function clic_en_pestana(texto) {
		const c = await sistema.evaluate((t) => {
			const nodos = document.querySelectorAll('.nav-link, [role="tab"], [class*="tab"]')
			for (const e of nodos) {
				if ((e.innerText || '').trim() === t) {
					const r = e.getBoundingClientRect()
					if (r.width > 20 && r.height > 10) {
						return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
					}
				}
			}
			return null
		}, texto)
		if (!c) { console.log('  ! no encontre la pestaña "' + texto + '"'); return }
		await mover(sistema, c.x, c.y, 500)
		await sistema.mouse.click(c.x, c.y)
		await sistema.evaluate(() => { if (window.__pulso) window.__pulso() })
		await sistema.waitForTimeout(500)
		// Las pestañas no cambian la URL, asi que no hay waitForURL que valga: se comprueba que la
		// solapa haya quedado activa y, si no, se reintenta una vez. En la primera corrida el clic
		// se registro pero la pestaña no cambio, y en el video se veia Proveedores mientras la voz
		// hablaba de Compras.
		const activa = await sistema.evaluate((t) => {
			const e = Array.from(document.querySelectorAll('.nav-link, [role="tab"], [class*="tab"]'))
				.find((x) => (x.innerText || '').trim() === t)
			return e ? /active|selected/i.test(e.className) || e.getAttribute('aria-selected') === 'true' : null
		}, texto)
		if (activa === false) {
			await sistema.mouse.click(c.x, c.y)
			await sistema.waitForTimeout(400)
			console.log('  -> pestaña ' + texto + ': hizo falta reintentar el clic')
		}
		console.log('  -> entro a la pestaña ' + texto + (activa ? '' : ' (activa: ' + activa + ')'))
	}

	for (const p of PARADAS) {
		if (p.pestana) {
			await en(p.ms - 800)
			await clic_en_pestana(p.pestana)
			continue
		}
		const c = items[p.item]
		if (!c) { console.log('  ! no encontre "' + p.item + '" en el menu'); continue }
		await en(p.ms - 1500)
		await mover(sistema, 26, c.y, 500)           // entra al strip: el menu se despliega
		await mover(sistema, c.x, c.y, 450)          // se para sobre el item
		await en(p.ms)
		await sistema.mouse.click(c.x, c.y)
		await sistema.evaluate(() => { if (window.__pulso) window.__pulso() })
		console.log('  -> entro a ' + p.item)
		// 🔴 Esperar a que navegue ANTES de salir del menu. Si se sale enseguida, la navegacion
		// reemplaza el DOM despues de que el mouse ya se movio, el :hover del nav queda pegado y
		// el menu se ve abierto tapando el modulo al que acabas de entrar. Paso en Vender y en
		// Tesoreria en la corrida del 26/8.
		await sistema.waitForTimeout(650)
		await mover(sistema, 1050, 600, 600)         // sale: el menu se repliega, se ve el modulo
		await sistema.mouse.move(1052, 602)          // empujoncito: recalcula el :hover en el DOM nuevo
	}
	await en(43000)
	await foto(2)
	await cerrar_beat(2)

	// ===================== BEAT 3 — la tienda online (15,2 s) ===========================
	console.log('BEAT 3 - la tienda')
	await camara_a(tienda)
	await tienda.evaluate(CURSOR).catch(() => {})
	await mover(tienda, 960, 500, 800)
	await en(2500, tienda)
	for (let i = 0; i < 5; i++) {                   // scroll corto por el catalogo
		await tienda.mouse.wheel(0, 240)
		await tienda.waitForTimeout(420)
	}
	await foto(3, tienda)
	await en(13500, tienda)
	await tienda.mouse.wheel(0, -1200)
	await cerrar_beat(3, tienda)

	// ===================== BEAT 4 — la dinamica del panel (23,4 s) ======================
	// Tiempos recalculados el 26/8 sobre la toma NUEVA de b4 (la de "anotala" corregido). La toma
	// vieja duraba 31,2 s y esta 23,4: los tiempos de antes caian todos fuera.
	console.log('BEAT 4 - el panel')
	await camara_a(sistema)
	await mover(sistema, 1500, 300, 800)
	await en(1920)
	await mover(sistema, 1670, 148, 700)            // "con este panel" -> el titulo de la seccion
	await en(3040)
	await mover(sistema, 1670, 196, 600)            // "ordenado en secciones" -> los puntitos
	await en(7860)
	await mover(sistema, 1670, 294, 800)            // "videos cortos como este" -> la tarjeta
	await sistema.evaluate(() => { if (window.__pulso) window.__pulso() })
	await en(17420)
	await mover(sistema, 1670, 1010, 1000)          // "anotala aca, en las notas"
	await sistema.evaluate(() => { if (window.__pulso) window.__pulso() })
	await foto(4)
	await cerrar_beat(4)

	// ===================== BEAT 5 — cierre (4,3 s) ======================================
	console.log('BEAT 5 - cierre')
	await mover(sistema, 1884, 133, 600)            // flecha ">" del panel: pasa a la seccion 2
	await sistema.mouse.click(1884, 133).catch(() => {})
	await sistema.waitForTimeout(700)
	await mover(sistema, 1670, 294, 700)            // el puntero queda sobre su primer video
	await foto(5)
	await cerrar_beat(5)

	try { await cdp.send('Page.stopScreencast') } catch (e) {}
	await sistema.waitForTimeout(400)
	await soltar_candado(sistema)
	await context.close()
	await browser.close()

	// ===================== armado ======================================================
	console.log('\nFrames capturados: ' + frames.length)
	const total_ms = dur.reduce((a, d) => a + d.segundos, 0) * 1000
	const previos = frames.filter((f) => f.ms_local === null || f.ms_local <= 0)
	const utiles = frames.filter((f) => f.ms_local !== null && f.ms_local > 0)
	if (previos.length) utiles.unshift(Object.assign({}, previos[previos.length - 1], { ms_local: 0 }))

	const lineas = []
	for (let i = 0; i < utiles.length; i++) {
		const fin = i < utiles.length - 1 ? utiles[i + 1].ms_local : total_ms
		const d = (fin - utiles[i].ms_local) / 1000
		if (d <= 0) continue
		lineas.push("file '" + path.join(FRAMES_DIR, utiles[i].archivo).replace(/\\/g, '/') + "'")
		lineas.push('duration ' + d.toFixed(6))
	}
	lineas.push("file '" + path.join(FRAMES_DIR, utiles[utiles.length - 1].archivo).replace(/\\/g, '/') + "'")
	const lista = path.join(OUT_DIR, 'lista-frames.txt')
	fs.writeFileSync(lista, lineas.join('\n'))

	fs.writeFileSync(path.join(OUT_DIR, 'beats.json'),
		JSON.stringify({ escala: ESCALA, calidad: CALIDAD, fps_salida: FPS_SALIDA, total_ms, beats, frames }, null, 2))

	console.log('\nBeats (fin real / objetivo, ms):')
	for (const b of beats) {
		console.log('  beat ' + b.beat + ': ' + b.fin_ms + ' / ' + b.objetivo_ms + '  (desvio ' + (b.fin_ms - b.objetivo_ms) + 'ms)')
	}

	const mudo = path.join(OUT_DIR, 'video-mudo.mp4')
	console.log('\nEncodeando a ' + FPS_SALIDA + ' fps CFR (crf 14)...')
	// 🔴 LA CONVERSION DE RANGO Y MATRIZ NO ES DECORATIVA: sin ella el video se ve LAVADO en
	// el navegador, con los blancos reventados, aunque en el reproductor local se vea perfecto.
	//
	// Los frames del screencast son JPEG: rango completo (0-255) y matriz BT.601. Poner solo
	// `-pix_fmt yuv420p` no alcanza —la salida igual queda `yuvj420p` con `color_range=pc` y
	// `color_space=bt470bg`—, y el navegador ignora esa etiqueta y lo interpreta como rango
	// limitado BT.709, que es lo que asume por defecto. Los niveles se estiran y los blancos se
	// van al tope.
	//
	// Medido el 26/8/2026 en un navegador real, contra la foto 4K del mismo instante como
	// referencia (mismo render, sin pasar por compresion de video):
	//
	//     referencia (navegador)  luminancia media 236,7   blanco puro 38,3%
	//     sin convertir           luminancia media 244,1   blanco puro 73,0%   <- el doble
	//     convertido              luminancia media 235,4   blanco puro 36,2%
	//
	// Ojo al diagnosticarlo: ffmpeg SI respeta la etiqueta `pc`, asi que comparando frames con
	// ffmpeg el archivo malo parece el correcto. Hay que medirlo en un navegador.
	execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista,
		'-vf', 'fps=' + FPS_SALIDA +
			',scale=in_range=full:out_range=limited:in_color_matrix=bt470bg:out_color_matrix=bt709' +
			',format=yuv420p',
		'-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p',
		'-color_range', 'tv', '-colorspace', 'bt709',
		'-color_primaries', 'bt709', '-color_trc', 'bt709',
		mudo], { stdio: 'inherit' })
	console.log('Video mudo: ' + mudo)
}

main().catch(async (err) => {
	console.error(err)
	if (global.__page) {
		try { await global.__page.screenshot({ path: path.join(OUT_DIR, 'falla.png'), fullPage: true }) } catch (e) {}
		// Tambien en la falla: si la corrida entro y se rompio despues, el candado queda tomado
		// y la corrida siguiente no puede entrar.
		await soltar_candado(global.__page)
	}
	process.exit(1)
})
