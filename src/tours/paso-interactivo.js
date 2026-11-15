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
 * Las dos reglas generales que salen de acá (valen para cualquier ancla y cualquier recorrido del
 * motor, no solo para el precio):
 *
 * A. La tarjeta no tapa lo que el paso pide usar: los controles de formulario que aparecen después
 *    de mostrarse el paso (o el que tiene el foco), el ancla y, por último, los botones del pie del
 *    modal. Ver `elegir_posicion_tarjeta()`.
 * B. Tocar un control de formulario del MISMO modal del ancla (sin modal, del contenedor de la vista)
 *    no es «salir del recorrido»: el control recibe el foco o el cambio. Botones, enlaces y la X del
 *    modal siguen como siempre (el clic en el fondo pregunta si se termina). Ver
 *    `es_control_de_formulario()` y `control_en_punto()`.
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
 * Partes de un modal donde viven sus acciones (Guardar, Eliminar, la X): ahí no se deja pasar nada.
 *
 * @type {String}
 */
const PARTES_DE_ACCION = '.modal-header, .modal-footer'

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
 * @returns {Boolean}
 */
export function es_control_de_formulario(d) {
	if (!d || !d.en_contenedor || d.en_parte_de_accion || d.en_tarjeta || d.en_ancla || d.deshabilitado) {
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
 * Lo de abajo lee el DOM (fino a propósito: la decisión vive arriba).
 * ---------------------------------------------------------------------------------------------- */

/**
 * El contenedor dentro del cual se dejan usar los controles mientras el paso señala `ancla`: el
 * `.modal-content` del modal abierto que la contiene; sin modal, el contenedor de la vista
 * (`.container-fluid` de App.vue). Si hay un modal abierto que NO contiene el ancla, ninguno: lo que
 * está a la vista es otra cosa y no se deja pasar nada.
 *
 * @param {Element} ancla
 * @returns {Element|null}
 */
export function contenedor_permitido(ancla) {
	if (!ancla || typeof ancla.closest !== 'function') return null
	const modal = ancla.closest('.modal.show .modal-content')
	if (modal) return modal
	if (document.querySelector('.modal.show')) return null
	return ancla.closest('.container-fluid')
}

/**
 * Descriptor de un elemento para `es_control_de_formulario()`.
 *
 * @param {Element} el
 * @param {Element} contenedor
 * @param {Element|null} ancla
 * @returns {Object}
 */
export function describir(el, contenedor, ancla) {
	const tag = (el.tagName || '').toLowerCase()
	const editable = el.getAttribute('contenteditable')
	return {
		tag: tag,
		tipo: tag === 'input' ? (el.getAttribute('type') || 'text').toLowerCase() : null,
		rol: el.getAttribute('role'),
		editable: editable === '' || editable === 'true',
		deshabilitado: Boolean(el.disabled || el.readOnly || el.getAttribute('aria-disabled') === 'true'),
		en_contenedor: Boolean(contenedor && contenedor.contains(el)),
		en_parte_de_accion: Boolean(el.closest(PARTES_DE_ACCION)),
		en_tarjeta: Boolean(el.closest('.driver-popover')),
		en_ancla: Boolean(ancla && ancla.contains(el)),
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
 * ¿La caja se ve en la ventana?
 *
 * @param {Object} caja Un DOMRect.
 * @returns {Boolean}
 */
export function caja_visible(caja) {
	return caja.width > 0 && caja.height > 0 && caja.bottom > 0 && caja.right > 0
		&& caja.top < window.innerHeight && caja.left < window.innerWidth
}

/**
 * Los controles de formulario que se dejan usar en el paso, con su zona de clic medida.
 *
 * @param {Element} ancla
 * @returns {Array<{el: Element, zona: Element, caja: DOMRect, accion: String}>}
 */
export function controles_permitidos(ancla) {
	const contenedor = contenedor_permitido(ancla)
	if (!contenedor) return []
	const lista = []
	contenedor.querySelectorAll(SELECTOR_CONTROLES).forEach(function (el) {
		const d = describir(el, contenedor, ancla)
		if (!es_control_de_formulario(d)) return
		const zona = zona_de(el)
		const caja = zona.getBoundingClientRect()
		if (!caja_visible(caja)) return
		lista.push({ el: el, zona: zona, caja: caja, accion: accion_para(d) })
	})
	return lista
}
