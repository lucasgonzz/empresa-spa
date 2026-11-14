// Dónde va la tarjeta acoplada de Robotito (paso sin control que señalar): arriba o abajo, siempre a la
// derecha (en el teléfono ocupa el ancho). La posición la pone el CSS de Anfitrion.vue con la clase
// `tour-tarjeta-acoplada--arriba`; acá solo se decide si conviene ponerla.
//
// El defecto que lo motivó (ronda 4 de la prueba, 14/11/2026): con la ficha de un artículo abierta, la
// tarjeta abajo a la derecha tapaba «Guardar» y «Guardar y cerrar» del pie del modal, justo lo que el
// paso pedía tocar. Funciones puras: se prueban sin navegador (tests/robotito-tour-guiado.test.cjs).

// El pie de un modal de BootstrapVue abierto: ahí viven sus botones de acción.
export const SELECTOR_PIE_DE_MODAL = '.modal.show .modal-footer'

/**
 * @param {{left: number, right: number, top: number, bottom: number}} a
 * @param {{left: number, right: number, top: number, bottom: number}} b
 * @returns {number} Superficie en común de los dos rectángulos (0 si no se tocan).
 */
export function superficie_pisada(a, b) {
	const ancho = Math.min(a.right, b.right) - Math.max(a.left, b.left)
	const alto = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
	return ancho > 0 && alto > 0 ? ancho * alto : 0
}

/**
 * Los pies de modal que se ven en pantalla, recortados a la ventana. Un pie que quedó fuera de la
 * vista (modal largo sin scroll interno) no cuenta hasta que la persona scrollea hasta él.
 *
 * @param {Document} documento
 * @param {number} ancho_vista
 * @param {number} alto_vista
 * @returns {Array<{left: number, right: number, top: number, bottom: number}>}
 */
export function pies_de_modal_visibles(documento, ancho_vista, alto_vista) {
	if (!documento || typeof documento.querySelectorAll !== 'function') return []
	const pies = []
	documento.querySelectorAll(SELECTOR_PIE_DE_MODAL).forEach(function (pie) {
		const caja = pie.getBoundingClientRect()
		const recorte = {
			left: Math.max(caja.left, 0),
			right: Math.min(caja.right, ancho_vista),
			top: Math.max(caja.top, 0),
			bottom: Math.min(caja.bottom, alto_vista),
		}
		if (recorte.right > recorte.left && recorte.bottom > recorte.top) pies.push(recorte)
	})
	return pies
}

/**
 * Decide si la tarjeta va arriba. Respeta la preferencia (la de «Mover arriba/abajo», abajo por
 * defecto) salvo que en esa posición pise algo que la otra pisa menos.
 *
 * Las dos posiciones posibles se calculan con la caja actual de la tarjeta: mismo ancho y alto, y el
 * margen contra el borde que tiene hoy (16px en escritorio, 8px en el teléfono) se usa para los dos
 * bordes. Así la decisión no depende de dónde esté puesta ahora y no oscila.
 *
 * @param {{left: number, right: number, top: number, bottom: number}} tarjeta Caja actual.
 * @param {Boolean} arriba_ahora Si la tarjeta está hoy arriba.
 * @param {Array} obstaculos Lo que no se puede tapar (ver `pies_de_modal_visibles`).
 * @param {number} alto_vista
 * @param {Boolean} preferida_arriba
 * @returns {Boolean}
 */
export function conviene_arriba(tarjeta, arriba_ahora, obstaculos, alto_vista, preferida_arriba) {
	const alto = tarjeta.bottom - tarjeta.top
	if (!(alto > 0) || !obstaculos.length) return Boolean(preferida_arriba)
	const margen = Math.max(arriba_ahora ? tarjeta.top : alto_vista - tarjeta.bottom, 0)
	const arriba = { left: tarjeta.left, right: tarjeta.right, top: margen, bottom: margen + alto }
	const abajo = { left: tarjeta.left, right: tarjeta.right, top: alto_vista - margen - alto, bottom: alto_vista - margen }
	const pisado = function (caja) {
		return obstaculos.reduce((total, obstaculo) => total + superficie_pisada(caja, obstaculo), 0)
	}
	const en_preferida = pisado(preferida_arriba ? arriba : abajo)
	if (!en_preferida) return Boolean(preferida_arriba)
	const en_la_otra = pisado(preferida_arriba ? abajo : arriba)
	return en_la_otra < en_preferida ? !preferida_arriba : Boolean(preferida_arriba)
}

/**
 * Lo mismo, midiendo la tarjeta y los modales en la pantalla. Sin DOM (un test de node) devuelve la
 * preferencia tal cual.
 *
 * @param {Element} tarjeta El wrapper de la tarjeta de driver.js.
 * @param {Boolean} arriba_ahora
 * @param {Boolean} preferida_arriba
 * @returns {Boolean}
 */
export function tarjeta_va_arriba(tarjeta, arriba_ahora, preferida_arriba) {
	if (typeof window === 'undefined' || typeof document === 'undefined' || typeof tarjeta.getBoundingClientRect !== 'function') {
		return Boolean(preferida_arriba)
	}
	const obstaculos = pies_de_modal_visibles(document, window.innerWidth, window.innerHeight)
	return conviene_arriba(tarjeta.getBoundingClientRect(), arriba_ahora, obstaculos, window.innerHeight, preferida_arriba)
}
