/**
 * Helper de auto-scroll horizontal por cercania a los bordes laterales de un contenedor scrolleable.
 *
 * Portado tal cual de scroll_margenes() de src/common-vue/components/display/table/Index.vue (los
 * listados), para poder reusar el mismo comportamiento en otros componentes (por ejemplo la tabla
 * del modal de busqueda) sin duplicar la logica linea por linea.
 *
 * OJO: la implementacion original sigue viviendo tal cual en display/table/Index.vue (no se toco
 * en este cambio, a proposito, para no arriesgar el comportamiento de los listados). Si en el
 * futuro se cambia el comportamiento de auto-scroll, hay que tocar los DOS lugares hasta que se
 * unifique todo detras de este helper.
 */

/**
 * Engancha el auto-scroll horizontal de margenes sobre un contenedor con overflow-x.
 *
 * Reproduce exactamente la logica de scroll_margenes(): zona sensible de MARGIN px desde cada
 * borde, velocidad maxima MAX_SPEED proporcional a la cercania al borde, corrida con
 * requestAnimationFrame (sin duplicar la animacion si ya esta corriendo), y sin activar el
 * auto-scroll cuando el mouse esta sobre la barra de scroll vertical (para poder usarla).
 *
 * @param {HTMLElement} el Contenedor scrolleable (el que tiene la barra de scroll horizontal).
 * @returns {Object|null} Handle { el, move_handler, leave_handler } para pasarle despues a
 * unbind_edge_auto_scroll, o null si no se pudo enganchar (el no existe).
 */
export function bind_edge_auto_scroll(el) {
	if (!el) {
		return null
	}

	// Ancho de la zona de scroll de los margenes (no cambia).
	const MARGIN = 70
	// Velocidad maxima, al borde de la zona util.
	const MAX_SPEED = 20

	let scrollDirection = null
	let scrollSpeed = 0
	let isScrolling = false

	const startScroll = () => {
		if (isScrolling) return // Evita duplicar la animacion

		isScrolling = true
		const scroll = () => {
			if (!scrollDirection || scrollSpeed <= 0) {
				isScrolling = false
				return // Detiene si no hay direccion o velocidad
			}
			el.scrollLeft += scrollDirection === 'right' ? scrollSpeed : -scrollSpeed
			requestAnimationFrame(scroll)
		}
		scroll()
	}

	const stopScroll = () => {
		scrollDirection = null
		scrollSpeed = 0
	}

	const handleMouseMove = (e) => {
		const rect = el.getBoundingClientRect()
		const left = rect.left
		const right = rect.right
		const x = e.clientX
		// Ancho real de la scrollbar vertical (a la derecha). 0 si no hay.
		const scrollbar_width = el.offsetWidth - el.clientWidth

		// Sobre la barra de scroll vertical: no auto-scroll (para poder usar la barra).
		if (scrollbar_width > 0 && x > right - scrollbar_width) {
			stopScroll()
			return
		}

		if (x < left + MARGIN) {
			// Margen izquierdo: cuanto mas cerca del borde, mas rapido.
			let distance = x - left // 0 en el borde, MARGIN en el limite interno
			let proximity = (MARGIN - distance) / MARGIN
			if (proximity < 0) proximity = 0
			if (proximity > 1) proximity = 1
			scrollDirection = 'left'
			scrollSpeed = MAX_SPEED * proximity
			startScroll()
		} else if (x > right - MARGIN) {
			// Margen derecho (excluyendo la scrollbar): cuanto mas cerca del borde usable, mas rapido.
			let distance = right - x // pequeno cerca del borde
			let usable = MARGIN - scrollbar_width // zona util sin la scrollbar
			if (usable <= 0) usable = MARGIN
			// proximity = 1 justo al lado de la scrollbar (maxima velocidad), 0 en el limite interno.
			let proximity = (MARGIN - distance) / usable
			if (proximity < 0) proximity = 0
			if (proximity > 1) proximity = 1
			scrollDirection = 'right'
			scrollSpeed = MAX_SPEED * proximity
			startScroll()
		} else {
			stopScroll()
		}
	}

	el.addEventListener('mousemove', handleMouseMove)
	el.addEventListener('mouseleave', stopScroll)

	return {
		el: el,
		move_handler: handleMouseMove,
		leave_handler: stopScroll,
	}
}

/**
 * Saca los listeners enganchados por bind_edge_auto_scroll.
 *
 * @param {Object} handle Lo que devolvio bind_edge_auto_scroll.
 * @returns {void}
 */
export function unbind_edge_auto_scroll(handle) {
	if (handle && handle.el) {
		if (handle.move_handler) {
			handle.el.removeEventListener('mousemove', handle.move_handler)
		}
		if (handle.leave_handler) {
			handle.el.removeEventListener('mouseleave', handle.leave_handler)
		}
	}
}
