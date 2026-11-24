import { id_de_aviso_de_pedido } from '@/utils/pedidos_nuevos'

// Marcas del DISPOSITIVO (no del comercio ni del usuario): la capacidad del navegador no depende de quién inició sesión.
// Guardan el userAgent con el que se comprobaron: si el navegador se actualiza o se cambia, dejan de valer.
const CLAVE_DISPOSITIVO = 'cc:aviso-pedido:v1:dispositivo'

// Chrome y los navegadores basados en Chromium de Android exponen Notification y requestPermission, pero
// `new Notification()` lanza TypeError "Illegal constructor" (sólo admiten showNotification de un service worker,
// que esta función no usa). Detectarlo por plataforma evita declarar "habilitado" antes del primer pedido, porque
// la única prueba directa sería construir un aviso. Firefox para Android queda afuera de esta regla: si también
// fallara, la marca persistida de recibir() lo cubre desde el primer pedido en adelante.
export function constructor_ilegal_por_plataforma(agente) {
	return /Android/i.test(agente || '') && !/Firefox/i.test(agente || '')
}

// Una instancia por aplicación. Nunca deriva avisos de listados, polling ni reconexiones.
// localStorage es propio del navegador/dispositivo y se separa además por comercio y usuario.
export function crear_avisador(obtener_navegador) {
	let clave = null
	let conectado = false
	let pendiente = false
	let generacion = 0
	let fallo = false
	// Falla del constructor: es del navegador, así que sobrevive al cambio de usuario/comercio (a diferencia de `fallo`).
	let fallo_constructor = false
	let abiertos = []
	const observadores = new Set()
	function navegador() { return obtener_navegador() || {} }
	function leer(sufijo) {
		try { return navegador().localStorage.getItem(clave + sufijo) } catch (error) { return null }
	}
	function escribir(sufijo, valor) {
		try { navegador().localStorage.setItem(clave + sufijo, valor); return true } catch (error) { return false }
	}
	// En el navegador real el agente vive en window.navigator.userAgent (window.userAgent no existe); sólo si falta se
	// lee el userAgent de arriba, que es la forma que inyectan los navegadores falsos de los tests.
	function agente() {
		const nav = navegador()
		return String((nav.navigator && nav.navigator.userAgent) || nav.userAgent || '')
	}
	function leer_dispositivo(sufijo) {
		try { return navegador().localStorage.getItem(CLAVE_DISPOSITIVO + sufijo) } catch (error) { return null }
	}
	function escribir_dispositivo(sufijo, valor) {
		try { navegador().localStorage.setItem(CLAVE_DISPOSITIVO + sufijo, valor); return true } catch (error) { return false }
	}
	// Sólo cuenta la marca hecha con este mismo navegador y versión.
	function marca_vigente(sufijo) {
		const marca = leer_dispositivo(sufijo)
		return marca !== null && marca === (agente() || 'sin_agente')
	}
	function constructor_incapaz() {
		return fallo_constructor || constructor_ilegal_por_plataforma(agente()) || marca_vigente(':incapaz')
	}
	function cerrar() {
		abiertos.forEach(function (aviso) { try { aviso.close() } catch (error) { /* Ya cerrado. */ } })
		abiertos = []
	}
	function estado() {
		const nav = navegador()
		const incapaz = constructor_incapaz()
		const soportado = Boolean(nav.isSecureContext && nav.Notification && nav.Notification.requestPermission && !fallo && !incapaz)
		const permiso = soportado ? nav.Notification.permission : 'default'
		// Un opt-in guardado con el permiso en "default" (revocado o reiniciado) no cuenta como elegido: si no, el texto
		// dice "desactivados" y el botón ofrece "Desactivar". Con permiso otorgado o denegado sí se muestra el opt-in.
		const elegido = Boolean(clave && soportado && permiso !== 'default' && leer(':optin') === '1')
		let codigo = 'desactivado'
		if (!soportado) codigo = 'sin_soporte'
		else if (permiso === 'denied') codigo = 'denegado'
		else if (!clave || !conectado) codigo = 'desconectado'
		else if (elegido && permiso === 'granted') codigo = 'habilitado'
		// verificado: un aviso real ya se construyó en este navegador. Antes del primer pedido "habilitado" es sólo
		// permiso + opt-in; la interfaz no debe prometer más que eso.
		return {
			codigo, elegido, pendiente,
			verificado: marca_vigente(':verificado'),
			motivo: codigo === 'sin_soporte' && incapaz ? 'constructor' : 'navegador',
		}
	}
	function publicar() {
		const actual = estado()
		observadores.forEach(function (observar) { observar(actual) })
		return actual
	}
	const api = {
		estado,
		suscribir(observar) {
			observadores.add(observar)
			observar(estado())
			return function () { observadores.delete(observar) }
		},
		contexto(owner, usuario) {
			const siguiente = owner && usuario ? 'cc:aviso-pedido:v1:' + owner + ':' + usuario : null
			if (siguiente !== clave) {
				cerrar()
				clave = siguiente
				generacion++
				pendiente = false
				fallo = false
			}
			return publicar()
		},
		conexion(valor) {
			conectado = Boolean(valor)
			if (!conectado) cerrar()
			return publicar()
		},
		refrescar() {
			if (estado().codigo !== 'habilitado') cerrar()
			return publicar()
		},
		// Sólo invocado por el clic del botón; nunca desde hooks, watchers o eventos Echo.
		habilitar() {
			const actual = estado()
			if (pendiente || !clave || !conectado || actual.codigo === 'sin_soporte' || actual.codigo === 'denegado') {
				return Promise.resolve(actual)
			}
			const turno = generacion
			const objetivo = clave
			pendiente = true
			publicar()
			function terminar(permiso) {
				if (turno !== generacion || objetivo !== clave) return estado()
				pendiente = false
				if (permiso === 'granted' && !escribir(':optin', '1')) fallo = true
				return publicar()
			}
			function rechazar() {
				if (turno !== generacion || objetivo !== clave) return estado()
				pendiente = false
				fallo = true
				return publicar()
			}
			try {
				if (navegador().Notification.permission === 'granted') return Promise.resolve(terminar('granted'))
				return Promise.resolve(navegador().Notification.requestPermission()).then(terminar, rechazar)
			} catch (error) { return Promise.resolve(rechazar()) }
		},
		deshabilitar() {
			generacion++
			pendiente = false
			escribir(':optin', '0')
			cerrar()
			return publicar()
		},
		recibir(payload) {
			const id = id_de_aviso_de_pedido(payload)
			if (!id || estado().codigo !== 'habilitado') return false
			let vistos
			try { vistos = JSON.parse(leer(':vistos') || '[]') } catch (error) { vistos = [] }
			if (!Array.isArray(vistos)) vistos = []
			if (vistos.indexOf(id) !== -1) return false
			// También cubre eventos repetidos tras recargar. Sin nombres, importes ni datos del comprador.
			if (!escribir(':vistos', JSON.stringify(vistos.concat(id).slice(-256)))) return false
			try {
				const aviso = new (navegador().Notification)('Nuevo pedido en tu tienda', {
					body: 'Abrí Pedidos en el sistema para revisarlo.',
					tag: clave + ':' + id,
				})
				abiertos.push(aviso)
				escribir_dispositivo(':verificado', agente() || 'sin_agente')
				aviso.onclose = function () { abiertos = abiertos.filter(function (otro) { return otro !== aviso }) }
				if (abiertos.length > 10) abiertos.shift().close()
			} catch (error) {
				fallo_constructor = true
				// Sólo el "Illegal constructor" (TypeError) es permanente para este navegador: se recuerda tras recargar.
				// Cualquier otro error se informa en esta sesión pero no se persiste, para no bloquear para siempre.
				if (error && (error.name === 'TypeError' || /illegal constructor/i.test(String(error.message || '')))) {
					escribir_dispositivo(':incapaz', agente() || 'sin_agente')
					escribir_dispositivo(':verificado', '')
				}
				cerrar()
				publicar()
				return false
			}
			// Fuera del try: si un observador lanza, no debe tomarse por un constructor roto (eso se persistiría).
			// Avisa ya a los suscriptores: sin esto el control seguía en "Todavía no se comprobó…" hasta un focus/storage.
			publicar()
			return true
		},
	}
	return api
}

export const avisador_pedidos = crear_avisador(function () {
	return typeof window === 'undefined' ? null : window
})
