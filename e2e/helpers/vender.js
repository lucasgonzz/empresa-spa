// Helpers compartidos por los circuitos del modulo Vender.
//
// Los tres circuitos de venta --mostrador, presupuesto y multipago/devolucion-- hacen las mismas
// cinco o seis maniobras: entrar a Vender, meter un articulo, elegir una opcion de un select cuya
// etiqueta lleva datos adosados, leer el total, leer el stock del listado y leer el saldo de una
// caja. Estaban escritas una vez por archivo y cada copia aprendia las trampas por su cuenta.
//
// Lo que vive aca es lo que **no** es propio de un circuito. La linea de base, el `contexto`
// compartido y las aserciones siguen en cada archivo: son lo que ese circuito afirma.

const { expect } = require('@playwright/test')
const { esperar_recursos_descargados } = require('./recursos')
const { search_and_select } = require('./formulario')
const { numero_de_pantalla, numero_de_dato, redondear } = require('./numeros')

/**
 * Lee una celda numerica de una tabla por su testid de solo lectura.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} model_name
 * @param {string} key
 * @param {number|string} id
 * @returns {Promise<number>}
 */
async function celda_numerica(page, model_name, key, id) {
	const celda = page.locator(`[data-testid="celda-${model_name}-${key}-${id}"]`)
	await expect(celda).toBeVisible()

	return numero_de_pantalla(await celda.innerText())
}

/**
 * Busca UN articulo en el listado con el buscador general y devuelve su id.
 *
 * 🔴 Mirar "lo que el listado esta mostrando" no sirve, por dos motivos que se acumulan y que
 * costaron corridas el 31/8/2026:
 *
 *   1. El listado por defecto trae **pagina 1 ordenada por id descendente**
 *      (`runListadoPorDefecto`). Con la base ya usada --y cada corrida crea articulos nuevos-- los
 *      del fixture, que tienen los ids mas bajos, se caen de esa pagina.
 *   2. El listado ademas **recuerda el ultimo filtro**, entre specs y entre corridas: no vive en la
 *      pagina, lo restaura el sistema al entrar.
 *
 * En los dos casos el rojo dice `no encontre el articulo "X" en el listado`, con el articulo
 * perfectamente vivo en la base, y manda a dudar del nombre.
 *
 * ⚠️ El nombre no puede tener caracteres especiales: "Clavos N° 2" llegaba al input como `°` a
 * secas.
 *
 * Asume que la pagina ya esta en el listado.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} nombre
 * @returns {Promise<string>}
 */
async function buscar_articulo(page, nombre) {
	let id = null

	// 🔴 El tecleo y el click van ADENTRO del reintento, no antes. Reintentar solo la lectura no
	//    sirve: si la busqueda no llego a correr, la pantalla se queda mostrando lo anterior y el
	//    reintento relee el mismo DOM equivocado hasta agotarse.
	await expect(async () => {
		const buscador = page.locator('[data-testid="buscador-general"]')
		await expect(buscador, 'el listado tenia que tener su buscador general').toBeVisible()

		// 🔴 Tecleo real, no `fill()`. Es la misma trampa que ya documenta `search_and_select`:
		//    `fill()` escribe el valor en el DOM pero el componente no se entera --`query_value`
		//    se queda vacio-- y entonces `buscar()` corta en su primera linea sin mandar ningun
		//    pedido. El sintoma es brutal de leer: el input MUESTRA el texto buscado y la grilla
		//    sigue con el listado de antes, sin error, sin request, sin nada.
		await buscador.click()
		await buscador.fill('')
		await buscador.pressSequentially(nombre, { delay: 30 })

		await expect(
			buscador,
			`no se pudo escribir "${nombre}" en el buscador del listado`
		).toHaveValue(nombre, { timeout: 5000 })

		// 🔴 La busqueda se dispara con la LUPA. Y se espera la RESPUESTA del pedido, no la grilla:
		//    leer el DOM apenas se clickea devuelve el listado anterior.
		const [respuesta] = await Promise.all([
			page.waitForResponse(
				res => res.url().includes('/global-search/') && res.request().method() === 'POST',
				{ timeout: 20000 }
			),
			page.locator('[data-testid="buscador-general-lupa"]').click(),
		])

		expect(respuesta.ok(), 'la busqueda del listado no salio bien').toBeTruthy()

		await expect(page.locator('[data-testid^="celda-article-name-"]').first()).toBeVisible({ timeout: 10000 })

		id = await page.evaluate(texto => {
			const celda = [...document.querySelectorAll('[data-testid^="celda-article-name-"]')]
				.find(c => c.innerText.trim() === texto)
			return celda ? celda.dataset.testid.replace('celda-article-name-', '') : null
		}, nombre)

		expect(id, `no encontre el articulo "${nombre}" en el listado`).not.toBeNull()
	}).toPass({ timeout: 60000 })

	return id
}

/**
 * Deja el listado sin filtros ni busqueda, si quedo alguno puesto.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function limpiar_busqueda_del_listado(page) {
	const reiniciar = page.locator('[data-testid="btn-reiniciar-filtros"]')

	if (await reiniciar.count() > 0) {
		await reiniciar.click()
	}
}

/**
 * Entra al listado de articulos y devuelve, por nombre, el id y el stock de cada uno.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string[]} nombres
 * @returns {Promise<{ids: Object, stock: Object}>}
 */
async function leer_articulos(page, nombres) {
	await page.goto('/listado-de-articulos')
	await esperar_recursos_descargados(page, { abrir_panel: false })

	const ids = {}
	const stock = {}

	for (const nombre of nombres) {
		const id = await buscar_articulo(page, nombre)

		ids[nombre] = id
		stock[nombre] = await celda_numerica(page, 'article', 'stock', id)
	}

	// Se deja el listado como estaba: una busqueda del buscador general tambien queda pegada, y el
	// que ensucia limpia.
	await limpiar_busqueda_del_listado(page)

	return { ids, stock }
}

/**
 * Saldo de una caja, leido del modulo de tesoreria.
 *
 * 🔴 La ruta es `/caja`, en SINGULAR. `router/routes.js` declara el item del menu con
 * `path: '/cajas'` --eso es lo que ve el menu-- pero la que el router registra es
 * `/caja/:view?/:sub_view?`. Entrar a `/cajas` no matchea ninguna ruta y deja la pagina en blanco:
 * sin error de consola, sin 404, y con `$route.matched` vacio.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} nombre
 * @returns {Promise<number>}
 */
async function saldo_de_caja(page, nombre) {
	await page.goto('/caja')
	await esperar_recursos_descargados(page, { abrir_panel: false })

	const id = await page.evaluate(texto => {
		const celda = [...document.querySelectorAll('[data-testid^="celda-caja-name-"]')]
			.find(c => c.innerText.trim() === texto)
		return celda ? celda.dataset.testid.replace('celda-caja-name-', '') : null
	}, nombre)

	expect(id, `no encontre la caja "${nombre}" en el modulo de tesoreria`).not.toBeNull()

	return celda_numerica(page, 'caja', 'saldo', id)
}

/**
 * Entra a Vender con los recursos del arranque ya descargados.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function abrir_vender(page) {
	await page.goto('/vender')
	await esperar_recursos_descargados(page, { abrir_panel: false })
	// El selector de metodo de pago es de la etapa 1, que arranca abierta: es la señal de que la
	// pantalla ya se monto.
	await expect(page.locator('[data-testid="venta-metodo-pago"]')).toBeVisible()
}

/**
 * Agrega un articulo a la venta por el buscador por nombre y le pone la cantidad.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} nombre
 * @param {string} id Id del articulo, para ubicar su renglon.
 * @param {number} cantidad
 * @returns {Promise<void>}
 */
async function agregar_articulo(page, nombre, id, cantidad) {
	// El buscador de articulos de Vender es el `search-component` generico con `id="search-article"`,
	// asi que publica su testid solo y `search_and_select` sirve tal cual: click, tecleo real,
	// Enter que BUSCA, y click en el primer resultado.
	await search_and_select(page, 'search-article', nombre)

	// 🔴 Elegir el articulo NO lo agrega a la venta: queda PENDIENTE esperando la cantidad. El
	//    buscador ya muestra su nombre y su stock, el cursor salta al campo "Cantidad", y la venta
	//    sigue diciendo "0 productos" hasta que se confirma con Enter. Sin este paso, el renglon
	//    nunca existe y el spec se va en timeout buscando una fila que el sistema no tiene por que
	//    haber dibujado.
	//
	//    Depende de la configuracion de la cuenta (`users.ask_amount_in_vender`); el fixture lo
	//    tiene prendido, que es el comportamiento por defecto.
	const pendiente = page.locator('[data-testid="venta-cantidad-pendiente"]')
	await expect(
		pendiente,
		`"${nombre}" tenia que quedar pendiente de cantidad despues de elegirlo en el buscador`
	).toBeVisible()
	await pendiente.fill(String(cantidad))
	await pendiente.press('Enter')

	// Recien ahora existe el renglon, y con la cantidad ya puesta.
	await expect(
		page.locator(`[data-testid="venta-item-cantidad-${id}"]`),
		`"${nombre}" tenia que entrar a la venta`
	).toHaveValue(String(cantidad))
}

/**
 * Elige una opcion de un select buscandola por texto PARCIAL.
 *
 * 🔴 No sirve `selectOption({ label })`, que exige el texto exacto: las etiquetas de estos selects
 * llevan datos adosados que cambian con la configuracion de la cuenta. El metodo de pago
 * "Efectivo", con un descuento configurado, se muestra como **"3 - Efectivo (-10,00%)"** -- el
 * numero del metodo adelante y el porcentaje atras. Un test que pida el texto exacto se rompe el
 * dia que alguien cambia el descuento, y el rojo dice "did not find some options", que suena a que
 * falta la opcion.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} testid
 * @param {string} texto Parte del texto de la opcion (ej. "Efectivo").
 * @returns {Promise<void>}
 */
async function elegir_opcion_que_contenga(page, testid, texto) {
	const select = page.locator(`[data-testid="${testid}"]`)
	await expect(select).toBeVisible()

	const valor = await select.evaluate((elemento, buscado) => {
		const opcion = [...elemento.options].find(o => o.text.includes(buscado))
		return opcion ? opcion.value : null
	}, texto)

	expect(
		valor,
		`el select "${testid}" no ofrece ninguna opcion que diga "${texto}" (¿esta cerrada la caja?)`
	).not.toBeNull()

	await select.selectOption(valor)
}

/**
 * Reparte un total entre N partes sin perder ni inventar centavos.
 *
 * La ultima parte se lleva la diferencia: `chequear_total_repartido()` exige que la suma de las
 * filas de exactamente el total, y dividir con redondeo independiente puede dejar un centavo
 * colgado que corta el guardado sin decir por que.
 *
 * @param {number} total
 * @param {number} partes
 * @returns {number[]}
 */
function repartir(total, partes) {
	const importes = []
	let acumulado = 0

	for (let i = 0; i < partes - 1; i++) {
		const parte = redondear(total / partes)
		importes.push(parte)
		acumulado = redondear(acumulado + parte)
	}

	importes.push(redondear(total - acumulado))

	return importes
}

/**
 * Carga el reparto en el modal de multiples metodos de pago ("payment-method-modal").
 *
 * Cada fila publica sus tres controles con el INDICE de la fila: `pago-metodo-0`, `pago-monto-0`,
 * `pago-caja-0`, y la siguiente con el 1. La segunda fila hay que agregarla con "Agregar método de
 * pago".
 *
 * 🔴 Se llama DOS veces por venta cuando la cuenta tiene algun descuento por metodo de pago
 * configurado: el modal muestra "Calcular" antes que "Listo", y `Buttons.calcular()` rearma las
 * filas con `amount: ''`, o sea que borra los importes. Sin la segunda pasada, "Listo" no hace
 * nada --`chequear_total_repartido()` corta en silencio-- y el modal se queda abierto.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Array<{metodo: string, caja: string}>} reparto
 * @param {Object} [opciones]
 * @param {boolean} [opciones.armar_filas=false] Si hay que agregar las filas que faltan (1ra pasada).
 * @returns {Promise<number[]>} El importe que quedo cargado en cada fila.
 */
async function cargar_reparto(page, reparto, opciones) {
	opciones = opciones || {}

	// 🔴 El importe a repartir se lee DEL MODAL, no del total que muestra Vender antes de abrirlo.
	//    Parecen el mismo numero --los dos salen de `state.vender.total`-- y no lo son: **abrir el
	//    modal cambia el total**. Al abrirlo se descarta el descuento del metodo de pago elegido en
	//    el selector simple (`PaymentMethod.vue` limpia
	//    `current_acount_payment_methods_with_discounts`) y `setTotal()` recalcula sin el.
	//
	//    Medido el 31/8/2026: la pantalla decia 13.137,54 y el modal pedia repartir 14.597,27,
	//    exactamente un 10% mas --el descuento de "Efectivo", que el fixture deja como metodo por
	//    defecto--.
	const total = page.locator('[data-testid="multipago-total-a-repartir"]')
	await expect(total, 'el modal de reparto tenia que decir cuanto hay que repartir').toBeVisible()

	const importes = repartir(numero_de_dato(await total.getAttribute('data-monto')), reparto.length)

	for (let i = 0; i < reparto.length; i++) {

		if (opciones.armar_filas && i > 0) {
			await page.locator('[data-testid="btn-agregar-metodo-pago"]').click()
		}

		const monto = page.locator(`[data-testid="pago-monto-${i}"]`)
		await expect(monto, `no aparecio la fila de pago ${i}`).toBeVisible()

		await elegir_opcion_que_contenga(page, `pago-metodo-${i}`, reparto[i].metodo)

		// 🔴 Los importes se TIPEAN, incluido el de la ultima fila, y eso es a proposito: este
		//    camino custodia el arreglo del 1/9/2026 en `chequear_total_repartido()`.
		//
		//    Hasta ese dia la validacion comparaba los dos totales con `Math.trunc(x * 100) / 100`,
		//    y repartir un total con decimales dejaba un residuo de coma flotante que el truncado
		//    convertia en un centavo de diferencia. El modal mostraba el MISMO numero en "Total a
		//    repartir" y "Total repartido", el sobrante salia como `NaN`, y "Calcular" no hacia nada
		//    ni decia por que. El atajo de entonces era llenar la ultima fila con el boton
		//    "Completar" (`pago-completar-<i>`), que calcula el resto del lado del sistema.
		//
		//    Ahora la comparacion redondea, asi que tipear el reparto tiene que funcionar. Si
		//    alguien vuelve a truncar, este helper se pone rojo -- que es exactamente lo que se
		//    quiere.
		await monto.fill(String(importes[i]))
		// El importe dispara el recalculo del sobrante con un @input: sin soltar el foco, el modal
		// puede seguir creyendo que falta repartir.
		await monto.press('Tab')

		// 🔴 La caja se elige DESPUES del importe: el selector de caja de la fila solo se dibuja
		//    cuando la fila ya tiene monto. Con el orden al reves el select no existe y el rojo
		//    dice que falta la opcion de la caja.
		await elegir_opcion_que_contenga(page, `pago-caja-${i}`, reparto[i].caja)
	}

	return importes
}

/**
 * Despliega la etapa 3 de Vender ("Cierre y opciones"), donde viven los descuentos.
 *
 * 🔴 Esa etapa **arranca plegada**, y el plegado es `v-show`: los controles existen en el DOM pero
 * estan ocultos. O sea que buscarlos con `page.evaluate()` los encuentra --evaluate no mira
 * visibilidad-- y despues clickearlos falla con "element is not visible", que manda a buscar el
 * problema en el selector cuando lo que falta es abrir la etapa.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function abrir_etapa_3(page) {
	const encabezado = page.locator('[data-testid="venta-etapa-3"]')
	await expect(encabezado, 'Vender tenia que tener su etapa 3').toBeVisible()

	if (await encabezado.getAttribute('data-abierta') === 'no') {
		await encabezado.click()
	}

	await expect(encabezado, 'la etapa 3 tenia que quedar desplegada').toHaveAttribute('data-abierta', 'si')
}

/**
 * Prende o apaga uno de los toggles de Vender.
 *
 * 🔴 Estos toggles son "estilo iPhone": el `<input type="checkbox">` que lleva el `data-testid`
 * esta VISUALMENTE OCULTO y lo que se ve --y lo que se clickea-- es el `<label>` que lo envuelve,
 * con su `<span class="vender-toggle__track">` adentro. `check()` sobre el input falla con
 * "element is not visible" / "Received: hidden" aunque el elemento este perfectamente en el DOM, y
 * el rojo manda a buscar por que no se dibujo el toggle cuando el toggle esta ahi.
 *
 * Se clickea el label ancestro, que es lo que hace un usuario. Sirve para todos: los de
 * `VenderToggle.vue` (donde el testid ES el id del input) y los sueltos como
 * `venta-guardar-presupuesto`, cuyo id es otro.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} testid
 * @param {boolean} [encendido=true]
 * @returns {Promise<void>}
 */
async function poner_toggle(page, testid, encendido = true) {
	const input = page.locator(`[data-testid="${testid}"]`)
	await expect(input, `no existe el toggle "${testid}"`).toBeAttached()

	if (await input.isChecked() === encendido) {
		return
	}

	// Hay dos estructuras y las dos esconden el input:
	//   - los toggles de Vender lo envuelven en su `<label>` (ancestro),
	//   - los `b-form-checkbox` de Bootstrap-Vue lo dejan al lado de un `<label>` HERMANO
	//     (`.custom-control-input` es `opacity: 0`).
	// Se clickea el label que corresponda; si no hubiera ninguno, queda el click forzado sobre el
	// input, que dispara igual el `change`.
	const padre = input.locator('xpath=ancestor::label[1]')
	const hermano = input.locator('xpath=following-sibling::label[1]')

	if (await padre.count() > 0) {
		await padre.click()
	} else if (await hermano.count() > 0) {
		await hermano.click()
	} else {
		await input.setChecked(encendido, { force: true })
	}

	if (encendido) {
		await expect(input, `el toggle "${testid}" tenia que quedar prendido`).toBeChecked()
	} else {
		await expect(input, `el toggle "${testid}" tenia que quedar apagado`).not.toBeChecked()
	}
}

/**
 * Total que muestra Vender, leido del `data-monto` y no del texto.
 *
 * `price()` recorta los decimales cuando son ",00", asi que del texto no siempre se puede sacar el
 * numero. Mismo criterio que los renglones de Posicion Fiscal.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
async function total_de_la_venta(page) {
	const total = page.locator('[data-testid="venta-total"]')
	await expect(total).toBeVisible()

	return numero_de_dato(await total.getAttribute('data-monto'))
}

/**
 * Fecha de hoy en YYYY-MM-DD, para el control de fechas de los modulos que se ven por dia.
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
 * Entra a un modulo que se ve POR DIA y deja el dia de hoy cargado.
 *
 * 🔴 Estos modulos --ventas, presupuestos, devoluciones-- NO disparan el listado al montarse
 * (`disparar_listado_por_defecto()` en view/Index.vue se saltea los que se ven por fecha). Sin el
 * click en el dia, la tabla dice "No hay ..." con los registros en la base, que es el sintoma que
 * manda a buscar el problema en el alta.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} ruta Ruta canonica, con el parametro de vista puesto (ej. '/ventas/todas').
 * @param {Object} [opciones]
 * @param {string} [opciones.solapa] Sucursal cuya solapa hay que activar despues de cargar el dia.
 * @returns {Promise<void>}
 */
async function abrir_modulo_del_dia(page, ruta, opciones) {
	opciones = opciones || {}

	await page.goto(ruta)
	await esperar_recursos_descargados(page, { abrir_panel: false })

	const hoy = page.locator(`[data-testid="control-fecha-dia"][data-fecha="${fecha_de_hoy()}"]`)
	await expect(hoy, 'el control de fechas tenia que ofrecer el dia de hoy').toBeVisible()
	await hoy.click()

	// 🔴 El listado de ventas se parte por SUCURSAL, en una nav de solapas arriba de la tabla
	//    ("Todas" | "Principal (1)"). Una venta hecha con la sucursal Principal no se ve desde la
	//    solapa que este activa por defecto: la tabla dice "No hay Ventas" con la venta en la base
	//    y con el contador de la otra solapa marcando (1).
	// 🔴 ...pero la solapa SOLO EXISTE si el dia tiene alguna venta de esa sucursal: la nav se arma
	//    con las sucursales que aparecen en los resultados. O sea que su ausencia no es una falla,
	//    es "todavia no hay ventas hoy" --el caso de un spec que saca la foto del listado ANTES de
	//    crear la venta--. Por eso se clickea si esta y se sigue si no.
	//
	//    Lo que si es una falla es no encontrar despues la fila de la venta, y eso lo verifica cada
	//    spec con su propio `sale-row-<id>`: la solapa no es la asercion, es el camino.
	//    Se ESPERA a que aparezca antes de darla por ausente: mirar el DOM al toque, recien
	//    clickeado el dia, daria "no esta" siempre --el listado todavia no cargo-- y el spec seguiria
	//    en la solapa equivocada.
	if (opciones.solapa) {
		const solapa = page.locator(`[data-testid="nav-item-${opciones.solapa}"]`)

		try {
			await expect(solapa).toBeVisible({ timeout: 15000 })
			await solapa.click()
		} catch (error) {
			console.log(`[helpers] el dia no tiene registros de la sucursal "${opciones.solapa}" todavia`)
		}
	}
}

/**
 * Abre la cuenta corriente de un cliente o de un proveedor y NO sigue hasta que la lista de
 * movimientos esta dibujada.
 *
 * 🔴 El reintento cubre un no-op silencioso: `BtnCurrentAcounts` hace
 * `$bvModal.show('current-acounts')`, y si el componente del modal --async-- todavia no cargo su
 * chunk, ese show no hace nada y no tira ningun error. El sintoma es un rojo veinte lineas mas
 * abajo diciendo "no encontre el movimiento", que manda a buscar el problema en la cuenta
 * corriente cuando en realidad el modal nunca se abrio.
 *
 * Se vuelve a clickear SOLO si el modal no esta: repetir el click con el modal abierto lo cerraria.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number|string} id Id del cliente o del proveedor.
 * @param {number} [moneda_id=1] 1 es pesos.
 * @returns {Promise<void>}
 */
async function abrir_cuenta_corriente(page, id, moneda_id = 1) {
	const modal = page.locator('#current-acounts___BV_modal_outer_')
	const filas = page.locator('[data-testid^="current_acount-row-"]')

	await expect(async () => {
		if (await modal.count() === 0) {
			await page.locator(`[data-testid="btn-current-acount-${id}-${moneda_id}"]`).click()
		}
		await expect(filas.first()).toBeVisible({ timeout: 5000 })
	}).toPass({ timeout: 45000 })
}

module.exports = {
	celda_numerica,
	buscar_articulo,
	limpiar_busqueda_del_listado,
	leer_articulos,
	saldo_de_caja,
	abrir_vender,
	agregar_articulo,
	elegir_opcion_que_contenga,
	abrir_etapa_3,
	repartir,
	cargar_reparto,
	poner_toggle,
	total_de_la_venta,
	fecha_de_hoy,
	abrir_modulo_del_dia,
	abrir_cuenta_corriente,
}
