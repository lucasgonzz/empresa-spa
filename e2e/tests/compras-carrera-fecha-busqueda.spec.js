// Test end to end de la mision compras-tabla-vacia-por-fecha (21/9/2026): una respuesta tardia del
// buscador general/filtro no puede pisar el dia que el usuario ya eligio.
//
// El bug reportado por Lucas con el cliente Arfren: en Compras, clickear un dia con compras
// registradas a veces dejaba la tabla vacia mientras el cartel "Total comprado" si mostraba un
// valor, sin ningun error de consola ni de red. La causa, verificada linea por linea contra
// develop (ver claude-comerciocity/_cruzado/misiones/20260921-compras-tabla-vacia-por-fecha/plan.md):
// runGlobalSearch/runFilter (src/store/__base_store.js) hacen commit('setFiltered', ...) +
// commit('setIsFiltered', true) en su .then() SIN comparar si esa respuesta sigue siendo la
// vigente. Si el usuario ya cambio de dia (ControlFecha.vue::changeFromDate, que resetea
// is_filtered=false y pide el dia nuevo con getModels) antes de que la respuesta de una busqueda
// anterior vuelva, esa respuesta tardia pisa el estado igual: display/Index.vue renderiza
// state.filtered en cuanto is_filtered es true, asi que la tabla queda mostrando el resultado (a
// veces vacio) de una busqueda vieja en vez del dia clickeado.
//
// El arreglo agrega `state.consulta_vigente_token` en __base_store.js: getModels lo incrementa
// ANTES de resetear filtered/is_filtered, y runGlobalSearch/runFilter capturan el token vigente al
// arrancar y solo commitean su resultado en el .then() si el token no cambio mientras la request
// viajaba. Este spec reproduce la carrera de punta a punta, interceptando la respuesta del
// buscador general para sostenerla "en vuelo" y clickeando el dia ANTES de soltarla.
//
// COMO SE FUERZA LA CARRERA:
//   `page.route()` intercepta el POST a /api/global-search/provider-order y lo deja pendiente
//   (nunca llama a route.continue()) hasta que el test lo libera a mano, DESPUES de clickear el
//   dia y de que la propia respuesta del dia (que NO se intercepta) ya volvio. Es una
//   reconstruccion deterministica de "la respuesta de la busqueda vuelve DESPUES de que el usuario
//   ya cambio de dia", sin depender de ninguna condicion de timing real.
//
// POR QUE EL DIA SE CLICKEA POR JS Y NO CON page.locator(...).click():
//   Mientras el buscador general esta en vuelo, runGlobalSearch prende el overlay global de carga
//   (commit('auth/setLoading', true, {root:true})), que es un <div> fixed con z-index 10000 sin
//   pointer-events:none (common-vue/components/LogoLoading.vue) y por lo tanto TAPA cualquier click
//   real sobre la tira de dias. En produccion la carrera igual es posible (dos operaciones async
//   que comparten el mismo flag global de loading pueden apagarlo antes de que la propia request
//   lenta vuelva), pero reproducir ESA sincronizacion exacta desde un test no aporta nada: lo que
//   hay que probar es que el STORE resuelve bien la carrera cuando las dos respuestas llegan en
//   orden invertido, no en que orden exacto se prende y apaga un overlay. Por eso el click se
//   dispara con `elemento.click()` desde `page.evaluate()`, que llama al handler @click de Vue
//   directo, sin pasar por el hit-testing del navegador (mismo criterio ya usado en este repo para
//   clicks bajo modales que un overlay tapa).
//
// POR QUE EL MISMO DIA (HOY) DOS VECES Y NO DOS DIAS DISTINTOS:
//   El guard no mira que dia se pide: mira si getModels (cualquier dia) se disparo despues de que
//   arranco la busqueda que esta en vuelo. Clickear HOY una segunda vez ejercita exactamente el
//   mismo commit('incrementar_consulta_vigente_token') que clickear un dia distinto, sin depender
//   de que el fixture tenga compras sembradas en otro dia puntual: HOY es el unico dia que
//   ControlFecha.vue deja clickear siempre, tenga o no movimientos (ver clickDia() en
//   common-vue/components/previus-days/ControlFecha.vue).
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { aislar_broadcasts } = require('../helpers/entorno')
const path = require('path')

test.describe.configure({ mode: 'serial' })

let page

/** Predicado de la ruta del buscador general de Compras (POST /api/global-search/provider-order). */
const es_la_busqueda_general_de_compras = url => /\/api\/global-search\/provider-order(\?|$)/.test(url.href)

/**
 * Fecha de hoy en YYYY-MM-DD, en la zona horaria del navegador (misma que usa
 * compra-costeo-facturacion.spec.js para el mismo proposito).
 *
 * @returns {string}
 */
function fecha_de_hoy() {
	const hoy = new Date()
	return [
		hoy.getFullYear(),
		String(hoy.getMonth() + 1).padStart(2, '0'),
		String(hoy.getDate()).padStart(2, '0'),
	].join('-')
}

/**
 * Lee del store de Vuex el estado de provider_order relevante para este spec (Vue 2 deja la
 * instancia raiz en #app.__vue__, mismo patron que estado_de_vender() de
 * vender-lista-de-precios-obligatoria.spec.js).
 *
 * @returns {Promise<{is_filtered: boolean, filtered_length: number, consulta_vigente_token: number}|null>}
 */
async function estado_provider_order() {
	return page.evaluate(function () {
		const raiz = document.querySelector('#app')
		const store = raiz && raiz.__vue__ ? raiz.__vue__.$store : null
		if (!store || !store.state.provider_order) {
			return null
		}
		return {
			is_filtered: store.state.provider_order.is_filtered,
			filtered_length: store.state.provider_order.filtered.length,
			consulta_vigente_token: store.state.provider_order.consulta_vigente_token,
		}
	})
}

/**
 * Clickea la celda de un dia de ControlFecha por JS (ver el comentario del encabezado: hace falta
 * para que el click llegue al handler de Vue aunque el overlay global de carga este tapandolo).
 *
 * @param {string} fecha_iso Fecha en YYYY-MM-DD (el atributo data-fecha ya viene normalizado asi).
 * @returns {Promise<void>}
 */
async function clickear_dia_por_js(fecha_iso) {
	const encontrado = await page.evaluate(function (fecha) {
		const celda = document.querySelector('[data-testid="control-fecha-dia"][data-fecha="' + fecha + '"]')
		if (!celda) {
			return false
		}
		celda.click()
		return true
	}, fecha_iso)
	expect(encontrado, 'no se encontro la celda del dia ' + fecha_iso + ' en ControlFecha').toBe(true)
}

/**
 * Espera la respuesta del GET que dispara getModels para el dia elegido (no se intercepta nunca:
 * es la request "rapida" que tiene que ganarle a la busqueda general demorada).
 *
 * @returns {Promise<import('@playwright/test').Response>}
 */
function esperar_respuesta_del_dia() {
	return page.waitForResponse(function (response) {
		return response.request().method() === 'GET' && response.url().includes('/api/provider-order/from-date/')
	}, { timeout: 20000 })
}

test.beforeAll(async ({ browser }) => {
	const context = await browser.newContext({
		storageState: path.join(__dirname, '..', '.auth', 'user.json'),
	})
	page = await context.newPage()
	// Este spec arma su propia pagina (necesita controlar page.route), asi que el fixture de
	// e2e/fixtures.js no la toca: el aislamiento de broadcasts hay que pedirlo a mano.
	await aislar_broadcasts(page)

	await page.goto('/proveedores/compras')
	await esperar_recursos_descargados(page, { abrir_panel: false })
})

test.afterAll(async () => {
	if (page) {
		await page.close()
	}
})

test.describe('Compras: una respuesta tardia del buscador general no pisa el dia ya elegido', () => {

	test('clickear el dia de hoy antes de que responda una busqueda vieja deja is_filtered en false', async () => {
		// Arranca en un estado limpio clickeando hoy (siempre disponible, ver el comentario del
		// encabezado): asi el test no depende de que el fixture tenga compras sembradas hoy.
		const espera_del_dia_inicial = esperar_respuesta_del_dia()
		await clickear_dia_por_js(fecha_de_hoy())
		await espera_del_dia_inicial

		const estado_inicial = await estado_provider_order()
		expect(estado_inicial.is_filtered, 'despues de clickear el dia, is_filtered tenia que quedar en false').toBe(false)

		// Intercepta la busqueda general y la deja "en vuelo": nunca llama a route.continue() hasta
		// que el propio test lo libere, mas abajo.
		let liberar_busqueda_tardia
		const busqueda_tardia_liberada = new Promise(function (resolve) {
			liberar_busqueda_tardia = resolve
		})
		await page.route(es_la_busqueda_general_de_compras, async function (route) {
			await busqueda_tardia_liberada
			await route.continue()
		})

		try {
			const espera_del_post_de_busqueda = page.waitForRequest(function (request) {
				return request.method() === 'POST' && es_la_busqueda_general_de_compras(new URL(request.url()))
			}, { timeout: 20000 })

			// Dispara la busqueda general con un criterio que casi seguro no matchea nada: lo que
			// importa es que la respuesta, matchee o no, no puede pisar el dia clickeado mas abajo.
			const input_buscador = page.locator('[data-testid="buscador-general"]').first()
			await input_buscador.fill('zzz-termino-que-no-deberia-existir-nunca-zzz')
			await input_buscador.press('Enter')

			// Espera a que el POST realmente haya salido: recien ahi la carrera existe de verdad.
			await espera_del_post_de_busqueda

			// LA CARRERA: clickea el dia de hoy de nuevo ANTES de soltar la respuesta de la
			// busqueda. Este es el commit('incrementar_consulta_vigente_token') que tiene que
			// ganarle a la respuesta tardia (ver el comentario del encabezado sobre por que es el
			// mismo dia).
			const espera_del_dia_de_la_carrera = esperar_respuesta_del_dia()
			await clickear_dia_por_js(fecha_de_hoy())
			await espera_del_dia_de_la_carrera

			// Recien ahora se suelta la respuesta vieja de la busqueda, que en un sistema sin el
			// guard pisaria is_filtered=true + filtered=[...] encima del dia que se acaba de
			// clickear.
			const espera_de_la_respuesta_de_busqueda = page.waitForResponse(function (response) {
				return response.request().method() === 'POST' && es_la_busqueda_general_de_compras(new URL(response.url()))
			}, { timeout: 20000 })
			liberar_busqueda_tardia()
			await espera_de_la_respuesta_de_busqueda

			// Un respiro para que el .then() de runGlobalSearch (o el guard, que corta antes)
			// termine de correr: la respuesta ya esta resuelta, falta que el microtask de la
			// promesa se procese y Vue reaccione.
			await page.waitForTimeout(300)
		} finally {
			await page.unroute(es_la_busqueda_general_de_compras)
		}

		const estado_final = await estado_provider_order()
		expect(
			estado_final.is_filtered,
			'la respuesta tardia de la busqueda general piso is_filtered: la tabla va a mostrar el resultado de una busqueda vieja en vez del dia clickeado'
		).toBe(false)

		// El token tiene que haber avanzado (2 clicks de dia + 1 busqueda = minimo 3 incrementos):
		// no alcanza con que is_filtered haya dado la casualidad de quedar en false, el mecanismo
		// que lo sostiene tiene que estar corriendo de verdad.
		expect(
			estado_final.consulta_vigente_token,
			'el token de intencion vigente tenia que haber avanzado durante la carrera'
		).toBeGreaterThan(estado_inicial.consulta_vigente_token)
	})

	test('sin carrera, una busqueda del buscador general si deja is_filtered en true', async () => {
		// Contraparte del test anterior (criterio 3 del plan de la mision): el guard no tiene que
		// romper el camino limpio, sin ninguna respuesta tardia de por medio.
		const input_buscador = page.locator('[data-testid="buscador-general"]').first()
		await input_buscador.fill('zzz-otro-termino-que-no-deberia-existir-zzz')

		const espera_de_la_respuesta = page.waitForResponse(function (response) {
			return response.request().method() === 'POST' && es_la_busqueda_general_de_compras(new URL(response.url()))
		}, { timeout: 20000 })
		await input_buscador.press('Enter')
		await espera_de_la_respuesta

		// Respiro para que el .then() (que ahora si tiene que commitear) termine de correr.
		await page.waitForTimeout(300)

		const estado = await estado_provider_order()
		expect(estado.is_filtered, 'sin ninguna carrera, la busqueda del buscador general tenia que dejar is_filtered en true').toBe(true)
	})
})
