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
 * Es un techo para una API COLGADA, no para una lenta. La consulta sale del script inline de
 * `public/index.html` (`window.__CC_ARRANQUE__.version_activa`) apenas carga el documento, antes de
 * que el bundle se descargue y se evalúe: cuando Vue arranca, casi siempre ya está resuelta y un
 * arranque largo de la aplicación no la afecta. Si saliera recién desde Vue, el temporizador de su
 * techo competiría con ese arranque por el mismo hilo. Este valor tiene que mantenerse igual al
 * `TECHO_CONSULTA_MS` de ese script.
 */
export const CONSULTA_VERSION_ACTIVA_TIMEOUT_MS = 5000

/**
 * Los modos de presentación con los que una app instalada puede reportarse.
 *
 * 🔴 No alcanza con `standalone`. Cuando una app instalada navega FUERA de su scope (el manifest
 * no declara `scope`, así que el scope es el origen de instalación), Chrome y Edge la atienden con
 * la barra de "in-app browsing" puesta, y en ese estado el modo puede reportarse como
 * `minimal-ui`. Una pestaña común de navegador reporta `browser`.
 *
 * 🔴 Y `fullscreen` NO está, aunque el primer arreglo (10/9/2026) sí lo tenía. Una pestaña común de
 * un navegador en pantalla completa (F11, modo kiosco, la consultora de precios que se deja en un
 * pasillo) también reporta `display-mode: fullscreen`. Cuando esta lista decidía solo un toast ese
 * falso positivo era inocuo; ahora decide un BLOQUEO, y dejaría sin sistema a quien no tiene
 * ninguna app instalada. El manifest declara `display: standalone`, así que una app de
 * ComercioCity no reporta `fullscreen` salvo que el usuario ponga F11 adentro de ella: ese caso
 * se deja pasar (sigue el comportamiento de siempre). `window-controls-overlay` solo lo reporta
 * una app instalada que lo declare, y `minimal-ui` no lo reporta una pestaña normal.
 */
const MODOS_DE_APP_INSTALADA = [
	'standalone',
	'minimal-ui',
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
 * ¿El host es una dirección IP (v4 o v6) y no un nombre de dominio?
 *
 * @param {string} host Host ya normalizado (`URL.hostname` trae los corchetes de una IPv6).
 * @returns {boolean}
 */
function es_direccion_ip(host) {
	return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.indexOf(':') !== -1 || /^\[.*\]$/.test(host)
}

/**
 * ¿Las dos direcciones son del MISMO dominio o de dos "hermanas" que cuelgan del mismo dominio
 * padre? (`galvan.comerciocity.com` y `galvan2.comerciocity.com` lo son; `galvan.comerciocity.com`
 * y `login-falso.example` no.)
 *
 * 🔴 Es la defensa contra un `default_version` ajeno, y existe por un motivo concreto. Ese valor lo
 * escribe `PUT admin-sync/update-default-version`, y `ADMIN_SYNC_REQUIRE_API_KEY` está APAGADO en
 * toda la flota (`AdminApiKey` deja pasar todo, ver los informes del 25/8 y del 14/9/2026): hoy
 * cualquiera que conozca la API de un cliente puede escribirle la URL que quiera. Antes de esta
 * misión eso solo mandaba, DESPUÉS del login, a la sesión ya iniciada al sitio ajeno (con un token de
 * transferencia en la URL). Con la redirección previa al login mandaría a TODO el que abre el
 * login, ANTES de que escriba el documento y la clave: phishing a escala de cliente. Y la pantalla
 * de bloqueo de la app instalada le mostraría esa dirección al usuario como "la nueva". Por eso el
 * destino tiene que ser un frente de este mismo dominio o se ignora.
 *
 * Reglas, en orden:
 * - mismo host (el puerto no importa: en desarrollo los dos frentes son el mismo host en puertos
 *   distintos) → sí;
 * - si alguno es una IP → no (dos IP distintas no son hermanas);
 * - se comparan los dominios padre (el host sin su primera etiqueta) y tienen que ser iguales y
 *   tener al menos dos etiquetas (`comerciocity.com`): nunca solo un TLD (`com`), que emparentaría
 *   a cualquier .com con cualquier otro;
 * - y el padre no puede parecer un sufijo público (`com.ar`, `co.uk`: segunda etiqueta de hasta 3
 *   letras + país de 2), porque emparentaría a cualquier `*.com.ar` con cualquier otro. No hay
 *   lista de sufijos públicos en el bundle: es una aproximación a propósito conservadora, y su
 *   único costo es que un cliente con un dominio raro pierda la redirección y siga con el
 *   mecanismo de siempre.
 *
 * @param {string} a Una dirección (con o sin protocolo).
 * @param {string} b La otra.
 * @param {string} [protocolo_por_defecto] Protocolo para las que vengan sin él.
 * @returns {boolean} `false` también si alguna no se puede interpretar.
 */
export function comparten_dominio_padre(a, b, protocolo_por_defecto) {
	var url_a = parsear_direccion_http(a, protocolo_por_defecto)
	var url_b = parsear_direccion_http(b, protocolo_por_defecto)

	if (!url_a || !url_b) {
		return false
	}

	var host_a = host_normalizado(url_a)
	var host_b = host_normalizado(url_b)

	if (host_a === host_b) {
		return true
	}

	if (es_direccion_ip(host_a) || es_direccion_ip(host_b)) {
		return false
	}

	var padre_a = host_a.split('.').slice(1)
	var padre_b = host_b.split('.').slice(1)

	if (padre_a.length < 2 || padre_a.join('.') !== padre_b.join('.')) {
		return false
	}

	// Un padre de dos etiquetas con forma de sufijo público (`com.ar`, `co.uk`) no une a nadie.
	if (padre_a.length === 2 && padre_a[0].length <= 3 && padre_a[1].length === 2) {
		return false
	}

	return true
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
 * Clave de `sessionStorage` con la que una ventana de app instalada recuerda que ya fue bloqueada.
 *
 * Es POR VENTANA (sessionStorage sobrevive a un F5 pero no a cerrar la ventana). Hace falta porque
 * el bloqueo de una app instalada que llegó redirigida por código anterior a esta misión (B3) se
 * decide por el token que trae la URL, y ese token se saca de la barra: sin este recuerdo, un F5
 * dentro de la ventana bloqueada mostraba el login y la app vieja se podía usar. Al cerrar la
 * ventana y volver a abrir la app se arranca de cero, en su dirección de instalación, donde los
 * tres bloqueos vuelven a decidir.
 */
var CLAVE_VENTANA_BLOQUEADA = 'cc_pwa_bloqueada'

/**
 * Deja marcada esta ventana como bloqueada. Nunca tira (almacenamiento bloqueado = no se recuerda).
 *
 * @param {Window} [win] Ventana (por defecto `window`).
 * @returns {void}
 */
export function marcar_ventana_como_bloqueada(win) {
	try {
		(win || window).sessionStorage.setItem(CLAVE_VENTANA_BLOQUEADA, '1')
	} catch (e) {
		/* sin almacenamiento no se puede recordar: el bloqueo vale solo para esta carga */
	}
}

/**
 * @param {Window} [win] Ventana (por defecto `window`).
 * @returns {boolean} `true` si esta ventana ya fue bloqueada antes.
 */
export function ventana_esta_marcada_como_bloqueada(win) {
	try {
		return (win || window).sessionStorage.getItem(CLAVE_VENTANA_BLOQUEADA) === '1'
	} catch (e) {
		return false
	}
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

	// 🔴 Un destino de otro dominio no se sigue ni se muestra, venga de donde venga: es la defensa
	// contra un `default_version` escrito por un tercero (ver `comparten_dominio_padre`).
	if (!comparten_dominio_padre(base.origin, ubicacion.origin, ubicacion.protocol)) {
		return { accion: 'seguir', motivo: 'dominio_ajeno' }
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
