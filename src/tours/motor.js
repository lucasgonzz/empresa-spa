import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

import CATALOGO from '@/tours/catalogo'
import GANCHOS from '@/tours/ganchos'

/**
 * Motor de los tours guiados de la demo.
 *
 * Cuando el lead termina de mirar el video de un clip, aprieta "Probar" y este motor lo acompaña
 * clic a clic a hacer la acción que el video le explicó.
 *
 * 🔴 Este módulo viaja adentro del chunk diferido de `PanelDemo.vue`, que `App.vue` monta solo
 * cuando el getter `demo/panel_visible` es true — o sea, solo si se entró con el token en la URL.
 * Un cliente real no ejecuta ni una línea de driver.js, y por eso el `import` del CSS vive acá y
 * no en `main.js`: moverlo a `main.js` metería los 3,9 KB en el bundle de los ~40 clientes.
 *
 * ⚠️ `driver.js` está pineado en la versión EXACTA `1.4.0` en `package.json`, sin caret, y eso no
 * es prolijidad: de la 1.5.0 en adelante el `dist` usa `?.` y `??`, y este build es webpack 4 con
 * acorn 6.4.2, que no los parsea. Un `^1.4.0` resuelve a 1.8.0 y **rompe el build de producción**
 * con `Module parse failed: Unexpected token`.
 *
 * ## Por qué el motor maneja el avance y no lo delega en driver.js
 *
 * driver.js quiere que le pases todos los pasos de entrada (`setSteps`) y él navega entre ellos
 * con sus botones. Acá eso no sirve: un tour acompaña una acción que **va cambiando la pantalla**,
 * así que el elemento del paso 4 no existe hasta que el lead hizo el clic del paso 3. Medir todos
 * los pasos al arrancar descartaría la mitad antes de empezar.
 *
 * Por eso el motor usa `highlight()` —un paso a la vez— y decide él cuándo avanzar, según el
 * `avanza` de cada paso: `'clic'` (el lead tocó el elemento), `'aparece'` (apareció el elemento
 * del paso siguiente), `'desaparece'` (se fue el elemento de ESTE paso, para los que viven adentro
 * de un modal que se cierra al elegir) o `'siguiente'` (apretó el botón del cartel).
 *
 * Un paso admite además dos opciones que cambian cómo se lo muestra:
 *
 * - `scroll_tabla: 'inicio'` — en vez de centrar el elemento en la tabla, deja la tabla en su
 *   principio. Ver `acomodar_scroll()`.
 * - `foco: true` / `foco: false` — fuerza o apaga el foco automático en el campo del paso. Ver
 *   `enfocar_campo_del_paso()`.
 */

/** Cuánto se espera, como mucho, a que aparezca un elemento antes de dar el paso por perdido. */
const TECHO_ESPERA_ELEMENTO = 12000

/**
 * Techo para esperar el gesto del lead cuando un paso avanza "por aparición".
 *
 * 🔴 Es enorme a propósito, y sale de una medición: con el techo normal de 12 segundos, un lead
 * que se toma su tiempo para leer el cartel y decidir **perdía el paso**: el motor daba el gesto
 * por no hecho y seguía de largo solo. Verificado el 30/8/2026 sobre el tour 1.1 — el paso del
 * menú Crear se salteó mientras el modal todavía no se había abierto, y el tour siguió sin el lead.
 *
 * Esperar es lo correcto: el lead SIEMPRE tiene la cruz para cortar el tour (§3.7-bis), así que
 * ningún techo hace falta para que no quede atrapado. Los cinco minutos son un tope de higiene
 * para no dejar un sondeo vivo para siempre si alguien abandona la pestaña.
 */
const TECHO_ESPERA_GESTO = 300000

/** Cada cuánto se vuelve a mirar si el elemento ya está en el DOM. */
const INTERVALO_SONDEO = 120

/**
 * Espera después de navegar de ruta.
 *
 * Vue destruye y reconstruye la vista, y varias vistas piden sus datos en `created()`. Sin esto,
 * el primer paso de un tour que arranca navegando mide un DOM a medio armar.
 */
const ESPERA_TRAS_NAVEGAR = 400

/**
 * Cuántos cuadros seguidos tiene que quedarse quieta la caja del elemento para darla por asentada.
 *
 * 🔴 Tres y no uno: un `b-modal` de BootstrapVue entra animando su `transform` y hay cuadros
 * sueltos en los que la caja no cambia entre dos mediciones aunque la animación siga.
 */
const CUADROS_ESTABLES = 3

/**
 * Techo de cuadros que se esperan a que la caja se asiente (~1,2 s a 60 fps).
 *
 * Es un tope de higiene, no el caso normal: la transición del modal dura 300 ms y el scroll
 * horizontal de la tabla lo hacemos nosotros de golpe. Si algo se anima para siempre —un spinner
 * que late, una barra de progreso— el paso se dibuja igual al llegar acá.
 */
const TECHO_ASENTADO = 72

/**
 * La clase con la que driver.js marca el único elemento que sigue aceptando clics.
 *
 * Está escrita en `driver.css` y no se puede cambiar; el motor la necesita porque Vue se la borra
 * al re-renderizar. Ver `custodiar_clase_activa()`.
 */
const CLASE_ACTIVA = 'driver-active-element'

/** Segunda pasada de reubicación del cartel, para lo que se acomode después de dibujarlo. */
const DEMORA_REUBICAR = 450

/** Techo de espera de un paso cuando el anterior ya se salteó. Ver `techo_de()`. */
const TECHO_TRAS_SALTEO = 2500

/**
 * Cuántos pasos seguidos se pueden saltear antes de dar el tour por imposible.
 *
 * Tres y no uno: hay pasos sueltos que dependen de una extensión o de un permiso y faltar es
 * normal. Tres seguidos, en cambio, significa que la pantalla que el tour da por hecha no está.
 */
const TOPE_SALTEOS_SEGUIDOS = 3

/**
 * Cuánto se espera, como mucho, a que un desplegable termine de abrirse antes de seguir igual.
 *
 * 🔴 Lo pidió Lucas el 1/9/2026 sobre los clips 1.6, 1.7 y 1.8: *"cuando hago clic en el botón que
 * abre el drop down hay que esperar a que se abra el dropdown y recién ahí pasa al siguiente paso"*.
 * Con el respiro fijo de 80 ms el tour se iba al paso siguiente mientras Popper todavía estaba
 * colocando el menú, así que el paso que señala una opción de adentro no encontraba su elemento y
 * se salteaba. Ver `esperar_menu_desplegado()`.
 *
 * Los 2,5 s son un tope de higiene: si el menu no abre, el tour avanza igual. Un desplegable que no
 * abre no puede dejar al lead encerrado.
 */
const TECHO_MENU_ABIERTO = 2500

/** Título del diálogo que pregunta si se termina el tour. Ver `pedir_confirmacion_de_cierre()`. */
const TITULO_CONFIRMACION = '¿Terminamos el tour?'

/**
 * Capa del diálogo de confirmación.
 *
 * Uno más que el cartel de driver.js, que se dibuja con `z-index: 1000000000`. Es el número mínimo
 * que lo deja arriba: subirlo más solo agranda la distancia con el resto de la aplicación.
 */
const Z_DIALOGO_CONFIRMACION = 1000000001

/** Instancia viva de driver.js, o null. Una sola a la vez. */
let recorrido = null

/** Estado de la corrida actual. Null cuando no hay tour. */
let corrida = null

/** Limpiezas pendientes (listeners de clic, temporizadores, sondeos). */
let limpiezas = []

/**
 * Elementos a los que el motor les prendió una clase para poder señalarlos, con cómo apagarla.
 *
 * Ver `revelar()`. Se apagan al cambiar de paso y al cerrar el tour.
 *
 * @type {Array<Function>}
 */
let revelados = []

/**
 * Cómo soltar los enganches de refresco del paso que está a la vista, o null.
 *
 * Ver `enganchar_refresco()`. Va suelto y no adentro de `limpiezas` porque se suelta **al cambiar
 * de paso**, no al terminar el tour: apilarlos haría que un solo scroll dispare un refresco por
 * cada paso que ya pasó.
 *
 * @type {Function|null}
 */
let sueltas_de_refresco = null

/**
 * El dialogo de "¿Terminamos el tour?" que se dibuja al intentar cerrar por afuera, o null.
 *
 * Ver `pedir_confirmacion_de_cierre()`. Vive suelto y no adentro de `limpiezas` porque también hay
 * que poder bajarlo sin terminar la corrida (cuando el lead elige "Seguir en el tour").
 *
 * @type {Element|null}
 */
let dialogo_de_cierre = null

/**
 * Cómo soltar el listener de Escape del diálogo de cierre, o null.
 *
 * @type {Function|null}
 */
let soltar_teclado_del_dialogo = null

/**
 * Traduce un paso al selector CSS con el que se lo busca en el DOM.
 *
 * Se admiten dos formas:
 *
 * 1. `ancla` — el contrato `data-tour` de `contexto/demo_data_tour.md`. Es la forma preferida:
 *    sobrevive a los retoques de estilo y de estructura, y si alguien la borra queda detectable.
 * 2. `selector` — un selector CSS crudo, para los anclajes que **ya existen y son estables** sin
 *    tocar código: los `#form-group-<key>` que arma `ModelForm` para cada campo de cada
 *    formulario, y los `[data-testid="nav-item-<x>"]` del nav horizontal. Usarlos ahorra tocar
 *    componentes de `common-vue`, que se despliegan a los ~40 clientes reales.
 *
 * @param {Object} paso
 * @returns {String}
 */
function selector_de(paso) {
	if (paso.ancla) {
		return '[data-tour="' + paso.ancla + '"]'
	}

	return paso.selector
}

/**
 * Busca un elemento visible para ese selector.
 *
 * 🔴 No alcanza con `querySelector`: media docena de anclajes del contrato viven en un `v-show`
 * (la etapa 1 de Vender), en una rama colapsada o en un contenedor que mide casi cero mientras no
 * tiene datos (`vender.lista_articulos` con la venta vacía). driver.js igual los "resalta", pero
 * dibuja una franja de un pixel arriba de la nada y el lead no entiende qué le señalan.
 *
 * Un mismo selector puede dar varios nodos y solo uno estar a la vista: el desplegable de acciones
 * se monta dos veces, y las ramas `v-if`/`v-else` de un botón conviven en el árbol un instante. Por
 * eso se recorren todos y se devuelve el primero que se pueda señalar de verdad.
 *
 * @param {String} selector
 * @returns {Element|null}
 */
function buscar_visible(selector) {
	if (!selector) {
		return null
	}

	let candidatos = []

	try {
		candidatos = document.querySelectorAll(selector)
	} catch (error) {
		console.warn('Tour: selector inválido "' + selector + '"', error)
		return null
	}

	for (let i = 0; i < candidatos.length; i++) {
		const resuelto = resolver_visible(candidatos[i])

		if (resuelto) {
			return resuelto
		}
	}

	return null
}

/**
 * Devuelve el elemento si se puede señalar, o el hijo que sí se puede, o null.
 *
 * 🔴 Acá vive el arreglo del caso `b-modal`, que es el que más anclas del contrato afecta.
 *
 * BootstrapVue declara `inheritAttrs: false` en `BModal` y mete los atributos sueltos —o sea
 * nuestro `data-tour`— en `computedAttrs`, que va al **div exterior del portal**
 * (`modal-outer-...`). Ese div lleva `modalOuterStyle` y sus dos hijos son `position: fixed`, así
 * que **mide 0x0**. Verificado en `node_modules/bootstrap-vue/src/components/modal/modal.js`
 * (`computedAttrs()` alrededor de la línea 320, usado en el `h('div', ...)` del final).
 *
 * O sea que un `data-tour` puesto sobre un `<b-modal>` —que es lo que pide el contrato y lo que
 * hacen una docena de anclas de todas las secciones— apunta a un elemento de cero por cero. Sin
 * este rescate, driver.js dibujaría un recuadro de un pixel arriba a la izquierda y el lead vería
 * el cartel señalando la nada.
 *
 * La salida es bajar al `.modal-content`, que es el recuadro blanco que el lead ve como "el
 * modal". Se hace acá y no cambiando los quince componentes porque el contrato dice que el ancla
 * va en el modal, y tiene razón: es el lugar donde alguien la va a buscar.
 *
 * @param {Element} elemento
 * @returns {Element|null}
 */
function resolver_visible(elemento) {
	if (se_puede_senalar(elemento)) {
		return elemento
	}

	const contenido = elemento.querySelector('.modal-content')

	if (contenido && se_puede_senalar(contenido)) {
		return contenido
	}

	return null
}

/**
 * ¿Este elemento tiene caja y está a la vista?
 *
 * `offsetParent` da null para cualquier ancestro con `display: none`, que es como Vue implementa
 * `v-show` — y así se descartan los anclajes de la etapa 1 de Vender cuando está colapsada. Se
 * contempla aparte `position: fixed`, donde `offsetParent` también es null aunque el elemento se
 * vea perfectamente: es el caso del sidebar de WhatsApp, de la tarjeta de AFIP y de los modales.
 *
 * @param {Element} elemento
 * @returns {Boolean}
 */
function se_puede_senalar(elemento) {
	const caja = elemento.getBoundingClientRect()

	if (caja.width < 2 || caja.height < 2) {
		return false
	}

	if (elemento.offsetParent !== null) {
		return true
	}

	return window.getComputedStyle(elemento).position === 'fixed'
}

/**
 * Resuelve cuando el elemento aparece, o a los `techo` milisegundos con null.
 *
 * 🔴 Devuelve null en vez de rechazar a propósito: que un paso no encuentre su elemento es un caso
 * PREVISTO, no un error. Pasa siempre que una extensión está apagada, que el lead no cumplió la
 * precondición del paso anterior, o que el elemento depende de un permiso. El motor saltea ese
 * paso y sigue, nunca deja al lead encerrado mirando un overlay.
 *
 * @param {String} selector
 * @param {Number} techo
 * @returns {Promise<Element|null>}
 */
function esperar_elemento(selector, techo) {
	const limite = typeof techo === 'number' ? techo : TECHO_ESPERA_ELEMENTO

	return new Promise(function (resolver) {
		const ya_esta = buscar_visible(selector)

		if (ya_esta) {
			resolver(ya_esta)
			return
		}

		let transcurrido = 0

		const reloj = setInterval(function () {
			const elemento = buscar_visible(selector)

			if (elemento) {
				clearInterval(reloj)
				resolver(elemento)
				return
			}

			transcurrido += INTERVALO_SONDEO

			if (transcurrido >= limite) {
				clearInterval(reloj)
				resolver(null)
			}
		}, INTERVALO_SONDEO)

		limpiezas.push(function () {
			clearInterval(reloj)
		})
	})
}

/**
 * Promesa que se resuelve sola después de N milisegundos.
 *
 * @param {Number} ms
 * @returns {Promise}
 */
function esperar_ms(ms) {
	if (!ms) {
		return Promise.resolve()
	}

	return new Promise(function (resolver) {
		const reloj = setTimeout(resolver, ms)

		limpiezas.push(function () {
			clearTimeout(reloj)
		})
	})
}

/**
 * Deja el tour parado en la vista que el paso necesita.
 *
 * 🔴 El tour navega solo y NO le pide al lead que use el menú lateral, y eso está medido:
 * `nav-vertical/NavVertical.vue` dibuja las rutas en un `v-for` sin un solo identificador por
 * ítem, así que no hay a qué anclar. Y aunque lo hubiera, `driver.css` pone
 * `.driver-active * { pointer-events: none }` salvo sobre el elemento resaltado, así que el ítem
 * quedaría inerte; peor todavía con "Tienda Online", cuyo submenú se cierra al perder el foco.
 *
 * El `.catch()` es por `NavigationDuplicated`: si el lead ya está en esa ruta, vue-router rechaza
 * la promesa y sin esto el tour se cortaría justo cuando todo estaba bien. Mismo tratamiento que
 * ya usa `views/Online.vue`.
 *
 * @param {Object} router
 * @param {Object|null} ruta
 * @returns {Promise}
 */
function ir_a(router, ruta) {
	if (!ruta || !router) {
		return Promise.resolve()
	}

	const actual = router.currentRoute

	/* Si ya estamos donde hay que estar, no se navega: remontar la vista al pedo tira el estado que
	 * el paso anterior dejó armado (una venta a medio cargar, un filtro puesto, un modal abierto). */
	if (actual && actual.name === ruta.name && mismos_params(actual.params, ruta.params)) {
		return Promise.resolve()
	}

	return router.push(ruta)
		.catch(function () {
			/* NavigationDuplicated y navegaciones abortadas: ninguna es un problema acá. */
		})
		.then(function () {
			return esperar_ms(ESPERA_TRAS_NAVEGAR)
		})
}

/**
 * @param {Object} unos
 * @param {Object} otros
 * @returns {Boolean}
 */
function mismos_params(unos, otros) {
	const esperados = otros || {}
	const actuales = unos || {}
	const claves = Object.keys(esperados)

	for (let i = 0; i < claves.length; i++) {
		if (String(actuales[claves[i]]) !== String(esperados[claves[i]])) {
			return false
		}
	}

	return true
}

/**
 * Corre el gancho declarado en `antes`, si el paso tiene uno.
 *
 * Los ganchos son las acciones que hay que ejecutar ANTES de poder señalar un elemento: desplegar
 * la etapa 1 de Vender, esperar un modal. Viven en `src/tours/ganchos.js` con nombre, y el
 * catálogo los referencia por ese nombre en vez de meter funciones adentro de los datos.
 *
 * ⚠️ **Los ganchos ya incluyen su propia espera** (450 ms la etapa 1, 700 ms con el select de
 * método de pago). Un paso con gancho NO necesita además `espera_ms` con el mismo número: sería
 * esperar el doble.
 *
 * @param {Object} paso
 * @param {Object} contexto
 * @returns {Promise}
 */
function correr_gancho(paso, contexto) {
	if (!paso.antes) {
		return Promise.resolve()
	}

	const gancho = GANCHOS[paso.antes]

	if (typeof gancho !== 'function') {
		console.warn('Tour: el paso pide el gancho "' + paso.antes + '" y no existe en ganchos.js')
		return Promise.resolve()
	}

	try {
		return Promise.resolve(gancho(contexto, paso))
	} catch (error) {
		console.warn('Tour: el gancho "' + paso.antes + '" falló', error)
		return Promise.resolve()
	}
}

/**
 * Cuánto se espera el elemento de este paso.
 *
 * 🔴 Después de un salteo, el techo baja, y eso arregla un silencio de minuto y medio.
 *
 * Un paso que no encuentra su elemento se saltea, pero recién después de esperarlo los 12 segundos
 * de rigor. Cuando la demo no tiene los datos que el tour necesita, eso se saltea **paso por
 * paso**: medido el 31/8/2026 sobre el clip 2.5 —ningún cliente del fixture tiene cuenta corriente,
 * así que no existe el botón del paso 1 ni el modal del que dependen los seis siguientes—, el lead
 * aprieta "Probar", la pantalla cambia de módulo y se queda **84 segundos sin que pase nada**.
 *
 * Los 12 segundos valen para el primero: un elemento puede tardar en llegar. Pero si uno ya faltó,
 * los que dependen de él no van a aparecer por esperarlos más.
 *
 * @param {Object} paso
 * @returns {Number}
 */
function techo_de(paso) {
	if (paso.techo_ms) {
		return paso.techo_ms
	}

	if (corrida && corrida.salteados_seguidos > 0) {
		return TECHO_TRAS_SALTEO
	}

	return TECHO_ESPERA_ELEMENTO
}

/**
 * Prende las clases que hacen falta para que el elemento se pueda VER mientras el paso lo señala.
 *
 * 🔴 Existe por la lupa de los encabezados de la tabla, y el caso es más feo de lo que parece.
 *
 * `display/table/Index.vue` deja `.cont-filter-buttons` con `max-width: 0; opacity: 0;
 * pointer-events: none` y lo abre con `th:hover`. Pero `driver.css` pone
 * `.driver-active * { pointer-events: none }` sobre todo lo que no sea el elemento resaltado, y un
 * elemento con `pointer-events: none` **nunca matchea `:hover`**. O sea que, con un tour corriendo,
 * el lead no puede hacer aparecer la lupa de ninguna manera: el paso le resalta un botón invisible
 * y le pide que lo toque. Lo reportó Lucas el 31/8/2026 sobre el clip 1.6.
 *
 * La salida es la clase `force-show`, que ese mismo componente ya usa cuando el filtro está en uso
 * y hace exactamente esto (`max-width: 220px; opacity: 1; pointer-events: auto`). No se inventa CSS
 * nuevo ni se toca el componente, que se despliega a los ~40 clientes reales.
 *
 * @param {Element} elemento
 * @returns {void}
 */
function revelar(elemento) {
	ocultar_revelados()

	if (!elemento || typeof elemento.closest !== 'function') {
		return
	}

	/* Se busca para los dos lados: hay pasos que anclan la lupa misma y otros que anclan el `th`
	 * entero, que es donde el lead tiene que llevar el mouse. */
	const filtros = elemento.closest('.cont-filter-buttons') || elemento.querySelector('.cont-filter-buttons')

	if (filtros && !filtros.classList.contains('force-show')) {
		filtros.classList.add('force-show')

		revelados.push(function () {
			filtros.classList.remove('force-show')
		})
	}
}

/**
 * Sube del elemento encontrado al ancestro que el paso pida, si pide alguno.
 *
 * Sirve para señalar algo que **no tiene identificador propio pero contiene uno que sí**: el caso
 * que lo trajo es la columna de la tabla. Un `th` no tiene id, pero adentro tiene el botón de
 * filtro (`#btn_filter_<key>`, que ya existía), así que `{ selector: '#btn_filter_cost',
 * ancestro: 'th' }` resalta la columna "Costo base" entera sin tocar `common-vue`.
 *
 * ⚠️ No lo uses con `avanza: 'clic'` salvo que el ancestro sea único en la pantalla: el avance por
 * clic reconoce el gesto contra el elemento resuelto **y** contra el selector del paso, y un
 * ancestro genérico como `th` hace que cualquier encabezado sirva.
 *
 * @param {Element} elemento
 * @param {String|undefined} ancestro
 * @returns {Element}
 */
function subir_a_ancestro(elemento, ancestro) {
	if (!ancestro || !elemento || typeof elemento.closest !== 'function') {
		return elemento
	}

	const arriba = elemento.closest(ancestro)

	if (!arriba || !se_puede_senalar(arriba)) {
		return elemento
	}

	return arriba
}

/**
 * Apaga lo que haya prendido `revelar()`.
 *
 * @returns {void}
 */
function ocultar_revelados() {
	revelados.forEach(function (apagar) {
		try {
			apagar()
		} catch (error) {
			console.warn('Tour: fallo al apagar un revelado', error)
		}
	})

	revelados = []
}

/**
 * Trae el elemento a la parte visible de cada contenedor con scroll propio que lo contenga.
 *
 * 🔴 driver.js no alcanza para esto, y el motivo está medido en su `dist`:
 *
 * 1. Decide si scrollear con `isElementInView()`, que compara contra el **viewport de la ventana**,
 *    no contra el contenedor. Y cuando scrollea usa `scrollIntoView({ behavior: 'smooth' })` salvo
 *    que el PADRE DIRECTO tenga scroll vertical — para un `th` el padre es el `tr`, que no lo
 *    tiene, así que sale por la rama suave, que es **asincrónica**.
 * 2. Después no vuelve a medir: `refresh` cuelga de `window.addEventListener('scroll')`, y el
 *    scroll de `.cont-table` no llega a `window` (los eventos de scroll no burbujean).
 *
 * Resultado: el recuadro se pinta donde el elemento **estaba** antes del scroll. Es lo que reportó
 * Lucas el 31/8/2026 en el clip 1.6 — pide tocar la lupa de "Proveedor" y el recuadro cae sobre
 * "Costo base".
 *
 * Haciendo el scroll nosotros, de golpe y antes de medir, driver.js encuentra el elemento ya en el
 * viewport y no vuelve a tocarlo.
 *
 * @param {Element} elemento
 * @returns {void}
 */
function traer_a_la_vista(elemento) {
	if (!elemento) {
		return
	}

	let padre = elemento.parentElement

	while (padre && padre !== document.body && padre !== document.documentElement) {
		if (tiene_scroll_propio(padre)) {
			acercar_dentro_de(padre, elemento)
		}

		padre = padre.parentElement
	}

	acercar_en_la_pagina(elemento)
}

/**
 * Scrollea LA PÁGINA si el elemento quedó fuera de la ventana.
 *
 * 🔴 El recorrido de los contenedores de arriba no alcanza: cubre lo que scrollea por su cuenta
 * —la tabla, un modal— pero no el documento. Medido el 1/9/2026 en el paso 2 del clip 1.8: el menú
 * de "Crear" se abre hacia abajo y con la tabla cargada su primera opción cae en `y: 1005` sobre
 * una ventana de 900 px. El recuadro y el cartel se dibujaban **fuera de la pantalla**, y el lead
 * veía el overlay oscuro sin nada señalado.
 *
 * driver.js tiene su propio `scrollIntoView`, pero sólo lo dispara al resaltar y **no** en el
 * `refresh()` de `reubicar_cartel()` (verificado en el `dist`: `refreshActiveHighlight` no
 * scrollea), así que un elemento que aparece o se mueve después de resaltar —justo el caso de un
 * menú que se despliega— se queda afuera.
 *
 * Se usa `block: 'center'` y no `'nearest'` a propósito: el cartel de driver.js se planta al lado
 * del elemento y con `'nearest'` el elemento queda pegado al borde, con el cartel medio afuera.
 *
 * @param {Element} elemento
 * @returns {void}
 */
function acercar_en_la_pagina(elemento) {
	if (typeof elemento.getBoundingClientRect !== 'function') {
		return
	}

	const caja = elemento.getBoundingClientRect()
	const alto = window.innerHeight || document.documentElement.clientHeight

	/* Sólo si de verdad quedó afuera: scrollear cuando ya se ve mueve la pantalla debajo del lead
	 * en cada refresco, que es peor que el problema que esto arregla. */
	if (caja.height > 0 && caja.top >= 0 && caja.bottom <= alto) {
		return
	}

	if (typeof elemento.scrollIntoView === 'function') {
		elemento.scrollIntoView({ block: 'center', inline: 'nearest' })
	}
}

/**
 * ¿Este contenedor scrollea por su cuenta?
 *
 * @param {Element} contenedor
 * @returns {Boolean}
 */
function tiene_scroll_propio(contenedor) {
	const desborda = contenedor.scrollWidth > contenedor.clientWidth + 1
		|| contenedor.scrollHeight > contenedor.clientHeight + 1

	if (!desborda) {
		return false
	}

	const estilo = window.getComputedStyle(contenedor)
	const modos = estilo.overflow + ' ' + estilo.overflowX + ' ' + estilo.overflowY

	return modos.indexOf('auto') !== -1 || modos.indexOf('scroll') !== -1
}

/**
 * Centra el elemento adentro del contenedor, sin tocar el eje que ya lo tenía a la vista.
 *
 * Se escribe con `scrollLeft`/`scrollTop` y no con `scrollIntoView` a propósito: es inmediato (no
 * hay `scroll-behavior: smooth` en ninguna hoja de la SPA, verificado) y no arrastra a los demás
 * contenedores de la cadena, que se resuelven de a uno en `traer_a_la_vista`.
 *
 * @param {Element} contenedor
 * @param {Element} elemento
 * @returns {void}
 */
function acercar_dentro_de(contenedor, elemento) {
	const marco = contenedor.getBoundingClientRect()
	const caja = elemento.getBoundingClientRect()

	/**
	 * 🔴 Un elemento MÁS ANCHO que el contenedor no se centra: ya está a la vista.
	 *
	 * Sin esta guarda, una fila de la tabla —que mide el ancho de TODAS las columnas, 3.500 px
	 * medidos el 31/8/2026— se "centraba" corriendo la tabla 1.000 px a la derecha, y el lead
	 * terminaba mirando columnas del medio en vez del principio de la fila que el paso le señala.
	 */
	if (caja.width < marco.width) {
		if (caja.left < marco.left || caja.right > marco.right) {
			contenedor.scrollLeft += (caja.left + caja.width / 2) - (marco.left + marco.width / 2)
		}
	} else if (caja.left < marco.left) {
		/* Más ancho que el contenedor y empezando a la izquierda de lo visible: no se centra, pero
		 * sí se lo lleva a su PRINCIPIO. Es el caso de una fila de la tabla con el scroll horizontal
		 * corrido de antes: sin esto el paso dice "abrí este artículo" y el lead está mirando
		 * columnas del medio, sin ver el nombre. */
		contenedor.scrollLeft += caja.left - marco.left
	}

	/* El `thead` de la tabla es sticky: nunca sale del marco, así que este eje no lo toca. */
	if (caja.height < marco.height && (caja.top < marco.top || caja.bottom > marco.bottom)) {
		contenedor.scrollTop += (caja.top + caja.height / 2) - (marco.top + marco.height / 2)
	}
}

/**
 * Deja la tabla mostrando su PRINCIPIO, que es donde está la columna de las imágenes.
 *
 * 🔴 Lo pidió Lucas el 1/9/2026 sobre el clip 1.7: *"quiero que primero haga un scroll horizontal al
 * inicio de la tabla de los artículos donde se ve la columna de las imágenes"*, y enseguida
 * *"el scroll de la tabla se corre y vuela al centro, eso no debe de pasar"*.
 *
 * `traer_a_la_vista()` no alcanza para eso: centra el elemento en su contenedor, que es lo correcto
 * cuando el paso señala una columna del medio y exactamente lo contrario cuando señala la tabla
 * entera. Por eso un paso puede declarar `scroll_tabla: 'inicio'` y ese scroll **manda sobre**
 * `traer_a_la_vista()`.
 *
 * ⚠️ El recorrido de ancestros no siempre encuentra un contenedor que scrollee de costado: el paso 2
 * del 1.7 ancla el botón de modo selección, que vive en el encabezado de la vista y no adentro de la
 * tabla, y aun así lo que hay que dejar quieto es la tabla. De ahí el respaldo por `.cont-table`, que
 * es el contenedor con `overflow-x: auto` que `display/table/Index.vue` le pone a toda tabla del
 * sistema (`Index.vue:1635-1639`).
 *
 * 🔴 Y por eso lo que cuenta como "encontrado" es el desborde HORIZONTAL, no `tiene_scroll_propio()`
 * a secas: media docena de contenedores de la vista scrollean solo en vertical, y darlos por buenos
 * apagaría el respaldo sin haber movido nada. El síntoma sería el peor: la opción declarada en el
 * paso y la tabla igual de corrida.
 *
 * @param {Element} elemento
 * @returns {void}
 */
function llevar_scroll_al_inicio(elemento) {
	let encontrado = false
	let padre = elemento ? elemento.parentElement : null

	while (padre && padre !== document.body && padre !== document.documentElement) {
		if (padre.scrollWidth > padre.clientWidth + 1 && tiene_scroll_propio(padre)) {
			padre.scrollLeft = 0
			encontrado = true
		}

		padre = padre.parentElement
	}

	if (encontrado) {
		return
	}

	const tabla = buscar_visible('.cont-table')

	if (tabla) {
		tabla.scrollLeft = 0
	}
}

/**
 * Acomoda el scroll para este paso: al principio si lo pide, centrado si no.
 *
 * Está en una función sola porque se llama DOS veces por paso —antes de resaltar y otra vez después
 * de que driver.js hizo su propio scroll— y las dos tienen que decidir lo mismo. Ver
 * `reubicar_cartel()`.
 *
 * @param {Object} paso
 * @param {Element} elemento
 * @returns {void}
 */
function acomodar_scroll(paso, elemento) {
	if (paso && paso.scroll_tabla === 'inicio') {
		llevar_scroll_al_inicio(elemento)
		return
	}

	traer_a_la_vista(elemento)
}

/**
 * Resuelve cuando la caja del elemento deja de moverse.
 *
 * 🔴 Sin esto, el motor mide un elemento que todavía se está acomodando y driver.js pinta el
 * recuadro donde el elemento **va a dejar de estar**:
 *
 * - un `b-modal` de BootstrapVue entra con `transform: translate(0, -50px) → translate(0, 0)` en
 *   300 ms, así que medirlo apenas aparece lo ubica ~50 px más arriba. Es lo que reportó Lucas el
 *   31/8/2026 en el paso "Andá a la pestaña Precio" del clip 1.4: el recuadro caía arriba de la
 *   fila de pestañas, no sobre ella;
 * - Popper todavía no colocó el menú desplegable;
 * - el scroll que acaba de hacer `traer_a_la_vista` puede no haberse pintado.
 *
 * `esperar_elemento` resuelve en cuanto el nodo tiene caja de 2 px, que es mucho antes de que la
 * caja sea la definitiva. Este es el paso que faltaba entre las dos cosas.
 *
 * @param {Element} elemento
 * @returns {Promise<Element>}
 */
function asentar_layout(elemento) {
	return new Promise(function (resolver) {
		let anterior = null
		let estables = 0
		let cuadros = 0
		let cortado = false

		limpiezas.push(function () {
			cortado = true
		})

		function mirar() {
			if (cortado) {
				resolver(elemento)
				return
			}

			const caja = elemento.getBoundingClientRect()
			const ahora = [
				Math.round(caja.top),
				Math.round(caja.left),
				Math.round(caja.width),
				Math.round(caja.height),
			].join(':')

			estables = ahora === anterior ? estables + 1 : 0
			anterior = ahora
			cuadros++

			if (estables >= CUADROS_ESTABLES || cuadros >= TECHO_ASENTADO) {
				resolver(elemento)
				return
			}

			window.requestAnimationFrame(mirar)
		}

		window.requestAnimationFrame(mirar)
	})
}

/**
 * Deja el paso listo para ser señalado: navega, corre el gancho, espera y busca el elemento.
 *
 * Los tres pasos finales —revelar, acercar y asentar— son los que hacen que el recuadro caiga
 * donde el lead está mirando, y no donde el elemento estaba un cuarto de segundo antes.
 *
 * @param {Object} paso
 * @param {Object} contexto
 * @returns {Promise<Element|null>}
 */
function preparar_paso(paso, contexto) {
	return ir_a(contexto.router, paso.ruta)
		.then(function () {
			return correr_gancho(paso, contexto)
		})
		.then(function () {
			return esperar_ms(paso.espera_ms || 0)
		})
		.then(function () {
			return esperar_elemento(selector_de(paso), techo_de(paso))
		})
		.then(function (encontrado) {
			if (!encontrado) {
				return null
			}

			const elemento = subir_a_ancestro(encontrado, paso.ancestro)

			revelar(elemento)

			/* Se espera DOS veces, y el orden importa: `revelar()` abre la lupa con una transición
			 * de 200 ms, así que scrollear antes de que termine acomodaría la tabla contra una caja
			 * que todavía va a cambiar de ancho. Primero se deja asentar lo revelado, después se
			 * scrollea contra la caja definitiva, y recién ahí se vuelve a esperar por si el scroll
			 * movió algo más. */
			return asentar_layout(elemento)
				.then(function () {
					acomodar_scroll(paso, elemento)

					return asentar_layout(elemento)
				})
		})
}

/**
 * Suelta todo lo que la corrida dejó enganchado.
 *
 * @returns {void}
 */
function limpiar() {
	limpiezas.forEach(function (soltar) {
		try {
			soltar()
		} catch (error) {
			console.warn('Tour: fallo al soltar un enganche', error)
		}
	})

	limpiezas = []

	ocultar_revelados()
	soltar_refresco()
	cerrar_dialogo_de_confirmacion()
}

/**
 * Le avisa al lead por qué el tour se cortó sin llegar a ningún lado.
 *
 * Va por el `$toast` de la aplicación, que es el mismo canal que usa el resto del sistema para
 * avisar cosas, y no por un cartel de driver.js: el tour ya terminó y montar un paso de más para
 * decir "no hay paso" es peor. Si por lo que sea no hay `$toast`, queda en la consola y listo.
 *
 * 🔴 Son DOS mensajes, y el segundo nació el 1/9/2026 junto con el "Siguiente" en todos los pasos.
 *
 * Hasta ese día el aviso era uno solo —*"esta práctica necesita datos que tu demo todavía no tiene
 * cargados"*— porque la única forma de llegar acá era que la pantalla que el tour da por hecha no
 * existiera. Desde que el lead puede adelantarse con el botón en un paso que esperaba un gesto
 * (ver `botones_de()`), hay una segunda forma: se salteó la acción, los pasos que dependían de ella
 * no encuentran su elemento, y el tour se corta. Echarle la culpa a los datos en ese caso es
 * mentirle: los datos estaban.
 *
 * @returns {void}
 */
function avisar_sin_pasos() {
	const raiz = corrida && corrida.contexto ? corrida.contexto.root : null
	const avanzo_a_mano = Boolean(corrida && corrida.avanzo_a_mano)

	console.warn('Tour ' + (corrida ? corrida.clip_id : '') + ': se cortó ' + (avanzo_a_mano ? 'después de que el lead se adelantó con el botón' : 'porque la demo no tiene los datos que este recorrido necesita') + ' (mostrados: ' + (corrida ? corrida.mostrados : '?') + ', salteados: ' + (corrida ? corrida.salteados : '?') + ')')

	if (!raiz || !raiz.$toast || typeof raiz.$toast.info !== 'function') {
		return
	}

	const texto = avanzo_a_mano
		? 'Te adelantaste algunos pasos y el tour se perdió. Podés volver a empezarlo desde el panel.'
		: 'Esta práctica necesita datos que tu demo todavía no tiene cargados. Mirá el video y seguí con el que sigue.'

	raiz.$toast.info(texto, {
		duration: 6000,
	})
}

/**
 * Reporta un evento del tour al bus de la demo.
 *
 * 🔴 Los tres nombres (`tour.iniciado`, `tour.paso_salteado`, `tour.completado`) tienen que estar
 * dados de alta en `DemoEventoEmitter::NOMBRES_UX` de `empresa-api`. Si no lo están, el endpoint
 * los descarta con un **204 mudo** y esta llamada parece exitosa: la acción `reportar` nunca
 * rechaza. Un nombre mal dado de alta no rompe nada visible y se descubre recién cuando alguien
 * mira el panel del admin y no hay datos. Hay un test que lo cubre:
 * `BusDeEventosTest::test_el_endpoint_de_ux_registra_los_eventos_del_tour_guiado`.
 *
 * @param {String} nombre
 * @param {Object} datos
 * @returns {void}
 */
function reportar(nombre, datos) {
	if (!corrida || !corrida.contexto || !corrida.contexto.store) {
		return
	}

	corrida.contexto.store.dispatch('demo/reportar', {
		nombre: nombre,
		clip_id: corrida.clip_id || null,
		datos: datos || {},
	})
}

/**
 * Resuelve los pasos de un clip.
 *
 * 🔴 Se prefiere lo que venga en el plan (`clip.pasos`) por sobre el catálogo local, y es a
 * propósito: `demo_experiencia.md` §3.12 decidió el 6/7/2026 que los pasos fueran data-driven
 * desde el manifest del admin. Hoy el plan congelado NO los trae —por eso existe el catálogo
 * local, que además vive en el mismo repo que el DOM al que apunta—, pero el día que el admin los
 * mande, mandan sin tocar una línea de acá.
 *
 * @param {Object} clip
 * @returns {Object|null}
 */
function guion_de(clip) {
	if (!clip) {
		return null
	}

	if (Array.isArray(clip.pasos) && clip.pasos.length > 0) {
		return { pasos: clip.pasos, ruta: clip.ruta || null }
	}

	return CATALOGO[clip.id] || null
}

/**
 * Pide ir al paso `i`, ignorando los pedidos que lleguen mientras uno está en curso.
 *
 * 🔴 El guarda no es defensivo de más: preparar un paso es asíncrono (navega, corre el gancho,
 * espera el elemento), y `corrida.indice` recién se actualiza al final. Sin esto, un lead que
 * aprieta "Siguiente" tres veces seguidas —o que lo aprieta mientras el paso todavía se está
 * armando— dispara tres preparaciones que leen el MISMO índice viejo y piden todas el mismo paso.
 * Medido el 30/8/2026: ocho clics seguidos dejaban el cartel clavado en el paso 4 mientras el
 * recuadro ya se había ido a otro elemento.
 *
 * @param {Number} i
 * @returns {void}
 */
function avanzar_a(i) {
	if (!corrida || corrida.avanzando) {
		return
	}

	mostrar_paso(i)
}

/**
 * Muestra el paso `i`, salteando los que no encuentran su elemento.
 *
 * @param {Number} i
 * @returns {void}
 */
function mostrar_paso(i) {
	if (!corrida || !recorrido) {
		return
	}

	if (i >= corrida.pasos.length) {
		/**
		 * 🔴 "Llegué al final" NO es lo mismo que "el lead hizo el recorrido".
		 *
		 * Un paso que no encuentra su elemento se saltea, así que un tour cuyos pasos se saltearon
		 * TODOS llega igual al final y, sin esta cuenta, emitía `tour.completado` con
		 * `completo: true`. El caso real es el clip 2.10 en una demo recién sembrada: el
		 * `DemoSetupHelper` no crea la `WhatsappBotConfig`, el botón de simular no se dibuja, y
		 * once de doce pasos se saltean. El panel del admin le habría mostrado a Tomás que ese lead
		 * completó el tour de WhatsApp sin que hubiera visto una sola pantalla.
		 *
		 * El criterio es que se haya mostrado más de la mitad de los pasos. `salteados` viaja igual
		 * en el evento, así que del lado del admin se puede afinar sin tocar esto.
		 *
		 * 🔴 Y desde el 1/9/2026 exige ADEMÁS no haberse cortado por salteos, que es lo que hace
		 * que "probado" quiera decir lo mismo en los tres lugares donde se lee.
		 *
		 * Sin esa mitad, un tour que mostró 8 de 10 pasos y después se cortó por
		 * `TOPE_SALTEOS_SEGUIDOS` salía con `completo: true` y `motivo: 'cortado'`: el lead veía el
		 * aviso de que el tour se perdió y ningún check, el admin lo marcaba "Probado" al 100%, y
		 * al primer F5 el botón se pintaba verde retroactivamente porque el plan lee `completo`.
		 * Tres cuentas distintas sobre la misma corrida. No explota nunca —por eso hay que buscarlo
		 * a propósito—, simplemente el lead ve una cosa y Tomás ve otra.
		 *
		 * Ahora `completo` implica `!corto_por_salteos`, que es justo lo que separa `'listo'` de
		 * `'cortado'` unos renglones más abajo. Las dos cuentas quedan encajadas por construcción.
		 */
		corrida.completo = !corrida.corto_por_salteos && corrida.mostrados > corrida.pasos.length / 2

		/**
		 * 🔴 Un tour que no llegó a mostrar UN SOLO paso no puede terminar en silencio, y tampoco
		 * puede contarse como terminado.
		 *
		 * Pasa cuando la demo no tiene los datos que el tour necesita: el 2.5 arranca en el botón
		 * de cuenta corriente de un cliente, y si ningún cliente tiene cuenta ese botón no existe;
		 * el motor saltea ese paso, los seis que siguen dependen del modal que ese botón abre, y se
		 * saltean también. Medido el 31/8/2026: el lead aprieta "Probar", el panel se colapsa, la
		 * pantalla cambia de módulo y **no pasa nada más**. No tiene forma de saber si el sistema
		 * se colgó o si hizo algo mal.
		 *
		 * El aviso no arregla la falta de datos —eso es de la demo, no del tour—, pero le cierra el
		 * gesto al lead y lo devuelve al panel.
		 *
		 * Y desde el 1/9/2026 esa misma condición decide el motivo con el que se cierra. El panel se
		 * reabre solo, pinta el botón de verde y abre el clip siguiente cuando el motor le avisa
		 * `motivo: 'listo'` (ver `cerrar_corrida()`): un tour que llegó al final salteando todo —o
		 * que se cortó por `TOPE_SALTEOS_SEGUIDOS`— no puede disparar eso, porque el lead vería el
		 * check de "probado" sin haber tocado una pantalla. Es la misma trampa que ya cubre
		 * `corrida.completo`, unos renglones más arriba, y por el mismo motivo.
		 */
		const se_corto = corrida.mostrados === 0 || corrida.corto_por_salteos

		if (se_corto) {
			avisar_sin_pasos()
		}

		cerrar_corrida(se_corto ? 'cortado' : 'listo')
		destruir_recorrido()
		return
	}

	const paso = corrida.pasos[i]

	corrida.preparando = i
	corrida.avanzando = true

	preparar_paso(paso, corrida.contexto).then(function (elemento) {
		/* El lead pudo haber cortado el tour mientras se preparaba este paso. */
		if (!corrida || corrida.preparando !== i) {
			return
		}

		corrida.avanzando = false

		if (!elemento) {
			/* 🔴 Saltear, nunca colgarse. Un elemento que no aparece es lo NORMAL en varios pasos:
			 * `ventas.boton_editar_venta` tiene cinco frenos que lo esconden, `compras.boton_dif`
			 * solo existe si se cargó cantidad recibida, `ventas.grilla_alicuotas` solo si antes
			 * se escribió un importe, y el clip 4.6 entero depende de una extensión que viene
			 * apagada. Antes de esto, cualquiera de esos casos dejaba al lead mirando un overlay
			 * sin salida. */
			console.warn('Tour ' + corrida.clip_id + ': se saltea el paso ' + (i + 1) + ' ("' + (paso.ancla || paso.selector) + '") porque no apareció')

			corrida.salteados++
			corrida.salteados_seguidos++

			/* Tres seguidos: la pantalla que este tour da por hecha no está. Se corta acá en vez de
			 * seguir salteando de a uno hasta el final, que es lo que dejaba al lead esperando. */
			if (corrida.salteados_seguidos >= TOPE_SALTEOS_SEGUIDOS) {
				corrida.corto_por_salteos = true
				mostrar_paso(corrida.pasos.length)
				return
			}

			mostrar_paso(i + 1)
			return
		}

		corrida.indice = i
		corrida.mostrados++
		corrida.salteados_seguidos = 0

		/**
		 * 🔴 Se le pasa el ELEMENTO, no el selector, y esa palabra es la mitad de esta misión.
		 *
		 * Con un string, driver.js lo resuelve por su cuenta con `document.querySelector()`
		 * (verificado en `dist/driver.js.mjs` 1.4.0), o sea **el primer nodo del DOM que matchea**
		 * — que no tiene por qué ser el que el motor validó. Y el motor no usa `querySelector`
		 * justamente porque no alcanza: `buscar_visible()` recorre TODOS los matches y descarta los
		 * que no se pueden señalar (ramas `v-if`/`v-else` conviviendo un instante, el desplegable
		 * que se monta dos veces, el nav horizontal del modal contra el de la vista de atrás), y
		 * `resolver_visible()` además baja al `.modal-content` cuando el ancla cayó en el div de
		 * 0×0 de BootstrapVue.
		 *
		 * Todo ese trabajo se tiraba a la basura en esta línea: el motor medía un elemento y
		 * driver.js resaltaba otro. Lo reportó Lucas el 31/8/2026 —"el tour está señalando una
		 * parte equivocada del modal"— y es la causa de los recuadros fuera de lugar.
		 */
		/* Se suelta el custodio del paso anterior ANTES de resaltar el nuevo: si no, cuando driver
		 * le saca `driver-active-element` al elemento viejo, el custodio se la vuelve a poner y esa
		 * parte de la pantalla queda interactiva de más. Ver `custodiar_clase_activa()`. */
		soltar_refresco()

		recorrido.highlight({
			element: elemento,
			popover: {
				description: paso.texto,
				side: paso.lado || lado_sugerido(elemento),
				align: paso.alineacion || 'start',
				/* El progreso se arma a mano porque el motor muestra de a un paso: driver.js no
				 * sabe cuántos son en total, y el total real no se conoce hasta el final (los
				 * pasos que no aparecen se saltean). Se usa el total declarado, que es el que el
				 * lead entiende. */
				title: 'Paso ' + (i + 1) + ' de ' + corrida.pasos.length,
				showButtons: botones_de(paso, i),
				nextBtnText: i === corrida.pasos.length - 1 ? 'Listo' : 'Siguiente',
				doneBtnText: 'Listo',
			},
		})

		enganchar_refresco(elemento)
		reubicar_cartel(i, elemento)
		enfocar_campo_del_paso(paso, elemento)
		enganchar_avance(paso, i, elemento)
	})
}

/**
 * Le pone el foco al campo del paso, para que el lead pueda escribir sin buscar el mouse.
 *
 * Lo pidió Lucas el 1/9/2026: *"cuando voy en la etapa del tour en el que tengo que escribir algo en
 * un input, quiero que, además de señalarme en el tour, ese input se haga foco"*.
 *
 * 🔴 `preventScroll: true` no es un adorno: sin él el navegador scrollea hasta el campo por su
 * cuenta y pisa el trabajo de `traer_a_la_vista()` y de `reubicar_cartel()`, que es exactamente el
 * defecto de los recuadros fuera de lugar que se arregló el 31/8/2026. Con la opción puesta, el
 * foco no mueve nada.
 *
 * 🔴 **El buscador de una relación queda afuera, y la razón se midió en el código, no se supuso.**
 * `common-vue/components/search/Index.vue:70-71` abre el modal de búsqueda con `@click` y con
 * `@keyup`, NO con `@focus`: enfocarlo no abre nada, así que el foco no le ahorra un gesto al lead
 * —el gesto que el paso le pide es el clic, que es lo que abre el modal—. Y deja una trampa: con ese
 * input enfocado, CUALQUIER tecla (un Tab, un Escape) dispara `callSearchModal` y el modal se abre
 * solo, a destiempo. Por eso los `.search-field__input` no se enfocan. El input de adentro del modal
 * (`buscador-general__input`) sí, que es donde el lead tiene que escribir de verdad.
 *
 * 🔴 **Y solo en los pasos que piden cargar un dato**, no en cualquiera que tenga un input adentro.
 * La marca de "acá hay que escribir" ya existía y es la que usa el avance: un paso `avanza: 'clic'`
 * cuyo elemento contiene un campo de carga no espera el clic, espera el `change` con el valor
 * puesto (ver `enganchar_avance_por_clic()`). Sin esa condición, un paso que solo describe una
 * pantalla —"este es el formulario, son cuatro datos"— le robaría el foco al primer input que
 * encuentre adentro, que es un campo del que el cartel ni habla, y el lead terminaría escribiendo en
 * el lugar equivocado.
 *
 * Un paso puede forzarlo con `foco: true` y apagarlo con `foco: false`.
 *
 * @param {Object} paso
 * @param {Element} elemento Nodo resaltado.
 * @returns {void}
 */
function enfocar_campo_del_paso(paso, elemento) {
	if (!paso || paso.foco === false) {
		return
	}

	if (paso.foco !== true && paso.avanza !== 'clic') {
		return
	}

	const campo = campo_de_carga(elemento)

	if (!campo || typeof campo.focus !== 'function') {
		return
	}

	if (campo.classList && campo.classList.contains('search-field__input')) {
		return
	}

	/**
	 * 🔴 Y no se enfoca un campo que no se ve.
	 *
	 * `campo_de_carga()` resuelve con `querySelector` y no mira visibilidad, así que sobre un
	 * contenedor grande devuelve el primer input del árbol aunque esté escondido. El caso medido es
	 * el modal de búsqueda: el desplegable de propiedades del buscador general trae un input
	 * "Filtrar propiedades..." (`view/header/buscador-general/PropertiesDropdown.vue:60-65`) que vive
	 * en un menú cerrado y aparece ANTES en el DOM que el buscador de verdad. Enfocarlo mandaría el
	 * cursor a un campo que el lead no ve.
	 */
	if (!se_puede_senalar(campo)) {
		return
	}

	try {
		campo.focus({ preventScroll: true })
	} catch (error) {
		console.warn('Tour: no se pudo enfocar el campo del paso', error)
	}
}

/**
 * Vuelve a ubicar el cartel una vez que driver.js terminó de dibujarlo.
 *
 * 🔴 driver.js ubica el cartel en el mismo momento en que lo crea, y ahí mide mal. Medido el
 * 31/8/2026 sobre el paso 2 del clip 1.1: con el botón "Crear" a 115 px del borde izquierdo y 890
 * px libres a su derecha, `repositionPopover` cae en su rama de "no entra en ningún lado" y lo
 * manda al **pie de la pantalla, centrado** — a 700 px del elemento que está señalando, ignorando
 * el `side: 'right'` que se le pidió. Un `refresh()` posterior, con exactamente el mismo DOM, lo
 * deja en su lugar: el problema es cuándo mide, no qué mide.
 *
 * Por eso además de esto el motor apaga `animate` (ver la config de `driver()`): con la animación
 * prendida el cartel se dibuja a mitad de la transición y `refresh()` todavía apunta al elemento
 * ANTERIOR, así que no se lo puede corregir a tiempo.
 *
 * Dos disparos: el de los dos cuadros arregla la ubicación antes de que el ojo la vea, y el de los
 * 450 ms cubre lo que se acomode después (una imagen que carga, una fila que cambia de alto).
 *
 * 🔴 Y de paso deshace el scroll que driver.js hace por su cuenta.
 *
 * Al resaltar, driver.js pregunta si el elemento "está en el viewport" comparando sus cuatro lados
 * contra la ventana. Cualquier cosa **más ancha o más alta que la pantalla** —una fila de la tabla,
 * que mide el ancho de todas las columnas— da que no, y entonces la centra con
 * `scrollIntoView({ inline: 'center' })`. O sea que pisa el scroll que `traer_a_la_vista()` acaba
 * de dejar bien y devuelve la tabla al medio, con el lead mirando columnas del centro en vez del
 * principio de la fila que el paso le señala. Medido el 31/8/2026 en el paso 2 del clip 1.4.
 *
 * Se vuelve a acomodar acá, después de que driver.js ya hizo lo suyo, y recién ahí se refresca:
 * `refresh()` no scrollea, así que la posición queda.
 *
 * @param {Number} i Índice del paso que se está mostrando.
 * @param {Element} elemento Nodo resaltado.
 * @returns {void}
 */
function reubicar_cartel(i, elemento) {
	function reubicar() {
		if (!corrida || !recorrido || corrida.indice !== i) {
			return
		}

		/* Se vuelve a decidir con el paso en la mano —y no con `traer_a_la_vista()` a secas— porque
		 * un paso con `scroll_tabla: 'inicio'` quiere lo contrario de centrar: ver `acomodar_scroll()`.
		 * Sin esta segunda pasada el arreglo no funciona, exactamente por lo que dice el párrafo de
		 * arriba: driver.js re-centra cualquier elemento más ancho que la pantalla y pisa lo que le
		 * dejemos. */
		acomodar_scroll(corrida.pasos[i], elemento)
		recorrido.refresh()
	}

	window.requestAnimationFrame(function () {
		window.requestAnimationFrame(reubicar)
	})

	const reloj = setTimeout(reubicar, DEMORA_REUBICAR)

	limpiezas.push(function () {
		clearTimeout(reloj)
	})
}

/**
 * De qué lado del elemento se planta el cartel cuando el paso no lo declara.
 *
 * 🔴 El default de siempre fue `'bottom'`, y sobre un desplegable eso es exactamente el peor lugar:
 * el menú se abre hacia abajo y el cartel —que va con `z-index: 1000000000`, más que cualquier
 * `.dropdown-menu` de Bootstrap— le cae encima y **tapa la opción que el paso pide tocar**.
 *
 * Lo reportó Lucas el 31/8/2026 sobre el paso 2 del clip 1.1: "cuando abro el menú, el desplegable
 * aparece debajo de la tarjeta del tour y no puedo presionar". Su propia sugerencia fue poner el
 * cartel a la derecha del botón, y es lo que hace esto.
 *
 * Fuera de ese caso no se inventa nada: sigue siendo `'bottom'`, que es lo que driver.js reubica
 * solo cuando no entra.
 *
 * @param {Element} elemento
 * @returns {String}
 */
function lado_sugerido(elemento) {
	if (!abre_menu_hacia_abajo(elemento)) {
		return 'bottom'
	}

	/* Al costado donde haya pantalla: los desplegables del listado viven a la izquierda del
	 * encabezado, los de la tabla más al centro. */
	return elemento.getBoundingClientRect().left < window.innerWidth / 2 ? 'right' : 'left'
}

/**
 * ¿Este elemento despliega un menú justo debajo suyo?
 *
 * Cubre las dos formas en que aparece el contrato: el ancla puesta sobre el `<b-dropdown>` entero
 * (el menú es hijo) y el ancla puesta sobre el botón que lo abre (el menú es tío).
 *
 * @param {Element} elemento
 * @returns {Boolean}
 */
function abre_menu_hacia_abajo(elemento) {
	return Boolean(menu_de(elemento))
}

/**
 * El `.dropdown-menu` que este elemento despliega, o null.
 *
 * Cubre las dos formas en que aparece el contrato: el ancla puesta sobre el `<b-dropdown>` entero
 * (el menú es hijo) y el ancla puesta sobre el botón que lo abre (el menú es tío). La segunda es la
 * del clip 1.8 desde el 1/9/2026, que ancla la flechita del `<b-dropdown split>` y no el botón
 * entero.
 *
 * Se resuelve en vivo cada vez y no se guarda el nodo: BootstrapVue re-renderiza el desplegable al
 * abrirlo (le agrega `show` y `position-static`) y un nodo guardado puede quedar viejo.
 *
 * @param {Element} elemento
 * @returns {Element|null}
 */
function menu_de(elemento) {
	if (!elemento || typeof elemento.querySelector !== 'function') {
		return null
	}

	const propio = elemento.querySelector('.dropdown-menu')

	if (propio) {
		return propio
	}

	/**
	 * 🔴 Sube por `.dropdown` y NO por `.btn-group`, y la diferencia cuesta 2,5 segundos.
	 *
	 * Con `.btn-group` en la lista, un botón que no despliega nada pero que comparte grupo con uno
	 * que sí, encuentra el menú de su HERMANO y se hace pasar por desplegable. El caso real es
	 * `listado.boton_modo_seleccion`: `opciones-filtrados-seleccion/Index.vue:15-33` mete el botón
	 * de selección y el desplegable de seleccionados en un mismo
	 * `<div class="btn-group opciones-grupos__group">` para que Bootstrap los pegue visualmente.
	 *
	 * Mientras esto solo alimentaba a `lado_sugerido()`, un falso positivo era cosmético: el cartel
	 * se plantaba al costado en vez de abajo. Desde que además decide si hay que ESPERAR a que el
	 * menú se abra (ver `esperar_menu_desplegado()`), el mismo falso positivo deja al lead mirando
	 * un tour aparentemente colgado durante todo el techo —2,5 s— en el paso 2 del clip 1.7, que es
	 * uno de los que Lucas reportó. Lo encontró el chequeo independiente del 1/9/2026.
	 *
	 * `.dropdown` alcanza para los dos casos que el contrato necesita: BootstrapVue le pone
	 * `dropdown b-dropdown btn-group` a la raíz del `<b-dropdown>`, así que resuelve tanto con el
	 * ancla sobre el desplegable entero como con el ancla sobre el botón que lo abre.
	 */
	const contenedor = typeof elemento.closest === 'function'
		? elemento.closest('.dropdown')
		: null

	return contenedor ? contenedor.querySelector('.dropdown-menu') : null
}

/**
 * Vuelve a medir el recuadro cuando el elemento resaltado se mueve debajo del lead.
 *
 * 🔴 driver.js engancha su refresco a `window.addEventListener('scroll')`, y **los eventos de
 * scroll no burbujean**: el scroll de `.cont-table` —que es donde vive la mitad de los anclajes del
 * listado, de ventas y de compras— nunca le llega. El lead scrollea la tabla y el recuadro se queda
 * pintado donde el elemento estaba. Acá se escucha en captura sobre `document`, que sí los ve.
 *
 * `refresh()` es seguro para llamar seguido: re-mide el recuadro y reubica el cartel, y NO vuelve a
 * scrollear (verificado en el `dist` — `refreshActiveHighlight` no pasa por `scrollIntoView`), así
 * que no puede pelearse con el scroll del lead.
 *
 * @param {Element} elemento
 * @returns {void}
 */
function enganchar_refresco(elemento) {
	let pedido = false

	function volver_a_medir() {
		if (pedido || !corrida || !recorrido) {
			return
		}

		pedido = true

		window.requestAnimationFrame(function () {
			pedido = false

			if (corrida && recorrido) {
				recorrido.refresh()
			}
		})
	}

	document.addEventListener('scroll', volver_a_medir, true)
	window.addEventListener('resize', volver_a_medir)

	/* El elemento también se mueve sin que nadie scrollee: la tabla recalcula anchos de columna al
	 * llegar los datos, y el modal cambia de alto al abrirse una solapa. */
	let observador = null

	if (typeof ResizeObserver === 'function') {
		observador = new ResizeObserver(volver_a_medir)
		observador.observe(elemento)
	}

	const custodio = custodiar_clase_activa(elemento)
	const custodio_menu = custodiar_menu_abierto(elemento)

	sueltas_de_refresco = function () {
		document.removeEventListener('scroll', volver_a_medir, true)
		window.removeEventListener('resize', volver_a_medir)

		if (observador) {
			observador.disconnect()
		}

		if (custodio) {
			custodio.disconnect()
		}

		if (custodio_menu) {
			custodio_menu.disconnect()
		}

		/* Se la saca a mano porque el custodio pudo habérsela repuesto. Es seguro: esto corre
		 * ANTES del `highlight()` del paso siguiente, que se la vuelve a poner al elemento que
		 * corresponda —incluso si es este mismo. */
		elemento.classList.remove(CLASE_ACTIVA)
	}
}

/**
 * Le devuelve al elemento resaltado la clase `driver-active-element` cada vez que Vue se la borra.
 *
 * 🔴 Esta es LA causa del "se tilda" que reportó Lucas el 31/8/2026: *"cuando quiero hacer clic en
 * el botón de Crear no pasa nada"*, *"intento cerrar la tarjeta y no pasa nada"*.
 *
 * `driver.css` deja la pantalla entera inerte mientras hay un tour —`.driver-active * {
 * pointer-events: none }`— y le devuelve el clic a UNA sola cosa: lo que lleve la clase
 * `driver-active-element`. driver.js se la pone al resaltar y da por hecho que se queda.
 *
 * En Vue 2 no se queda. Cuando un componente vuelve a renderizar y su binding de `class` cambia,
 * Vue **reescribe el atributo `class` entero**, y con él se va cualquier clase que le haya puesto
 * alguien de afuera. Medido en vivo sobre el paso 2 del clip 1.1: apenas se abre el menú Crear,
 * BootstrapVue le agrega `show` y `position-static` al `<div class="dropdown b-dropdown">`, la
 * clase de driver desaparece y a partir de ahí `document.elementFromPoint()` sobre el botón
 * devuelve `BODY`: **no queda un solo elemento de la aplicación que se pueda tocar**. El lead ve
 * una pantalla que no responde a nada.
 *
 * No es un caso raro del desplegable: le pasa a cualquier elemento resaltado cuyo componente
 * cambie una clase —una fila que se marca, un botón que se activa, una solapa que se selecciona—,
 * o sea a media docena larga de pasos de los 24 tours.
 *
 * El custodio vuelve a ponerla. Reponerla dispara al observador una segunda vez, pero ahí la clase
 * ya está y no hay más mutación: se estabiliza en una vuelta.
 *
 * @param {Element} elemento
 * @returns {MutationObserver|null}
 */
/**
 * Mantiene abierto el menú desplegable dentro del cual vive el elemento resaltado.
 *
 * 🔴 Sin esto, el paso que señala una opción de un menú resalta un elemento de 0×0.
 *
 * Medido el 1/9/2026 recorriendo el clip 1.8 en vivo: el lead toca la flechita de "Crear",
 * `esperar_menu_desplegado()` espera correctamente a que el menú abra, el motor prepara el paso
 * siguiente y encuentra la opción "Importación" —o sea que hasta ahí todo funciona—, pero **el
 * propio acto de mostrar el paso cierra el menú**: driver.js le pasa el foco al cartel al
 * renderizarlo, y BootstrapVue cierra sus desplegables ante cualquier foco de afuera. Resultado
 * medido: caja resaltada `[0,0,0,0]` y el cartel hablando de una opción que ya no está en pantalla.
 *
 * Es la misma clase de defecto que `custodiar_clase_activa()` —algo de afuera deshace lo que el
 * tour necesita— y se resuelve igual: se observa y se repone. Reponer la clase `show` es lo que
 * BootstrapVue mira para dibujar el menú, así que alcanza con devolvérsela al menú y a su
 * contenedor.
 *
 * ⚠️ El custodio se suelta al cambiar de paso (`sueltas_de_refresco`), así que el lead puede
 * cerrar el menú normalmente en cuanto el tour avanza. Mientras el paso está a la vista, en cambio,
 * cerrarlo dejaría al tour señalando la nada — que es justamente lo que se está evitando.
 *
 * @param {Element} elemento Nodo resaltado.
 * @returns {MutationObserver|null}
 */
function custodiar_menu_abierto(elemento) {
	if (typeof MutationObserver !== 'function' || !elemento || typeof elemento.closest !== 'function') {
		return null
	}

	const menu = elemento.closest('.dropdown-menu')

	if (!menu) {
		return null
	}

	const contenedor = menu.closest('.dropdown, .btn-group')

	function reponer() {
		if (!corrida || !recorrido) {
			return
		}

		if (!menu.classList.contains('show')) {
			menu.classList.add('show')
		}

		if (contenedor && !contenedor.classList.contains('show')) {
			contenedor.classList.add('show')
		}
	}

	const custodio = new MutationObserver(reponer)

	custodio.observe(menu, { attributes: true, attributeFilter: ['class'] })

	if (contenedor) {
		custodio.observe(contenedor, { attributes: true, attributeFilter: ['class'] })
	}

	/* Una pasada de entrada: si el menú ya se cerró entre que se resolvió el elemento y que se
	 * llegó acá, el observador no vería ningún cambio y el paso quedaría igual de roto. */
	reponer()

	return custodio
}

function custodiar_clase_activa(elemento) {
	if (typeof MutationObserver !== 'function') {
		return null
	}

	const custodio = new MutationObserver(function () {
		if (!corrida || !recorrido) {
			return
		}

		if (!elemento.classList.contains(CLASE_ACTIVA)) {
			elemento.classList.add(CLASE_ACTIVA)
		}
	})

	custodio.observe(elemento, { attributes: true, attributeFilter: ['class'] })

	return custodio
}

/**
 * Suelta los enganches de refresco del paso que estaba a la vista.
 *
 * @returns {void}
 */
function soltar_refresco() {
	if (!sueltas_de_refresco) {
		return
	}

	const soltar = sueltas_de_refresco

	sueltas_de_refresco = null

	try {
		soltar()
	} catch (error) {
		console.warn('Tour: fallo al soltar el refresco del paso', error)
	}
}

/**
 * Qué botones lleva el cartel de este paso: SIEMPRE los tres.
 *
 * 🔴 Esto revierte a propósito la guarda del 30/8/2026, y la decisión vieja no se borra porque
 * entenderla es lo único que evita que alguien la vuelva a poner dentro de un mes.
 *
 * **Lo que decía la regla vieja, y por qué era razonable:** un paso que avanza por clic o por
 * aparición no mostraba "Siguiente", porque un lead que lo apretaba se salteaba justamente la acción
 * que el tour le estaba pidiendo y llegaba al paso siguiente sin haber hecho lo que ese paso da por
 * hecho. Se midió el 30/8/2026 con `highlight()`: `popover.showButtons` no se aplica en ese modo, así
 * que la ocultación terminó viviendo en `onPopoverRender`.
 *
 * **Por qué se saca:** Lucas lo pidió al revés el 1/9/2026 —*"esos botones de siguiente y atrás,
 * dentro de cada viñeta de cada paso, deben estar siempre, para que el usuario no se pierda"*—, y
 * tiene razón sobre lo que pasa de verdad: un cartel sin ningún botón no le dice al lead que el tour
 * está esperando un gesto suyo, le dice que el tour se colgó. Se queda mirando una tarjeta que no
 * responde. El costo del botón (saltearse un paso) es reversible y visible; el costo de no tenerlo
 * (creer que el sistema se rompió) no.
 *
 * **Cómo se compensa el costo:** cuando el lead avanza con el botón desde un paso que esperaba un
 * gesto, la corrida se marca con `avanzo_a_mano` (ver `marcar_avance_a_mano()`), y si más adelante
 * el tour se corta por `TOPE_SALTEOS_SEGUIDOS` el aviso dice otra cosa: no le echa la culpa a los
 * datos de la demo, que estaban. Ver `avisar_sin_pasos()`.
 *
 * `previous` sigue sin dibujarse en el paso 0, que es lo que hace `onPopoverRender`: no hay atrás.
 *
 * ⚠️ Esta lista es informativa: con `highlight()` driver.js **no aplica** `popover.showButtons`
 * (medido el 30/8/2026). Quien manda de verdad es `onPopoverRender`. Se deja igual para que el que
 * lea el paso sepa qué se pretende dibujar.
 *
 * @param {Object} paso
 * @param {Number} i
 * @returns {Array}
 */
function botones_de(paso, i) {
	return i === 0 ? ['next', 'close'] : ['next', 'previous', 'close']
}

/**
 * Deja anotado que el lead se adelantó con el botón en un paso que esperaba un gesto.
 *
 * Es la compensación de que "Siguiente" esté siempre a la vista (ver `botones_de()`): lo único que
 * cambia es el texto del aviso si el tour termina cortándose por salteos, para no decirle al lead
 * que le faltan datos cuando lo que pasó es que se salteó la acción.
 *
 * @returns {void}
 */
function marcar_avance_a_mano() {
	if (!corrida || corrida.indice < 0) {
		return
	}

	if (espera_un_gesto(corrida.pasos[corrida.indice], corrida.indice)) {
		corrida.avanzo_a_mano = true
	}
}

/**
 * ¿Este paso espera un gesto del lead, o se avanza con el botón del cartel?
 *
 * 🔴 La segunda condición evita un cuelgue que se midió el 30/8/2026 y que dejaba **cuatro tours
 * clavados para siempre** (1.3, 1.5, 3.1 y 4.2).
 *
 * Esos tours tienen "pasos puente" —un cartel que dice "ahora te llevo a X"— declarados con
 * `avanza: 'aparece'`, esperando el elemento del paso que viene. Pero ese elemento vive **en otra
 * ruta**, y el motor recién navega cuando prepara el paso siguiente: o sea que el elemento no
 * puede aparecer nunca, porque lo que lo haría aparecer es justamente el avance que está esperando.
 * Y como en ese entonces un paso que espera un gesto **no dibujaba "Siguiente"** —eso cambió el
 * 1/9/2026, ver `botones_de()`—, y `driver.css` deja el resto de la pantalla inerte, el lead quedaba
 * sin ninguna salida salvo cerrar el tour.
 *
 * Cuando el paso que viene declara otra ruta, entonces, el gesto no existe: lo dispara el botón. La
 * guarda sigue haciendo falta con el botón siempre a la vista: sin ella el motor dejaría un sondeo
 * vivo cinco minutos esperando algo que no puede pasar, y el cartel diría "hacé el gesto" cuando lo
 * único que hay para hacer es apretar Siguiente.
 *
 * @param {Object} paso
 * @param {Number} i
 * @returns {Boolean}
 */
function espera_un_gesto(paso, i) {
	/* Un paso que espera que su propio elemento SE VAYA no depende del paso siguiente ni de la ruta:
	 * el gesto es el del lead cerrando el modal en el que está parado. Ver
	 * `enganchar_avance_por_desaparicion()`. */
	if (paso.avanza === 'desaparece') {
		return true
	}

	if (paso.avanza !== 'clic' && paso.avanza !== 'aparece') {
		return false
	}

	if (paso.avanza === 'aparece' && cambia_de_ruta(i)) {
		return false
	}

	/* El elemento del paso que viene ya estaba a la vista: no hay aparición que esperar. */
	if (corrida && corrida.forzar_boton === i) {
		return false
	}

	return true
}

/**
 * ¿El paso siguiente vive en otra ruta que el actual?
 *
 * @param {Number} i
 * @returns {Boolean}
 */
function cambia_de_ruta(i) {
	if (!corrida) {
		return false
	}

	const actual = corrida.pasos[i]
	const siguiente = corrida.pasos[i + 1]

	if (!siguiente || !siguiente.ruta) {
		return false
	}

	if (!actual || !actual.ruta) {
		return true
	}

	if (actual.ruta.name !== siguiente.ruta.name) {
		return true
	}

	return !mismos_params(actual.ruta.params, siguiente.ruta.params)
}

/**
 * Engancha el disparador de avance del paso actual.
 *
 * Es el corazón del motor: cada paso declara CÓMO se pasa al siguiente, y acá se conecta ese
 * disparador. Sin esto el tour sería una diapositiva; con esto acompaña la acción de verdad.
 *
 * @param {Object} paso
 * @param {Number} i
 * @param {Element} elemento Nodo que se está resaltando, ya resuelto.
 * @returns {void}
 */
function enganchar_avance(paso, i, elemento) {
	if (!espera_un_gesto(paso, i)) {
		/* Lo dispara el botón del cartel, que cae en `onNextClick`. Nada que enganchar. */
		return
	}

	if (paso.avanza === 'clic') {
		enganchar_avance_por_clic(paso, i, elemento)
		return
	}

	if (paso.avanza === 'desaparece') {
		enganchar_avance_por_desaparicion(paso, i)
		return
	}

	enganchar_avance_por_aparicion(i)
}

/**
 * Avanza cuando el lead hace clic de verdad sobre el elemento resaltado.
 *
 * 🔴 driver.js no trae `advanceOn` (eso lo tiene Shepherd, que se descartó por licencia), así que
 * el avance por clic se resuelve acá.
 *
 * El listener va sobre `document` en fase de captura y no sobre el elemento, por dos motivos
 * medidos: varios elementos del contrato se re-renderizan entre que se los resalta y que el lead
 * los toca (el modal de reparto de pagos remonta su contenido con `:key` cada vez que se abre), y
 * un listener pegado al nodo viejo se pierde con el nodo. Con `closest()` sobre el selector, el
 * clic se reconoce aunque el nodo sea otro.
 *
 * @param {Object} paso
 * @param {Number} i
 * @param {Element} resaltado Nodo que se está resaltando, ya resuelto.
 * @returns {void}
 */
function enganchar_avance_por_clic(paso, i, resaltado) {
	const selector = selector_de(paso)

	if (!selector) {
		return
	}

	/**
	 * 🔴 Sobre un campo de carga, el clic NO es la acción: es poner el foco.
	 *
	 * Una docena larga de pasos dicen "cargá", "escribí", "poné el número" — el costo, el margen, el
	 * código de barras, el importe a facturar, la cantidad recibida. Avanzando con el clic, el tour
	 * se iba al paso siguiente **antes de que el lead escribiera nada**, y en el 4.1 eso significaba
	 * guardar una compra sin proveedor cuatro pasos después.
	 *
	 * Con un campo adentro, entonces, el avance espera a que el dato esté cargado (`change`, que en
	 * un input dispara al salir del campo con el valor cambiado), no a que lo toquen.
	 */
	const campo = campo_de_carga(resaltado || buscar_visible(selector))

	if (campo) {
		enganchar_avance_por_carga(campo, selector, i)
		return
	}

	function al_clickear(evento) {
		if (!corrida || corrida.indice !== i) {
			return
		}

		if (!evento.target || typeof evento.target.closest !== 'function') {
			return
		}

		/* Se acepta el clic si cayó adentro del nodo resaltado O si matchea el selector del paso.
		 * Las dos formas hacen falta: la primera cubre los pasos que resaltan un ancestro (ver
		 * `subir_a_ancestro`), y la segunda los nodos que se re-renderizaron entre que se los
		 * resaltó y que el lead los tocó. */
		const cayo_adentro = resaltado && typeof resaltado.contains === 'function' && resaltado.contains(evento.target)

		if (!cayo_adentro && !evento.target.closest(selector)) {
			return
		}

		document.removeEventListener('click', al_clickear, true)

		/**
		 * 🔴 Si lo que el clic abre es un desplegable, el respiro fijo no alcanza.
		 *
		 * Lo reportó Lucas el 1/9/2026 sobre los clips 1.6, 1.7 y 1.8: *"cuando hago clic en el
		 * botón que abre el drop down, ya sea de los filtrados o de los seleccionados manualmente,
		 * hay que esperar a que se abra el dropdown y recién ahí pasa al siguiente paso del tour"*.
		 *
		 * BootstrapVue abre el menú y Popper lo coloca en un tick posterior; a los 80 ms el `<ul>`
		 * todavía puede no tener la clase `show` ni caja. El paso siguiente —que señala una opción de
		 * adentro— no encuentra su elemento y **se saltea en silencio**, que es la forma en que un
		 * tour roto se ve sano.
		 *
		 * Se sondea por la forma del elemento y no por una marca en el guion: así arregla los tres
		 * clips a la vez y cualquier paso futuro que ancle un desplegable.
		 */
		if (abre_menu_hacia_abajo(resaltado) || abre_menu_hacia_abajo(buscar_visible(selector))) {
			esperar_menu_desplegado(selector, resaltado, i)
			return
		}

		/* Un respiro: el handler de la aplicación tiene que correr primero, si no el tour avanza
		 * antes de que el clic haya hecho lo suyo y el paso siguiente mide un DOM viejo. */
		setTimeout(function () {
			if (corrida && corrida.indice === i) {
				mostrar_paso(i + 1)
			}
		}, 80)
	}

	document.addEventListener('click', al_clickear, true)

	limpiezas.push(function () {
		document.removeEventListener('click', al_clickear, true)
	})
}

/**
 * Espera a que el desplegable que el lead acaba de tocar esté abierto de verdad, y recién ahí avanza.
 *
 * "Abierto de verdad" es el `.dropdown-menu` con la clase `show` **y con caja**: BootstrapVue le pone
 * `show` al empezar y Popper lo posiciona después, así que la clase sola llega antes de que el menú
 * se pueda tocar.
 *
 * 🔴 **Si el techo se agota, avanza igual.** Un desplegable que no abre es un problema de la
 * pantalla, no del lead: dejarlo esperando para siempre lo encerraría en un paso que ya hizo. Se
 * avisa por consola y se sigue; el paso que viene, si no encuentra su elemento, se saltea con las
 * reglas de siempre.
 *
 * @param {String} selector Selector del paso, para volver a resolver el elemento si Vue lo re-renderizó.
 * @param {Element|null} resaltado Nodo que se resaltó.
 * @param {Number} i
 * @returns {void}
 */
function esperar_menu_desplegado(selector, resaltado, i) {
	let transcurrido = 0

	function menu_abierto() {
		const menu = menu_de(buscar_visible(selector)) || menu_de(resaltado)

		return Boolean(menu && menu.classList.contains('show') && se_puede_senalar(menu))
	}

	const reloj = setInterval(function () {
		if (!corrida || corrida.indice !== i) {
			clearInterval(reloj)
			return
		}

		if (menu_abierto()) {
			clearInterval(reloj)
			mostrar_paso(i + 1)
			return
		}

		transcurrido += INTERVALO_SONDEO

		if (transcurrido >= TECHO_MENU_ABIERTO) {
			clearInterval(reloj)
			console.warn('Tour ' + corrida.clip_id + ': el desplegable del paso ' + (i + 1) + ' no llegó a abrirse en ' + TECHO_MENU_ABIERTO + ' ms; se avanza igual')
			mostrar_paso(i + 1)
		}
	}, INTERVALO_SONDEO)

	limpiezas.push(function () {
		clearInterval(reloj)
	})
}

/**
 * Avanza cuando el elemento del propio paso deja de estar a la vista.
 *
 * Lo necesitan los pasos que viven ADENTRO de algo que se cierra al usarlo: el modal de búsqueda del
 * proveedor (clip 1.1) y el de artículos de Vender (clip 2.1). Ahí `'clic'` no sirve —el clic cae en
 * un renglón de resultados, no en el input que el paso resalta— y `'aparece'` tampoco —lo que aparece
 * después es un campo que ya estaba en el DOM, detrás del modal—.
 *
 * 🔴 Si el techo se agota **se queda en el paso**, igual que `'aparece'`: que el lead todavía no haya
 * elegido no significa que no vaya a elegir. Y desde el 1/9/2026 además tiene "Siguiente" en el
 * cartel, así que la salida no depende de que el motor adivine.
 *
 * @param {Object} paso
 * @param {Number} i
 * @returns {void}
 */
function enganchar_avance_por_desaparicion(paso, i) {
	const selector = selector_de(paso)

	if (!selector) {
		return
	}

	const techo = paso.techo_gesto_ms || TECHO_ESPERA_GESTO
	let transcurrido = 0

	const reloj = setInterval(function () {
		if (!corrida || corrida.indice !== i) {
			clearInterval(reloj)
			return
		}

		if (!buscar_visible(selector)) {
			clearInterval(reloj)
			mostrar_paso(i + 1)
			return
		}

		transcurrido += INTERVALO_SONDEO

		if (transcurrido >= techo) {
			clearInterval(reloj)
			console.warn('Tour ' + corrida.clip_id + ': sigo esperando que el lead cierre lo del paso ' + (i + 1) + '; puede seguir con el botón o cerrar el tour cuando quiera')
		}
	}, INTERVALO_SONDEO)

	limpiezas.push(function () {
		clearInterval(reloj)
	})
}

/**
 * El primer campo de carga que esté A LA VISTA adentro del elemento.
 *
 * Ver el porqué en `campo_de_carga()`, que es su único llamador.
 *
 * @param {Element} elemento
 * @returns {Element|null}
 */
function primer_campo_visible(elemento) {
	const candidatos = elemento.querySelectorAll('input:not([type=checkbox]):not([type=radio]), textarea, select')

	for (let i = 0; i < candidatos.length; i++) {
		if (se_puede_senalar(candidatos[i])) {
			return candidatos[i]
		}
	}

	return null
}

/**
 * Devuelve el campo de carga del elemento resaltado, si el paso es de cargar un dato.
 *
 * El elemento anclado suele ser el CONTENEDOR (un `#form-group-...`, un `div` de tarjeta), así que
 * el campo se busca adentro. Se excluyen los `checkbox` y `radio`, donde el clic **sí** es la
 * acción completa.
 *
 * @param {Element|null} elemento Nodo resaltado.
 * @returns {Element|null}
 */
function campo_de_carga(elemento) {
	if (!elemento) {
		return null
	}

	/**
	 * 🔴 Se recorren TODOS los campos y se descarta el que no se ve, en vez de quedarse con el
	 * primero del árbol.
	 *
	 * Con `querySelector` a secas, un paso que ancla un modal se quedaba con el primer input del
	 * DOM adentro de ese modal — y en el buscador de artículos ese primero es el campo OCULTO
	 * "Filtrar propiedades…" de `buscador-general/PropertiesDropdown.vue`, que vive dentro de un
	 * menú cerrado y aparece antes en el orden del documento. Dos consecuencias, las dos calladas:
	 * el avance por carga se quedaba esperando un `change` que ese campo no iba a disparar nunca
	 * (paso 4 del clip 2.1, colgado sin que nadie lo viera), y el foco automático del paso se lo
	 * llevaba un campo que el lead no tiene delante.
	 *
	 * `se_puede_senalar()` es el mismo criterio que ya usa `buscar_visible()` para elegir entre
	 * ramas `v-if`/`v-else` que conviven un instante: si sirve para decidir qué se resalta, sirve
	 * para decidir dónde se escribe.
	 */
	const candidato = elemento.matches('input, textarea, select')
		? elemento
		: primer_campo_visible(elemento)

	if (!candidato) {
		return null
	}

	const tipo = (candidato.getAttribute('type') || '').toLowerCase()

	if (tipo === 'checkbox' || tipo === 'radio' || tipo === 'button' || tipo === 'submit') {
		return null
	}

	if (candidato.disabled || candidato.readOnly) {
		return null
	}

	return candidato
}

/**
 * Avanza cuando el lead termina de cargar el dato.
 *
 * Escucha `change` en fase de captura sobre `document`, y no sobre el campo, por lo mismo que el
 * avance por clic: varios de estos campos se re-renderizan entre que se los resalta y que el lead
 * los usa, y un listener pegado al nodo viejo se pierde con el nodo.
 *
 * @param {Element} campo
 * @param {String} selector
 * @param {Number} i
 * @returns {void}
 */
function enganchar_avance_por_carga(campo, selector, i) {
	function al_cargar(evento) {
		if (!corrida || corrida.indice !== i) {
			return
		}

		if (!evento.target || typeof evento.target.closest !== 'function') {
			return
		}

		if (!evento.target.closest(selector)) {
			return
		}

		/* Un campo que quedó vacío no es un dato cargado: el lead entró y salió sin escribir. */
		if (typeof evento.target.value === 'string' && evento.target.value.trim() === '') {
			return
		}

		document.removeEventListener('change', al_cargar, true)

		setTimeout(function () {
			if (corrida && corrida.indice === i) {
				mostrar_paso(i + 1)
			}
		}, 120)
	}

	document.addEventListener('change', al_cargar, true)

	limpiezas.push(function () {
		document.removeEventListener('change', al_cargar, true)
	})
}

/**
 * Avanza cuando aparece el elemento del paso siguiente.
 *
 * Es el modo que necesitan los pasos que dependen de algo que tarda y que no dispara ningún clic
 * del lead: un modal que abre en el `$nextTick` siguiente, el resumen de imágenes que llega por
 * Pusher entre 10 y 15 segundos después, la factura escaneada que vuelve del servidor a los ~30.
 *
 * @param {Number} i
 * @returns {void}
 */
function enganchar_avance_por_aparicion(i) {
	const siguiente = corrida.pasos[i + 1]

	if (!siguiente) {
		return
	}

	/**
	 * 🔴 Si el elemento del paso que viene YA está a la vista, esperar su aparición no espera nada:
	 * `esperar_elemento` mira una vez de entrada y resuelve en el acto, así que el cartel
	 * desaparece antes de que el lead lo lea.
	 *
	 * Medido el 30/8/2026 sobre cuatro clips, y en todos se comía **el gesto que le da nombre al
	 * clip**: en el 2.1 el escaneo del código de barras (el paso siguiente es el buscador, que es su
	 * hermano en la misma fila), y en el 4.1 la carga del proveedor — con lo cual la compra que se
	 * guarda cuatro pasos después salía sin proveedor.
	 *
	 * Cuando el elemento ya está, el gesto no se puede detectar por aparición: se pasa a botón, que
	 * al menos deja al lead decidir cuándo terminó.
	 */
	if (buscar_visible(selector_de(siguiente))) {
		console.warn('Tour ' + corrida.clip_id + ': el paso ' + (i + 2) + ' ya está a la vista, así que el paso ' + (i + 1) + ' avanza con el botón')
		corrida.forzar_boton = i
		recorrido.refresh()
		return
	}

	esperar_elemento(selector_de(siguiente), siguiente.techo_ms || TECHO_ESPERA_GESTO).then(function (elemento) {
		if (!corrida || corrida.indice !== i) {
			return
		}

		if (!elemento) {
			/**
			 * 🔴 Se queda en el paso, NO saltea.
			 *
			 * Acá el motor está esperando un gesto del lead —abrir un modal, mandar un escaneo—, y
			 * que todavía no lo haya hecho no significa que no lo vaya a hacer. Adelantarlo lo deja
			 * mirando un cartel que habla de una pantalla que él no abrió, que es peor que
			 * esperarlo. Si se cansó, tiene la cruz.
			 */
			console.warn('Tour ' + corrida.clip_id + ': sigo esperando el gesto del paso ' + (i + 1) + '; el lead puede cerrar el tour cuando quiera')
			return
		}

		mostrar_paso(i + 1)
	})
}

/**
 * Cierra la corrida, reporta cómo terminó y le avisa al panel.
 *
 * Es el ÚNICO lugar que emite los eventos de cierre, y por eso es idempotente: al cierre se llega
 * por tres caminos —el último paso, la cruz del cartel, y el panel cortando el tour desde afuera—
 * y los tres pasan por acá.
 *
 * ## El aviso al panel (`contexto.al_terminar`)
 *
 * El llamador puede pasar una función en el contexto y el motor la llama con:
 *
 * ```js
 * { clip_id: String, motivo: 'listo' | 'cortado', completo: Boolean,
 *   mostrados: Number, pasos: Number }
 * ```
 *
 * Con ella el panel se reabre solo, pinta el botón del clip de verde y abre el siguiente. Si no
 * viene, o no es una función, el motor no hace nada: cualquier llamador viejo sigue andando igual.
 *
 * 🔴 **`motivo: 'listo'` solo cuando el guion llegó al final habiendo mostrado pasos.** La cruz, el
 * clic afuera confirmado, el Escape, `cortar_tour()` desde el panel y el corte por
 * `TOPE_SALTEOS_SEGUIDOS` dan `'cortado'`. Un tour abandonado no se marca como probado.
 *
 * 🔴 **El aviso sale FUERA del ciclo de cierre, con `setTimeout(..., 0)`.** Lo que hace el panel al
 * recibirlo es reabrirse, y si se reabre mientras driver.js todavía está vivo el overlay le queda
 * pegado encima: la pantalla entera queda inerte con el panel arriba. Como `destruir_recorrido()`
 * corre sincrónicamente después de esta función en los tres caminos de cierre, un salto al próximo
 * turno del event loop alcanza para que el aviso llegue con el overlay ya desarmado. Por lo mismo,
 * el temporizador **no** se apila en `limpiezas`: `limpiar()` corre acá abajo y lo cancelaría.
 *
 * @param {String} [motivo] `'listo'` si el guion terminó; cualquier otra cosa se toma como cortado.
 * @returns {void}
 */
function cerrar_corrida(motivo) {
	if (!corrida || corrida.terminada) {
		return
	}

	corrida.terminada = true

	const completo = Boolean(corrida.completo)

	if (!completo) {
		reportar('tour.paso_salteado', {
			paso: corrida.indice + 1,
			total: corrida.pasos.length,
		})
	}

	reportar('tour.completado', {
		completo: completo,
		pasos: corrida.pasos.length,
		mostrados: corrida.mostrados,
		salteados: corrida.salteados,
	})

	const avisar = corrida.contexto && typeof corrida.contexto.al_terminar === 'function'
		? corrida.contexto.al_terminar
		: null

	const resultado = {
		clip_id: corrida.clip_id || null,
		motivo: motivo === 'listo' ? 'listo' : 'cortado',
		completo: completo,
		mostrados: corrida.mostrados,
		pasos: corrida.pasos.length,
	}

	corrida = null
	limpiar()

	if (!avisar) {
		return
	}

	setTimeout(function () {
		try {
			avisar(resultado)
		} catch (error) {
			console.warn('Tour: el aviso de cierre al panel falló', error)
		}
	}, 0)
}

/**
 * Cierra driver.js sin volver a pasar por `onDestroyStarted`.
 *
 * ⚠️ `destroy()` dispara `onDestroyed`, no `onDestroyStarted`, así que llamarlo desde adentro de
 * ese hook —que es el patrón que la propia driver.js documenta— no recursa.
 *
 * @returns {void}
 */
function destruir_recorrido() {
	/* El diálogo se baja SIEMPRE, aunque no haya recorrido: es lo único del tour que vive colgado de
	 * `document.body` y sobrevivir a la corrida lo dejaría flotando sobre la aplicación. */
	cerrar_dialogo_de_confirmacion()

	if (!recorrido) {
		return
	}

	const instancia = recorrido

	recorrido = null
	instancia.destroy()
}


/**
 * Le pregunta al lead si de verdad quiere terminar el tour, en vez de cerrarlo de una.
 *
 * Lo pidió Lucas el 1/9/2026: *"si estoy en medio del tour y presiono sin querer fuera de la viñeta
 * del tour y fuera del foco, en lugar de que se cierre el tour, me pregunte si deseo terminar el
 * tour"*. Cubre los dos cierres accidentales —el clic en el fondo oscuro y el Escape—, que son los
 * que driver.js manda a `onDestroyStarted`.
 *
 * ⚠️ **La cruz del cartel NO pasa por acá y eso es a propósito.** Apretarla es un gesto explícito,
 * el lead sabe exactamente lo que está haciendo, y hacerla funcionar a la primera costó la misión
 * del 31/8/2026. Preguntarle ahí sería devolverle el problema que se le arregló. Ver `onCloseClick`.
 *
 * 🔴 **El diálogo se arma acá, a mano, y no con un `b-modal` ni con ningún componente de la app.**
 * `driver.css` deja la pantalla entera en `pointer-events: none` mientras hay un tour
 * (`.driver-active * { pointer-events: none }`), así que un modal de la aplicación se dibujaría
 * perfecto y no aceptaría un solo clic: el lead vería una pregunta que no puede contestar, con el
 * tour trabado atrás. Por eso el `pointer-events: auto` va **inline** (gana por especificidad contra
 * la regla de driver) en el contenedor **y en cada botón** —la regla de driver le pone
 * `pointer-events: none` a cada descendiente por separado, así que heredar del padre no alcanza—, y
 * el `z-index` va por encima del cartel de driver.js, que usa 1000000000.
 *
 * @returns {void}
 */
function pedir_confirmacion_de_cierre() {
	/* Ya está preguntando: un segundo clic en el fondo no apila otro diálogo. */
	if (dialogo_de_cierre) {
		return
	}

	/* Sin corrida no hay nada que preguntar, y no cerrar sería peor que preguntar de más: el overlay
	 * de driver.js quedaría pegado sobre una aplicación que ya no tiene tour. */
	if (!corrida) {
		destruir_recorrido()
		return
	}

	const fondo = document.createElement('div')

	fondo.setAttribute('role', 'dialog')
	fondo.setAttribute('aria-modal', 'true')
	fondo.setAttribute('aria-label', TITULO_CONFIRMACION)

	aplicar_estilos(fondo, {
		position: 'fixed',
		top: '0',
		left: '0',
		right: '0',
		bottom: '0',
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
		padding: '16px',
		background: 'rgba(0, 0, 0, .45)',
		'z-index': String(Z_DIALOGO_CONFIRMACION),
		'pointer-events': 'auto',
	})

	const caja = document.createElement('div')

	aplicar_estilos(caja, {
		width: '100%',
		'max-width': '340px',
		background: '#fff',
		'border-radius': '10px',
		padding: '20px',
		'box-shadow': '0 10px 40px rgba(0, 0, 0, .35)',
		'font-family': 'inherit',
		'pointer-events': 'auto',
	})

	const titulo = document.createElement('p')

	titulo.textContent = TITULO_CONFIRMACION

	aplicar_estilos(titulo, {
		margin: '0 0 6px',
		'font-size': '17px',
		'font-weight': '600',
		color: '#222',
	})

	const bajada = document.createElement('p')

	bajada.textContent = 'Si lo terminás, volvés a la pantalla como estaba. Podés arrancarlo de nuevo desde el panel.'

	aplicar_estilos(bajada, {
		margin: '0 0 18px',
		'font-size': '14px',
		'line-height': '1.4',
		color: '#555',
	})

	const fila = document.createElement('div')

	aplicar_estilos(fila, {
		display: 'flex',
		gap: '8px',
		'justify-content': 'flex-end',
		'flex-wrap': 'wrap',
	})

	const terminar = boton_del_dialogo('Sí, terminar', false)
	const seguir = boton_del_dialogo('Seguir en el tour', true)

	terminar.addEventListener('click', function () {
		cerrar_corrida('cortado')
		destruir_recorrido()
	})

	seguir.addEventListener('click', function () {
		cerrar_dialogo_de_confirmacion()
	})

	/**
	 * 🔴 Nada de lo que pase adentro del diálogo sale a `document`, y eso evita una vuelta perversa.
	 *
	 * driver.js escucha los clics en `document` para saber si cayeron "afuera" y disparar
	 * `onDestroyStarted`. El diálogo ESTÁ afuera del elemento resaltado, así que un clic en "Seguir
	 * en el tour" cerraría el diálogo... y en el mismo viaje del evento lo volvería a abrir. Se corta
	 * en la burbuja del contenedor, que es después de que los botones ya hicieron lo suyo.
	 */
	;['pointerdown', 'mousedown', 'click'].forEach(function (tipo) {
		fondo.addEventListener(tipo, function (evento) {
			evento.stopPropagation()
		})
	})

	fila.appendChild(terminar)
	fila.appendChild(seguir)
	caja.appendChild(titulo)
	caja.appendChild(bajada)
	caja.appendChild(fila)
	fondo.appendChild(caja)
	document.body.appendChild(fondo)

	dialogo_de_cierre = fondo

	/**
	 * Escape sobre el diálogo = "Seguir en el tour".
	 *
	 * 🔴 Se escuchan los DOS eventos de la tecla y se cierra en el `keyup`, y las dos cosas son
	 * necesarias para que un solo Escape no haga dos cosas contradictorias:
	 *
	 * - **Cerrar en el `keyup` y no en el `keydown`** deja el diálogo abierto durante todo el
	 *   `keydown`. driver.js registra su propio manejador de Escape sobre `document` y no está dicho
	 *   ni en qué evento ni en qué fase: mientras el diálogo siga abierto cuando ese manejador corra,
	 *   su `onDestroyStarted` se va por la guarda del principio de esta función en vez de dibujar un
	 *   segundo diálogo.
	 * - **`hubo_keydown`** evita lo contrario: si a este diálogo lo abrió el Escape de driver.js, el
	 *   `keyup` de ESE MISMO golpe de tecla lo cerraría al instante y el lead vería un parpadeo. Solo
	 *   cierra el `keyup` cuya tecla se apretó con el diálogo ya en pantalla.
	 *
	 * Los listeners que se agregan durante el reparto de un evento no reciben ese evento (lo dice la
	 * spec del DOM), así que registrarlos acá adentro no los expone al golpe que abrió el diálogo.
	 */
	let hubo_keydown = false

	function al_teclear(evento) {
		/**
		 * 🔴 Tab se corta acá aunque no haga nada, y no es por prolijidad.
		 *
		 * driver.js registra un `keydown` propio sobre `window` que **atrapa el foco adentro del
		 * cartel**: cualquier Tab lo devuelve ahí. Con el diálogo abierto eso significa que el lead
		 * no puede llegar con el teclado al botón que le estamos pidiendo que elija, aunque el
		 * diálogo se anuncie como `role="dialog"` / `aria-modal="true"`. Cortando la propagación,
		 * el Tab vuelve a ser el del navegador y recorre los dos botones.
		 *
		 * No hace falta implementar el ciclo de foco a mano: el diálogo tiene exactamente dos
		 * focusables y el navegador ya sabe ir de uno al otro.
		 */
		if (evento.key === 'Tab' || evento.keyCode === 9) {
			evento.stopPropagation()
			return
		}

		if (evento.key !== 'Escape' && evento.keyCode !== 27) {
			return
		}

		evento.preventDefault()
		evento.stopPropagation()

		if (evento.type === 'keydown') {
			hubo_keydown = true
			return
		}

		if (hubo_keydown) {
			cerrar_dialogo_de_confirmacion()
		}
	}

	document.addEventListener('keydown', al_teclear, true)
	document.addEventListener('keyup', al_teclear, true)

	soltar_teclado_del_dialogo = function () {
		document.removeEventListener('keydown', al_teclear, true)
		document.removeEventListener('keyup', al_teclear, true)
	}

	/* El foco arranca en "Seguir en el tour": si el lead llegó acá sin querer, un Enter reflejo lo
	 * devuelve al tour en vez de terminárselo. */
	try {
		seguir.focus({ preventScroll: true })
	} catch (error) {
		console.warn('Tour: no se pudo enfocar el diálogo de cierre', error)
	}
}

/**
 * Arma uno de los dos botones del diálogo de cierre.
 *
 * @param {String} texto
 * @param {Boolean} secundario El de "seguir", que es el de menos peso visual.
 * @returns {Element}
 */
function boton_del_dialogo(texto, secundario) {
	const boton = document.createElement('button')

	boton.type = 'button'
	boton.textContent = texto

	aplicar_estilos(boton, {
		padding: '8px 14px',
		border: secundario ? '1px solid #c8ccd2' : '1px solid transparent',
		'border-radius': '6px',
		background: secundario ? '#fff' : '#d9534f',
		color: secundario ? '#333' : '#fff',
		'font-size': '14px',
		'font-family': 'inherit',
		cursor: 'pointer',
		/* 🔴 Inline y en CADA botón: `.driver-active *` de driver.css se los apaga uno por uno. */
		'pointer-events': 'auto',
	})

	return boton
}

/**
 * Escribe estilos inline sin depender de la sintaxis camelCase de `style`.
 *
 * `setProperty` acepta el nombre CSS tal cual se escribe en una hoja, que es como está escrito el
 * diálogo de arriba, y así el que lo lea puede copiarlo a un `.sass` sin traducir nada.
 *
 * @param {Element} nodo
 * @param {Object} estilos
 * @returns {void}
 */
function aplicar_estilos(nodo, estilos) {
	Object.keys(estilos).forEach(function (propiedad) {
		nodo.style.setProperty(propiedad, estilos[propiedad])
	})
}

/**
 * Baja el diálogo de confirmación, si hay uno.
 *
 * Se llama desde `limpiar()` y desde `destruir_recorrido()` además de desde el botón "Seguir en el
 * tour": es lo único del motor que vive colgado de `document.body`, y sobrevivir a la corrida lo
 * dejaría flotando sobre la aplicación sin nada que lo cierre.
 *
 * @returns {void}
 */
function cerrar_dialogo_de_confirmacion() {
	if (typeof soltar_teclado_del_dialogo === 'function') {
		soltar_teclado_del_dialogo()
		soltar_teclado_del_dialogo = null
	}

	if (!dialogo_de_cierre) {
		return
	}

	const nodo = dialogo_de_cierre

	dialogo_de_cierre = null

	if (nodo.parentNode) {
		nodo.parentNode.removeChild(nodo)
	}
}

/**
 * Arranca el tour de un clip.
 *
 * @param {Object} clip Clip entero, tal como viaja en el plan.
 * @param {Object} contexto `{ router, store, root, al_terminar }`. `al_terminar` es opcional: si es
 *                          una función, el motor la llama al cerrar con
 *                          `{ clip_id, motivo, completo, mostrados, pasos }` —ver `cerrar_corrida()`—
 *                          y con eso el panel se reabre y marca el clip como probado.
 * @returns {Boolean} true si el tour arrancó.
 */
export function iniciar_tour(clip, contexto) {
	cortar_tour()

	const guion = guion_de(clip)

	if (!guion || !Array.isArray(guion.pasos) || guion.pasos.length === 0) {
		console.warn('Tour: no hay guion para el clip ' + (clip ? clip.id : '(sin id)'))
		return false
	}

	/* Cada paso hereda la ruta del tour si no declara una propia. La mayoría de los tours pasan
	 * por una sola vista; los que saltan (1.3, 1.5, 3.1, 4.2) la declaran paso por paso. */
	const pasos = guion.pasos.map(function (paso) {
		return Object.assign({}, paso, { ruta: paso.ruta || guion.ruta || null })
	})

	corrida = {
		clip_id: clip.id,
		contexto: contexto,
		pasos: pasos,
		indice: -1,
		preparando: -1,
		mostrados: 0,
		salteados: 0,
		/* Salteos encadenados sin ningún paso mostrado en el medio. Ver `TOPE_SALTEOS_SEGUIDOS`. */
		salteados_seguidos: 0,
		/* El tour se cortó porque la pantalla que da por hecha no está. Ver `avisar_sin_pasos()`. */
		corto_por_salteos: false,
		/* El lead usó "Siguiente" en un paso que esperaba un gesto. Ver `marcar_avance_a_mano()`. */
		avanzo_a_mano: false,
		terminada: false,
		avanzando: false,
		/* Indice del paso al que hubo que devolverle el boton porque no habia aparicion que esperar. */
		forzar_boton: -1,
		/* El tour llegó al final Y mostró más de la mitad de sus pasos. Lo escribe `mostrar_paso()`
		 * al pasarse del último; hasta entonces vale `false`, que es lo correcto para un tour que
		 * se corta a la mitad. Declarado acá y no dejado en `undefined` porque es el flag del que
		 * cuelga que el lead vea el botón verde: se busca en este literal antes que en el archivo. */
		completo: false,
	}

	recorrido = driver({
		allowClose: true,
		popoverClass: 'tour-demo',
		smoothScroll: true,
		/**
		 * 🔴 Sin animación de transición, y no es una preferencia estética.
		 *
		 * Con `animate: true` driver.js dibuja el cartel **a mitad de la transición de 400 ms**, y
		 * hasta que esa transición termina su estado interno (`__activeElement`, `__activeStep`)
		 * sigue apuntando al paso ANTERIOR. O sea que el cartel se ubica con medidas de vuelo y no
		 * hay forma de corregirlo a tiempo: un `refresh()` en ese rato lo mandaría al elemento
		 * viejo.
		 *
		 * Eso es lo que dejaba el cartel del paso 2 del clip 1.1 tirado al pie de la pantalla, a
		 * 700 px del botón que estaba señalando (medido el 31/8/2026). Apagándola, el cartel se
		 * dibuja de una con el DOM quieto, y `reubicar_cartel()` puede afinarlo en el cuadro
		 * siguiente.
		 *
		 * Lo que se pierde es el deslizamiento del recuadro entre un paso y el otro. Lo que se gana
		 * es que el recuadro y el cartel caigan donde tienen que caer, que es de lo que se trataba.
		 */
		animate: false,
		/* El lead TIENE que poder tocar el elemento resaltado: el tour no es una diapositiva, es
		 * él haciendo la acción. Por eso la interacción con lo resaltado queda habilitada. */
		disableActiveInteraction: false,
		prevBtnText: 'Atrás',
		/**
		 * El avance lo maneja el motor, no driver.js. Definir este hook es justamente lo que se lo
		 * saca de las manos: sin él, driver.js avanzaría a un paso que todavía no está preparado.
		 */
		/**
		 * Deja los botones del cartel como corresponde. Es el único lugar donde eso se decide.
		 *
		 * 🔴 Se hace acá y no con `popover.showButtons` porque eso **no se aplica** al usar
		 * `highlight()` en vez de `drive()`: medido el 30/8/2026, un paso declarado con
		 * `avanza: 'clic'` seguía dibujando "Siguiente".
		 *
		 * 🔴 **Hasta el 1/9/2026 acá se OCULTABA "Siguiente" en los pasos que esperan un gesto**, para
		 * que el lead no se salteara la acción que el tour le estaba pidiendo. Lucas pidió lo
		 * contrario ese día —*"esos botones de siguiente y atrás deben estar siempre, para que el
		 * usuario no se pierda"*—: un cartel sin botones no se lee como "hacé el gesto", se lee como
		 * "esto se colgó". El razonamiento completo, con lo que se hizo para compensar el costo, está
		 * en `botones_de()`; no se borró porque una regla sin su historia se vuelve a poner sola.
		 *
		 * "Atrás" sigue sin dibujarse en el paso 0: no hay adónde volver.
		 */
		onPopoverRender: function (popover) {
			if (!corrida) {
				return
			}

			if (popover.nextButton) {
				popover.nextButton.style.display = ''
			}

			if (popover.previousButton) {
				popover.previousButton.style.display = corrida.indice > 0 ? '' : 'none'
			}
		},
		/**
		 * 🔴 La cruz del cartel NO cierra sola. Hay que atenderla acá o queda muerta.
		 *
		 * driver.js registra sus manejadores internos —clic en el fondo, Escape, flechas— dentro de
		 * `drive()`, el modo que recorre una lista de pasos. Este motor no usa `drive()`: usa
		 * `highlight()`, un paso por vez. Y **no existe ninguna registración para el clic de la
		 * cruz** (verificado en `dist/driver.js.mjs` 1.4.0: las cuatro registraciones son
		 * `overlayClick`, `escapePress`, `arrowLeftPress` y `arrowRightPress`). Sin este hook, el
		 * clic en la cruz dispara un evento que no atiende nadie.
		 *
		 * Es el otro defecto que reportó Lucas el 31/8/2026: *"intento cerrar la tarjeta del
		 * tutorial y no pasa nada, y luego de insistir varias veces haciendo clic recién ahí se
		 * cierra"*. Lo que la cerraba al final era uno de esos clics cayendo en el fondo oscuro,
		 * que sí tiene manejador. Reproducido acá: dos clics seguidos en la cruz y el tour seguía
		 * en el mismo paso.
		 */
		onCloseClick: function () {
			cerrar_corrida('cortado')
			destruir_recorrido()
		},
		onNextClick: function () {
			/* Antes de mover el índice: si este paso esperaba un gesto y el lead lo salteó con el
			 * botón, queda anotado para que un corte posterior no le eche la culpa a los datos. */
			marcar_avance_a_mano()
			avanzar_a(corrida ? corrida.indice + 1 : 0)
		},
		onPrevClick: function () {
			if (corrida && corrida.indice > 0) {
				avanzar_a(corrida.indice - 1)
			}
		},
		/**
		 * Lo disparan los dos cierres accidentales: el clic en el fondo oscuro y la tecla Escape.
		 *
		 * 🔴 Definir este hook hace que driver.js **no se destruya solo** — el cierre queda en
		 * nuestras manos y hay que llamar `destroy()` a mano. Es el patrón que documenta la
		 * librería, y desde el 1/9/2026 es lo que permite **no cerrar**: se dibuja la pregunta y, si
		 * el lead elige seguir, no se hace nada y el tour sigue exactamente donde estaba.
		 *
		 * Lo pidió Lucas ese día: *"si presiono sin querer fuera de la viñeta del tour, en lugar de
		 * que se cierre, me pregunte si deseo terminar el tour"*. Hasta entonces este hook cerraba de
		 * una, igual que la cruz — y un clic de más en el fondo tiraba el recorrido entero.
		 *
		 * ⚠️ La cruz del cartel NO pasa por acá: tiene su propio `onCloseClick` y sigue cerrando a la
		 * primera, que es lo que se arregló el 31/8/2026. Cortar el tour a mitad de camino sigue
		 * siendo una salida legítima y prevista (§3.7-bis); lo que se agrega es que no se dispare
		 * sola.
		 */
		onDestroyStarted: function () {
			pedir_confirmacion_de_cierre()
		},
	})

	reportar('tour.iniciado', { pasos: pasos.length })

	mostrar_paso(0)

	return true
}

/**
 * Corta el tour en curso, si hay uno.
 *
 * La llama el panel cuando el lead reabre el panel o cuando el componente se destruye: dos tours
 * a la vez no tienen sentido y los listeners del viejo seguirían escuchando clics.
 *
 * @returns {void}
 */
export function cortar_tour() {
	/* Se cierra la corrida ANTES de destruir, para que el abandono quede registrado: si el lead
	 * reabre el panel a mitad de un tour, eso es información que el closer quiere tener.
	 *
	 * El motivo es 'cortado' SIEMPRE, y no depende de dónde se haya quedado: acá se llega porque el
	 * panel se está reabriendo o porque se está por arrancar otro tour, nunca porque el lead haya
	 * terminado el recorrido. Marcar el clip como probado desde acá sería regalarle el check. */
	cerrar_corrida('cortado')
	destruir_recorrido()
	limpiar()
}

/**
 * ¿Hay un tour corriendo?
 *
 * @returns {Boolean}
 */
export function hay_tour_activo() {
	return Boolean(corrida && !corrida.terminada)
}

/**
 * ¿Este clip tiene un tour escrito?
 *
 * @param {Object} clip
 * @returns {Boolean}
 */
export function hay_tour_para(clip) {
	return Boolean(guion_de(clip))
}

export default {
	iniciar_tour: iniciar_tour,
	cortar_tour: cortar_tour,
	hay_tour_activo: hay_tour_activo,
	hay_tour_para: hay_tour_para,
}
