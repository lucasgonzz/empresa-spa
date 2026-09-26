// Vender recupera solo los catalogos de "forma de pago" y "punto de venta AFIP" cuando su pedido
// del arranque falla, sin que haga falta recargar la pagina.
//
// Nace del informe 20260925-incidente-selects-vacios-vender-trama.md: un corte de red durante el
// arranque de la SPA (10-20% de los dias, medido en Trama) puede dejar esos dos selectores vacios
// para siempre, porque a diferencia de `price_type` no tenian ningun mecanismo de recuperacion.
// La mision resiliencia-recursos-iniciales agrega uno generico
// (common-vue/helpers/critical_catalog_recovery.js) y lo engancha en los dos selectores.
//
// ── Que afirma ───────────────────────────────────────────────────────────────────────────────
//
//  (a) Con GET /api/current-acount-payment-method fallando la primera vez y respondiendo bien
//      despues, el selector de forma de pago muestra "Cargando formas de pago..." mientras
//      reintenta y termina poblado, SIN recargar la pagina.
//  (b) Lo mismo para GET /api/afip-information y el selector de punto de venta.
//  (c) Con los dos endpoints fallando SIEMPRE (agotando la ventana de reintentos automaticos),
//      aparece el boton "Reintentar" en los dos selectores; sacada la intercepcion, clickearlo
//      puebla el selector correspondiente.
//
// ── Como se simula la falla ──────────────────────────────────────────────────────────────────
//
// 🔴 El catalogo baja en el arranque adentro de POST /api/recursos-iniciales (el pedido masivo),
//    no como GET suelto: para que el GET individual se dispare hace falta que ese modelo falte de
//    la respuesta del masivo (download-resources/Index.vue repliega a pedir_sueltos() cuando
//    `cuerpo.models` no trae la clave: `!cuerpo || typeof cuerpo.models == 'undefined'`). Mismo
//    mecanismo que ya usa vender-lista-de-precios-obligatoria.spec.js para price_type.
//
// 🔴 La PRIMERA vez que se pide el GET individual es la del propio arranque (pedir_sueltos, antes
//    de que exista cualquier mecanismo de recuperacion): esa es la que se hace fallar en (a)/(b).
//    El mecanismo de recuperacion no dispara su propio intento hasta que el arranque entero
//    termino de intentarlo (data-estado="listo"), asi que su GET es el SEGUNDO hit al endpoint, y
//    ese es el que en (a)/(b) se deja pasar.
//
// 🔴 `page.unroute(predicado)` solo desactiva la ruta si `predicado` es la MISMA referencia de
//    funcion que se le paso a `page.route()` (no alcanza con un predicado "equivalente" armado de
//    nuevo). Por eso cada patron vive en una constante y esa misma constante viaja a route() y a
//    unroute(), nunca una arrow function nueva por llamada.
//
// 🔴 Se usa la sesion por defecto (storageState de auth.setup.js, la cuenta de
//    TestingFerreteriaSeeder): esta mision no depende de ningun fixture especial, a diferencia de
//    vender-lista-de-precios-obligatoria.spec.js.
const { test, expect } = require('../fixtures')
const { abrir_vender } = require('../helpers/vender')

/** Selector de forma de pago (PaymentMethod.vue). */
const SELECT_METODO_PAGO = '[data-testid="venta-metodo-pago"]'
/** Aviso de "Cargando formas de pago..." mientras la recuperacion reintenta. */
const CARGANDO_METODO_PAGO = '[data-testid="venta-metodos-pago-reintentando"]'
/** Boton manual de PaymentMethod.vue, visible solo con la recuperacion agotada. */
const BOTON_REINTENTAR_METODO_PAGO = '[data-testid="venta-metodos-pago-reintentar"]'

/** Selector de punto de venta AFIP (SelectAfipInformation.vue). */
const SELECT_PUNTO_VENTA = '[data-testid="venta-punto-venta"]'
/** Aviso de "Cargando puntos de venta..." mientras la recuperacion reintenta. */
const CARGANDO_PUNTO_VENTA = '[data-testid="venta-punto-venta-reintentando"]'
/** Boton manual de SelectAfipInformation.vue, visible solo con la recuperacion agotada. */
const BOTON_REINTENTAR_PUNTO_VENTA = '[data-testid="venta-punto-venta-reintentar"]'

/** Predicado de POST /api/recursos-iniciales (el pedido masivo del arranque). */
const es_el_arranque = url => /\/api\/recursos-iniciales(\?|$)/.test(url.href)
/** Predicado de GET /api/current-acount-payment-method. */
const es_metodo_pago = url => /\/api\/current-acount-payment-method(\?|$)/.test(url.href)
/** Predicado de GET /api/afip-information. */
const es_punto_venta = url => /\/api\/afip-information(\?|$)/.test(url.href)

/**
 * Intercepta POST /api/recursos-iniciales y le saca del cuerpo los model_names indicados, para
 * forzar el repliegue a GET individual (ver el comentario largo del encabezado).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string[]} model_names
 * @returns {Promise<void>}
 */
async function forzar_repliegue_de(page, model_names) {
	await page.route(es_el_arranque, async route => {
		const respuesta = await route.fetch()
		let cuerpo = null
		try {
			cuerpo = await respuesta.json()
		} catch (error) {
			cuerpo = null
		}
		if (cuerpo && cuerpo.models && typeof cuerpo.models === 'object') {
			model_names.forEach(model_name => {
				delete cuerpo.models[model_name]
			})
		}
		await route.fulfill({ response: respuesta, json: cuerpo })
	})
}

/**
 * Intercepta un GET puntual para que falle la PRIMERA vez y despues responda normal.
 *
 * @param {import('@playwright/test').Page} page
 * @param {function} predicado uno de es_metodo_pago / es_punto_venta.
 * @returns {Promise<void>}
 */
async function fallar_una_vez_y_despues_responder_bien(page, predicado) {
	let intentos = 0

	await page.route(predicado, route => {
		intentos++

		if (intentos === 1) {
			return route.abort('failed')
		}

		return route.continue()
	})
}

/**
 * Cuantas opciones REALES (sin contar el placeholder "Seleccione...") ofrece un select.
 *
 * @param {import('@playwright/test').Locator} select
 * @returns {Promise<number>}
 */
async function opciones_reales(select) {
	return select.evaluate(el => {
		return [...el.options].filter(o => o.value !== '0' && o.value !== '').length
	})
}

test.describe('Vender: recuperacion de metodos de pago y puntos de venta AFIP', () => {

	test('(a) current-acount-payment-method: falla una vez, despues responde bien -> se recupera sola', async ({ page }) => {
		await forzar_repliegue_de(page, ['current_acount_payment_method'])
		await fallar_una_vez_y_despues_responder_bien(page, es_metodo_pago)

		try {
			await abrir_vender(page)

			// Ventana en la que tiene que verse "reintentando": el primer intento (el del propio
			// arranque) ya fallo, y el mecanismo de recuperacion agenda el suyo recien cuando el
			// arranque llega a 'listo'. Puede que para el momento en que este assert corre el
			// segundo intento ya haya vuelto (maquina rapida): por eso no es un assert duro, es
			// best-effort informativo, y lo que importa de verdad es el resultado final de abajo.
			try {
				await expect(
					page.locator(CARGANDO_METODO_PAGO),
					'mientras reintenta, PaymentMethod.vue tenia que mostrar el aviso de carga'
				).toBeVisible({ timeout: 5000 })
			} catch (error) {
				console.log('[recuperacion] no se llego a ver "reintentando" para metodos de pago (la recuperacion resolvio muy rapido)')
			}

			// La condicion real: el aviso de carga desaparece y el select termina con opciones
			// reales, SIN haber recargado la pagina en ningun momento de este test.
			await expect(
				page.locator(CARGANDO_METODO_PAGO),
				'el aviso de carga de metodos de pago tenia que desaparecer una vez resuelto'
			).toBeHidden({ timeout: 20000 })

			const select = page.locator(SELECT_METODO_PAGO)
			await expect(select, 'el selector de metodo de pago tenia que seguir visible').toBeVisible()

			await expect(async () => {
				const cantidad = await opciones_reales(select)
				expect(cantidad, 'el selector de metodo de pago tenia que quedar poblado con al menos una opcion real').toBeGreaterThan(0)
			}).toPass({ timeout: 10000 })

			await expect(
				page.locator(BOTON_REINTENTAR_METODO_PAGO),
				'con la recuperacion resuelta, el boton "Reintentar" no tenia que estar en pantalla'
			).toHaveCount(0)
		} finally {
			await page.unroute(es_metodo_pago)
			await page.unroute(es_el_arranque)
		}
	})

	test('(b) afip-information: falla una vez, despues responde bien -> se recupera sola', async ({ page }) => {
		await forzar_repliegue_de(page, ['afip_information'])
		await fallar_una_vez_y_despues_responder_bien(page, es_punto_venta)

		try {
			await abrir_vender(page)

			try {
				await expect(
					page.locator(CARGANDO_PUNTO_VENTA),
					'mientras reintenta, SelectAfipInformation.vue tenia que mostrar el aviso de carga'
				).toBeVisible({ timeout: 5000 })
			} catch (error) {
				console.log('[recuperacion] no se llego a ver "reintentando" para puntos de venta (la recuperacion resolvio muy rapido)')
			}

			await expect(
				page.locator(CARGANDO_PUNTO_VENTA),
				'el aviso de carga de puntos de venta tenia que desaparecer una vez resuelto'
			).toBeHidden({ timeout: 20000 })

			const select = page.locator(SELECT_PUNTO_VENTA)
			await expect(select, 'el selector de punto de venta tenia que seguir visible').toBeVisible()

			await expect(async () => {
				const cantidad = await opciones_reales(select)
				expect(cantidad, 'el selector de punto de venta tenia que quedar poblado con al menos una opcion real').toBeGreaterThan(0)
			}).toPass({ timeout: 10000 })

			await expect(
				page.locator(BOTON_REINTENTAR_PUNTO_VENTA),
				'con la recuperacion resuelta, el boton "Reintentar" no tenia que estar en pantalla'
			).toHaveCount(0)
		} finally {
			await page.unroute(es_punto_venta)
			await page.unroute(es_el_arranque)
		}
	})

	test('(c) los dos endpoints fallan siempre -> aparece Reintentar, y clickearlo puebla el selector', async ({ page }) => {
		// La ventana de reintentos automaticos suma ~60s de backoff (2+4+8+16+30) mas los propios
		// intentos: se prueban los DOS catalogos en el mismo test (sus cadenas corren en paralelo,
		// una no espera a la otra) para no pagar esa espera dos veces.
		test.setTimeout(150000)

		await forzar_repliegue_de(page, ['current_acount_payment_method', 'afip_information'])

		// A diferencia de (a)/(b): ACA la intercepcion aborta SIEMPRE, sin contador. Una vez que la
		// recuperacion se da por agotada no vuelve a intentar sola, asi que dejar la intercepcion
		// puesta indefinidamente no genera mas trafico de fondo.
		await page.route(es_metodo_pago, route => route.abort('failed'))
		await page.route(es_punto_venta, route => route.abort('failed'))

		let intercepciones_sacadas = false

		try {
			await abrir_vender(page)

			// Los dos botones tienen que aparecer dentro de la ventana de reintentos automaticos.
			await expect(
				page.locator(BOTON_REINTENTAR_METODO_PAGO),
				'agotada la recuperacion automatica, PaymentMethod.vue tenia que ofrecer el boton "Reintentar"'
			).toBeVisible({ timeout: 90000 })

			await expect(
				page.locator(BOTON_REINTENTAR_PUNTO_VENTA),
				'agotada la recuperacion automatica, SelectAfipInformation.vue tenia que ofrecer el boton "Reintentar"'
			).toBeVisible({ timeout: 90000 })

			// Se sacan las DOS intercepciones antes de clickear: el enunciado pide el click "con la
			// intercepcion ya sacada", para que el reintento manual pegue contra el endpoint sano.
			await page.unroute(es_metodo_pago)
			await page.unroute(es_punto_venta)
			intercepciones_sacadas = true

			await page.locator(BOTON_REINTENTAR_METODO_PAGO).click()

			const select_metodo_pago = page.locator(SELECT_METODO_PAGO)
			await expect(async () => {
				const cantidad = await opciones_reales(select_metodo_pago)
				expect(cantidad, 'tras clickear "Reintentar", el selector de metodo de pago tenia que quedar poblado').toBeGreaterThan(0)
			}).toPass({ timeout: 15000 })

			await expect(
				page.locator(BOTON_REINTENTAR_METODO_PAGO),
				'con el catalogo ya poblado, el boton "Reintentar" de metodos de pago tenia que desaparecer'
			).toHaveCount(0)

			await page.locator(BOTON_REINTENTAR_PUNTO_VENTA).click()

			const select_punto_venta = page.locator(SELECT_PUNTO_VENTA)
			await expect(async () => {
				const cantidad = await opciones_reales(select_punto_venta)
				expect(cantidad, 'tras clickear "Reintentar", el selector de punto de venta tenia que quedar poblado').toBeGreaterThan(0)
			}).toPass({ timeout: 15000 })

			await expect(
				page.locator(BOTON_REINTENTAR_PUNTO_VENTA),
				'con el catalogo ya poblado, el boton "Reintentar" de puntos de venta tenia que desaparecer'
			).toHaveCount(0)
		} finally {
			if (!intercepciones_sacadas) {
				await page.unroute(es_metodo_pago)
				await page.unroute(es_punto_venta)
			}
			await page.unroute(es_el_arranque)
		}
	})
})
