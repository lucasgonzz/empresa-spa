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
 * del paso siguiente) o `'siguiente'` (apretó el botón del cartel).
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
					traer_a_la_vista(elemento)

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
}

/**
 * Le avisa al lead que esta práctica no se puede hacer con los datos que tiene la demo.
 *
 * Va por el `$toast` de la aplicación, que es el mismo canal que usa el resto del sistema para
 * avisar cosas, y no por un cartel de driver.js: el tour ya terminó y montar un paso de más para
 * decir "no hay paso" es peor. Si por lo que sea no hay `$toast`, queda en la consola y listo.
 *
 * @returns {void}
 */
function avisar_sin_pasos() {
	const raiz = corrida && corrida.contexto ? corrida.contexto.root : null

	console.warn('Tour ' + (corrida ? corrida.clip_id : '') + ': se cortó porque la demo no tiene los datos que este recorrido necesita (mostrados: ' + (corrida ? corrida.mostrados : '?') + ', salteados: ' + (corrida ? corrida.salteados : '?') + ')')

	if (!raiz || !raiz.$toast || typeof raiz.$toast.info !== 'function') {
		return
	}

	raiz.$toast.info('Esta práctica necesita datos que tu demo todavía no tiene cargados. Mirá el video y seguí con el que sigue.', {
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
		 */
		corrida.completo = corrida.mostrados > corrida.pasos.length / 2

		/**
		 * 🔴 Un tour que no llegó a mostrar UN SOLO paso no puede terminar en silencio.
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
		 */
		if (corrida.mostrados === 0 || corrida.corto_por_salteos) {
			avisar_sin_pasos()
		}

		cerrar_corrida()
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
		enganchar_avance(paso, i, elemento)
	})
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

		traer_a_la_vista(elemento)
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
	if (!elemento || typeof elemento.querySelector !== 'function') {
		return false
	}

	if (elemento.querySelector('.dropdown-menu')) {
		return true
	}

	const contenedor = typeof elemento.closest === 'function'
		? elemento.closest('.dropdown, .btn-group')
		: null

	return Boolean(contenedor && contenedor.querySelector('.dropdown-menu'))
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

	sueltas_de_refresco = function () {
		document.removeEventListener('scroll', volver_a_medir, true)
		window.removeEventListener('resize', volver_a_medir)

		if (observador) {
			observador.disconnect()
		}

		if (custodio) {
			custodio.disconnect()
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
 * Qué botones lleva el cartel de este paso.
 *
 * Un paso que avanza por clic o por aparición no muestra "Siguiente": si lo mostrara, el lead
 * saltearía la acción que el tour justamente le está pidiendo que haga. Sí queda siempre la cruz
 * de cerrar — §3.7-bis pide que el lead nunca quede atrapado.
 *
 * @param {Object} paso
 * @param {Number} i
 * @returns {Array}
 */
function botones_de(paso, i) {
	if (espera_un_gesto(paso, i)) {
		return ['close']
	}

	return i === 0 ? ['next', 'close'] : ['next', 'previous', 'close']
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
 * Y como un paso que espera un gesto no dibuja "Siguiente", y `driver.css` deja el resto de la
 * pantalla inerte, el lead quedaba sin ninguna salida salvo cerrar el tour.
 *
 * Cuando el paso que viene declara otra ruta, entonces, el gesto no existe: lo dispara el botón.
 *
 * @param {Object} paso
 * @param {Number} i
 * @returns {Boolean}
 */
function espera_un_gesto(paso, i) {
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

	const candidato = elemento.matches('input, textarea, select')
		? elemento
		: elemento.querySelector('input:not([type=checkbox]):not([type=radio]), textarea, select')

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
 * Cierra la corrida y reporta cómo terminó.
 *
 * Es el ÚNICO lugar que emite los eventos de cierre, y por eso es idempotente: al cierre se llega
 * por tres caminos —el último paso, la cruz del cartel, y el panel cortando el tour desde afuera—
 * y los tres pasan por acá.
 *
 * @returns {void}
 */
function cerrar_corrida() {
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

	corrida = null
	limpiar()
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
	if (!recorrido) {
		return
	}

	const instancia = recorrido

	recorrido = null
	instancia.destroy()
}

/**
 * Arranca el tour de un clip.
 *
 * @param {Object} clip Clip entero, tal como viaja en el plan.
 * @param {Object} contexto {router, store, root}
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
		terminada: false,
		avanzando: false,
		/* Indice del paso al que hubo que devolverle el boton porque no habia aparicion que esperar. */
		forzar_boton: -1,
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
		 * Muestra u oculta los botones según cómo avanza el paso actual.
		 *
		 * 🔴 Se hace acá y no con `popover.showButtons` porque eso **no se aplica** al usar
		 * `highlight()` en vez de `drive()`: medido el 30/8/2026, un paso declarado con
		 * `avanza: 'clic'` seguía dibujando "Siguiente". Y un "Siguiente" en un paso que espera
		 * un gesto es peor que inútil: el lead lo aprieta, se saltea la acción que el tour le está
		 * pidiendo, y llega al paso que viene sin haber hecho lo que ese paso da por hecho.
		 */
		onPopoverRender: function (popover) {
			if (!corrida) {
				return
			}

			const paso = corrida.pasos[corrida.indice]
			const espera_gesto = paso && (paso.avanza === 'clic' || paso.avanza === 'aparece')

			if (popover.nextButton) {
				popover.nextButton.style.display = espera_gesto ? 'none' : ''
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
			cerrar_corrida()
			destruir_recorrido()
		},
		onNextClick: function () {
			avanzar_a(corrida ? corrida.indice + 1 : 0)
		},
		onPrevClick: function () {
			if (corrida && corrida.indice > 0) {
				avanzar_a(corrida.indice - 1)
			}
		},
		/**
		 * Lo dispara el lead al cerrar: la cruz del cartel, el clic afuera o la tecla Escape.
		 *
		 * 🔴 Definir este hook hace que driver.js **no se destruya solo** — el cierre queda en
		 * nuestras manos y hay que llamar `destroy()` a mano. Es el patrón que documenta la
		 * librería, y acá se aprovecha para registrar el abandono antes de cerrar.
		 *
		 * Cortar el tour a mitad de camino es una salida legítima y prevista (§3.7-bis: "el tour
		 * siempre ofrece saltar paso, para que el lead nunca quede atrapado"): se registra y no
		 * se estorba.
		 */
		onDestroyStarted: function () {
			cerrar_corrida()
			destruir_recorrido()
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
	 * reabre el panel a mitad de un tour, eso es información que el closer quiere tener. */
	cerrar_corrida()
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
