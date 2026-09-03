// Exploración del módulo Alertas — pestaña STOCK MÍNIMO (3/9/2026).
//
// Qué afirma este archivo:
//
//   1. El circuito configuración → reporte: poner el mínimo del depósito ARRIBA del stock suma
//      una alerta y suma su faltante × costo al chip "Costo de reposición"; ponerlo IGUAL al
//      stock suma la alerta con faltante cero (cuenta en el conteo, no en la plata). Es la rama
//      de depósitos de `InventoryPerformanceHelper` (condición `stock_min >= amount`: la
//      IGUALDAD alerta), que solo corre si el artículo no alertó por su stock global.
//   2. El badge de la pestaña sale del CONTADOR del reporte (`stock_minimo`) — arreglo de la
//      exploración del 3/9/2026: antes leía `models[0].articles_stock_minimo`, un campo que el
//      endpoint no manda desde que la lista se paginó, y quedaba clavado en 0 con la tabla
//      llena. El badge tiene que decir lo mismo que el chip.
//
// 🔴 Por qué el mínimo se configura por el ENDPOINT (PUT article-update-addresses) y no por la
//    pantalla: HOY NO HAY NINGÚN CAMINO DE INTERFAZ QUE LLEGUE. Verificado en la exploración:
//      - el `stock_min` global es `not_show: true` (sin campo en el formulario) y no tiene
//        `use_to_update` (la masiva no lo ofrece) — src/models/article.js;
//      - el editor por depósito (EditAddressStock.vue) vive en slots `#table-prop-*` de
//        views/Listado.vue que la tabla del listado NO renderiza (medido: 14 filas, permiso de
//        owner, y cero `btn_editar_depositos` en el DOM; la celda Stock cae al texto).
//    El PUT de este spec es EXACTAMENTE el que mandaría ese botón. El día que el camino de
//    interfaz vuelva, migrar `configurar_minimo` a la pantalla y listo.
//
// De qué depende del fixture: "Pata de cama" y "Marco para cama" (proveedor Rosario, sin
// presentación ni unidades individuales: costo normalizado == costo), el depósito id 1
// ("Principal"), y `users.duracion_reporte_inventario = 1` (lo deja TestingFerreteriaSeeder) —
// sin esa vigencia corta el reporte no se regenera durante la corrida y la espera de este
// archivo NO puede terminar. El worker de cola tiene que estar corriendo: la regeneración es un
// job (`ProcessInventoryPerformanceJob`), y sin worker queda en `pending` para siempre.
//
// Trampas esquivadas:
//   - El broadcast del reporte nuevo no llega en e2e (Pusher aislado): el refresco se fuerza
//     re-clickeando la pestaña, que re-pide el reporte y, si venció, encola la regeneración.
//   - El spec LIMPIA los mínimos al terminar (y al arrancar, por si una corrida quedó a mitad).
//     La limpieza deja 0 y no NULL: `set_stock_min_max()` saltea la fila si stock_min y
//     stock_max vienen los dos null, así que por este endpoint no se puede volver a NULL — y 0
//     no alerta (`0 >= amount` es falso con stock positivo), que es lo que importa acá.
//   - El costo se lee de la celda del listado en el momento (otras corridas lo mueven con la
//     actualización masiva); nada se hardcodea.

const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { redondear } = require('../helpers/numeros')
const {
	celda_numerica,
	leer_articulos,
} = require('../helpers/vender')

const ARTICULO_CON_FALTANTE = 'Pata de cama'
const ARTICULO_EN_EL_LIMITE = 'Marco para cama'
/** Cuántas unidades por encima del stock actual se pone el mínimo del primero. */
const FALTANTE = 4
/** Id del depósito del fixture ("Principal"). */
const DEPOSITO_ID = 1

const contexto = {
	/** nombre -> id. */
	ids: {},
	/** nombre -> stock del depósito (pivot.amount) leído del propio endpoint. */
	amount: {},
	/** Costo del artículo con faltante, leído de la celda del listado. */
	costo: null,
	/** Chips del reporte limpio: {conteo, reposicion, sin_stock, negativo}. */
	base: null,
}

/**
 * PUT article-update-addresses desde la sesión de la página (mismas cookies, mismo XSRF).
 *
 * La URL de la API sale de la convención de puertos del pool (README: API = 8100+N,
 * SPA = 8180+N): el origen de la página menos 80 en el puerto.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} payload {article_id, addresses}
 * @returns {Promise<Object>} El artículo completo que devuelve el endpoint.
 */
async function put_addresses(page, payload) {
	const resultado = await page.evaluate(async (body) => {
		const api = window.location.origin.replace(/:(\d+)$/, (m, p) => ':' + (Number(p) - 80))
		const xsrf = decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || '')
		const res = await fetch(api + '/api/article-update-addresses', {
			method: 'PUT',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
				'X-XSRF-TOKEN': xsrf,
			},
			body: JSON.stringify(body),
		})
		return { ok: res.ok, status: res.status, json: res.ok ? await res.json() : null }
	}, payload)

	expect(resultado.ok, `el PUT article-update-addresses devolvió ${resultado.status}`).toBeTruthy()
	return resultado.json.model
}

/**
 * Deja el stock mínimo pedido en el depósito del fixture, sin tocar el stock.
 *
 * Primero pide la foto del artículo con un PUT vacío (addresses: [] no recorre nada y devuelve
 * el fullModel), y con el amount real arma el PUT verdadero: mandar el amount actual hace que
 * `update_addresses()` calcule diferencia 0 y no genere ningún movimiento de stock.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number|string} article_id
 * @param {number} stock_min 0 = no alertar (la vuelta a NULL no existe por este endpoint).
 * @returns {Promise<number>} El stock (amount) del depósito.
 */
async function configurar_minimo(page, article_id, stock_min) {
	const foto = await put_addresses(page, { article_id: article_id, addresses: [] })

	const pivot = (foto.addresses || []).find(a => Number(a.id) === DEPOSITO_ID)
	expect(pivot, `el artículo ${article_id} tenía que tener pivot con el depósito ${DEPOSITO_ID}`).toBeTruthy()

	const amount = Number(pivot.pivot.amount)

	await put_addresses(page, {
		article_id: article_id,
		addresses: [{
			id: DEPOSITO_ID,
			pivot: {
				amount: amount,
				stock_min: stock_min,
				stock_max: pivot.pivot.stock_max,
			},
		}],
	})

	return amount
}

/**
 * Entra a la pestaña Stock mínimo de Alertas.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function abrir_stock_minimo(page) {
	await page.goto('/alertas/stock-minimo')
	await esperar_recursos_descargados(page, { abrir_panel: false })
	await expect(page.locator('[data-testid="nav-item-Stock minimo"]')).toBeVisible()
}

/**
 * Lee los cuatro chips del resumen. null si el resumen todavía no está.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Object|null>}
 */
async function leer_chips(page) {
	return page.evaluate(() => {
		const conteo = document.querySelector('[data-testid="stock-minimo-chip-bajo-minimo"]')
		if (!conteo) {
			return null
		}
		return {
			conteo: Number(conteo.dataset.valor),
			sin_stock: Number(document.querySelector('[data-testid="stock-minimo-chip-sin-stock"]').dataset.valor),
			negativo: Number(document.querySelector('[data-testid="stock-minimo-chip-negativo"]').dataset.valor),
			reposicion: Number(document.querySelector('[data-testid="stock-minimo-chip-reposicion"]').dataset.monto),
		}
	})
}

/**
 * Cuántas alertas tiene el ÚLTIMO reporte para un artículo, preguntado directo al endpoint
 * paginado (el mismo que consume la tabla), con la sesión de la página.
 *
 * 🔴 Por endpoint y no por el buscador de la pestaña, y la historia importa (3/9/2026): la
 * versión por UI se COLGABA sin límite — `fill()` con el mismo valor que el input ya tenía no
 * dispara ningún evento, el debounce no corre, no sale ningún fetch, y el waitForResponse queda
 * esperando para siempre (le pasó al fill('') sobre un buscador ya vacío en cada reintento del
 * ciclo de espera: tests de 4 minutos a 1,5 HORAS según el timeout). El endpoint es la misma
 * fuente que la tabla; la representación visual se verifica aparte, UNA vez, en el test 2.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} nombre
 * @returns {Promise<number>} El total que reporta el endpoint para esa búsqueda.
 */
async function total_en_el_reporte(page, nombre) {
	const resultado = await page.evaluate(async (buscado) => {
		const api = window.location.origin.replace(/:(\d+)$/, (m, p) => ':' + (Number(p) - 80))
		const res = await fetch(
			api + '/api/inventory-performance/articles-stock-minimo?page=1&per_page=25&search=' + encodeURIComponent(buscado),
			{ credentials: 'include', headers: { Accept: 'application/json' } }
		)
		if (!res.ok) {
			return { ok: false, status: res.status }
		}
		const json = await res.json()
		return { ok: true, total: Number(json.models.total) }
	}, nombre)

	expect(resultado.ok, `el endpoint de artículos bajo el mínimo devolvió ${resultado.status}`).toBeTruthy()
	return resultado.total
}

/**
 * Re-entra a la pestaña hasta que el reporte refleje la condición pedida.
 *
 * El re-click de la pestaña activa vuelve a pedir el reporte y, si su vigencia venció (1 minuto
 * en el fixture), encola la regeneración que procesa el worker. Por eso la espera es larga: en
 * el peor caso hay que dejar pasar el minuto entero antes del ciclo que ya la trae.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Function} condicion async () => void — tira si todavía no se cumple.
 * @param {string} descripcion
 * @returns {Promise<void>}
 */
async function esperar_reporte(page, condicion, descripcion) {
	await expect(async () => {
		// Auto-recuperación del ciclo: si la vista de Alertas se desmontó (pasó el 3/9/2026 —
		// el snapshot del timeout mostraba solo la nav, sin pestañas, y el click nunca más
		// encontraba a quién apuntar), se vuelve a entrar antes de reintentar.
		const pestania = page.locator('[data-testid="nav-item-Stock minimo"]')
		if (!(await pestania.isVisible().catch(() => false))) {
			await page.goto('/alertas/stock-minimo')
			await esperar_recursos_descargados(page, { abrir_panel: false })
		}

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('inventory-performance') && !res.url().includes('articles-stock-minimo')),
			pestania.click(),
		])
		expect(respuesta.ok()).toBeTruthy()

		// El created_at que el endpoint devolvió, para que un timeout diga QUÉ reporte estaba
		// mirando cada intento (un toPass agotado se traga el expect interno que falló).
		const cuerpo = await respuesta.json().catch(() => null)
		const reporte = cuerpo && cuerpo.models && cuerpo.models[0] ? cuerpo.models[0] : null
		console.log(`[stock-minimo] intento: reporte ${reporte ? reporte.id + ' (' + reporte.created_at + ') min=' + reporte.stock_minimo : 'ausente'} generating=${cuerpo ? cuerpo.generating : '?'}`)

		await condicion()
	}, descripcion).toPass({ timeout: 240000, intervals: [8000] })
}

// ─────────────────────────────────────────────────────────────────────────────────────────────

test.describe.serial('Alertas · Stock mínimo: el mínimo por depósito llega a los chips, la tabla y el badge', () => {

	test('punto de partida: los dos artículos sin mínimo, y el reporte limpio', async ({ page }) => {
		test.setTimeout(360000)

		const { ids } = await leer_articulos(page, [ARTICULO_CON_FALTANTE, ARTICULO_EN_EL_LIMITE])
		contexto.ids = ids

		contexto.costo = await celda_numerica(page, 'article', 'cost', ids[ARTICULO_CON_FALTANTE])
		expect(contexto.costo, `"${ARTICULO_CON_FALTANTE}" tiene que tener costo cargado`).toBeGreaterThan(0)

		// Limpieza defensiva: si una corrida anterior quedó a mitad, los mínimos siguen puestos.
		contexto.amount[ARTICULO_CON_FALTANTE] = await configurar_minimo(page, ids[ARTICULO_CON_FALTANTE], 0)
		contexto.amount[ARTICULO_EN_EL_LIMITE] = await configurar_minimo(page, ids[ARTICULO_EN_EL_LIMITE], 0)

		await abrir_stock_minimo(page)

		// El reporte limpio es el que NO lista a ninguno de los dos (medido por el endpoint).
		await esperar_reporte(page, async () => {
			expect(await total_en_el_reporte(page, ARTICULO_CON_FALTANTE)).toBe(0)
			expect(await total_en_el_reporte(page, ARTICULO_EN_EL_LIMITE)).toBe(0)
		}, 'el reporte tenía que quedar sin los dos artículos del spec')

		contexto.base = await leer_chips(page)
		expect(contexto.base, 'el resumen de chips tenía que estar dibujado').not.toBeNull()

		console.log(`[stock-minimo] base: ${JSON.stringify(contexto.base)} · costo ${contexto.costo} · stock ${JSON.stringify(contexto.amount)}`)
	})

	test('el mínimo por depósito suma la alerta, el faltante suma plata, y la igualdad suma solo conteo', async ({ page }) => {
		test.setTimeout(360000)

		// Hace falta una página con sesión para el evaluate: cualquier vista sirve.
		await abrir_stock_minimo(page)

		// Mínimo por ENCIMA del stock: alerta con faltante. Mínimo IGUAL al stock: alerta sin faltante.
		const amount_faltante = await configurar_minimo(
			page,
			contexto.ids[ARTICULO_CON_FALTANTE],
			contexto.amount[ARTICULO_CON_FALTANTE] + FALTANTE
		)
		const amount_limite = await configurar_minimo(
			page,
			contexto.ids[ARTICULO_EN_EL_LIMITE],
			contexto.amount[ARTICULO_EN_EL_LIMITE]
		)

		// El amount no tenía que moverse entre los dos PUT de cada artículo.
		expect(amount_faltante).toBe(contexto.amount[ARTICULO_CON_FALTANTE])
		expect(amount_limite).toBe(contexto.amount[ARTICULO_EN_EL_LIMITE])

		const conteo_esperado = contexto.base.conteo + 2
		const reposicion_esperada = redondear(contexto.base.reposicion + FALTANTE * contexto.costo)

		await esperar_reporte(page, async () => {
			const chips = await leer_chips(page)
			expect(chips, 'el resumen tenía que estar dibujado').not.toBeNull()
			expect(chips.conteo, 'el chip "Bajo el mínimo" tenía que sumar las dos alertas nuevas').toBe(conteo_esperado)
			expect(
				redondear(chips.reposicion),
				`el costo de reposición tenía que subir exactamente ${FALTANTE} × ${contexto.costo}`
			).toBe(reposicion_esperada)
		}, 'el reporte con los dos mínimos configurados no llegó')

		// Los chips que no tenían por qué moverse, no se movieron.
		const chips = await leer_chips(page)
		expect(chips.sin_stock, '"Sin stock" no tenía que cambiar').toBe(contexto.base.sin_stock)
		expect(chips.negativo, '"Con stock negativo" no tenía que cambiar').toBe(contexto.base.negativo)

		// El reporte lista a los dos, cada uno por la rama del depósito (medido por el mismo
		// endpoint que consume la tabla). La IGUALDAD stock == mínimo es la segunda línea.
		expect(await total_en_el_reporte(page, ARTICULO_CON_FALTANTE), `"${ARTICULO_CON_FALTANTE}" tenía que estar en el reporte`).toBeGreaterThan(0)
		expect(await total_en_el_reporte(page, ARTICULO_EN_EL_LIMITE), 'la IGUALDAD stock == mínimo también alerta').toBeGreaterThan(0)

		// Y la representación visual, UNA vez: el buscador de la pestaña con el artículo del
		// faltante. Tipeo real (no fill: un fill con el valor que el input ya tiene no dispara
		// eventos y el fetch nunca sale) y la fila visible como aserción.
		const buscador = page.locator('[data-testid="stock-minimo-buscador"]')
		await buscador.click()
		await buscador.pressSequentially(ARTICULO_CON_FALTANTE, { delay: 25 })
		await expect(
			page.locator('[data-testid="stock-minimo-tabla"] tbody tr').filter({ hasText: ARTICULO_CON_FALTANTE }).first(),
			'la tabla de la pestaña tenía que listar al artículo bajo el mínimo'
		).toBeVisible({ timeout: 15000 })

		// 🔴 El badge de la pestaña dice lo mismo que el chip (el arreglo del 3/9/2026: antes
		// leía una relación que el endpoint ya no manda y quedaba clavado en 0).
		const badge = await page.evaluate(() => {
			const item = document.querySelector('[data-testid="nav-item-Stock minimo"]')
			const b = item ? item.querySelector('.badge') : null
			return b ? Number(b.innerText.trim()) : 0
		})
		expect(badge, 'el badge de la pestaña tiene que mostrar el contador del reporte').toBe(chips.conteo)
	})

	test('limpieza: los mínimos vuelven a cero para la próxima corrida', async ({ page }) => {
		await abrir_stock_minimo(page)
		await configurar_minimo(page, contexto.ids[ARTICULO_CON_FALTANTE], 0)
		await configurar_minimo(page, contexto.ids[ARTICULO_EN_EL_LIMITE], 0)
	})
})
