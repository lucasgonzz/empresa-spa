// Setup global de autenticacion (prompt 617). Corre una unica vez antes de los specs
// (ver "dependencies" del proyecto "chromium" en playwright.config.js) y guarda la sesion
// logueada en e2e/.auth/user.json via storageState, para que ningun spec tenga que repetir
// el login.
//
// Credenciales: SIEMPRE desde variables de entorno (e2e/.env.e2e, nunca commiteado). Si faltan,
// el setup falla explicitamente en vez de intentar loguear con un valor vacio/hardcodeado.
const { test: setup, expect } = require('@playwright/test')
const path = require('path')
const { esperar_recursos_descargados } = require('./helpers/recursos')
const { aislar_broadcasts } = require('./helpers/entorno')

const AUTH_FILE = path.join(__dirname, '.auth', 'user.json')

setup('login', async ({ page }) => {
	const email = process.env.E2E_EMAIL
	const password = process.env.E2E_PASSWORD

	if (!email || !password) {
		throw new Error(
			'Faltan E2E_EMAIL y/o E2E_PASSWORD. Copia e2e/.env.e2e.example a e2e/.env.e2e y completa las credenciales de un usuario de prueba (ver e2e/README.md).'
		)
	}

	// Antes de la primera navegacion: ver el comentario largo de helpers/entorno.js.
	await aislar_broadcasts(page)

	await page.goto('/login')

	// Selectores por data-testid (agregados en LoginForm.vue, prompt 617).
	await page.locator('[data-testid="login-doc-number"]').fill(email)
	await page.locator('[data-testid="login-password"]').fill(password)
	await page.locator('[data-testid="login-submit"]').click()

	// El login exitoso redirige fuera de /login. Se espera a que la URL cambie en vez de
	// usar waitForTimeout: si el login falla (credenciales invalidas) esto va a fallar por
	// timeout con un mensaje claro, no en silencio.
	await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })

	// Entrar al sistema no es llegar a una URL: apenas hay sesion, la aplicacion se pone a bajar
	// los catalogos del arranque y hasta que no termina esta a medio cargar. Se espera aca, con el
	// recorrido completo (tarjeta -> panel -> "Todo listo"), por dos motivos: deja verificado de una
	// que la puerta al panel funciona, y no se guarda la sesion en el storageState hasta que el
	// arranque completo dio la vuelta sin romperse. Cada spec vuelve a esperar por su cuenta: el
	// storageState lleva cookies y localStorage, no el store de Vuex, asi que en una pagina nueva
	// los recursos se bajan de nuevo.
	await esperar_recursos_descargados(page)

	await page.context().storageState({ path: AUTH_FILE })
})
