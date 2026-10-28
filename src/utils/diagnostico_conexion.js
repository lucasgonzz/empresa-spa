/* Diagnóstico optativo. No reintenta operaciones de negocio ni conserva datos de ellas. */
export const FAMILIAS = 'user login logout sanctum csrf-cookie provider-order provider provider-order-status article client sale budget order afip-ticket current-acount payment-method table-column-preferences pdf-column-options column-position recursos-iniciales background-processes article-pdf configuration address download-resources estado'
export const SUFIJOS = 'config index show search all count total totals status pending health not-received days-to-advise last activity user csrf-cookie problemas-al-facturar'
export const RUTAS = 'root login demoIngreso informeCompartido passwordReset configuration abm employee alertas vender expense cheque reportes panel article deposito-para-checkear deposito-checkeadas por-entregar por-estado rutas sale VentasAll provider client budget produccion produccionV2 caja online whatsapp tienda_nube mercado_libre pending comprobantes consultora_de_precios papelera devoluciones ia ofertas'

export function endpoint_seguro(valor) {
	const partes = String(valor || '').replace(/[?#][\s\S]*$/, '').replace(/^[a-z]+:\/\/[^/]*/i, '').split('/').filter(Boolean)
	if (partes[0] === 'api') partes.shift()
	return '/' + partes.slice(0, 6).map((parte, i) => (i === 0 ? FAMILIAS : SUFIJOS).split(' ').includes(parte) ? parte : ':valor').join('/')
}

const TTL = 86400000
const CAP = 100
const CAMPOS = 'at_ms duracion_ms tipo metodo endpoint ruta status origen nav_online auth_online sesion_offline pendientes exitos_cercanos skip_global skip_navegacion cancelable request_id'.split(' ')
const TIPOS = 'http sin_respuesta timeout cancelado pendiente recuperacion aviso'.split(' ')
const ORIGENES = 'ninguno toast_conexion transicion_offline aviso_sesion_offline'.split(' ')

/** También se sanea lo leído de localStorage: nunca se sube un JSON arbitrario del equipo. */
function evento_seguro(evento, ahora) {
	if (!evento || typeof evento !== 'object' || evento.at_ms < ahora - TTL || evento.at_ms > ahora + 300000) return null
	if (!Number.isInteger(evento.at_ms) || !TIPOS.includes(evento.tipo) || !ORIGENES.includes(evento.origen)) return null
	const copia = {}
	CAMPOS.forEach(clave => { copia[clave] = evento[clave] })
	copia.endpoint = endpoint_seguro(evento.endpoint)
	copia.ruta = RUTAS.split(' ').includes(evento.ruta) ? evento.ruta : 'otra'
	copia.metodo = 'GET POST PUT PATCH DELETE HEAD OPTIONS ESTADO'.split(' ').includes(evento.metodo) ? evento.metodo : 'ESTADO'
	copia.request_id = /^[a-f0-9]{32}$/.test(evento.request_id) ? evento.request_id : null
	;['nav_online', 'auth_online', 'sesion_offline', 'skip_global', 'skip_navegacion', 'cancelable'].forEach(clave => { copia[clave] = evento[clave] === true })
	;[['duracion_ms', TTL], ['status', 599], ['pendientes', 200], ['exitos_cercanos', 20]].forEach(([clave, maximo]) => {
		copia[clave] = Math.max(0, Math.min(maximo, Math.floor(Number(evento[clave]) || 0)))
	})
	return copia
}

export function iniciar_diagnostico_conexion(opciones) {
	const { axios, instancias, store, router, api_url } = opciones
	const entorno = opciones.entorno || window
	const ahora = opciones.ahora || (() => Date.now())
	const temporizar = opciones.temporizar || ((fn, ms) => setTimeout(fn, ms))
	const cancelar = opciones.cancelar || (id => clearTimeout(id))
	const transporte = opciones.transporte || axios.create({ baseURL: api_url, withCredentials: true, timeout: 8000 })
	let persona = null, habilitado = false, generacion = 0, clave = '', cola = []
	let enviando = false, intentos = 0, pausa_hasta = 0, reintento = null
	let secuencia = 0, activos = new Map(), exitos = [], hubo_fallo = false
	let ultimo_online = null, ultima_sesion = null
	let config_intentos = 0, config_reintentable = false, config_proximo = 0
	const desinstalar = []
	function auth() { return store.state.auth || {} }
	function usuario() { return auth().authenticated && auth().user ? Number(auth().user.id) : null }
	function ruta() { const nombre = router.currentRoute && router.currentRoute.name; return RUTAS.split(' ').includes(nombre) ? nombre : 'otra' }
	function base() {
		exitos = exitos.filter(fecha => fecha >= ahora() - 30000).slice(-20)
		return { at_ms: ahora(), duracion_ms: 0, tipo: 'aviso', metodo: 'ESTADO', endpoint: '/estado', ruta: ruta(), status: 0, origen: 'ninguno',
			nav_online: !!(entorno.navigator && entorno.navigator.onLine), auth_online: auth().online === true,
			sesion_offline: !!auth().sesion_sin_conexion, pendientes: activos.size, exitos_cercanos: exitos.length,
			skip_global: false, skip_navegacion: false, cancelable: false, request_id: null }
	}
	function guardar() {
		cola = cola.map(e => evento_seguro(e, ahora())).filter(Boolean).slice(-CAP)
		try { if (clave) entorno.localStorage.setItem(clave, JSON.stringify(cola)) } catch (ignorado) { /* Memoria acotada si el navegador bloquea storage. */ }
	}
	function agregar(evento) {
		if (!habilitado || persona !== usuario()) return
		const seguro = evento_seguro(evento, ahora())
		if (seguro) { cola.push(seguro); guardar() }
	}
	function limpiar_activos() { activos.forEach(meta => { cancelar(meta.timer); if (meta.desuscribir) meta.desuscribir() }); activos.clear() }
	function subir() {
		if (!habilitado || enviando || persona !== usuario() || intentos >= 5 || ahora() < pausa_hasta) return
		guardar()
		if (!cola.length) return
		const turno = generacion, persona_del_lote = persona, lote = cola.slice(0, 10)
		enviando = true
		intentos++
		// Instancia aislada: jamás pasa por los interceptores/toasts de producto.
		let enviado = false
		Promise.resolve().then(() => {
			if (turno !== generacion || usuario() !== persona_del_lote) return
			enviado = true
			return transporte.post('/api/diagnostico-conexion/eventos', { eventos: lote }, { headers: { 'X-Diagnostico-Persona': String(persona_del_lote) } })
		})
		.then(res => {
			if (turno !== generacion) return
			if (!enviado) { enviando = false; return }
			if (!res || res.status !== 202 || !res.data || res.data.ok !== true) throw new Error('Diagnóstico sin confirmación')
			// Mientras viajaba el lote, el cap pudo desplazar sus filas. Quitar sólo las
			// confirmadas, nunca las nuevas que ahora ocupan esas posiciones.
			const confirmadas = lote.map(evento => JSON.stringify(evento))
			cola = cola.filter(evento => {
				const indice = confirmadas.indexOf(JSON.stringify(evento))
				if (indice < 0) return true
				confirmadas.splice(indice, 1)
				return false
			})
			guardar(); intentos = 0; enviando = false
			if (cola.length) { pausa_hasta = ahora() + 7000; reintento = temporizar(subir, 7000) }
		})
		.catch(error => {
			if (turno !== generacion) return
			enviando = false
			if (error.response && [401, 403, 404, 409].includes(error.response.status)) { habilitado = false; limpiar_activos(); return }
			pausa_hasta = ahora() + Math.min(120000, 5000 * Math.pow(2, intentos - 1))
			if (intentos < 5) reintento = temporizar(subir, pausa_hasta - ahora())
		})
	}
	function recuperar() {
		recuperar_config()
		// Cinco intentos por recuperación. El tráfico de negocio no arma un bucle de subida.
		if (intentos >= 5 && ahora() >= pausa_hasta + 300000) intentos = 0
		subir()
	}
	function configurar(id) {
		generacion++; habilitado = false; persona = id; limpiar_activos(); exitos = []; hubo_fallo = false
		if (reintento) cancelar(reintento)
		enviando = false; intentos = 0; pausa_hasta = 0; cola = []; clave = ''
		config_intentos = 0; config_reintentable = false; config_proximo = 0
		if (!id) return
		pedir_config()
	}
	function recuperar_config() {
		if (!habilitado && config_reintentable && config_intentos < 3 && ahora() >= config_proximo && persona === usuario()) pedir_config()
	}
	function pedir_config() {
		const turno = generacion
		const id = persona
		config_intentos++; config_reintentable = false
		Promise.resolve().then(() => transporte.get('/api/diagnostico-conexion/config'))
		.then(res => {
			if (turno !== generacion || usuario() !== id || !res.data || res.data.habilitado !== true || res.data.persona !== id) return
			habilitado = true
			clave = 'cc-diagnostico-conexion-v1:' + encodeURIComponent(api_url) + ':' + id
			try { const guardada = JSON.parse(entorno.localStorage.getItem(clave) || '[]'); cola = Array.isArray(guardada) ? guardada.slice(-CAP) : [] } catch (ignorado) { cola = [] }
			ultimo_online = auth().online; ultima_sesion = auth().sesion_sin_conexion
			guardar(); subir()
		}).catch(error => {
			if (turno !== generacion) return
			const status = error.response && error.response.status
			// API vieja o rechazo explícito: terminal. Red/5xx: hasta tres consultas,
			// separadas por al menos 30 s y disparadas por una señal de recuperación.
			config_reintentable = !status || status >= 500
			config_proximo = ahora() + 30000
		})
	}
	function iniciar(config) {
		try {
			if (!habilitado || persona !== usuario() || activos.size >= 200) return config
			// El axios general también puede llamar a terceros: no agregarles headers ni trazas.
			if (new URL(config.url, config.baseURL || api_url).origin !== new URL(api_url).origin) return config
			const id = ++secuencia
			let request_id = null
			if (entorno.crypto && entorno.crypto.getRandomValues) {
				const bytes = entorno.crypto.getRandomValues(new Uint8Array(16))
				request_id = Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('')
				config.headers = config.headers || {}
				config.headers['X-Diagnostico-Id'] = request_id
				config.headers['X-Diagnostico-Persona'] = String(persona)
			}
			const meta = { id, generacion, inicio: ahora(), metodo: String(config.method || 'get').toUpperCase(), endpoint: endpoint_seguro(config.url), ruta: ruta(),
				skip_global: !!config.skip_global_error_event, skip_navegacion: !!config.skip_navigation_cancel, cancelable: !!config.cancelToken, origen: 'ninguno', prolongado: false, request_id }
			config.__diagnostico_conexion = meta
			activos.set(id, meta)
			meta.timer = temporizar(() => {
				if (!habilitado || meta.generacion !== generacion || !activos.has(id)) return
				meta.prolongado = true
				meta.cancelable = !!config.cancelToken
				agregar(Object.assign(base(), meta_publica(meta), { duracion_ms: ahora() - meta.inicio, tipo: 'pendiente' })); subir()
			}, 30000)
		} catch (ignorado) { /* Un diagnóstico nunca cambia el request de negocio. */ }
		return config
	}
	function meta_publica(meta) {
		return { metodo: meta.metodo, endpoint: meta.endpoint, ruta: meta.ruta, skip_global: meta.skip_global, skip_navegacion: meta.skip_navegacion, cancelable: meta.cancelable, origen: meta.origen, request_id: meta.request_id }
	}
	function terminar(config, error, respuesta) {
		try {
			const meta = config && config.__diagnostico_conexion
			if (!habilitado || !meta || meta.generacion !== generacion || !activos.has(meta.id) || persona !== usuario()) return
			cancelar(meta.timer); activos.delete(meta.id)
			if (meta.desuscribir) meta.desuscribir()
			meta.cancelable = !!config.cancelToken
			const status = Number(respuesta && respuesta.status || error && error.response && error.response.status || 0)
			if (error) {
				const cancelado = axios.isCancel(error) || error.code === 'ERR_CANCELED'
				const tipo = cancelado ? 'cancelado' : status ? 'http' : ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code) ? 'timeout' : 'sin_respuesta'
				hubo_fallo = !cancelado || hubo_fallo
				agregar(Object.assign(base(), meta_publica(meta), { tipo, status, duracion_ms: ahora() - meta.inicio })); subir()
			} else {
				exitos.push(ahora())
				if (meta.prolongado || hubo_fallo) {
					agregar(Object.assign(base(), meta_publica(meta), { tipo: 'recuperacion', status, duracion_ms: ahora() - meta.inicio }))
					hubo_fallo = false
				}
				recuperar()
			}
		} catch (ignorado) { /* Sin efecto sobre la respuesta original. */ }
	}
	instancias.forEach(instancia => {
		const req = instancia.interceptors.request.use(iniciar)
		const res = instancia.interceptors.response.use(respuesta => { recuperar_config(); terminar(respuesta.config, null, respuesta); return respuesta }, error => { terminar(error.config, error); return Promise.reject(error) })
		desinstalar.push(() => { instancia.interceptors.request.eject(req); instancia.interceptors.response.eject(res) })
	})
	const dejar_observar = store.watch(usuario, configurar, { immediate: true })
	const dejar_suscribir = store.subscribe(mutation => {
		try {
			if (!habilitado) return
			if (mutation.type === 'auth/set_online' && ultimo_online !== auth().online) {
				ultimo_online = auth().online
				agregar(Object.assign(base(), { origen: 'transicion_offline' })); recuperar()
			}
			if (mutation.type === 'auth/set_sesion_sin_conexion' && ultima_sesion !== auth().sesion_sin_conexion) {
				ultima_sesion = auth().sesion_sin_conexion
				agregar(Object.assign(base(), { origen: 'aviso_sesion_offline' })); recuperar()
			}
		} catch (ignorado) { /* Observación sin efecto sobre las mutations. */ }
	})
	entorno.addEventListener('online', recuperar)
	return {
		observar_cancelacion(config) {
			try {
				const meta = config.__diagnostico_conexion, token = config.cancelToken
				if (!meta || meta.generacion !== generacion || !activos.has(meta.id) || !token || typeof token.subscribe !== 'function' || meta.desuscribir) return
				// source.cancel() entrega un CanceledError sin config. Observar el token
				// real permite asociarlo sin mutar el error que recibe la aplicación.
				const al_cancelar = motivo => terminar(config, motivo)
				meta.desuscribir = () => token.unsubscribe(al_cancelar)
				token.subscribe(al_cancelar)
			} catch (ignorado) { /* El diagnóstico no decide cancelación ni navegación. */ }
		},
		registrar_aviso(error) {
			try { if (error.config && error.config.__diagnostico_conexion) error.config.__diagnostico_conexion.origen = 'toast_conexion' } catch (ignorado) { /* Sin efecto en el aviso. */ }
		},
		destruir() {
			generacion++; habilitado = false; limpiar_activos(); if (reintento) cancelar(reintento)
			desinstalar.forEach(fn => fn()); dejar_observar(); dejar_suscribir(); entorno.removeEventListener('online', recuperar)
		},
	}
}
