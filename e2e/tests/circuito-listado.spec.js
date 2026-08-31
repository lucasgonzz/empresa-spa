// Circuito del LISTADO DE ARTICULOS: alta de un articulo y actualizacion masiva.
//
// Segundo de los archivos del circuito e2e completo. Cubre:
//
//   1. Crear un articulo desde el propio listado.
//   2. Filtrar el listado por proveedor.
//   3. Subirle un porcentaje a los costos de todos los articulos de ese proveedor, de una.
//   4. Prender y apagar la disponibilidad en el ecommerce, tambien de una.
//
// Depende del fixture determinista de empresa-api
// (database/seeders/testing/TestingFerreteriaSeeder.php), y en particular de dos cosas que ese
// fixture siembra desde el 31/8/2026: la extension `online` habilitada para el usuario (sin ella
// el campo "Disponible en la tienda" NO EXISTE en ninguna pantalla) y el proveedor "Buenos Aires".
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// Lo que hay que saber antes de tocar este archivo
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// 🔴 1. Serial y por DIFERENCIA, igual que el resto de los circuitos. El costo de un articulo del
//    fixture arranca en lo que dejo la corrida anterior --y este archivo justamente lo sube un 5%
//    cada vez que corre--, asi que lo unico afirmable es cuanto CAMBIO.
//
// 🔴 2. La lupa del filtro de una columna es INCLICKEABLE hasta que el mouse pasa por el
//    encabezado. No esta tapada por nada: su contenedor tiene `max-width: 0` y
//    `pointer-events: none`, y una regla `th:hover` lo abre. Playwright lo reporta como
//    *"`<div class="cont-th">` intercepts pointer events"*, que hace pensar en un elemento encima
//    cuando el que "tapa" es el propio ancestro del boton. Ver e2e/README.md.
//
// 🔴 3. La opcion "Actualizar" del dropdown de filtrados viene DESHABILITADA mientras no haya un
//    filtro aplicado, y clickearla no da ningun error: no pasa nada. Por eso el filtro va primero
//    y este archivo lo verifica antes de seguir.
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')
const { abrir_pestania, completar_campo, search_and_select, crear_desde_buscador } = require('../helpers/formulario')
const { numero_de_pantalla, numero_de_dato, redondear } = require('../helpers/numeros')

// ── Datos de entrada ─────────────────────────────────────────────────────────────────────────

/** Proveedor del fixture sobre cuyos articulos se hace la masiva. */
const PROVEEDOR = 'Buenos Aires'
/** Porcentaje que la masiva le suma a los costos. */
const AUMENTO = 5
/** Costo con el que nace el articulo que crea este circuito. */
const COSTO_INICIAL = 800

// ── Estado compartido entre los tests seriales ───────────────────────────────────────────────

const contexto = {
	/** Nombre del articulo que este circuito crea. Unico por corrida. */
	articulo: `E2E Listado ${Date.now()}`,
	/** Id del articulo creado. */
	id_creado: null,
	/** id -> costo de cada articulo del proveedor, ANTES de la masiva. */
	costos_previos: {},
}

// ── Helpers de este archivo ──────────────────────────────────────────────────────────────────

/**
 * Entra al listado de articulos con los recursos del arranque ya descargados.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function abrir_listado(page) {
	await page.goto('/listado-de-articulos')
	await esperar_recursos_descargados(page, { abrir_panel: false })
	// La primera celda es la señal de que la grilla ya trajo datos: hasta entonces no hay ninguna
	// fila y cualquier conteo daria cero.
	await expect(page.locator('[data-testid^="celda-article-name-"]').first()).toBeVisible()
}

/**
 * Deja el listado filtrado por un proveedor.
 *
 * 🔴 El `hover` sobre el encabezado no sobra y no es un workaround: es lo que hace CLICKEABLE a la
 * lupa. Su contenedor (`.cont-filter-buttons`) vive con `max-width: 0`, `opacity: 0` y
 * `pointer-events: none`, y la regla `th:hover` de display/table/Index.vue es la unica que lo abre.
 * Sin el hover, Playwright falla con "intercepts pointer events" nombrando al ANCESTRO del boton,
 * que es un mensaje que manda a buscar un elemento encima que no existe.
 *
 * Las dos acciones van seguidas y en el mismo test a proposito: si el puntero se va del encabezado
 * en el medio, el contenedor se vuelve a cerrar.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} proveedor Nombre del proveedor, tal cual lo muestra el buscador.
 * @returns {Promise<void>}
 */
async function filtrar_por_proveedor(page, proveedor) {
	const lupa = page.locator('[data-testid="btn-abrir-filtro-provider_id"]')
	const encabezado = page.locator('th').filter({ has: lupa })

	await encabezado.hover()
	await lupa.click()

	// 🔴 El filtro de "Proveedor" es un BUSCADOR, no un select, porque la columna es `type: 'search'`
	//    en src/models/article.js (`display/table/filter/Search.vue`, no `Select.vue`). Por eso no
	//    hay boton "Filtrar" que apretar: elegir el proveedor en el buscador YA aplica el filtro.
	await search_and_select(page, 'filtro-search-provider_id', proveedor)

	// 🔴 Elegir el proveedor en el buscador NO filtra: solo deja el criterio cargado. Lo que sale a
	//    buscar es el boton "Filtrar" del pie del modal (`btn-modal-filtrar`); el de al lado,
	//    "Agregar filtro", guarda el criterio y tampoco busca.
	//
	//    Cerrar el modal con Escape --que es lo que hacia este helper-- deja el listado SIN filtrar
	//    y el sintoma no se parece en nada a eso: el boton de limpiar el filtro de la columna igual
	//    aparece (mira si el filtro tiene valor, no si corrio), asi que desde afuera se ve filtrado.
	//    Lo que delata el enganio esta tres pasos mas adelante: la opcion "Actualizar" de la masiva
	//    sigue deshabilitada, porque el store todavia tiene `filtered_without_filter_form` en true.
	await page.locator('[data-testid="btn-modal-filtrar"]').click()

	// Y el modal tiene que irse: mientras siga abierto intercepta cualquier click posterior, y el
	// error nombra al modal en vez de al boton que se quiso tocar.
	await expect(
		page.locator('#filter-modal-article___BV_modal_outer_'),
		'el modal de filtros quedo abierto y va a tapar todo lo que siga'
	).toHaveCount(0)

	// 🔴 La condicion de "el listado esta filtrado" es que TODAS las filas sean de ese proveedor, y
	//    no que aparezca el boton de limpiar el filtro. Ese boton mira si el filtro tiene VALOR, no
	//    si llego a correr, asi que se dibuja igual con la grilla sin filtrar -- y entonces una
	//    lectura de la linea de base se lleva articulos de otros proveedores sin que nada lo avise.
	//    Costo una corrida: el spec fallaba sobre "Pata de cama", que es de Rosario y nunca tuvo que
	//    haber estado ahi.
	//
	//    Se reintenta porque la grilla se recarga por su cuenta despues del filtro: lo que se espera
	//    es que TERMINE de recargarse, no que el filtro exista.
	await expect(async () => {
		const proveedores = await page.evaluate(() => {
			return [...document.querySelectorAll('[data-testid^="celda-article-provider_id-"]')]
				.map(celda => celda.innerText.trim())
		})

		expect(proveedores.length, 'el listado quedo sin filas').toBeGreaterThan(0)

		const ajenas = [...new Set(proveedores.filter(nombre => nombre !== proveedor))]
		expect(
			ajenas,
			`el listado todavia muestra articulos de otros proveedores (${ajenas.join(', ')}): el filtro no llego a aplicarse`
		).toEqual([])
	}).toPass({ timeout: 30000 })
}

/**
 * Lee, de todas las filas visibles del listado, el id y el valor numerico de una columna.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} key Columna a leer (ej. "cost").
 * @returns {Promise<Object<string, number>>} id del articulo -> valor.
 */
async function leer_columna(page, key) {
	return page.evaluate(clave => {
		const valores = {}
		document.querySelectorAll(`[data-testid^="celda-article-${clave}-"]`).forEach(celda => {
			const id = celda.dataset.testid.replace(`celda-article-${clave}-`, '')
			// Mismo parser que numero_de_pantalla: la celda se imprime en es-AR (miles ".",
			// decimal ","). Se resuelve aca adentro porque este codigo corre en el navegador.
			const limpio = celda.innerText.replace(/[^\d.,-]/g, '')
			valores[id] = limpio === '' || limpio === '-'
				? NaN
				: Number(limpio.split('.').join('').replace(',', '.'))
		})
		return valores
	}, key)
}

/**
 * Clickea algo que tiene que abrir un modal de ModelForm, REINTENTANDO hasta que el modal exista.
 *
 * 🔴 El reintento no es un sleep disfrazado. Todo lo que abre un ModelForm pasa por `setModel()`
 * (common-vue/mixins/display.js), que adentro de un `setTimeout(..., 30)` hace
 * `$bvModal.show(model_name)`. Si el `<model>` --componente async-- todavia no cargo su chunk, ese
 * `show()` es un NO-OP SILENCIOSO de BootstrapVue. El sintoma es un click que anda bien y no abre
 * nada, sin un solo error de consola.
 *
 * ⚠️ La condicion es la EXISTENCIA del outer y no su visibilidad: un `.modal` de Bootstrap tiene
 * `position: fixed`, y para un elemento fijo `offsetParent` es siempre null.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} testid Elemento a clickear.
 * @param {string} model_name Modelo cuyo modal tiene que abrirse.
 * @returns {Promise<void>}
 */
async function abrir_modal_con(page, testid, model_name) {
	const modal = page.locator(`#${model_name}___BV_modal_outer_`)

	await expect(async () => {
		await page.locator(`[data-testid="${testid}"]`).click()
		await expect(modal).toBeAttached({ timeout: 3000 })
	}).toPass({ timeout: 30000 })
}

/**
 * Cambia de grupo dentro del modal de la actualizacion masiva.
 *
 * 🔴 No sirve `abrir_pestania()` de helpers/formulario.js: ese helper se acota a
 * `#<model_name>___BV_modal_outer_`, y el modal de la masiva NO se llama como el modelo --se llama
 * `article-update-models`--. Acotarlo importa: la nav del modulo que quedo detras usa el mismo
 * componente y los mismos `nav-item-<nombre>`.
 *
 * 🔴 Y hay que cambiar de grupo: el modal abre en "Datos generales" y **solo renderiza los campos
 * del grupo activo**, igual que ModelForm. El costo vive en "Precio" y la disponibilidad en la
 * tienda en "Tienda online"; buscarlos sin cambiar de grupo se va en timeout apuntando a un campo
 * que existe en el modelo y no en la pantalla.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} nombre Titulo del grupo, tal cual lo declara src/models/article.js.
 * @returns {Promise<void>}
 */
async function abrir_grupo_de_masiva(page, nombre) {
	await page.locator('#article-update-models___BV_modal_outer_')
		.locator(`[data-testid="nav-item-${nombre}"]`)
		.click()
}

/**
 * Abre la actualizacion masiva del conjunto FILTRADO.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function abrir_masiva_de_filtrados(page) {
	await page.locator('[data-testid="masiva-dropdown-filtrados"]').click()

	const opcion = page.locator('[data-testid="masiva-opcion-actualizar-filtrados"]')
	// 🔴 Si no hay filtro aplicado, esta opcion esta deshabilitada y clickearla NO hace nada ni
	//    avisa. Se verifica antes de clickear para que el rojo diga que falto filtrar, y no aparezca
	//    veinte lineas mas abajo como "no encuentro el modal".
	await expect(opcion, 'la opcion de actualizar masivo tenia que estar habilitada con el filtro puesto')
		.not.toHaveAttribute('aria-disabled', 'true')
	await opcion.click()

	await expect(page.locator('#article-update-models___BV_modal_outer_')).toBeAttached()
}

// ─────────────────────────────────────────────────────────────────────────────────────────────

test.describe.serial('Listado: alta de articulo y actualizacion masiva', () => {

	test('crea un articulo desde el listado', async ({ page }) => {
		await abrir_listado(page)

		await abrir_modal_con(page, 'btn-crear-article', 'article')

		// 🔴 El nombre de un articulo NUEVO no es un campo de texto: es un BUSCADOR. Mientras no haya
		//    codigo de barras ni codigo de proveedor, `listado/components/NameInput.vue` dibuja un
		//    search-component sobre articulos --para que no des de alta uno que ya existe-- y son DOS
		//    Enter: el primero busca, el segundo confirma que el nombre se use para uno nuevo. Es
		//    exactamente el flujo de `crear_desde_buscador`, que ya lo tiene resuelto con sus trampas
		//    (tecleo real para que el primer Enter busque en vez de seleccionar, y la asercion del
		//    medio que distingue "busque y no hay" de "todavia no busque").
		//
		//    Documentado del lado del usuario en manual_sistema/listado/identificacion.md.
		await crear_desde_buscador(page, 'article-name', contexto.articulo)

		// El mismo proveedor de la masiva: asi el articulo recien creado tambien tiene que recibir
		// el aumento, que es la unica forma de probar que la masiva alcanza a TODO el conjunto
		// filtrado y no solo a lo que ya estaba.
		await search_and_select(page, 'article-provider_id', PROVEEDOR)

		// 🔴 El costo vive en la pestaña "Precio" y el nombre y el proveedor en "Datos generales":
		//    ModelForm solo renderiza los campos del grupo activo, los demas NO estan en el DOM.
		await abrir_pestania(page, 'article', 'Precio')
		await completar_campo(page, 'article-cost', COSTO_INICIAL)

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/article') && res.request().method() === 'POST'),
			page.locator('[data-testid="btn-guardar-article"]').click(),
		])
		const cuerpo = await respuesta.json()
		contexto.id_creado = cuerpo.model ? String(cuerpo.model.id) : null
		expect(contexto.id_creado, 'el POST del articulo no devolvio un modelo con id').not.toBeNull()

		console.log(`[listado] articulo creado: ${contexto.articulo} (id ${contexto.id_creado})`)
	})

	test('linea de base: se anotan los costos de los articulos del proveedor', async ({ page }) => {
		await abrir_listado(page)
		await filtrar_por_proveedor(page, PROVEEDOR)

		contexto.costos_previos = await leer_columna(page, 'cost')

		const cantidad = Object.keys(contexto.costos_previos).length
		expect(cantidad, 'el filtro por proveedor no dejo ningun articulo').toBeGreaterThan(0)
		expect(
			contexto.costos_previos[contexto.id_creado],
			'el articulo recien creado tenia que quedar dentro del filtro por proveedor'
		).toBe(COSTO_INICIAL)

		console.log(`[listado] ${cantidad} articulos de "${PROVEEDOR}" en la linea de base`)
	})

	test(`la actualizacion masiva sube ${AUMENTO}% los costos de todos los articulos del proveedor`, async ({ page }) => {
		// Presupuesto propio, mas alto que el del resto: este paso no es lento por la interfaz sino
		// porque ESPERA UN JOB en segundo plano, y cada reintento vuelve a entrar al listado y a
		// filtrar. Subir el timeout aca esta justificado por una causa entendida; no es tapar lentitud.
		test.setTimeout(420000)

		await abrir_listado(page)
		await filtrar_por_proveedor(page, PROVEEDOR)
		await abrir_masiva_de_filtrados(page)

		await abrir_grupo_de_masiva(page, 'Precio')

		// El campo Costo se opera en modo "aumentar %": son tres modos excluyentes (bajar %,
		// aumentar % y fijar valor) y solo se renderiza el input del modo activo.
		await page.locator('[data-testid="masiva-modo-cost-increment"]').click()
		await completar_campo(page, 'masiva-valor-cost', AUMENTO)

		const [respuesta] = await Promise.all([
			page.waitForResponse(res => res.url().includes('/article') && res.request().method() === 'PUT'),
			page.locator('[data-testid="btn-confirmar-masiva"]').click(),
		])
		expect(respuesta.ok(), 'el PUT de la actualizacion masiva no salio bien').toBeTruthy()

		// 🔴 La masiva es ASINCRONICA: el PUT no aplica nada, ENCOLA un `ProcessMasiveUpdateJob` y
		//    responde 200 al toque (el log de la API lo dice con todas las letras: "actualizacion
		//    masiva encolada"). Sin un worker corriendo, el job queda en `pending` para siempre y los
		//    costos no se mueven -- con la peticion en 200 y sin un solo error en pantalla.
		//
		//    El entorno e2e necesita `php artisan queue:work` corriendo al lado de la API. Ver
		//    e2e/README.md.
		//
		//    Por eso la verificacion se REINTENTA: se vuelve a entrar al listado hasta que el job haya
		//    terminado. No se confia en que la grilla se refresque sola, que ademas no lo hace: lo que
		//    interesa es lo que quedo GUARDADO.
		await expect(async () => {
			await abrir_listado(page)
			await filtrar_por_proveedor(page, PROVEEDOR)

			const ahora = await leer_columna(page, 'cost')

			for (const id of Object.keys(contexto.costos_previos)) {
				const esperado = redondear(contexto.costos_previos[id] * (1 + AUMENTO / 100))
				expect(
					redondear(ahora[id]),
					`el costo del articulo ${id} tenia que subir ${AUMENTO}% (¿esta corriendo el worker de la cola?)`
				).toBe(esperado)
			}

			contexto.costos_ahora = ahora
		}).toPass({ timeout: 180000 })

		const ahora = contexto.costos_ahora

		// Y que efectivamente haya cambiado algo: si todos los costos fueran 0, la asercion de
		// arriba pasaria sin probar nada.
		const alguno = Object.keys(contexto.costos_previos).find(id => contexto.costos_previos[id] > 0)
		expect(alguno, 'ningun articulo del proveedor tenia costo, la asercion del aumento no probaria nada').toBeDefined()

		contexto.costos_previos = ahora
	})

	/*
	 * 🔴 Apagar y volver a prender son DOS tests y no un loop adentro de uno, por la misma razon que
	 * en circuito-compra.spec.js: cada vuelta se lleva una masiva, una navegacion al listado con su
	 * descarga de recursos y la apertura del articulo. Las dos vueltas juntas no entran en el
	 * presupuesto de 4 minutos por test.
	 *
	 * Y van las dos, no solo la de apagar: `online` viene en 1 por default de la migracion, asi que
	 * dejarlo apagado le cambiaria el punto de partida a cualquier otro circuito que corra despues.
	 */
	test('la actualizacion masiva saca los articulos del ecommerce', async ({ page }) => {
		// Espera un job en segundo plano, igual que la masiva de costos.
		test.setTimeout(420000)

		await masiva_de_ecommerce(page, 'desactivar')
	})

	test('y la actualizacion masiva los vuelve a poner en el ecommerce', async ({ page }) => {
		// Espera un job en segundo plano, igual que la masiva de costos.
		test.setTimeout(420000)

		await masiva_de_ecommerce(page, 'activar')
	})
})

/**
 * Corre la actualizacion masiva sobre el campo "Disponible en la tienda" y verifica el resultado
 * en el articulo, que es donde lo veria el operador: el listado no tiene columna para `online`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'activar'|'desactivar'} accion
 * @returns {Promise<void>}
 */
async function masiva_de_ecommerce(page, accion) {
	await abrir_listado(page)
	await filtrar_por_proveedor(page, PROVEEDOR)
	await abrir_masiva_de_filtrados(page)
	await abrir_grupo_de_masiva(page, 'Tienda online')

	// 🔴 Este campo solo existe si la cuenta tiene la extension `online`. Si no aparece, no es que
	//    la masiva no lo soporte: es que la extension no esta habilitada y `if_has_extencion` lo
	//    filtra de plano, en el formulario del articulo tambien. La asercion lo dice asi para que
	//    el rojo mande a mirar el fixture y no el componente.
	await expect(
		page.locator('[data-testid="masiva-campo-online"]'),
		'no aparecio "Disponible en la tienda": la cuenta del fixture necesita la extension "online"'
	).toBeVisible()

	await page.locator(`[data-testid="masiva-checkbox-online-${accion}"]`).click()

	const [respuesta] = await Promise.all([
		page.waitForResponse(res => res.url().includes('/article') && res.request().method() === 'PUT'),
		page.locator('[data-testid="btn-confirmar-masiva"]').click(),
	])
	expect(respuesta.ok(), `el PUT de la masiva de ecommerce (${accion}) no salio bien`).toBeTruthy()

	// Se vuelve a filtrar antes de buscar la fila: sin filtro, el listado trae TODOS los articulos
	// y el que creo este circuito --que tiene el id mas alto-- puede quedar fuera de la primera
	// pagina. Filtrado por su proveedor, el conjunto es chico y estable.
	// 🔴 Igual que la masiva de costos: el PUT solo ENCOLA el trabajo. Se reintenta la lectura hasta
	//    que el job haya corrido. Sin worker de cola levantado, esto no termina nunca -- y el mensaje
	//    de la asercion lo dice, para no mandar a nadie a buscar el problema en la interfaz.
	await expect(async () => {
		await abrir_listado(page)
		await filtrar_por_proveedor(page, PROVEEDOR)
		await abrir_modal_con(page, `celda-article-name-${contexto.id_creado}`, 'article')
		await abrir_pestania(page, 'article', 'Tienda online')

		const disponible = page.locator('[data-testid="article-online"]')

		if (accion === 'desactivar') {
			await expect(
				disponible,
				'la masiva tenia que dejar el articulo FUERA de la tienda (¿esta corriendo el worker de la cola?)'
			).not.toBeChecked({ timeout: 5000 })
		} else {
			await expect(
				disponible,
				'la masiva tenia que devolver el articulo a la tienda (¿esta corriendo el worker de la cola?)'
			).toBeChecked({ timeout: 5000 })
		}
	}).toPass({ timeout: 180000 })
}
