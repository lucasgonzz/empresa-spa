const CAPAS = '.asistente-ia-overlay--lateral, .whatsapp-sidebar, .tienda-mensajes-sidebar, '
	+ '.active-mobile-nav, .modal.show, .modal-backdrop, .dropdown-menu.show, dialog[open]'

function capa_de(nodo) {
	const capa = nodo.closest(CAPAS)
	if (!capa || !capa.matches('.modal-backdrop')) return capa
	const contenedor = capa.closest('[id$="___BV_modal_outer_"]')
	return contenedor ? contenedor.querySelector('.modal.show') : null
}

function capa_que_tapa(objetivo) {
	if (!objetivo.isConnected || !document.querySelector(CAPAS)) return null
	const rect = objetivo.getBoundingClientRect()
	const izquierda = Math.max(0, rect.left)
	const derecha = Math.min(window.innerWidth, rect.right)
	const arriba = Math.max(0, rect.top)
	const abajo = Math.min(window.innerHeight, rect.bottom)
	if (derecha <= izquierda || abajo <= arriba) return null

	// Driver deshabilita los punteros de las capas ajenas al paso. Quitamos su clase solo
	// durante la medición sincrónica para que el hit test encuentre lo que realmente se dibuja encima.
	const driver_activo = document.body.classList.contains('driver-active')
	if (driver_activo) document.body.classList.remove('driver-active')
	try {
		for (const px of [.5, .15, .85]) {
			for (const py of [.5, .15, .85]) {
				const pila = document.elementsFromPoint(izquierda + (derecha - izquierda) * px, arriba + (abajo - arriba) * py)
				for (const nodo of pila) {
					if (objetivo.contains(nodo)) break
					const capa = capa_de(nodo)
					if (capa && !capa.contains(objetivo) && !objetivo.contains(capa)) return capa
				}
			}
		}
	} finally {
		if (driver_activo) document.body.classList.add('driver-active')
	}
	return null
}

function cerrar(capa, vm) {
	if (capa.querySelector('[data-robotito-borrador]')) {
		vm.ocultar_capa_con_borrador(capa)
	} else if (capa.matches('.asistente-ia-overlay--lateral')) {
		vm.$root.$emit('agentes:cerrar')
	} else if (capa.matches('.whatsapp-sidebar')) {
		vm.$store.commit('whatsapp_chat/setSidebarAbierto', false)
	} else if (capa.matches('.tienda-mensajes-sidebar')) {
		vm.$store.commit('tienda_mensajes/setSidebarAbierto', false)
	} else if (capa.matches('dialog[open]') && typeof capa.requestClose === 'function') {
		capa.requestClose()
	} else {
		let boton = null
		if (capa.matches('.active-mobile-nav')) {
			boton = capa.parentElement.querySelector('[data-menu-implementacion-movil][aria-expanded="true"]')
		} else if (capa.matches('.modal.show')) {
			boton = capa.querySelector('.modal-header button.close, button[data-dismiss="modal"]')
		} else if (capa.matches('.dropdown-menu.show')) {
			boton = capa.parentElement.querySelector('.dropdown-toggle[aria-expanded="true"]')
		}
		if (!boton || boton.disabled) return false
		boton.click()
	}
	return true
}

export function despejar_paso(objetivo, vm, vigente) {
	const intentadas = new Set()
	function despejar() {
		if (!vigente()) return false
		const capa = capa_que_tapa(objetivo)
		if (!capa) return true
		if (intentadas.has(capa) || !cerrar(capa, vm)) return false
		intentadas.add(capa)
		// Vue y BootstrapVue desmontan la capa al terminar su transición de salida.
		return new Promise(resolver => setTimeout(resolver, 360)).then(despejar)
	}
	return Promise.resolve(despejar())
}
