// Setup global de autenticacion (prompt 617). Corre una unica vez antes de los specs
// (ver "dependencies" del proyecto "chromium" en playwright.config.js) y guarda la sesion
// logueada en e2e/.auth/user.json via storageState, para que ningun spec tenga que repetir
// el login.
//
// Credenciales: SIEMPRE desde variables de entorno (e2e/.env.e2e, nunca commiteado). Si faltan,
// el setup falla explicitamente en vez de intentar loguear con un valor vacio/hardcodeado.
//
// Este setup hace UNA sola cosa: dejar la sesion guardada. NO espera la descarga de recursos del
// arranque, a proposito -- ver el comentario del final.
const { test: setup, expect } = require('@playwright/test')
const path = require('path')
const { aislar_broadcasts } = require('./helpers/entorno')
const { informar_si_fallo } = require('./helpers/informe-de-fallo')

const AUTH_FILE = path.join(__dirname, '.auth', 'user.json')

// Este archivo no usa e2e/fixtures.js --no navega la aplicacion, solo loguea-- asi que engancha el
// informe de fallo por su cuenta. Si el login se rompe, TODA la suite queda en rojo por dependencia,
// y es justo el caso donde saber que paso rapido vale mas.
setup.afterEach(async ({}, testInfo) => {
	informar_si_fallo(testInfo)
})

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

	// Lo que se va a guardar es la cookie de sesion de Sanctum mas el localStorage, y de este
	// ultimo lo que importa es user_id: lo escribe la mutacion auth/setUser (src/store/auth.js)
	// justo antes de setAuthenticated, que es lo que dispara la redireccion de arriba. O sea que
	// cuando la URL cambio ya tiene que estar. Se chequea igual y no se asume: es la unica
	// verificacion que queda entre el login y el storageState desde que este setup dejo de esperar
	// la descarga de recursos, y un storageState guardado a medias deja TODA la suite en rojo con
	// un sintoma que no apunta al login.
	await expect
		.poll(() => page.evaluate(() => window.localStorage.getItem('user_id')), { timeout: 10000 })
		.not.toBeNull()

	// Guardar la sesion y salir. Lo unico que este setup tiene que dejar hecho es eso.
	//
	// 🔴 Aca NO se espera la descarga de recursos del arranque, y no es un olvido.
	//
	// El storageState guarda cookies y localStorage, no el store de Vuex: los ~68 catalogos que la
	// aplicacion baja al entrar no quedan guardados en ningun lado, y cada spec los vuelve a bajar
	// en su propia pagina. Esperarlos aca era pagar 35-45 segundos por una descarga que despues se
	// tira: el navegador del setup se cierra, y el primer spec arranca en una pagina nueva que baja
	// todo otra vez. En una corrida completa eran ~45 segundos regalados sin verificar nada que los
	// specs no verifiquen igual.
	//
	// La espera vive donde tiene sentido: en cada spec que entra a la interfaz de un modulo, como
	// primer paso despues de su page.goto() (ver e2e/README.md, "Esperar la descarga de recursos").
	// El recorrido completo por la tarjeta y el panel --que antes tambien se hacia aca-- lo cubre
	// alta-compra.spec.js, que llama al helper sin { abrir_panel: false }.
	await page.context().storageState({ path: AUTH_FILE })
})
