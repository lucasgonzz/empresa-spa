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

/** Instancia viva de driver.js, o null. Una sola a la vez. */
let recorrido = null

/** Estado de la corrida actual. Null cuando no hay tour. */
let corrida = null

/** Limpiezas pendientes (listeners de clic, temporizadores, sondeos). */
let limpiezas = []

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
 * Deja el paso listo para ser señalado: navega, corre el gancho, espera y busca el elemento.
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
			return esperar_elemento(selector_de(paso), paso.techo_ms)
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
			mostrar_paso(i + 1)
			return
		}

		corrida.indice = i
		corrida.mostrados++

		recorrido.highlight({
			element: selector_de(paso),
			popover: {
				description: paso.texto,
				side: paso.lado || 'bottom',
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

		enganchar_avance(paso, i)
	})
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
 * @returns {void}
 */
function enganchar_avance(paso, i) {
	if (!espera_un_gesto(paso, i)) {
		/* Lo dispara el botón del cartel, que cae en `onNextClick`. Nada que enganchar. */
		return
	}

	if (paso.avanza === 'clic') {
		enganchar_avance_por_clic(paso, i)
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
 * @returns {void}
 */
function enganchar_avance_por_clic(paso, i) {
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
	const campo = campo_de_carga(paso)

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

		if (!evento.target.closest(selector)) {
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
 * @param {Object} paso
 * @returns {Element|null}
 */
function campo_de_carga(paso) {
	const elemento = buscar_visible(selector_de(paso))

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
		terminada: false,
		avanzando: false,
		/* Indice del paso al que hubo que devolverle el boton porque no habia aparicion que esperar. */
		forzar_boton: -1,
	}

	recorrido = driver({
		allowClose: true,
		popoverClass: 'tour-demo',
		smoothScroll: true,
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
