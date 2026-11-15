/**
 * Lo que un paso con ancla deja usar además del ancla, y dónde se para la tarjeta para no taparlo
 * (ronda 7 de la prueba gratuita, 15/11/2026).
 *
 * El defecto, visto en producción con el recorrido de Robotito «cambiar el precio de un artículo»:
 *
 * - Paso 5, ancla = el interruptor «Setear precio final». Al prenderlo aparece el campo «Precio
 *   final» justo debajo… y la tarjeta de Robotito, que driver.js plantó debajo del ancla, lo tapaba.
 * - Paso 6, ancla = «Guardar y cerrar». El dueño toca el campo para escribir el precio y aparece
 *   «¿Terminamos el tour?»: el campo queda debajo del fondo oscuro de driver.js (un `<path>` SVG con
 *   `pointer-events: auto` y z-index 10000) y todo clic fuera del recuadro es «clic en el fondo» →
 *   `overlayClick` → `onDestroyStarted` → la pregunta. Lo tipeado no entra.
 *
 * Las dos reglas que salen de acá valen para cualquier ancla de cualquier recorrido del motor, pero
 * SOLO cuando el ancla está dentro de un modal abierto. Sin modal todo queda como antes de 9aa1b091
 * (decisión de la revisión de ese commit):
 *
 * A. La tarjeta no tapa lo que el paso pide usar: un control de formulario que apareció después de
 *    mostrarse el paso, o que tomó el foco por una acción de la persona (clic reenviado o Tab), con su
 *    etiqueta y el título de su grupo; después el ancla y, por último, los botones del pie del modal.
 *    Ver `elegir_posicion_tarjeta()`.
 * B. Tocar un control de formulario del MISMO modal del ancla no es «salir del recorrido»: el control
 *    recibe el foco o el cambio. Botones, enlaces, el encabezado y el pie del modal (la X, Guardar,
 *    Eliminar) y todo lo que el scroll del modal tenga escondido siguen como siempre: el clic en el
 *    fondo pregunta si se termina. Ver `control_bajo_el_clic()`.
 *
 * Las funciones de decisión son puras (cajas y descriptores, sin DOM) y se prueban en
 * tests/robotito-paso-interactivo.test.cjs. Las que leen el DOM son finas y se marcan como tales.
 */

/**
 * Tipos de `<input>` que NO son para cargar un dato: son botones o no se ven.
 *
 * @type {Array<String>}
 */
const TIPOS_QUE_NO_SON_CAMPO = ['button', 'submit', 'reset', 'image', 'hidden', 'file']

/**
 * Selector de los candidatos a «control de formulario». El filtro fino lo hace
 * `es_control_de_formulario()`; esto solo acota la búsqueda.
 *
 * @type {String}
 */
export const SELECTOR_CONTROLES = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="switch"], [role="checkbox"]'

/**
 * Partes de un modal donde viven sus acciones (Guardar, Eliminar, la X): ahí no se deja pasar nada,
 * ni los controles que tienen adentro ni lo que el cuerpo con scroll tenga escondido debajo.
 *
 * @type {String}
 */
export const PARTES_DE_ACCION = '.modal-header, .modal-footer'

/**
 * Clase del input de un buscador de relación (Categoría, Proveedor…). Ese input abre su modal de
 * búsqueda con cualquier `keyup` (`common-vue/components/search/Index.vue:70-71`), así que ni se le
 * da foco ni se le reenvía un clic: abriría un modal que queda inerte debajo del fondo del recorrido.
 * Es la misma clase que excluye `enfocar_campo_del_paso()` del motor (una sola fuente: este export).
 *
 * @type {String}
 */
export const CLASE_BUSCADOR_DE_RELACION = 'search-field__input'

// Pesos de lo que la tarjeta no debe tapar (A). El orden lo pidió el coordinador de la ronda 7:
// el control recién aparecido (o el que tiene el foco) > el ancla > los botones del pie del modal.
export const PESO_CONTROL_NUEVO = 100
export const PESO_ANCLA = 10
export const PESO_PIE_DE_MODAL = 1

/**
 * ¿Este descriptor es un control de formulario que el paso puede dejar usar?
 *
 * Pura: recibe lo que el DOM dice del elemento, ya leído (ver `describir()`).
 *
 * @param {Object} d Descriptor.
 * @param {String} d.tag Nombre de la etiqueta en minúsculas ('input', 'select'...).
 * @param {String} [d.tipo] Atributo `type` de un input, en minúsculas.
 * @param {String} [d.rol] Atributo `role`.
 * @param {Boolean} [d.editable] Si es `contenteditable`.
 * @param {Boolean} [d.deshabilitado] `disabled` o `readonly`.
 * @param {Boolean} d.en_contenedor Si está dentro del contenedor permitido (el modal del ancla o la vista).
 * @param {Boolean} [d.en_parte_de_accion] Si está en el encabezado o el pie del modal.
 * @param {Boolean} [d.en_tarjeta] Si está dentro de la tarjeta de Robotito (esa ya es usable).
 * @param {Boolean} [d.en_ancla] Si está dentro del ancla (ya es usable por driver.js).
 * @param {Boolean} [d.buscador_de_relacion] Si es el input de un buscador de relación (ver
 *        `CLASE_BUSCADOR_DE_RELACION`): no se toca ni por clic ni por Tab.
 * @returns {Boolean}
 */
export function es_control_de_formulario(d) {
	if (!d || !d.en_contenedor || d.en_parte_de_accion || d.en_tarjeta || d.en_ancla || d.deshabilitado
		|| d.buscador_de_relacion) {
		return false
	}
	if (d.tag === 'textarea' || d.tag === 'select') {
		return true
	}
	if (d.tag === 'input') {
		return TIPOS_QUE_NO_SON_CAMPO.indexOf(d.tipo || 'text') === -1
	}
	if (d.editable) {
		return true
	}
	return d.rol === 'switch' || d.rol === 'checkbox'
}

/**
 * Qué hacer con un clic reenviado a un control: escribir (foco) o cambiar su estado (clic real).
 *
 * @param {Object} d Descriptor (ver `es_control_de_formulario`).
 * @returns {'alternar'|'enfocar'}
 */
export function accion_para(d) {
	if (d && d.tag === 'input' && (d.tipo === 'checkbox' || d.tipo === 'radio')) {
		return 'alternar'
	}
	if (d && (d.rol === 'switch' || d.rol === 'checkbox')) {
		return 'alternar'
	}
	return 'enfocar'
}

/**
 * ¿El punto cae dentro de la caja?
 *
 * @param {{left: number, right: number, top: number, bottom: number}} caja
 * @param {number} x
 * @param {number} y
 * @returns {Boolean}
 */
export function contiene(caja, x, y) {
	return Boolean(caja) && x >= caja.left && x <= caja.right && y >= caja.top && y <= caja.bottom
}

/**
 * De una lista de controles permitidos con su zona de clic, el que está bajo el punto (el más chico
 * si hay varios: un input adentro de un grupo gana al grupo), o null.
 *
 * @param {Array<{caja: Object}>} controles
 * @param {number} x
 * @param {number} y
 * @returns {Object|null} El mismo objeto de la lista.
 */
export function control_en_punto(controles, x, y) {
	let elegido = null
	let menor = Infinity
	;(controles || []).forEach(function (control) {
		if (!contiene(control.caja, x, y)) return
		const superficie = (control.caja.right - control.caja.left) * (control.caja.bottom - control.caja.top)
		if (superficie < menor) {
			menor = superficie
			elegido = control
		}
	})
	return elegido
}

/**
 * ¿El punto cae en alguna de las cajas? Sirve para «el clic fue en el encabezado o el pie del modal».
 *
 * @param {Array<Object>} cajas
 * @param {number} x
 * @param {number} y
 * @returns {Boolean}
 */
export function punto_en_alguna(cajas, x, y) {
	return (cajas || []).some(function (caja) {
		return contiene(caja, x, y)
	})
}

/**
 * La parte de una caja que se ve a través de una serie de recortes (los ancestros con scroll y la
 * ventana). Null si no queda nada a la vista.
 *
 * 🔴 Es lo que faltaba en la primera versión (revisión de 9aa1b091): el cuerpo del modal del
 * artículo tiene scroll propio, con encabezado y pie fijos, y un control scrolleado debajo de ellos
 * conserva su caja ahí. Sin recortarla, un clic en la X o en «Guardar y cerrar» caía «dentro» de un
 * interruptor escondido.
 *
 * @param {{left: number, right: number, top: number, bottom: number}} caja
 * @param {Array<{left: number, right: number, top: number, bottom: number}>} recortes
 * @returns {{left: number, right: number, top: number, bottom: number}|null}
 */
export function recortar_caja(caja, recortes) {
	let resto = { left: caja.left, right: caja.right, top: caja.top, bottom: caja.bottom }
	;(recortes || []).forEach(function (recorte) {
		if (!resto) return
		resto = {
			left: Math.max(resto.left, recorte.left),
			right: Math.min(resto.right, recorte.right),
			top: Math.max(resto.top, recorte.top),
			bottom: Math.min(resto.bottom, recorte.bottom),
		}
		if (resto.right <= resto.left || resto.bottom <= resto.top) resto = null
	})
	return resto
}

/**
 * Superficie en común de dos cajas (0 si no se tocan).
 *
 * @param {{left: number, right: number, top: number, bottom: number}} a
 * @param {{left: number, right: number, top: number, bottom: number}} b
 * @returns {number}
 */
export function superficie_comun(a, b) {
	const ancho = Math.min(a.right, b.right) - Math.max(a.left, b.left)
	const alto = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
	return ancho > 0 && alto > 0 ? ancho * alto : 0
}

/**
 * Costo de poner la tarjeta en una caja: superficie tapada de cada obstáculo por su peso.
 *
 * @param {Object} caja
 * @param {Array<{caja: Object, peso: number}>} obstaculos
 * @returns {number}
 */
export function costo_de(caja, obstaculos) {
	return (obstaculos || []).reduce(function (total, obstaculo) {
		return total + superficie_comun(caja, obstaculo.caja) * (obstaculo.peso || 1)
	}, 0)
}

/**
 * Las ubicaciones posibles de la tarjeta alrededor del ancla: abajo, arriba, a la derecha y a la
 * izquierda, cada una pegada al principio, al centro o al final del ancla, más las cuatro esquinas de
 * la pantalla como último recurso. Todas se recortan para que la tarjeta quede entera en la vista.
 *
 * @param {{ancho: number, alto: number}} tarjeta Tamaño de la tarjeta.
 * @param {{left: number, right: number, top: number, bottom: number}} ancla
 * @param {{ancho: number, alto: number}} vista
 * @param {number} separacion Aire entre el ancla y la tarjeta.
 * @param {number} margen Aire mínimo contra el borde de la pantalla.
 * @returns {Array<{left: number, top: number, right: number, bottom: number}>}
 */
export function ubicaciones_posibles(tarjeta, ancla, vista, separacion, margen) {
	const w = tarjeta.ancho
	const h = tarjeta.alto
	const ancla_ancho = ancla.right - ancla.left
	const ancla_alto = ancla.bottom - ancla.top
	const crudas = []
	const horizontales = [ancla.left, ancla.left + ancla_ancho / 2 - w / 2, ancla.right - w]
	const verticales = [ancla.top, ancla.top + ancla_alto / 2 - h / 2, ancla.bottom - h]

	horizontales.forEach(function (left) {
		crudas.push({ left: left, top: ancla.bottom + separacion })
		crudas.push({ left: left, top: ancla.top - separacion - h })
	})
	verticales.forEach(function (top) {
		crudas.push({ left: ancla.right + separacion, top: top })
		crudas.push({ left: ancla.left - separacion - w, top: top })
	})
	crudas.push({ left: vista.ancho - margen - w, top: vista.alto - margen - h })
	crudas.push({ left: vista.ancho - margen - w, top: margen })
	crudas.push({ left: margen, top: vista.alto - margen - h })
	crudas.push({ left: margen, top: margen })

	return crudas.map(function (p) {
		const left = Math.max(margen, Math.min(p.left, vista.ancho - margen - w))
		const top = Math.max(margen, Math.min(p.top, vista.alto - margen - h))
		return { left: left, top: top, right: left + w, bottom: top + h }
	})
}

/**
 * Dónde conviene la tarjeta para no tapar lo que el paso pide usar (A).
 *
 * Si donde la dejó driver.js no tapa nada con peso, se respeta (devuelve null). Si tapa, se busca la
 * ubicación de menor costo; a igual costo gana la más cercana al ancla, para que la tarjeta siga
 * «hablando» del control que señala. Solo se mueve si la nueva tapa MENOS que la actual.
 *
 * @param {{left: number, right: number, top: number, bottom: number}} actual Caja de la tarjeta hoy.
 * @param {{left: number, right: number, top: number, bottom: number}} ancla
 * @param {Array<{caja: Object, peso: number}>} obstaculos Incluye el ancla con su peso.
 * @param {{ancho: number, alto: number}} vista
 * @param {Object} [opciones] `{ separacion: 12, margen: 8 }`.
 * @returns {{left: number, top: number}|null} La posición nueva, o null si la actual está bien.
 */
export function elegir_posicion_tarjeta(actual, ancla, obstaculos, vista, opciones) {
	const separacion = opciones && typeof opciones.separacion === 'number' ? opciones.separacion : 12
	const margen = opciones && typeof opciones.margen === 'number' ? opciones.margen : 8
	const tarjeta = { ancho: actual.right - actual.left, alto: actual.bottom - actual.top }
	if (!(tarjeta.ancho > 0) || !(tarjeta.alto > 0)) return null

	const costo_actual = costo_de(actual, obstaculos)
	if (costo_actual === 0) return null

	const centro_ancla = { x: (ancla.left + ancla.right) / 2, y: (ancla.top + ancla.bottom) / 2 }
	const distancia = function (caja) {
		const x = Math.max(caja.left - centro_ancla.x, 0, centro_ancla.x - caja.right)
		const y = Math.max(caja.top - centro_ancla.y, 0, centro_ancla.y - caja.bottom)
		return Math.hypot(x, y)
	}

	let mejor = null
	ubicaciones_posibles(tarjeta, ancla, vista, separacion, margen).forEach(function (caja) {
		const costo = costo_de(caja, obstaculos)
		if (!mejor || costo < mejor.costo || (costo === mejor.costo && distancia(caja) < mejor.distancia)) {
			mejor = { caja: caja, costo: costo, distancia: distancia(caja) }
		}
	})

	if (!mejor || mejor.costo >= costo_actual) return null
	return { left: Math.round(mejor.caja.left), top: Math.round(mejor.caja.top) }
}


/* ------------------------------------------------------------------------------------------------
 * Lo de abajo lee el DOM (fino a propósito: la decisión vive arriba). Lo prueba con un modal fiel el
 * arnés de Playwright de la misión (scripts/pasos/r7/arnes-recorrido.js, fuera del repo).
 * ---------------------------------------------------------------------------------------------- */

/**
 * El contenedor dentro del cual se dejan usar los controles mientras el paso señala `ancla`: el
 * `.modal-content` del modal abierto que la contiene. Sin modal, ninguno.
 *
 * 🔴 Solo con modal, a propósito (decisión de la revisión de 9aa1b091): en un paso sin modal —el
 * Listado, la guía de Vender, los tours de la demo— todo queda exactamente como antes: un clic fuera
 * del recuadro pregunta si se termina y la tarjeta queda donde la pone driver.js.
 *
 * @param {Element} ancla
 * @returns {Element|null}
 */
export function contenedor_permitido(ancla) {
	if (!ancla || typeof ancla.closest !== 'function') return null
	return ancla.closest('.modal.show .modal-content') || null
}

/**
 * Descriptor de un elemento para `es_control_de_formulario()`.
 *
 * `:disabled` cubre también un `fieldset[disabled]` de afuera. Límite conocido: en Safari los campos
 * de fecha y los `select` no siempre aceptan el foco programático igual que en Chrome; se dejan como
 * están (el foco puede no abrir el selector nativo).
 *
 * @param {Element} el
 * @param {Element} contenedor
 * @param {Element|null} ancla
 * @returns {Object}
 */
export function describir(el, contenedor, ancla) {
	const tag = (el.tagName || '').toLowerCase()
	const editable = el.getAttribute('contenteditable')
	const deshabilitado_por_css = typeof el.matches === 'function' && el.matches(':disabled')
	return {
		tag: tag,
		tipo: tag === 'input' ? (el.getAttribute('type') || 'text').toLowerCase() : null,
		rol: el.getAttribute('role'),
		editable: editable === '' || editable === 'true',
		deshabilitado: Boolean(deshabilitado_por_css || el.readOnly || el.getAttribute('aria-disabled') === 'true'),
		en_contenedor: Boolean(contenedor && contenedor.contains(el)),
		en_parte_de_accion: Boolean(el.closest(PARTES_DE_ACCION)),
		en_tarjeta: Boolean(el.closest('.driver-popover')),
		en_ancla: Boolean(ancla && ancla.contains(el)),
		buscador_de_relacion: Boolean(el.classList && el.classList.contains(CLASE_BUSCADOR_DE_RELACION)),
	}
}

/**
 * La zona de clic de un control: el interruptor o checkbox de Bootstrap esconde su `<input>` (opacity
 * 0, 1rem) y lo que se toca es el `.custom-control` entero, con su etiqueta.
 *
 * @param {Element} el
 * @returns {Element}
 */
export function zona_de(el) {
	const envoltorio = el.closest('.custom-control')
	return envoltorio && (el.type === 'checkbox' || el.type === 'radio') ? envoltorio : el
}

/**
 * Los recortes que le aplican a un elemento: la caja de cada ancestro que recorta su contenido
 * (`overflow` distinto de `visible`, como el cuerpo con scroll del modal) y la ventana.
 *
 * @param {Element} el
 * @returns {Array<Object>}
 */
function recortes_de(el) {
	const recortes = [{ left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }]
	let padre = el.parentElement
	while (padre && padre !== document.body && padre !== document.documentElement) {
		const estilo = window.getComputedStyle(padre)
		if (estilo.overflowX !== 'visible' || estilo.overflowY !== 'visible') {
			recortes.push(padre.getBoundingClientRect())
		}
		padre = padre.parentElement
	}
	return recortes
}

/**
 * Las cajas de las partes de acción (encabezado y pie) de los modales abiertos que se ven.
 *
 * @returns {Array<Object>}
 */
export function cajas_de_partes_de_accion() {
	const cajas = []
	document.querySelectorAll('.modal.show .modal-header, .modal.show .modal-footer').forEach(function (parte) {
		const caja = recortar_caja(parte.getBoundingClientRect(), recortes_de(parte))
		if (caja) cajas.push(caja)
	})
	return cajas
}

/**
 * Los controles de formulario que se dejan usar en el paso, con la parte de su zona de clic que de
 * verdad se ve (recortada por el scroll del modal y la ventana).
 *
 * @param {Element} ancla
 * @returns {Array<{el: Element, zona: Element, caja: Object, accion: String}>}
 */
export function controles_permitidos(ancla) {
	const contenedor = contenedor_permitido(ancla)
	if (!contenedor) return []
	const lista = []
	contenedor.querySelectorAll(SELECTOR_CONTROLES).forEach(function (el) {
		const d = describir(el, contenedor, ancla)
		if (!es_control_de_formulario(d)) return
		const zona = zona_de(el)
		const caja = recortar_caja(zona.getBoundingClientRect(), recortes_de(zona))
		if (!caja) return
		lista.push({ el: el, zona: zona, caja: caja, accion: accion_para(d) })
	})
	return lista
}

/**
 * El elemento de la página que está arriba de todo en el punto, sin contar el fondo ni la tarjeta del
 * recorrido. `driver.css` deja la página con `pointer-events: none`, y `elementsFromPoint` saltea esos
 * elementos: se le saca `driver-active` al body durante la medición (síncrona, no se pinta nada) y se
 * le devuelve.
 *
 * @param {number} x
 * @param {number} y
 * @returns {Element|null}
 */
function lo_que_hay_en(x, y) {
	if (typeof document.elementsFromPoint !== 'function') return null
	const body = document.body
	const activo = body.classList.contains('driver-active')
	if (activo) body.classList.remove('driver-active')
	let elementos = []
	try {
		elementos = document.elementsFromPoint(x, y)
	} finally {
		if (activo) body.classList.add('driver-active')
	}
	for (let i = 0; i < elementos.length; i++) {
		const el = elementos[i]
		if (el.closest && (el.closest('.driver-overlay') || el.closest('.driver-popover'))) continue
		return el
	}
	return null
}

/**
 * El control de formulario que la persona quiso tocar con un clic en el fondo del recorrido, o null
 * si el clic no es para un control (y entonces sigue preguntando si se termina).
 *
 * Tres filtros, en orden:
 * 1. Si el punto cae en el encabezado o el pie de un modal (la X, Guardar, Eliminar), nada.
 * 2. El punto tiene que caer en la parte VISIBLE de un control permitido (recortada por el scroll).
 * 3. Lo que de verdad está arriba en ese punto tiene que ser ese control, su envoltorio o su
 *    etiqueta: si hay otra cosa encima, nada.
 *
 * @param {Element} ancla
 * @param {number} x
 * @param {number} y
 * @returns {{el: Element, zona: Element, caja: Object, accion: String}|null}
 */
export function control_bajo_el_clic(ancla, x, y) {
	if (!contenedor_permitido(ancla)) return null
	if (punto_en_alguna(cajas_de_partes_de_accion(), x, y)) return null
	const control = control_en_punto(controles_permitidos(ancla), x, y)
	if (!control) return null
	const arriba = lo_que_hay_en(x, y)
	if (!arriba) return null
	const es_el = arriba === control.el || control.zona.contains(arriba)
		|| (arriba.tagName === 'LABEL' && arriba.control === control.el)
	return es_el ? control : null
}

/**
 * Lo que hace el clic reenviado: los interruptores y checkboxes se alternan con un `click()` de verdad
 * (dispara `change` y el `v-model` se entera), el resto recibe el foco con el cursor al final.
 *
 * @param {{el: Element, accion: String}} control
 * @returns {void}
 */
export function usar_control(control) {
	const el = control.el
	if (control.accion === 'alternar') {
		el.click()
		el.focus({ preventScroll: true })
		return
	}
	el.focus({ preventScroll: true })
	if (typeof el.setSelectionRange === 'function' && typeof el.value === 'string') {
		try {
			el.setSelectionRange(el.value.length, el.value.length)
		} catch (error) {
			/* Los input number no admiten selección: el foco alcanza. */
		}
	}
	if (el.tagName === 'SELECT' && typeof el.showPicker === 'function') {
		try {
			el.showPicker()
		} catch (error) {
			/* Sin gesto reconocido el navegador puede negarse: queda con el foco. */
		}
	}
}

/**
 * Lo que se puede enfocar con Tab dentro de la tarjeta y del ancla.
 *
 * @type {String}
 */
const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

/**
 * A quién va el foco con Tab (o Shift+Tab) durante un paso con modal: la tarjeta, el ancla y los
 * controles permitidos, en el orden del documento. Null si el paso no tiene controles permitidos
 * (entonces manda la trampa de foco de driver.js, como siempre).
 *
 * @param {Element} ancla
 * @param {Element|null} tarjeta El wrapper de la tarjeta de driver.js.
 * @param {Element|null} actual El elemento con foco.
 * @param {Boolean} atras Shift+Tab.
 * @returns {Element|null}
 */
export function siguiente_para_tab(ancla, tarjeta, actual, atras) {
	const controles = controles_permitidos(ancla).map(function (control) {
		return control.el
	})
	if (!controles.length) return null
	const del_ancla = Array.from(ancla.querySelectorAll(ENFOCABLES)).filter(function (el) {
		return !(el.classList && el.classList.contains(CLASE_BUSCADOR_DE_RELACION))
	})
	if (ancla.matches(ENFOCABLES)) del_ancla.unshift(ancla)
	const del_paso = del_ancla.concat(controles).filter(function (el, i, todos) {
		return todos.indexOf(el) === i
	}).sort(function (a, b) {
		return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
	})
	const de_la_tarjeta = tarjeta ? Array.from(tarjeta.querySelectorAll(ENFOCABLES)).filter(function (el) {
		return el.offsetParent !== null
	}) : []
	const lista = de_la_tarjeta.concat(del_paso)
	const i = lista.indexOf(actual)
	return (atras ? lista[i - 1] || lista[lista.length - 1] : lista[i + 1] || lista[0]) || null
}

/**
 * Lo que también hay que dejar a la vista junto con un control recién aparecido: su etiqueta (el
 * `.form-group` que lo envuelve) y el título del grupo donde vive (el primer encabezado de su
 * tarjeta, p. ej. «Minorista» y su precio), que le dicen a la persona en qué lista está.
 *
 * @param {Element} el
 * @returns {Array<Object>} Cajas recortadas a lo visible.
 */
export function contexto_visible_de(el) {
	const cajas = []
	const grupo = el.closest('.form-group')
	if (grupo) {
		const etiqueta = grupo.querySelector('legend, label')
		if (etiqueta) cajas.push(etiqueta)
	}
	const tarjeta = el.closest('.card')
	if (tarjeta) {
		const titulo = tarjeta.querySelector('h1, h2, h3, h4, h5, h6')
		if (titulo) cajas.push(titulo)
	}
	return cajas.map(function (nodo) {
		return recortar_caja(nodo.getBoundingClientRect(), recortes_de(nodo))
	}).filter(Boolean)
}
