/**
 * Utilidades PURAS para decidir si ESTA dirección es la versión activa del sistema del negocio.
 *
 * Contexto: cada cliente tiene dos frentes (dos subdominios) y en cada upgrade el admin rota cuál
 * es el activo, escribiendo su URL en `users.default_version`. El que entra por el frente que
 * quedó en desuso tiene que terminar en el activo. Hasta ahora eso pasaba DESPUÉS del login
 * (`check_version.js`: transferir la sesión e irse). Este módulo agrega la pregunta antes del
 * login, cuando todavía no hay sesión que transferir.
 *
 * Todo lo de acá es puro a propósito: no importa Vue, no toca `window` al cargarse y recibe sus
 * dependencias (ubicación, `fetch`, `matchMedia`) por parámetro con `window` como valor por
 * defecto. Eso permite probar la decisión con una tabla de casos, sin navegador.
 */

/**
 * Query param con el que la redirección previa al login marca la URL de destino.
 *
 * 🔴 Es la guarda contra los bucles: si el destino cree que TAMBIÉN es un frente equivocado (un
 * `default_version` mal cargado, un alias de dominio, dos frentes que se contradicen), el marcador
 * le dice "a vos ya te mandaron de otro lado" y no se redirige por segunda vez. Un solo salto,
 * siempre. Sin esto, un dato mal cargado dejaría la pantalla de login en un ir y venir entre dos
 * direcciones, ANTES de que el usuario pueda escribir nada.
 *
 * `main.js` lo saca de la barra de direcciones antes de montar Vue, para que no se cuele en el
 * `?redirect=` que arma el router.
 */
export const MARCA_DE_REDIRECCION = 'cc_vr'

/**
 * Techo de tiempo de la consulta de versión activa.
 *
 * Cinco segundos: es una request chica contra la propia API, que sale en paralelo con `auth/me`
 * (que ya son dos idas y vueltas). Al vencerse se sigue como si la API no supiera nada, así que
 * el peor caso es el comportamiento de siempre (redirigir después del login).
 *
 * Es un techo para una API COLGADA, no para una lenta: el temporizador corre en el hilo principal,
 * el mismo que arranca Vue, y en un celular lento un arranque de varios segundos puede hacer que
 * venza aunque la respuesta ya esté en la red. Por eso es holgado y, además, la consulta sale del
 * script inline de `public/index.html` (`window.__CC_ARRANQUE__.version_activa`), antes de que el
 * bundle se descargue: cuando Vue arranca, casi siempre ya está resuelta. Este valor tiene que
 * mantenerse igual al `TECHO_CONSULTA_MS` de ese script.
 */
export const CONSULTA_VERSION_ACTIVA_TIMEOUT_MS = 5000

/**
 * Los cuatro modos de presentación con los que una app instalada puede reportarse.
 *
 * 🔴 No alcanza con `standalone`. Cuando una app instalada navega FUERA de su scope (el manifest
 * no declara `scope`, así que el scope es el origen de instalación), Chrome y Edge la atienden con
 * la barra de "in-app browsing" puesta, y en ese estado el modo puede reportarse como
 * `minimal-ui`. Una pestaña común de navegador reporta `browser`, que no está en la lista, así que
 * preguntar por los cuatro no tiene falsos positivos por ese lado.
 */
const MODOS_DE_APP_INSTALADA = [
	'standalone',
	'minimal-ui',
	'fullscreen',
	'window-controls-overlay',
]

/**
 * Convierte un valor guardado en `default_version` (con o sin protocolo) en una URL, o `null`.
 *
 * Solo acepta `http:` y `https:`. Es una validación de seguridad: el valor sale de la base y lo
 * escribe el admin, pero a este parser se le pasa también lo que contesta la API, y una
 * redirección a `javascript:` o `data:` no puede ser posible ni por un dato mal cargado.
 *
 * @param {*} raw Valor crudo (ej. `https://sub.dominio.com`, `sub.dominio.com`).
 * @param {string} [protocolo_por_defecto] Protocolo a usar si el valor no trae (ej. `https:`).
 * @returns {URL|null}
 */
export function parsear_direccion_http(raw, protocolo_por_defecto) {
	if (!raw || typeof raw !== 'string') {
		return null
	}

	var texto = raw.trim()

	if (!texto) {
		return null
	}

	// Sin protocolo se usa el de la página actual (http en local, https en producción).
	var con_protocolo = /^[a-z][a-z0-9+.-]*:\/\//i.test(texto)
		? texto
		: (protocolo_por_defecto || 'https:') + '//' + texto.replace(/^\/+/, '')

	try {
		var url = new URL(con_protocolo)

		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			return null
		}

		if (!url.hostname) {
			return null
		}

		return url
	} catch (e) {
		return null
	}
}

/**
 * ¿Las dos direcciones son el MISMO sitio?
 *
 * 🔴 Compara host y puerto y IGNORA el protocolo, y esto es lo primero que alguien va a querer
 * "corregir" de vuelta a comparar `origin` entero. Con `origin` entero, un `default_version`
 * guardado como `http://cliente.comerciocity.com` no coincide nunca con la página servida por
 * `https://cliente.comerciocity.com`: el servidor redirige a https, el chequeo vuelve a decir
 * "no es este frente" y se redirige otra vez — un bucle. Ya pasó con `http://` en las
 * `client_apis` de Golonorte (7/9/2026) y es el hallazgo 10 del informe del 10/9/2026.
 * `URL.port` es '' cuando coincide con el puerto por defecto del protocolo, así que
 * `http://x` y `https://x` dan el mismo host y el mismo puerto ('').
 *
 * @param {string} a Una dirección (con o sin protocolo).
 * @param {string} b La otra.
 * @param {string} [protocolo_por_defecto] Protocolo para las que vengan sin él.
 * @returns {boolean} `false` también si alguna no se puede interpretar.
 */
export function mismo_sitio(a, b, protocolo_por_defecto) {
	var url_a = parsear_direccion_http(a, protocolo_por_defecto)
	var url_b = parsear_direccion_http(b, protocolo_por_defecto)

	if (!url_a || !url_b) {
		return false
	}

	return host_normalizado(url_a) === host_normalizado(url_b) && url_a.port === url_b.port
}

/**
 * Host en minúsculas y sin el punto final de un FQDN absoluto (`x.com.` es `x.com`).
 *
 * @param {URL} url
 * @returns {string}
 */
function host_normalizado(url) {
	return url.hostname.toLowerCase().replace(/\.$/, '')
}

/**
 * ¿La aplicación está corriendo como app instalada (PWA) y no adentro de una pestaña del
 * navegador?
 *
 * Importa porque una PWA es POR ORIGEN y no se puede mudar: la que el cliente instaló desde
 * `galvan.comerciocity.com` no puede pasar sola a `galvan2.comerciocity.com` — para el sistema
 * operativo son dos aplicaciones distintas. Al que entra por el navegador no le pasa esto.
 *
 * @param {Window} [win] Ventana a consultar (por defecto `window`).
 * @returns {boolean}
 */
export function es_app_instalada(win) {
	var ventana = win || window

	try {
		if (typeof ventana.matchMedia === 'function') {
			for (var i = 0; i < MODOS_DE_APP_INSTALADA.length; i++) {
				if (ventana.matchMedia('(display-mode: ' + MODOS_DE_APP_INSTALADA[i] + ')').matches) {
					return true
				}
			}
		}
	} catch (e) {
		/* Un navegador sin matchMedia no puede tener la app instalada: se sigue con iOS. */
	}

	// iOS no implementa `display-mode` y marca la app instalada con esta bandera propia.
	return Boolean(ventana.navigator && ventana.navigator.standalone === true)
}

/**
 * ¿La URL trae la marca de que se llegó por una redirección previa al login?
 *
 * @param {string} search `location.search` (con o sin el `?` inicial).
 * @returns {boolean}
 */
export function hay_marca_de_redireccion(search) {
	try {
		return new URLSearchParams(search || '').has(MARCA_DE_REDIRECCION)
	} catch (e) {
		return false
	}
}

/**
 * Saca la marca de redirección de la barra de direcciones (sin recargar) y avisa si estaba.
 *
 * Se llama UNA vez, en `main.js` antes de montar Vue. Devuelve el booleano y no lo vuelve a
 * leer de la URL después, porque para entonces ya no está.
 *
 * @param {Window} [win] Ventana a consultar (por defecto `window`).
 * @returns {boolean} `true` si la marca estaba.
 */
export function quitar_marca_de_redireccion(win) {
	var ventana = win || window

	if (!hay_marca_de_redireccion(ventana.location.search)) {
		return false
	}

	try {
		var params = new URLSearchParams(ventana.location.search)
		params.delete(MARCA_DE_REDIRECCION)

		var search_nueva = params.toString()

		ventana.history.replaceState(
			ventana.history.state,
			'',
			ventana.location.pathname + (search_nueva ? '?' + search_nueva : '') + ventana.location.hash
		)
	} catch (e) {
		/* Si no se puede limpiar la barra queda la marca: inofensiva, solo se ve fea. */
	}

	return true
}

/**
 * ¿Esta carga llegó por una redirección previa al login? Se completa UNA vez, al arrancar, con
 * `registrar_llegada_por_redireccion()`; después de eso la marca ya no está en la URL.
 */
var llegada_por_redireccion = false

/**
 * Lee (y saca de la barra de direcciones) la marca de redirección y guarda el resultado para que
 * el resto de la aplicación lo consulte con `llego_por_redireccion()`.
 *
 * @param {Window} [win] Ventana a consultar (por defecto `window`).
 * @returns {boolean}
 */
export function registrar_llegada_por_redireccion(win) {
	llegada_por_redireccion = quitar_marca_de_redireccion(win)

	return llegada_por_redireccion
}

/**
 * @returns {boolean} `true` si el arranque actual llegó con la marca de redirección.
 */
export function llego_por_redireccion() {
	return llegada_por_redireccion
}

/**
 * Arma la URL a la que hay que mandar al que todavía no inició sesión.
 *
 * Conserva ruta, query y hash: quien tenía guardado `https://viejo/vender` termina en
 * `https://nuevo/vender` y, si hay que loguearse, el router lo devuelve ahí después. Y agrega la
 * marca de redirección (ver `MARCA_DE_REDIRECCION`).
 *
 * @param {string} default_version Dirección activa tal como está guardada.
 * @param {{protocol: string, pathname: string, search: string, hash: string}} ubicacion
 *        Ubicación actual (`window.location`).
 * @returns {string} URL completa, o cadena vacía si `default_version` no sirve.
 */
export function armar_destino_previo_al_login(default_version, ubicacion) {
	var base = parsear_direccion_http(default_version, ubicacion.protocol)

	if (!base) {
		return ''
	}

	var destino = new URL(base.origin)
	var params = new URLSearchParams(ubicacion.search || '')

	params.set(MARCA_DE_REDIRECCION, '1')

	destino.pathname = ubicacion.pathname || '/'
	destino.search = params.toString()
	destino.hash = ubicacion.hash || ''

	return destino.toString()
}

/**
 * Decide qué hacer con un visitante SIN sesión según cuál es la dirección activa.
 *
 * Es la tabla completa de la misión `redireccion-version-antes-del-login` (24/9/2026), en el
 * orden en que se evalúa: el primer caso que aplica gana.
 *
 * @param {object} entrada
 * @param {string|null} entrada.default_version Lo que contestó la API (`null` si no supo).
 * @param {{origin: string, protocol: string, pathname: string, search: string, hash: string}} entrada.ubicacion
 *        Ubicación actual (`window.location`).
 * @param {boolean} entrada.es_app_instalada Si corre como PWA (ver `es_app_instalada`).
 * @param {boolean} entrada.vino_por_redireccion Si ya lo mandó otra dirección (marca en la URL, o
 *        token de transferencia de sesión): un solo salto, nunca dos.
 * @returns {{accion: string, motivo: string, destino?: string, direccion?: string}}
 *          `accion` es `seguir` (mostrar el login), `redirigir` (ir a `destino`) o `bloquear`
 *          (pantalla de "entrá desde el navegador a `direccion`").
 */
export function decidir_version_previa_al_login(entrada) {
	var ubicacion = entrada.ubicacion
	var base = parsear_direccion_http(entrada.default_version, ubicacion.protocol)

	// La API no supo (varios dueños, sin default_version, endpoint inexistente, sin red...).
	if (!base) {
		return { accion: 'seguir', motivo: 'sin_informacion' }
	}

	// Escape para levantar un frente viejo a propósito (slots de testing, "Cambiar versión").
	if (new URLSearchParams(ubicacion.search || '').has('forceStable')) {
		return { accion: 'seguir', motivo: 'forceStable' }
	}

	if (entrada.vino_por_redireccion) {
		return { accion: 'seguir', motivo: 'ya_redirigido' }
	}

	if (mismo_sitio(base.origin, ubicacion.origin, ubicacion.protocol)) {
		return { accion: 'seguir', motivo: 'mismo_sitio' }
	}

	// Una app instalada no puede seguir al frente nuevo: es otra aplicación para el sistema
	// operativo. No se redirige (adentro de la app da error): se le dice que use el navegador.
	if (entrada.es_app_instalada) {
		return {
			accion: 'bloquear',
			motivo: 'app_instalada_en_direccion_vieja',
			direccion: base.origin,
		}
	}

	return {
		accion: 'redirigir',
		motivo: 'direccion_vieja',
		direccion: base.origin,
		destino: armar_destino_previo_al_login(entrada.default_version, ubicacion),
	}
}

/**
 * Le pregunta a la API cuál es la dirección activa de este sistema, SIN sesión.
 *
 * 🔴 Nunca rechaza y nunca muestra nada: cualquier cosa que no sea un `200` con un objeto JSON
 * (404 de una API que todavía no tiene el endpoint, 500, CORS, corte de red, timeout) es "no sé"
 * y se resuelve con `null`, que el llamador trata como "seguir al login como siempre". Por eso va
 * con `fetch` nativo y no con `axios`: los interceptores globales de `main.js` convertirían un
 * corte de red en el cartel "No pudimos conectarnos con el servidor" sobre una consulta que el
 * usuario ni sabe que existe.
 *
 * `credentials: 'omit'`: no manda ni recibe cookies. No hace falta sesión y no tiene por qué
 * tocar la del frente viejo.
 *
 * @param {string} api_url URL base de la API de ESTE frente (sin barra final).
 * @param {number} [timeout_ms] Techo de tiempo (por defecto `CONSULTA_VERSION_ACTIVA_TIMEOUT_MS`).
 * @param {object} [entorno] Dependencias inyectables para probar: `fetch`, `AbortController`,
 *        `setTimeout`, `clearTimeout`. Por defecto las de `window`.
 * @returns {Promise<{default_version: (string|null)}|null>}
 */
export function consultar_version_activa(api_url, timeout_ms, entorno) {
	var dep = entorno || {}
	var fn_fetch = dep.fetch || (typeof window !== 'undefined' ? window.fetch : null)
	var Controlador = dep.AbortController || (typeof window !== 'undefined' ? window.AbortController : null)
	var fn_set_timeout = dep.setTimeout || (typeof window !== 'undefined' ? window.setTimeout.bind(window) : null)
	var fn_clear_timeout = dep.clearTimeout
		|| (typeof window !== 'undefined' ? window.clearTimeout.bind(window) : function () {})

	return new Promise(function (resolve) {
		try {
			if (!api_url || typeof fn_fetch !== 'function' || typeof fn_set_timeout !== 'function') {
				resolve(null)
				return
			}

			var controlador = typeof Controlador === 'function' ? new Controlador() : null

			var temporizador = fn_set_timeout(function () {
				if (controlador) {
					controlador.abort()
				}
				resolve(null)
			}, timeout_ms || CONSULTA_VERSION_ACTIVA_TIMEOUT_MS)

			var opciones = {
				method: 'GET',
				credentials: 'omit',
				cache: 'no-store',
				headers: { Accept: 'application/json' },
			}

			if (controlador) {
				opciones.signal = controlador.signal
			}

			fn_fetch(String(api_url).replace(/\/+$/, '') + '/api/version-activa', opciones)
				.then(function (res) {
					return res && res.ok ? res.json() : null
				})
				.then(function (json) {
					fn_clear_timeout(temporizador)
					resolve(json && typeof json === 'object' && !Array.isArray(json) ? json : null)
				})
				.catch(function () {
					fn_clear_timeout(temporizador)
					resolve(null)
				})
		} catch (e) {
			resolve(null)
		}
	})
}
