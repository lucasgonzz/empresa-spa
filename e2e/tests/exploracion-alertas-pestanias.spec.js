// Exploración del módulo Alertas — pestañas PEDIDOS PROVEEDOR, PEDIDOS ONLINE, MENSAJES y
// FACTURACIÓN (3/9/2026).
//
// Qué afirma este archivo:
//
//   1. La coherencia badge ↔ contenido de cada pestaña: el número rojo de la nav cuenta LO MISMO
//      que la tabla muestra (filas en Pedidos Proveedor / Pedidos Online / Facturación; SUMA de
//      mensajes sin leer en Mensajes — ahí el badge cuenta mensajes y la tabla lista chats).
//   2. Pedidos Proveedor: un pedido creado HOY con días de aviso NO alerta hoy — el aviso "a los
//      N días" recién aparece al día N+1 (comportamiento real fijado también en PHPUnit:
//      tests/Feature/Alertas/3_Pedidos_proveedor_dias_de_aviso_Test.php, con el porqué).
//   3. Pedidos Online: la celda del cliente es TEXTO, no botón — el código tiene un botón verde
//      que nunca se dibuja (PedidosOnline.vue declara el slot `#cell(proveedor)` pero sus
//      columnas son cliente/pedido/total/hace/fecha: slot huérfano por copy-paste, y su click
//      llamaría `showProviderCurrentAcount` con un pedido de tienda). FIJA EL COMPORTAMIENTO
//      REAL: si algún día el botón se arregla, este test se pone rojo y hay que decidir qué
//      tiene que abrir.
//   4. Facturación: la fila de una venta con comprobante sin CAE trae el botón "N° ..." que abre
//      el modal de la venta, y las celdas sucursal y empleado MUESTRAN sus datos — fija los tres
//      arreglos de la exploración (el typo `stree`→`street`, la key `employee`→`empleado`, y el
//      eager load de `sale.address`/`sale.employee` en AfipTicketController).
//
// De qué depende: los datos que la exploración sembró directo en la base del slot (un pedido a
// "Buenos Aires" con aviso vencido, un comprobante sin CAE de la venta 1, un buyer con un pedido
// sin confirmar y un mensaje sin leer). Esos datos NO se re-siembran por corrida: cuando un
// `migrate:fresh` los borre, las pestañas quedan vacías y este archivo SIGUE VERDE — todas las
// aserciones de contenido son condicionales a que haya filas; la coherencia badge ↔ contenido se
// afirma siempre. El pedido de HOY del punto 2 sí lo crea el spec en cada corrida, por el
// endpoint real de compras.
//
// Trampa esquivada: los badges de la nav son b-badge que con 0 no se dibujan — badge ausente
// se lee como 0, nunca se espera el elemento.

const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')

const contexto = {
	/** Id del pedido a proveedor creado HOY por el spec. */
	pedido_de_hoy: null,
}

/**
 * Entra a una pestaña del módulo de Alertas y espera su contenido.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} ruta Segmento de la vista (ej. 'pedidos-proveedor').
 * @param {string} nombre_pestania El name del ítem de la nav (ej. 'Pedidos Proveedor').
 * @returns {Promise<void>}
 */
async function abrir_pestania_de_alertas(page, ruta, nombre_pestania) {
	await page.goto('/alertas/' + ruta)
	await esperar_recursos_descargados(page, { abrir_panel: false })
	await expect(page.locator(`[data-testid="nav-item-${nombre_pestania}"]`)).toBeVisible()
}

/**
 * Lee el número del badge de una pestaña. Ausente = 0 (b-badge no se dibuja con 0).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} nombre_pestania
 * @returns {Promise<number>}
 */
async function badge_de(page, nombre_pestania) {
	return page.evaluate(nombre => {
		const item = document.querySelector(`[data-testid="nav-item-${nombre}"]`)
		const badge = item ? item.querySelector('.badge') : null
		return badge ? Number(badge.innerText.trim()) : 0
	}, nombre_pestania)
}

/**
 * Cuenta las filas VISIBLES del tbody de una tabla de alertas, por su testid. 0 si la tabla no
 * está (estado vacío dibujado en su lugar).
 *
 * Los dos `:visible` no son decorativos, y cada uno tapa una trampa distinta medida el
 * 3/9/2026 en Facturación:
 *   - el de la TABLA: el mismo componente ListSales está montado DOS veces — en la pestaña y
 *     adentro del modal "afip-reenviar-facturas" (cerrado) — así que el testid matchea dos
 *     tablas y las filas se contaban dobles;
 *   - el de las FILAS: b-table puede dejar un `<tr>` auxiliar sin datos en el tbody.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} testid_tabla
 * @returns {Promise<number>}
 */
async function filas_de(page, testid_tabla) {
	return page.locator(`[data-testid="${testid_tabla}"]:visible tbody tr:visible`).count()
}

// ─────────────────────────────────────────────────────────────────────────────────────────────

test.describe.serial('Alertas · Pedidos Proveedor, Pedidos Online, Mensajes y Facturación', () => {

	test('Pedidos Proveedor: el badge cuenta las filas, y un pedido de HOY con aviso no alerta', async ({ page }) => {
		// El pedido de hoy se crea por el endpoint real de compras, con la sesión de la página.
		await abrir_pestania_de_alertas(page, 'pedidos-proveedor', 'Pedidos Proveedor')

		const creado = await page.evaluate(async () => {
			const api = window.location.origin.replace(/:(\d+)$/, (m, p) => ':' + (Number(p) - 80))
			const xsrf = decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || '')
			const res = await fetch(api + '/api/provider-order', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'X-XSRF-TOKEN': xsrf,
				},
				// Los flags van explícitos aunque sean 0: las columnas son NOT NULL y el
				// formulario real siempre los manda (sin update_stock el insert da 500).
				body: JSON.stringify({
					provider_id: 1,
					provider_order_status_id: 1,
					days_to_advise: 2,
					update_stock: 0,
					update_prices: 0,
					precios_incluyen_iva: 0,
					generate_current_acount: 0,
					moneda_id: 1,
					total_with_iva: 0,
					total_from_provider_order_afip_tickets: 0,
					articles: [],
					childrens: [],
				}),
			})
			return { ok: res.ok, status: res.status, json: res.ok ? await res.json() : null }
		})
		expect(creado.ok, `el POST del pedido devolvió ${creado.status}`).toBeTruthy()
		contexto.pedido_de_hoy = creado.json.model.id
		console.log(`[alertas-pestanias] pedido de hoy: ${contexto.pedido_de_hoy}`)

		// Recargar la pestaña para que la lista se re-pida con el pedido nuevo ya en la base.
		await abrir_pestania_de_alertas(page, 'pedidos-proveedor', 'Pedidos Proveedor')

		const filas = await filas_de(page, 'alertas-pedidos-proveedor-tabla')
		const badge = await badge_de(page, 'Pedidos Proveedor')

		expect(badge, 'el badge de Pedidos Proveedor tiene que contar las filas de su tabla').toBe(filas)

		if (filas === 0) {
			await expect(page.locator('[data-testid="alertas-pedidos-proveedor-vacio"]')).toBeVisible()
		}

		// El pedido de HOY (aviso a los 2 días) no puede estar: su aviso vence en el futuro.
		// La tabla no expone ids por fila; el número del pedido alcanza para reconocerlo.
		const num = creado.json.model.num
		await expect(
			page.locator(`[data-testid="alertas-pedidos-proveedor-tabla"] tbody tr`).filter({ hasText: String(num) }),
			'un pedido creado hoy con días de aviso no puede alertar hoy'
		).toHaveCount(0)
	})

	test('Pedidos Online: el badge cuenta las filas y el cliente es texto, no botón', async ({ page }) => {
		await abrir_pestania_de_alertas(page, 'pedidos-online', 'Pedidos Online')

		const filas = await filas_de(page, 'alertas-pedidos-online-tabla')
		const badge = await badge_de(page, 'Pedidos Online')

		expect(badge, 'el badge de Pedidos Online tiene que contar las filas de su tabla').toBe(filas)

		if (filas === 0) {
			await expect(page.locator('[data-testid="alertas-pedidos-online-vacio"]')).toBeVisible()
			return
		}

		// COMPORTAMIENTO REAL FIJADO: la primera columna (cliente) no tiene ningún botón. El
		// slot #cell(proveedor) del componente nunca matchea sus columnas. Si esto se pone rojo
		// es que alguien arregló el slot: decidir qué debe abrir ese botón antes de festejarlo
		// (hoy llamaría showProviderCurrentAcount con un pedido de la tienda).
		const botones_en_cliente = await page.locator(
			'[data-testid="alertas-pedidos-online-tabla"] tbody tr td:first-child button'
		).count()
		expect(botones_en_cliente, 'la celda del cliente es texto plano (el botón del código es un slot huérfano)').toBe(0)
	})

	test('Mensajes: el badge suma los mensajes sin leer que las filas muestran', async ({ page }) => {
		await abrir_pestania_de_alertas(page, 'mensajes', 'Mensajes')

		const badge = await badge_de(page, 'Mensajes')
		const filas = await filas_de(page, 'alertas-mensajes-tabla')

		if (filas === 0) {
			await expect(page.locator('[data-testid="alertas-mensajes-vacio"]')).toBeVisible()
			expect(badge, 'sin chats sin leer el badge tiene que ser 0').toBe(0)
			return
		}

		// El badge cuenta MENSAJES y la tabla lista CHATS: el badge tiene que ser la suma de la
		// columna "mensajes" de las filas (segunda columna).
		const suma = await page.evaluate(() => {
			let total = 0
			document.querySelectorAll('[data-testid="alertas-mensajes-tabla"] tbody tr').forEach(tr => {
				total += Number(tr.children[1].innerText.trim())
			})
			return total
		})

		expect(badge, 'el badge de Mensajes es la suma de mensajes sin leer de todos los chats').toBe(suma)
	})

	test('Facturación: la fila del comprobante sin CAE, con sucursal y empleado a la vista', async ({ page }) => {
		await abrir_pestania_de_alertas(page, 'facturacion', 'Facturacion')

		// 🔴 Si el aviso del arranque ("Facturas no autorizadas") está abierto, se cierra —
		// exactamente lo que haría el operador. Con comprobantes sin CAE en la base ese modal se
		// le abre solo al dueño encima de CUALQUIER pantalla, monta su propio ListSales (misma
		// tabla, mismos testids) y tapa los clicks; medido tres veces el 3/9/2026.
		const aviso = page.locator('#afip-reenviar-facturas___BV_modal_outer_ .modal.show')
		if (await aviso.count()) {
			await page.keyboard.press('Escape')
			await expect(aviso).toHaveCount(0, { timeout: 10000 })
		}

		// Y todo se mide en LA TABLA DE LA PESTAÑA (fuera de cualquier modal): el mismo
		// componente vive adentro del aviso, así que un selector global cuenta doble. Las filas
		// se cuentan por el BOTÓN de la venta y no por `tbody tr`, porque esta b-table dibuja
		// una segunda <tr> de detalles (row-details con los botones de AFIP) por cada venta.
		// Lo enseñaron tres rojos falsos seguidos el 3/9/2026.
		const en_la_pestania = selector => page.evaluate(sel => {
			const tablas = [...document.querySelectorAll('[data-testid="alertas-facturacion-tabla"]')]
			const tabla = tablas.find(t => !t.closest('.modal'))
			return tabla ? [...tabla.querySelectorAll(sel)].length : -1
		}, selector)

		const filas = await en_la_pestania('[data-testid^="alertas-facturacion-venta-"]')
		const badge = await badge_de(page, 'Facturacion')

		if (filas <= 0) {
			await expect(page.locator('[data-testid="alertas-facturacion-vacio"]')).toBeVisible()
			expect(badge, 'sin comprobantes con problemas el badge tiene que ser 0').toBe(0)
			return
		}

		expect(badge, 'el badge de Facturación tiene que contar las ventas de su tabla').toBe(filas)

		// La primera fila de la tabla de la pestaña: su botón abre el modal de la venta. Con el
		// aviso ya cerrado, el único botón VISIBLE es el de la pestaña (el del modal no se ve).
		const boton_venta = page.locator('[data-testid^="alertas-facturacion-venta-"]:visible').first()
		await expect(boton_venta, 'cada fila tiene que traer el botón de su venta').toBeVisible()

		// 🔴 Las celdas que fija esta exploración: sucursal y empleado CON contenido. Antes
		// quedaban siempre vacías (typo stree, key employee vs columna empleado, y el endpoint
		// sin cargar las relaciones). La venta sembrada tiene sucursal "Principal" y ningún
		// empleado -> la celda de empleado cae al nombre del dueño.
		const celdas = await page.evaluate(() => {
			const tablas = [...document.querySelectorAll('[data-testid="alertas-facturacion-tabla"]')]
			const tabla = tablas.find(t => !t.closest('.modal'))
			const tr = tabla ? tabla.querySelector('tbody tr') : null
			return tr ? [...tr.children].map(td => td.innerText.trim()) : []
		})

		// Columnas: venta · sucursal · punto_de_venta · tipo_comprobante · empleado · total · ...
		expect(celdas[1], 'la celda de sucursal no puede quedar vacía con la venta teniendo sucursal').not.toBe('')
		expect(celdas[4], 'la celda de empleado no puede quedar vacía: sin empleado muestra al dueño').not.toBe('')

		// Y el botón abre el modal de la venta de verdad.
		await boton_venta.click()
		await expect(
			page.locator('#sale___BV_modal_outer_'),
			'el botón "N° ..." tenía que abrir el modal de la venta'
		).toBeAttached({ timeout: 15000 })
	})
})
