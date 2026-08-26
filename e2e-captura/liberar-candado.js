// Libera el candado de sesion unica del usuario de la demo.
//
// POR QUE HACE FALTA (medido el 26/8/2026):
//
// AuthHelper::checkUserLastActivity() guarda `session_id` y `last_activity` en el usuario. Si
// llega un pedido desde otra sesion, devuelve false y /api/user contesta 403 — aunque el magic
// link haya validado perfecto. El sintoma engaña mucho: POST /api/demo/ingreso sigue devolviendo
// 200 {"ok":true}, y la SPA rebota a /login sin decir por que. Tres entradas seguidas: la primera
// ENTRO, las otras dos 403.
//
// El candado se suelta con POST /logout (web.php, sin prefijo /api), que llama a
// removeUserLastActivity(). Pero ese logout solo hace algo si el que lo pide ESTA autenticado:
// desde una sesion rebotada devuelve 200 y no libera nada. Y si el que lo tomo fue un navegador
// que ya se cerro, no queda nadie que pueda soltarlo: hay que esperar el tiempo de inactividad
// del usuario (USER_ACTIVITY_MINUTES, 60 minutos por defecto).
//
// 🟢 ARREGLADO EN develop EL 26/8/2026 (commit 247d24db, mision `ingreso-demo-candado-sesion`):
// la sesion de demo quedo EXENTA del candado, asi que el magic link ya no puede quedar afuera.
// Este script sigue haciendo falta hasta que ese arreglo llegue a la demo desplegada. Cuando
// llegue, deja de ser necesario para entrar — pero no molesta dejarlo corriendo.
//
// La salida es el login maestro de la demo, que SALTEA el candado de actividad
// (master_login_bypass_activity_key en AuthController). Se entra con el, se cierra sesion, y eso
// libera el candado del usuario para que el magic link pueda volver a entrar.
//
//   node e2e-captura/liberar-candado.js

const { chromium } = require('playwright')

const BASE = 'https://demo.comerciocity.com'
const API = 'https://api-demo.comerciocity.com'
const DOC = process.env.DEMO_LOGIN_DOC || 'login full'
const PASS = process.env.DEMO_LOGIN_PASS || '1234'

async function main() {
	const browser = await chromium.launch()
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
	const page = await context.newPage()

	console.log('Entrando con el login maestro (saltea el candado)...')
	await page.goto(BASE + '/login')
	await page.getByPlaceholder('Ingresá tu número de documento').fill(DOC)
	await page.getByPlaceholder('Ingresá tu contraseña').fill(PASS)
	await page.getByRole('button', { name: 'Iniciar sesión' }).click()

	try {
		await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
	} catch (e) {
		console.log('! No salio de /login. Revisar credenciales o que la API responda.')
		await context.close(); await browser.close()
		process.exit(1)
	}
	await page.waitForTimeout(2500)

	const estado = await page.evaluate(async (api) => {
		const xsrf = decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || '')
		const antes = await fetch(api + '/api/user', { credentials: 'include' })
		const out = await fetch(api + '/logout', {
			method: 'POST', credentials: 'include',
			headers: { 'X-XSRF-TOKEN': xsrf, Accept: 'application/json' },
		})
		return { user_antes: antes.status, logout: out.status }
	}, API)

	console.log('  /api/user antes del logout: ' + estado.user_antes)
	console.log('  POST /logout             : ' + estado.logout)
	console.log(estado.user_antes === 200 && estado.logout === 200
		? 'Candado LIBERADO. El magic link ya puede entrar.'
		: '! Algo no salio como se esperaba; revisar arriba.')

	await context.close()
	await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
