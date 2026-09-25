import axios from 'axios'
import { env } from '@/runtime_config'
import {
	comparten_dominio_padre,
	consultar_version_activa,
	decidir_version_previa_al_login,
	es_app_instalada,
	llego_por_redireccion,
	marcar_ventana_como_bloqueada,
	mismo_sitio,
	parsear_direccion_http,
	ventana_esta_marcada_como_bloqueada,
} from '@/utils/version_de_direccion'

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
 * Cubre las dos cosas que pasan adentro: esperar el `load` de la ventana (ver
 * `esperar_a_que_la_pagina_termine_de_cargar`) y después `unregister()` + `caches.delete()`, que
 * son operaciones locales y sin red. Tres segundos alcanzan de sobra para las dos, y si el
 * navegador no resuelve en ese plazo se redirige igual: dejar al usuario mirando una pantalla en
 * blanco es peor que dejarle el service worker viejo puesto, que es exactamente lo que ya tiene
 * hoy.
 */
var LIMPIEZA_PWA_TIMEOUT_MS = 3000

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
 * Config de los dos pedidos del cambio de frente (el token y el logout).
 *
 * Además del techo de tiempo lleva `skip_global_error_event`, la bandera que ya usa el resto de
 * `main.js` para que el interceptor global no muestre nada. Sin ella, un timeout de estos dos
 * pedidos le sale al usuario como *"El servidor tardó demasiado en responder. Lo que pediste
 * puede haber quedado en curso..."* —un texto escrito para una acción que el usuario pidió— por
 * una transferencia que él no pidió y ni sabe que existe. En el peor camino salían dos avisos,
 * y encima viajaban con él al frente nuevo.
 *
 * Se devuelve un objeto nuevo en cada llamada y no una constante compartida: axios recibe el
 * config por referencia y no hay por qué darle el mismo a dos pedidos.
 *
 * @returns {object}
 */
function config_de_pedido_de_transferencia() {
	return {
		timeout: PEDIDO_DE_TRANSFERENCIA_TIMEOUT_MS,
		skip_global_error_event: true,
	}
}

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
 * Espera a que la ventana haya terminado de cargar. Si ya cargó, resuelve enseguida.
 *
 * 🔴 Existe por una carrera que anulaba la limpieza sin dejar rastro. `registerServiceWorker.js`
 * no registra el service worker al importarse: `register-service-worker` engancha el registro al
 * evento `load` de la ventana. Y la limpieza corre cuando resuelve `auth/me`, que en la app
 * instalada —bundle precacheado, API rápida— puede resolver ANTES de ese `load`. La secuencia
 * quedaba: desregistrar ✓ → dispara `load` → se vuelve a registrar → redirigir. O sea, limpieza
 * deshecha, sin error y sin síntoma. Esperando el `load` primero, el registro ya pasó y el
 * desregistro es el que queda.
 *
 * Nunca rechaza. El techo de tiempo de la limpieza cubre igual el caso de un `load` que no llega.
 *
 * @returns {Promise<*>}
 */
function esperar_a_que_la_pagina_termine_de_cargar() {
	if (!window.document || window.document.readyState === 'complete') {
		return Promise.resolve()
	}

	return new Promise(function (resolve) {
		window.addEventListener('load', function () {
			resolve()
		}, { once: true })
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
		limpieza = esperar_a_que_la_pagina_termine_de_cargar()
			.then(function () {
				return Promise.all([
					desregistrar_service_workers(),
					borrar_caches_del_origen(),
				])
			})
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
	data() {
		return {
			/**
			 * ¿Ya se resolvió la pregunta "¿esta es la dirección activa?" para el arranque SIN
			 * sesión? Es una sola vez por carga: `App.vue` la usa para no volver a hacerla cada
			 * vez que la sesión se cae o el usuario cierra sesión (ahí ya no es un arranque).
			 */
			version_previa_al_login_resuelta: false,

			/**
			 * ¿Esta carga llegó con un token de transferencia de sesión en la URL? Se guarda acá
			 * porque `consume_version_session_token_if_present()` lo saca de la barra de
			 * direcciones, y la decisión previa al login, que corre después, necesita saberlo:
			 * a quien ya lo mandó otra dirección no se lo manda otra vez.
			 */
			llego_con_token_de_transferencia: false,
		}
	},
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
				/**
				 * 🔴 Una ventana de app instalada que ya fue bloqueada por llegar redirigida (el caso
				 * B3, más abajo) SIGUE bloqueada después de un F5. El token se saca de la barra, y sin
				 * este recuerdo la recarga mostraba el login adentro de la app vieja: se podía seguir
				 * usando. El recuerdo es por VENTANA (`sessionStorage`): al cerrarla y volver a abrir la
				 * app se arranca de cero, en su dirección de instalación, donde los tres bloqueos
				 * vuelven a decidir. Con `forceStable` (levantar un frente a propósito) no aplica.
				 */
				if (
					es_app_instalada()
					&& ventana_esta_marcada_como_bloqueada()
					&& !params.has('forceStable')
				) {
					this.bloquear_app_instalada(window.location.origin, 'redirigida_dentro_de_la_app')
				}

				return Promise.resolve(null)
			}

			this.llego_con_token_de_transferencia = true

			/**
			 * 🔴 Llegar con un token corriendo como app instalada quiere decir que una PWA de la
			 * dirección VIEJA fue redirigida hasta acá por código anterior a esta misión (el código
			 * nuevo nunca redirige una app instalada: la bloquea). Adentro de esa app el frente
			 * nuevo es "otra aplicación", y no se quiere que se use ahí.
			 *
			 * No se consume el token: sería dejar una sesión iniciada (con su candado de sesión
			 * única tomado) en una ventana que se está bloqueando. Vence solo a los 5 minutos, y
			 * el usuario entra a mano desde el navegador, donde `create_version_session_token()`
			 * ya le liberó el candado del frente viejo.
			 *
			 * Riesgo conocido y aceptado: una PWA legítima de ESTE origen que recibiera un token
			 * (una navegación capturada desde una pestaña) también se bloquearía. Una redirección
			 * por JavaScript no es un link capturable, así que se considera improbable.
			 */
			if (es_app_instalada()) {
				/**
				 * El token se saca de la barra recién cuando el router terminó su navegación
				 * inicial, no acá. Medido en el build real: la ruta `/` redirige a `login` CONSERVANDO
				 * la query (`redirect: {name: 'login'}` hereda `?version_session_token=...`) y el
				 * router reescribe la URL cuando resuelve el componente lazy — después de este
				 * `created()`. Sacarlo antes lo dejaba de vuelta en la barra, con el token todavía
				 * vigente 5 minutos, junto a una pantalla que le pide al usuario copiar direcciones.
				 */
				var sacar_token_de_la_barra = function () {
					strip_version_session_token_from_url()
				}

				if (this.$router && typeof this.$router.onReady === 'function') {
					this.$router.onReady(sacar_token_de_la_barra, sacar_token_de_la_barra)
				} else {
					sacar_token_de_la_barra()
				}

				// Se recuerda en esta ventana: el F5 ya no trae el token (ver más arriba).
				marcar_ventana_como_bloqueada()

				this.bloquear_app_instalada(window.location.origin, 'redirigida_dentro_de_la_app')

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

			// Un valor que no se puede interpretar como dirección http(s) no manda a ningún lado.
			if (!parsear_direccion_http(default_version_raw, window.location.protocol)) {
				return false
			}

			// `forceStable` es el escape para levantar la SPA de un slot sin que se autoexpulse.
			var params = new URLSearchParams(window.location.search)
			var force_stable = params.has('forceStable')

			if (force_stable) {
				return false
			}

			/**
			 * 🔴 El destino tiene que ser un frente del MISMO dominio que este (ver
			 * `comparten_dominio_padre`). `default_version` lo escribe `PUT
			 * admin-sync/update-default-version`, que hoy acepta pedidos anónimos, y de este valor
			 * sale el redirect CON un token de transferencia de sesión en la URL: quien pudiera
			 * escribirlo se llevaría un token que se canjea contra la API real por una sesión.
			 * Un destino ajeno se ignora y el usuario se queda en este frente, que funciona.
			 */
			if (!comparten_dominio_padre(default_version_raw, window.location.origin, window.location.protocol)) {
				return false
			}

			/**
			 * Se compara el SITIO (host y puerto) y no el `origin` entero. Con `origin`, un
			 * `default_version` guardado con `http://` no coincide nunca con la página servida
			 * por `https://`: se redirige, el servidor devuelve a https, y se vuelve a redirigir
			 * — un bucle (hallazgo 10 del informe del 10/9/2026; ya pasó con `http://` en las
			 * `client_apis` de Golonorte). Ver `mismo_sitio()`.
			 */
			return !mismo_sitio(
				default_version_raw,
				window.location.origin,
				window.location.protocol
			)
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
			var self = this

			/**
			 * 🔴 Una app instalada (PWA) NO se redirige: es POR ORIGEN y el frente nuevo es "otra
			 * aplicación" para el sistema operativo, así que redirigirla adentro da error. Se le
			 * cierra la sesión de este frente (libera el candado de sesión única) y se la
			 * bloquea con la dirección a la que tiene que entrar desde el navegador. No se genera
			 * token: no hay a dónde transferirlo.
			 */
			if (es_app_instalada()) {
				var destino_bloqueo = parsear_direccion_http(
					this.default_version_configurada(),
					window.location.protocol
				)

				this.bloquear_app_instalada_y_cerrar_sesion(
					destino_bloqueo ? destino_bloqueo.origin : window.location.origin
				)

				return
			}

			var redirect_href = resolve_default_version_href(
				this.default_version_configurada()
			)

			this.mostrar_overlay_de_transferencia()

			/**
			 * Token de un solo uso: la API origen (donde ya hay login) lo guarda en BD compartida;
			 * la API destino lo consume al cargar el SPA correcto.
			 */
			axios
				.post('/version-session-token', null, config_de_pedido_de_transferencia())
				.then(function (res) {
					var plain_token = res.data && res.data.token
					if (!plain_token) {
						self.mostrar_overlay_de_transferencia()
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
						.post('/logout', null, config_de_pedido_de_transferencia())
						.catch(function () {
							/* ignorar: igualmente se redirige */
						})
						.finally(function () {
							self.mostrar_overlay_de_transferencia()
							redirigir_a(target_href)
						})
				})
				.catch(function () {
					/**
					 * Fallback sin token: comportamiento anterior (el usuario deberá loguearse de nuevo).
					 */
					self.mostrar_overlay_de_transferencia()

					axios
						.post('/logout', null, config_de_pedido_de_transferencia())
						.catch(function () {
							/* ignorar */
						})
						.finally(function () {
							self.mostrar_overlay_de_transferencia()
							redirigir_a(redirect_href)
						})
				})
		},

		/**
		 * Prende el overlay global con el motivo, para que la transferencia no parezca una
		 * aplicación colgada.
		 *
		 * 🔴 Y se vuelve a llamar después de cada pedido, no una sola vez al principio. Dos
		 * motivos, los dos medidos en el código:
		 *
		 * 1. Desde que el arranque se corta, durante la transferencia no queda NADA corriendo, y
		 *    `auth/me` ya apagó el overlay antes de marcar la sesión como iniciada
		 *    (`store/auth.js`: el `setLoading(false)` va antes del `setAuthenticated(true)`). Sin
		 *    esto el usuario mira una aplicación vacía, sin spinner y sin ningún indicio de que
		 *    algo está pasando. En el camino normal es un segundo y no se nota; con internet malo
		 *    son hasta 22 (10 del token + 10 del logout + 2 de la limpieza de la PWA).
		 * 2. El interceptor de `main.js` apaga el loading ante CUALQUIER error sin `response`
		 *    —y un timeout es exactamente eso—, sin mirar `skip_global_error_event`, que ahí solo
		 *    silencia el mensaje. O sea que un timeout del token nos apaga el overlay en el medio.
		 *
		 * Nadie lo apaga al final: lo apaga la navegación al otro frente.
		 *
		 * @returns {void}
		 */
		mostrar_overlay_de_transferencia() {
			this.$store.commit('auth/setLoading', true)
			this.$store.commit(
				'auth/setMessage',
				'Te estamos llevando a la versión actual de tu sistema...'
			)
		},

		/**
		 * Dispara YA la consulta "¿cuál es la dirección activa de este sistema?", sin sesión.
		 *
		 * Se llama desde `created()` de App.vue, en paralelo con `auth/me`: solo se usa si
		 * `auth/me` dice que no hay sesión, y para entonces la respuesta ya llegó. Devuelve una
		 * promesa que NUNCA rechaza (ver `consultar_version_activa`).
		 *
		 * @returns {Promise<object|null>}
		 */
		iniciar_consulta_de_version_activa() {
			/**
			 * Si el script inline de `public/index.html` ya la disparó (lo hace apenas carga,
			 * antes de que se descargue y evalúe el bundle), se toma esa promesa: la respuesta ya
			 * llegó o está por llegar. 🔴 Es lo que la hace mucho menos sensible a un celular lento:
			 * si la consulta saliera recién acá, el temporizador de su techo correría en el mismo hilo
			 * que el arranque de Vue, y un arranque de varios segundos podía hacer que el
			 * temporizador venciera aunque la respuesta ya estuviera en la red. Sin ese script
			 * (desarrollo sin `config.js`, un index.html anterior) se hace acá, como antes.
			 */
			var arranque = window.__CC_ARRANQUE__

			if (arranque && arranque.version_activa && typeof arranque.version_activa.then === 'function') {
				return arranque.version_activa
			}

			return consultar_version_activa(env('VUE_APP_API_URL'))
		},

		/**
		 * Antes de mostrar el login a alguien SIN sesión: si esta no es la dirección activa de su
		 * sistema, lo manda a la que sí lo es (o bloquea la app instalada). Misión
		 * redireccion-version-antes-del-login, 24/9/2026.
		 *
		 * Sin sesión no hay nada que transferir, así que a diferencia de
		 * `ir_a_la_version_correcta()` acá no hay token ni logout: alcanza con redirigir. Quien
		 * ya tiene sesión en este frente sigue por el camino de siempre (transferencia).
		 *
		 * 🔴 NUNCA rechaza y siempre resuelve: si algo falla, el usuario tiene que llegar al
		 * login. La decisión en sí está en `decidir_version_previa_al_login()`, que es pura y tiene
		 * la tabla completa de casos.
		 *
		 * @param {Promise<object|null>} consulta Lo que devolvió `iniciar_consulta_de_version_activa`.
		 * @returns {Promise<boolean>} `true` si se puede mostrar el login; `false` si ya se
		 *          redirigió o se bloqueó y NO hay que navegar al login.
		 */
		resolver_version_antes_del_login(consulta) {
			var self = this

			/**
			 * Mientras se espera la respuesta el login no se puede tocar: overlay neutro (sin
			 * mensaje, igual que el de `auth/me`). Casi siempre la consulta ya llegó y esto se
			 * prende y se apaga en el mismo turno, sin que el navegador llegue a pintarlo; solo se
			 * ve si la API tarda más que `auth/me`, y ahí evita que alguien empiece a escribir el
			 * documento en un formulario que está por reemplazarse.
			 */
			this.$store.commit('auth/setLoading', true)
			this.$store.commit('auth/setMessage', '')

			return Promise.resolve(consulta)
				.then(function (info) {
					var decision = decidir_version_previa_al_login({
						default_version: info && info.default_version ? info.default_version : null,
						ubicacion: window.location,
						es_app_instalada: es_app_instalada(),
						vino_por_redireccion: llego_por_redireccion() || self.llego_con_token_de_transferencia,
					})

					if (decision.accion === 'redirigir') {
						// Mismo overlay y misma salida que el cambio de versión posterior al login:
						// `redirigir_a` limpia el service worker y las cachés de este origen viejo.
						self.mostrar_overlay_de_transferencia()
						redirigir_a(decision.destino)

						return false
					}

					if (decision.accion === 'bloquear') {
						// Apaga el overlay de carga: la pantalla de bloqueo tiene que quedar sola.
						self.bloquear_app_instalada(decision.direccion, 'sin_sesion')

						return false
					}

					self.$store.commit('auth/setLoading', false)

					return true
				})
				.catch(function () {
					self.$store.commit('auth/setLoading', false)

					return true
				})
		},

		/**
		 * Prende la pantalla de bloqueo de la app instalada (PWA) con la dirección a la que hay
		 * que entrar desde el navegador. Apaga el overlay de carga: tiene que quedar sola.
		 *
		 * @param {string} direccion Dirección a mostrar (origen).
		 * @param {string} motivo Por qué se bloqueó (`sin_sesion`, `con_sesion`,
		 *        `redirigida_dentro_de_la_app`); hoy solo sirve para diagnosticar.
		 * @returns {void}
		 */
		bloquear_app_instalada(direccion, motivo) {
			this.$store.commit('auth/setLoading', false)
			this.$store.commit('auth/setMessage', '')
			this.$store.commit('auth/setVersionBloqueada', {
				direccion: direccion,
				motivo: motivo,
			})
		},

		/**
		 * Igual que `bloquear_app_instalada`, para quien YA tiene sesión en este frente viejo:
		 * además cierra esa sesión, para liberar el candado de sesión única y no dejar una
		 * sesión viva adentro de una app que ya no se puede usar.
		 *
		 * Primero se prende el bloqueo y después se cierra la sesión, en ese orden: el watch de
		 * `authenticated` de App.vue, al ver `false`, mira si hay bloqueo antes de mandar al
		 * login. El logout va con techo de tiempo y sin avisos (mismo config que la
		 * transferencia): si falla, el bloqueo queda igual.
		 *
		 * @param {string} direccion Dirección a mostrar (origen).
		 * @returns {void}
		 */
		bloquear_app_instalada_y_cerrar_sesion(direccion) {
			var self = this

			this.bloquear_app_instalada(direccion, 'con_sesion')

			axios
				.post('/logout', null, config_de_pedido_de_transferencia())
				.catch(function () {
					/* ignorar: el bloqueo ya está puesto */
				})
				.finally(function () {
					self.$store.commit('auth/setAuthenticated', false)
					self.$store.commit('auth/setUser', null)
				})
		},
	},
}
