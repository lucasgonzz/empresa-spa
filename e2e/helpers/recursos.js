// Espera de la descarga de recursos del arranque.
//
// Al entrar al sistema, download-resources/Index.vue se pasa varios segundos bajando ~70
// catalogos (rubros, proveedores, tipos de precio, preferencias de columnas...). Hasta que eso
// no termina, media aplicacion no esta en condiciones de ser usada: los selects vienen vacios,
// el buscador de articulos todavia no sabe con que columnas dinamicas trabajar, y las
// preferencias de columnas de las tablas se calculan recien cuando llego el ultimo. Un test que
// arranca antes no encuentra un bug: encuentra el sistema a medio cargar.
//
// El error clasico al escribir esto es esperar a que la TARJETA de progreso desaparezca. No
// sirve: la tarjeta se esconde sola 3 segundos despues de terminar, o sea que "no esta" tanto
// cuando la descarga termino como cuando todavia no empezo (aparece recien ~1 s despues de
// montar el componente). La condicion estable es el data-estado del elemento raiz de
// download-resources/Index.vue, que vive mientras viva la nav.
const { expect } = require('@playwright/test')

/**
 * Cuanto se le da a la descarga completa. Son ~70 requests contra la API local; en una maquina
 * cargada (seis slots trabajando a la vez) los 30 segundos por defecto de Playwright se quedan
 * cortos sin que haya nada roto.
 */
const TIMEOUT_DESCARGA = 120000

/** Elemento raiz de download-resources/Index.vue. Lleva data-estado, data-descargados y data-total. */
const MARCADOR = '[data-testid="recursos-estado"]'
/** Tarjeta de progreso de arriba a la derecha. Se clickea para desplegar el panel. */
const TARJETA = '[data-testid="recursos-tarjeta"]'
/** Panel lateral con el detalle recurso por recurso. El id lo pone el b-sidebar. */
const PANEL = '#download-resources'
/** Boton de cerrar del panel. */
const PANEL_CERRAR = '[data-testid="recursos-panel-cerrar"]'
/** Una fila por recurso dentro del panel. */
const PANEL_FILA = '[data-testid="recursos-panel-fila"]'

/**
 * Despliega el panel lateral de recursos clickeando la tarjeta de progreso.
 *
 * Devuelve false --sin fallar-- si la tarjeta no llego a aparecer. Pasa cuando la descarga fue
 * tan corta que la ventana de la tarjeta ya se cerro. Que el panel se abra es lo que este helper
 * VERIFICA cuando puede, pero no es la condicion que gatilla el test: esa es data-estado="listo",
 * y se chequea igual mas abajo.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} timeout milisegundos de espera por la tarjeta.
 * @returns {Promise<boolean>} si el panel quedo abierto.
 */
async function abrir_panel_de_recursos(page, timeout = 30000) {
	const tarjeta = page.locator(TARJETA)

	try {
		await tarjeta.waitFor({ state: 'visible', timeout: timeout })
	} catch (error) {
		console.log('[recursos] la tarjeta de progreso no aparecio en ' + timeout + ' ms; se sigue sin abrir el panel')
		return false
	}

	await tarjeta.click()

	const panel = page.locator(PANEL)
	await expect(panel).toBeVisible({ timeout: 5000 })
	// Un panel vacio querria decir que se abrio otro b-sidebar, o que la lista nunca se armo.
	await expect(page.locator(PANEL_FILA).first()).toBeVisible({ timeout: 5000 })

	return true
}

/**
 * Cierra el panel lateral de recursos, si esta abierto.
 *
 * Hay que cerrarlo antes de seguir con el test: son 360px pegados al borde derecho por encima de
 * la aplicacion, y cualquier control que quede abajo no se puede clickear.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function cerrar_panel_de_recursos(page) {
	const panel = page.locator(PANEL)

	if (!(await panel.isVisible())) {
		return
	}

	await page.locator(PANEL_CERRAR).click()
	await expect(panel).toBeHidden({ timeout: 5000 })
}

/**
 * Espera a que el sistema termine de descargar los recursos del arranque.
 *
 * Por defecto hace el recorrido completo tal como lo haria una persona que quiere ver que esta
 * pasando: clickea la tarjeta, mira el detalle en el panel, y recien cuando esta todo listo lo
 * cierra y sigue.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [opciones]
 * @param {boolean} [opciones.abrir_panel=true] desplegar el panel clickeando la tarjeta.
 * @param {boolean} [opciones.cerrar_panel=true] volver a cerrarlo al terminar.
 * @param {number} [opciones.timeout=120000] espera maxima por la descarga completa.
 * @returns {Promise<void>}
 */
async function esperar_recursos_descargados(page, opciones = {}) {
	const abrir = opciones.abrir_panel !== false
	const cerrar = opciones.cerrar_panel !== false
	const timeout = opciones.timeout || TIMEOUT_DESCARGA

	const marcador = page.locator(MARCADOR)

	// El componente entra por import() dinamico desde NavVertical.vue, asi que su chunk puede
	// tardar en llegar: el marcador no esta en el DOM en el instante en que termina la navegacion.
	// Se espera "attached" y no "visible" a proposito -- es un div sin contenido propio.
	await marcador.waitFor({ state: 'attached', timeout: timeout })

	let panel_abierto = false
	if (abrir) {
		panel_abierto = await abrir_panel_de_recursos(page, timeout)
	}

	// LA condicion. Todo lo de arriba es para poder mirar; esto es lo que gatilla el test.
	await expect(marcador).toHaveAttribute('data-estado', 'listo', { timeout: timeout })

	const total = await marcador.getAttribute('data-total')
	console.log('[recursos] descarga terminada: ' + total + ' recursos')

	if (panel_abierto && cerrar) {
		await cerrar_panel_de_recursos(page)
	}
}

module.exports = {
	TIMEOUT_DESCARGA,
	MARCADOR,
	TARJETA,
	PANEL,
	PANEL_FILA,
	abrir_panel_de_recursos,
	cerrar_panel_de_recursos,
	esperar_recursos_descargados,
}
