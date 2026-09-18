/**
 * Configuración de la SPA en tiempo de ejecución.
 *
 * Por qué existe: hasta la 4.0.22 cada `process.env.VUE_APP_*` lo resolvía vue-cli AL COMPILAR,
 * reemplazándolo por el valor literal del `.env`. Como la URL de la API y la del SPA son distintas
 * en cada frente de cada cliente, eso obligaba a UNA COMPILACIÓN POR FRENTE, y esa compilación
 * corría en el VPS de producción en cada upgrade (un núcleo al 100 % durante 5-10 minutos).
 *
 * Ahora el bundle es uno solo por versión (lo compila GitHub Actions al hacer el release, sin
 * `.env`) y los valores por frente se leen de `window.__CC_CONFIG__`, que define `config.js`: un
 * archivo que el admin escribe al lado del `index.html` en cada deploy (`DeploymentService` →
 * `SpaRuntimeConfig`). `public/index.html` lo carga síncrono y antes que el bundle, así que ya está
 * cargado cuando los stores hacen `axios.defaults.baseURL = env('VUE_APP_API_URL')` al importarse.
 *
 * Orden de resolución:
 *   1. `window.__CC_CONFIG__[key]`  → producción: lo escribe el admin en cada deploy.
 *   2. `process.env[key]`           → desarrollo (`.env` / `.env.local`) y respaldo: un frente
 *                                     compilado por la vía vieja, con `.env` y sin `config.js`,
 *                                     sigue andando exactamente igual que antes.
 *   3. `fallback`.
 *
 * vue-cli inyecta `process.env` como un objeto literal con todas las `VUE_APP_*` (DefinePlugin),
 * así que el acceso dinámico `process.env[key]` queda resuelto en el bundle y en el navegador no
 * sobrevive ninguna referencia a `process`.
 *
 * Los valores son strings en las dos fuentes ('true', 'false', URLs), igual que con el `.env`: el
 * código que compara contra 'true'/'false' no cambia. El contrato de keys está documentado en
 * `public/config.js.example`.
 */
export function env(key, fallback = undefined) {
	if (typeof window !== 'undefined' && window.__CC_CONFIG__ && window.__CC_CONFIG__[key] !== undefined) {
		return window.__CC_CONFIG__[key]
	}
	if (process.env[key] !== undefined) {
		return process.env[key]
	}
	return fallback
}
