import { id_de_aviso_de_pedido } from '@/utils/pedidos_nuevos'

// Una instancia por aplicación. Nunca deriva avisos de listados, polling ni reconexiones.
// localStorage es propio del navegador/dispositivo y se separa además por comercio y usuario.
export function crear_avisador(obtener_navegador) {
	let clave = null
	let conectado = false
	let pendiente = false
	let generacion = 0
	let fallo = false
	let abiertos = []
	const observadores = new Set()
	function navegador() { return obtener_navegador() || {} }
	function leer(sufijo) {
		try { return navegador().localStorage.getItem(clave + sufijo) } catch (error) { return null }
	}
	function escribir(sufijo, valor) {
		try { navegador().localStorage.setItem(clave + sufijo, valor); return true } catch (error) { return false }
	}
	function cerrar() {
		abiertos.forEach(function (aviso) { try { aviso.close() } catch (error) { /* Ya cerrado. */ } })
		abiertos = []
	}
	function estado() {
		const nav = navegador()
		const soportado = Boolean(nav.isSecureContext && nav.Notification && nav.Notification.requestPermission && !fallo)
		const permiso = soportado ? nav.Notification.permission : 'default'
		const elegido = Boolean(clave && leer(':optin') === '1')
		let codigo = 'desactivado'
		if (!soportado) codigo = 'sin_soporte'
		else if (permiso === 'denied') codigo = 'denegado'
		else if (!clave || !conectado) codigo = 'desconectado'
		else if (elegido && permiso === 'granted') codigo = 'habilitado'
		return { codigo, elegido, pendiente }
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
				aviso.onclose = function () { abiertos = abiertos.filter(function (otro) { return otro !== aviso }) }
				if (abiertos.length > 10) abiertos.shift().close()
				return true
			} catch (error) {
				fallo = true
				cerrar()
				publicar()
				return false
			}
		},
	}
	return api
}

export const avisador_pedidos = crear_avisador(function () {
	return typeof window === 'undefined' ? null : window
})
