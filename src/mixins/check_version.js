import axios from 'axios'
import { env } from '@/runtime_config'

/**
 * Alinea axios con la misma configuración que el store de auth (cookies / API base).
 */
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

/**
 * Nombre del query param que transporta el token de sesión entre versiones.
 */
var VERSION_SESSION_TOKEN_PARAM = 'version_session_token'

/**
 * Techo de tiempo para la limpieza de la PWA vieja antes de redirigir.
 *
 * Dos segundos alcanzan de sobra para `unregister()` + `caches.delete()` (son operaciones
 * locales, sin red), y si el navegador no resuelve en ese plazo se redirige igual: dejar al
 * usuario mirando una pantalla en blanco es peor que dejarle el service worker viejo puesto,
 * que es exactamente lo que ya tiene hoy.
 */
var LIMPIEZA_PWA_TIMEOUT_MS = 2000

/**
 * Cuánto dura el aviso de que la dirección de la aplicación cambió.
 *
 * Treinta segundos: es un aviso que hay que leer entero y que pide hacer algo (reinstalar la
 * app desde la dirección nueva), no un "guardado con éxito". Los toasts de este repo duran 10 s
 * y con ese plazo el aviso se pierde. Igual se puede cerrar tocándolo, y termina yéndose solo:
 * un toast que no se va nunca tapa la pantalla de alguien que está vendiendo.
 */
var AVISO_DIRECCION_NUEVA_MS = 30000

/**
 * Techo de tiempo para los pedidos que hay que esperar ANTES de redirigir al otro frente.
 *
 * Desde que el arranque se corta cuando hay que cambiar de versión, estos pedidos son lo único
 * que corre: si uno se cuelga sin resolver, no se redirige, no arranca la aplicación y el
 * usuario se queda mirando una pantalla muerta. Este repo no tiene timeout global de axios, así
 * que sin esto no hay nada que lo despierte.
 *
 * Diez segundos: son dos operaciones cortas contra la propia API (un token en base y un cierre
 * de sesión), y diez segundos le dan aire a un comercio con internet malo sin dejar a nadie
 * esperando de más. Al vencerse, axios rechaza y se sigue por el camino que ya existía —
 * redirigir igual—, así que el peor caso es que el usuario tenga que entrar a mano en el
 * frente nuevo. Que es exactamente lo que se quiere que pueda hacer.
 */
var PEDIDO_DE_TRANSFERENCIA_TIMEOUT_MS = 10000

/**
 * Convierte el valor guardado en `default_version` (con o sin protocolo) al `origin`
 * comparable con `window.location.origin`.
 *
 * @param {string} raw Valor desde owner/user (ej. https://sub.dominio.com o solo host).
 * @returns {string} Origin normalizado o cadena vacía si no aplica.
 */
function normalize_app_origin(raw) {
	if (!raw || typeof raw !== 'string') {
		return ''
	}
	var trimmed = raw.trim()
	if (!trimmed) {
		return ''
	}
	try {
		var url_string
		if (trimmed.indexOf('http://') === 0 || trimmed.indexOf('https://') === 0) {
			url_string = trimmed
		} else {
			// Sin protocolo: usar el mismo esquema que la página actual (http local vs https prod).
			url_string = window.location.protocol + '//' + trimmed.replace(/^\/+/, '')
		}
		var parsed = new URL(url_string)
		return parsed.origin
	} catch (e) {
		return trimmed
	}
}

/**
 * URL base a la que redirigir (origin del default_version), para `window.location.href`.
 *
 * @param {string} raw Mismo origen que recibe `normalize_app_origin`.
 * @returns {string} Href completo mínimo (origin).
 */
function resolve_default_version_href(raw) {
	var normalized_origin = normalize_app_origin(raw)
	if (normalized_origin) {
		return normalized_origin
	}
	return typeof raw === 'string' ? raw.trim() : ''
}

/**
 * Arma la URL de destino con el token de transferencia de sesión.
 *
 * @param {string} redirect_href Origin o URL base del default_version.
 * @param {string} plain_token Token de un solo uso devuelto por la API origen.
 * @returns {string} URL completa para `window.location.href`.
 */
function build_redirect_href_with_version_token(redirect_href, plain_token) {
	try {
		var redirect_url = new URL(redirect_href, window.location.origin)
		redirect_url.searchParams.set(VERSION_SESSION_TOKEN_PARAM, plain_token)
		return redirect_url.toString()
	} catch (e) {
		var separator = redirect_href.indexOf('?') >= 0 ? '&' : '?'
		return (
			redirect_href
			+ separator
			+ VERSION_SESSION_TOKEN_PARAM
			+ '='
			+ encodeURIComponent(plain_token)
		)
	}
}

/**
 * Quita el token de la barra de direcciones sin recargar la página.
 *
 * @returns {void}
 */
function strip_version_session_token_from_url() {
	var params = new URLSearchParams(window.location.search)
	if (!params.has(VERSION_SESSION_TOKEN_PARAM)) {
		return
	}
	params.delete(VERSION_SESSION_TOKEN_PARAM)
	var new_search = params.toString()
	var new_url =
		window.location.pathname
		+ (new_search ? '?' + new_search : '')
		+ window.location.hash
	window.history.replaceState({}, '', new_url)
}

/**
 * ¿La aplicación está corriendo como app instalada (PWA) y no adentro de una pestaña del
 * navegador?
 *
 * Importa porque una PWA es POR ORIGEN y no se puede mudar: la que el cliente instaló desde
 * `galvan.comerciocity.com` no puede pasar sola a `galvan2.comerciocity.com` — para el sistema
 * operativo son dos aplicaciones distintas. Al que entra por el navegador no le pasa nada de
 * esto, así que no se le avisa nada.
 *
 * @returns {boolean}
 */
function corriendo_como_app_instalada() {
	try {
		if (
			typeof window.matchMedia === 'function'
			&& window.matchMedia('(display-mode: standalone)').matches
		) {
			return true
		}
	} catch (e) {
		/* Un navegador sin matchMedia no puede tener la app instalada: se sigue con iOS. */
	}

	// iOS no implementa `display-mode` y marca la app instalada con esta bandera propia.
	return Boolean(window.navigator && window.navigator.standalone === true)
}

/**
 * Desregistra los service workers de ESTE origen. Best-effort: nunca rechaza.
 *
 * @returns {Promise<*>}
 */
function desregistrar_service_workers() {
	if (
		!window.navigator
		|| !window.navigator.serviceWorker
		|| typeof window.navigator.serviceWorker.getRegistrations !== 'function'
	) {
		return Promise.resolve()
	}

	return window.navigator.serviceWorker
		.getRegistrations()
		.then(function (registrations) {
			return Promise.all(
				registrations.map(function (registration) {
					return registration.unregister().catch(function () {
						/* ignorar: igualmente se redirige */
					})
				})
			)
		})
		.catch(function () {
			/* ignorar: igualmente se redirige */
		})
}

/**
 * Borra las cachés de este origen (las que arma workbox al construir la PWA).
 * Best-effort: nunca rechaza.
 *
 * @returns {Promise<*>}
 */
function borrar_caches_del_origen() {
	if (!window.caches || typeof window.caches.keys !== 'function') {
		return Promise.resolve()
	}

	return window.caches
		.keys()
		.then(function (keys) {
			return Promise.all(
				keys.map(function (key) {
					return window.caches.delete(key).catch(function () {
						/* ignorar: igualmente se redirige */
					})
				})
			)
		})
		.catch(function () {
			/* ignorar: igualmente se redirige */
		})
}

/**
 * Saca de encima la PWA de este origen antes de irse al frente correcto.
 *
 * El frente en desuso precachea su `index.html` para siempre (workbox con `skipWaiting`), así
 * que cada arranque de la app instalada vuelve a levantar la versión vieja desde caché y a
 * pasar por todo el ciclo de redirección. Desregistrado el service worker y borradas sus
 * cachés, el próximo arranque de esa dirección va derecho a la red.
 *
 * Nunca rechaza y nunca tarda más de `LIMPIEZA_PWA_TIMEOUT_MS`.
 *
 * @returns {Promise<*>}
 */
function limpiar_pwa_de_este_origen() {
	var limpieza

	try {
		limpieza = Promise.all([
			desregistrar_service_workers(),
			borrar_caches_del_origen(),
		])
	} catch (e) {
		// Un navegador con estas APIs bloqueadas puede tirar sincrónicamente al tocarlas.
		return Promise.resolve()
	}

	var techo_de_tiempo = new Promise(function (resolve) {
		window.setTimeout(resolve, LIMPIEZA_PWA_TIMEOUT_MS)
	})

	return Promise.race([
		limpieza.catch(function () {
			/* ignorar: igualmente se redirige */
		}),
		techo_de_tiempo,
	])
}

/**
 * Único punto de salida hacia el frente correcto: limpia la PWA vieja y recién ahí redirige.
 *
 * 🔴 El redirect no se negocia: pase lo que pase con la limpieza (falle, se cuelgue o el
 * navegador no tenga las APIs), esta función termina siempre en el `window.location.href`.
 *
 * @param {string} href Destino final.
 * @returns {void}
 */
function redirigir_a(href) {
	limpiar_pwa_de_este_origen()
		.catch(function () {
			/* no debería pasar; la limpieza no puede impedir el redirect */
		})
		.then(function () {
			window.location.href = href
		})
}

export default {
	methods: {
		/**
		 * Si la URL trae un token de transferencia, inicia sesión en esta versión (API destino)
		 * antes de ejecutar `auth/me`. Resuelve con el user si el login fue exitoso.
		 *
		 * @returns {Promise<object|null>} Usuario autenticado o null.
		 */
		consume_version_session_token_if_present() {
			var params = new URLSearchParams(window.location.search)
			var plain_token = params.get(VERSION_SESSION_TOKEN_PARAM)

			if (!plain_token) {
				return Promise.resolve(null)
			}

			var self = this

			return axios
				.get('/sanctum/csrf-cookie')
				.then(function () {
					return axios.post('/login-from-version-session-token', {
						token: plain_token,
					})
				})
				.then(function (res) {
					strip_version_session_token_from_url()

					if (res.data.login && res.data.user) {
						/**
						 * Se llegó acá por una transferencia de versión: si el usuario viene
						 * de la app instalada, la que tiene instalada es la de la dirección
						 * VIEJA y va a seguir entrando por ahí en cada arranque.
						 */
						self.avisar_cambio_de_direccion_si_es_pwa()

						return res.data.user
					}

					if (res.data.user_last_activity) {
						var wait_minutes = res.data.user_last_activity_wait_minutes || 0
						self.$toast.error(
							'Su cuenta esta siendo utilizada en otro dispositivo, cierre la cuenta en el otro dispositivo. En caso de que la cuenta no este siendo utilizada en el otro dispositivo, espere '
							+ wait_minutes
							+ ' minutos'
						)
					} else {
						self.$toast.error(
							'No se pudo iniciar sesión en esta versión. Volvé a ingresar desde el link de tu negocio.',
							{ duration: 10000 }
						)
					}

					return null
				})
				.catch(function () {
					strip_version_session_token_from_url()
					self.$toast.error('Error al validar el acceso a esta versión')
					return null
				})
		},

		/**
		 * Avisa —solo si la aplicación corre como app instalada— que la dirección cambió y que
		 * conviene instalarla de nuevo desde la nueva.
		 *
		 * Es lo único que se puede hacer hoy por el cliente que tiene la PWA vieja: una app
		 * instalada no se puede mudar de origen por código. Al que entra por el navegador no se
		 * le muestra nada, porque a él no le pasa.
		 *
		 * @returns {void}
		 */
		avisar_cambio_de_direccion_si_es_pwa() {
			if (!corriendo_como_app_instalada()) {
				return
			}

			this.$toast.info(
				'La dirección de tu sistema cambió a '
				+ window.location.host
				+ '. La aplicación que tenés instalada sigue apuntando a la anterior: abrí esta'
				+ ' dirección en el navegador e instalala de nuevo desde ahí para entrar'
				+ ' directo.',
				{ duration: AVISO_DIRECCION_NUEVA_MS }
			)
		},

		/**
		 * Valor crudo de `default_version` que manda para este usuario: el suyo si lo tiene
		 * cargado y, si no, el del dueño.
		 *
		 * 🔴 Las guardas contra null no son decorativas. Esto lo llama el watch de
		 * `authenticated` de App.vue, que es lo primero que corre cuando la sesión queda
		 * iniciada: `owner` es null mientras no haya user, y para un empleado es `user.owner`,
		 * que la respuesta de la API puede no traer. Antes se leía `this.owner.default_version`
		 * derecho, y una excepción ahí adentro se lleva puesto el arranque entero de la
		 * aplicación —ni permisos, ni menú, ni datos—, porque corta el watch en la primera
		 * línea.
		 *
		 * @returns {string} Valor configurado, o cadena vacía si no hay ninguno.
		 */
		default_version_configurada() {
			var raw = ''

			if (this.owner && this.owner.default_version) {
				raw = this.owner.default_version
			}

			// La preferencia del propio usuario pisa a la del dueño (mismo orden de siempre).
			if (this.user && this.user.default_version) {
				raw = this.user.default_version
			}

			return raw
		},

		/**
		 * ¿Este frente es el equivocado para este usuario?
		 *
		 * Sincrónico y sin efectos: es la pregunta que App.vue necesita poder hacerse ANTES de
		 * arrancar nada. Si la respuesta es que sí, no se dispara ninguna de las ~15 llamadas
		 * de arranque contra la API de este frente — cada respuesta de esas trae su
		 * `Set-Cookie`, y las que llegan tarde le pisan la sesión al frente nuevo.
		 *
		 * @returns {boolean}
		 */
		debe_cambiar_de_version() {
			var default_version_raw = this.default_version_configurada()

			if (!default_version_raw) {
				return false
			}

			var default_origin = normalize_app_origin(default_version_raw)
			var current_host = window.location.origin

			// `forceStable` es el escape para levantar la SPA de un slot sin que se autoexpulse.
			var params = new URLSearchParams(window.location.search)
			var force_stable = params.has('forceStable')

			if (force_stable || !default_origin || current_host === default_origin) {
				return false
			}

			return true
		},

		/**
		 * Genera un token de transferencia, cierra sesión en el host actual y redirige al
		 * `default_version` con el token, para que la API destino ya deje la sesión iniciada.
		 *
		 * Da por hecho que ya se preguntó con `debe_cambiar_de_version()`.
		 *
		 * @returns {void}
		 */
		ir_a_la_version_correcta() {
			var redirect_href = resolve_default_version_href(
				this.default_version_configurada()
			)

			/**
			 * Token de un solo uso: la API origen (donde ya hay login) lo guarda en BD compartida;
			 * la API destino lo consume al cargar el SPA correcto.
			 */
			axios
				.post('/version-session-token', null, {
					timeout: PEDIDO_DE_TRANSFERENCIA_TIMEOUT_MS,
				})
				.then(function (res) {
					var plain_token = res.data && res.data.token
					if (!plain_token) {
						redirigir_a(redirect_href)
						return
					}

					var target_href = build_redirect_href_with_version_token(
						redirect_href,
						plain_token
					)

					/**
					 * Logout en el host viejo para liberar lock de sesión única y no dejar
					 * cookies activas en la versión incorrecta.
					 */
					axios
						.post('/logout', null, {
							timeout: PEDIDO_DE_TRANSFERENCIA_TIMEOUT_MS,
						})
						.catch(function () {
							/* ignorar: igualmente se redirige */
						})
						.finally(function () {
							redirigir_a(target_href)
						})
				})
				.catch(function () {
					/**
					 * Fallback sin token: comportamiento anterior (el usuario deberá loguearse de nuevo).
					 */
					axios
						.post('/logout', null, {
							timeout: PEDIDO_DE_TRANSFERENCIA_TIMEOUT_MS,
						})
						.catch(function () {
							/* ignorar */
						})
						.finally(function () {
							redirigir_a(redirect_href)
						})
				})
		},

		/**
		 * Composición de los dos métodos de arriba, tal como se comportaba antes: pregunta y,
		 * si corresponde, se va. Queda para cualquier consumidor que ya llamara a
		 * `check_version()`; App.vue usa los dos por separado porque necesita cortar el
		 * arranque ANTES de disparar el resto de las llamadas.
		 *
		 * @returns {void}
		 */
		check_version() {
			if (!this.debe_cambiar_de_version()) {
				return
			}

			this.ir_a_la_version_correcta()
		},
	},
}
