// Configuracion de Playwright para los tests end-to-end de empresa-spa (prompt 617, grupo 184).
// CommonJS a proposito: el repo no usa TypeScript, no se introduce aca.
//
const path = require('path')
const fs = require('fs')
const { defineConfig, devices } = require('@playwright/test')

/**
 * Carga manual de e2e/.env.e2e (nunca commiteado, ver e2e/.env.e2e.example y e2e/README.md).
 * Se evita agregar la dependencia "dotenv" al repo para un archivo tan chico: parseo simple de
 * lineas "CLAVE=VALOR", ignorando comentarios (#) y lineas vacias. Solo completa variables que
 * todavia no esten seteadas en el entorno (para no pisar variables que ya vengan de CI/shell).
 *
 * @param {string} env_file_path ruta absoluta al archivo .env a cargar.
 * @returns {void}
 */
function load_env_file(env_file_path) {
	if (!fs.existsSync(env_file_path)) {
		return
	}
	const contents = fs.readFileSync(env_file_path, 'utf8')
	contents.split(/\r?\n/).forEach(line => {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) {
			return
		}
		const separator_index = trimmed.indexOf('=')
		if (separator_index === -1) {
			return
		}
		const key = trimmed.slice(0, separator_index).trim()
		let value = trimmed.slice(separator_index + 1).trim()
		// Quita comillas simples/dobles envolventes si las tiene.
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
			value = value.slice(1, -1)
		}
		if (key && typeof process.env[key] === 'undefined') {
			process.env[key] = value
		}
	})
}

load_env_file(path.join(__dirname, 'e2e', '.env.e2e'))

/**
 * URL base de la SPA corriendo en local (npm run serve). Configurable por variable de entorno
 * para poder apuntar a otro puerto/host sin tocar este archivo.
 */
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8080'

module.exports = defineConfig({
	// Carpeta donde viven los specs y el setup de autenticacion.
	testDir: './e2e',

	// Los tests de este harness escriben sobre la misma base de datos (fixture del prompt 613):
	// no se paralelizan corridas ni tests para evitar que se pisen entre si.
	fullyParallel: false,
	workers: 1,

	// Un test que pasa recien al reintentar esconde un problema real: sin reintentos en local.
	retries: 0,

	// 4 minutos por test, muy por encima del default de 30 segundos. Es holgado a proposito: en
	// local, contra WAMP y con la SPA sin buildear, el arranque real es lento y variable. Medido el
	// 4/8/2026 sobre e2e/tests/alta-compra.spec.js: la navegacion inicial a /proveedores/compras
	// tarda entre 5,8 y 9,2 segundos, el click que abre el alta otros 9, y la busqueda del proveedor
	// devolvio resultados recien pasados los 16 segundos. Con 30 segundos el presupuesto se agota en
	// el arranque y el timeout PARECE un bug de la aplicacion sin serlo. Bajar este numero sin haber
	// acelerado antes el arranque solo trae rojos que no corresponden a bugs.
	//
	// Subido de 120000 a 240000 el 15/8/2026: el presupuesto es del test ENTERO, hooks incluidos, y
	// desde que cada test espera en su beforeEach a que termine la descarga de recursos del arranque
	// (~35-45 s medidos aca, ver e2e/helpers/recursos.js) los 2 minutos se consumian antes de que el
	// spec de compras llegara a cargar sus 10 articulos. La API la sirve `php artisan serve`, que
	// atiende UN request por vez, asi que cada busqueda del modal espera su turno.
	timeout: 240000,

	// 30 segundos por asercion (default: 5). Con los tiempos de arranque de arriba, 5 segundos es
	// corto para este sistema: el expect(page).not.toHaveURL(/\/login/) del setup ya venia
	// reintentando 33 veces contra el mismo valor antes de rendirse.
	expect: {
		timeout: 30000,
	},

	// Reporter legible en consola local.
	reporter: [['list']],

	use: {
		baseURL: BASE_URL,

		// Guarda el trace SOLO si el test termina fallado, para que Lucas pueda ver que paso
		// sin tener que repetir la corrida completa.
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},

	projects: [
		{
			// Proyecto de setup: hace login una unica vez y guarda la sesion en storageState.
			// Los proyectos de test dependen de este via "dependencies".
			name: 'setup',
			testMatch: /auth\.setup\.js/,
		},
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				// Reutiliza la sesion guardada por el setup: los specs arrancan ya logueados.
				storageState: path.join(__dirname, 'e2e', '.auth', 'user.json'),
			},
			dependencies: ['setup'],
		},
	],
})
