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
