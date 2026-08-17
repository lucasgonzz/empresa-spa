// Test end to end (tarea 20, punto 4): pasar el mouse por "Importacion" tiene que desplegar su
// submenu SIN romper el menu principal.
//
// El sintoma que reporto Lucas el 11/8/2026: al apoyar el mouse sobre Importacion, "se rompe el
// diseno nuevamente y deja de verse las opciones del dropdown". O sea que el menu padre perdia
// opciones al abrirse el submenu.
//
// La causa eran dos cosas que se sumaban, las dos afuera del alcance de un diff que se lea a ojo:
//   1. ExcelDropdownSubmenu movia su propio <ul> a document.body con appendChild, y lo devolvia ahi
//      en un hook updated(). Vue 2 parchea comparando el DOM real contra su arbol virtual, asi que
//      un nodo movido por afuera lo deja trabajando con referencias a hermanos que ya no estan
//      donde cree, y el menu padre se desarma.
//   2. Ese teleport existia porque un submenu `position: fixed` no le servia de nada: tanto el
//      `transform` que Popper le pone al menu como el `filter: brightness()` que el hover del acento
//      le ponia al contenedor crean contexto de contencion, y un fixed adentro de eso se ancla al
//      ancestro en vez de al viewport.
//
// Por eso este test mide CANTIDAD DE OPCIONES VISIBLES antes y despues del hover: es lo unico que
// distingue "el submenu se abrio" de "el submenu se abrio y se llevo puesto el menu". Un test que
// solo verificara que el submenu aparece habria pasado con el bug presente.
//
// Selectores: se usan los que ya existen en el DOM (el id que arma b-dropdown como
// 'dropdown_' + model_name, y las clases de ExcelDropdownSubmenu / ExcelDropdownOptionItem). No se
// agrego ningun data-testid nuevo para este test.
const { test, expect } = require('../fixtures')
const { esperar_recursos_descargados } = require('../helpers/recursos')

test.describe('Listado: submenu de Importacion del menu Crear', () => {
	test('el submenu se despliega sin que el menu principal pierda opciones', async ({ page }) => {
		await page.goto('/listado-de-articulos')
		// Antes de tocar nada: el sistema baja los catalogos del arranque y hasta que no
		// termina esta a medio cargar (ver e2e/helpers/recursos.js). Sin abrir el panel: eso lo
		// verifican auth.setup.js y alta-compra.spec.js.
		await esperar_recursos_descargados(page, { abrir_panel: false })

		// El menu de "Crear" es un b-dropdown split: el caret es el que despliega.
		const dropdown_crear = page.locator('#dropdown_article')
		await expect(dropdown_crear).toBeVisible()
		await dropdown_crear.locator('.dropdown-toggle-split').click()

		const menu_principal = dropdown_crear.locator('.excel-create-dropdown-menu')
		await expect(menu_principal).toBeVisible()

		// 🔴 Esta asercion parece de otro tema y es la mas importante del test.
		//
		// El submenu se posiciona `position: fixed` con coordenadas de viewport. Un fixed deja de
		// anclarse al viewport si algun ancestro tiene transform, filter o will-change: pasa a
		// anclarse a ese ancestro. Popper le pone `transform: translate3d(...)` al menu por defecto,
		// y por eso el codigo le pasa gpuAcceleration:false adentro de modifiers.computeStyle.
		//
		// Sin esto, la regresion es INVISIBLE para el resto del test: un submenu anclado al menu y
		// recortado por su overflow sigue teniendo caja no vacia, asi que Playwright lo da por
		// visible y las cuentas de opciones dan bien igual. O sea que el test pasaria con el bug
		// puesto. Se mide la causa, no el sintoma.
		const transform_del_menu = await menu_principal.evaluate((el) => window.getComputedStyle(el).transform)
		expect(transform_del_menu === 'none' || transform_del_menu === '').toBeTruthy()

		// Cuantas opciones se ven con el menu recien abierto. Se cuentan los hijos directos del menu
		// para no sumar las opciones que vivan dentro de un submenu.
		const opciones_directas = menu_principal.locator('> li')
		const cantidad_inicial = await opciones_directas.count()
		expect(cantidad_inicial).toBeGreaterThan(0)

		// El hover sobre Importacion es exactamente el gesto que rompia el menu.
		const item_importacion = menu_principal.locator('.excel-dropdown-submenu', {
			hasText: 'Importación',
		})
		await item_importacion.hover()

		// El submenu se abre...
		const submenu = item_importacion.locator('.excel-dropdown-submenu__menu')
		await expect(submenu).toBeVisible()

		// ...y el menu principal sigue entero. Esta es la asercion que detecta la regresion: con el
		// bug presente, aca faltaban opciones.
		await expect(opciones_directas).toHaveCount(cantidad_inicial)
		await expect(menu_principal).toBeVisible()

		// Ir y volver entre los dos submenus tampoco lo rompe: cada transicion es un re-render, que
		// era justo cuando el hook updated() volvia a mover el nodo.
		const item_exportacion = menu_principal.locator('.excel-dropdown-submenu', {
			hasText: 'Exportación',
		})
		await item_exportacion.hover()
		await expect(item_exportacion.locator('.excel-dropdown-submenu__menu')).toBeVisible()

		await item_importacion.hover()
		await expect(submenu).toBeVisible()
		await expect(opciones_directas).toHaveCount(cantidad_inicial)

		// Y el submenu tiene que arrancar pegado al borde del item que lo abre, que es lo que
		// `update_menu_position` calcula con getBoundingClientRect. Es una comprobacion de sanidad
		// de la geometria, no el detector del bug: medido, con el menu transformado el submenu se
		// corre ~120px hacia la derecha y aun asi seguiria cayendo "a un costado". La que detecta la
		// regresion es la asercion del transform de mas arriba; esta agarra el caso en que las
		// coordenadas se calculen mal por otro motivo.
		const caja_item = await item_importacion.boundingBox()
		const caja_submenu = await submenu.boundingBox()
		expect(caja_submenu).not.toBeNull()
		expect(caja_submenu.width).toBeGreaterThan(0)
		const arranca_donde_termina_el_item = Math.abs(caja_submenu.x - (caja_item.x + caja_item.width)) <= 4
			|| Math.abs((caja_submenu.x + caja_submenu.width) - caja_item.x) <= 4
		expect(arranca_donde_termina_el_item).toBeTruthy()
	})
})
