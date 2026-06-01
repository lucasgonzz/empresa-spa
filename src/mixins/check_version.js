import axios from 'axios'

/**
 * Alinea axios con la misma configuración que el store de auth (cookies / API base).
 */
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

/**
 * Nombre del query param que transporta el token de sesión entre versiones.
 */
var VERSION_SESSION_TOKEN_PARAM = 'version_session_token'

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
		 * Si el usuario autenticado está en un host distinto al `default_version`, genera un token
		 * de transferencia, cierra sesión en el host actual y redirige al default con el token para
		 * que la API destino ya deje la sesión iniciada.
		 */
		check_version() {
			var default_version_raw = this.owner.default_version

			if (this.user.default_version) {
				default_version_raw = this.user.default_version
			}

			if (!default_version_raw) {
				return
			}

			var default_origin = normalize_app_origin(default_version_raw)
			var current_host = window.location.origin

			var params = new URLSearchParams(window.location.search)
			var force_stable = params.has('forceStable')

			if (force_stable || !default_origin || current_host === default_origin) {
				return
			}

			var redirect_href = resolve_default_version_href(default_version_raw)

			/**
			 * Token de un solo uso: la API origen (donde ya hay login) lo guarda en BD compartida;
			 * la API destino lo consume al cargar el SPA correcto.
			 */
			axios
				.post('/version-session-token')
				.then(function (res) {
					var plain_token = res.data && res.data.token
					if (!plain_token) {
						window.location.href = redirect_href
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
						.post('/logout')
						.catch(function () {
							/* ignorar: igualmente se redirige */
						})
						.finally(function () {
							window.location.href = target_href
						})
				})
				.catch(function () {
					/**
					 * Fallback sin token: comportamiento anterior (el usuario deberá loguearse de nuevo).
					 */
					axios
						.post('/logout')
						.catch(function () {
							/* ignorar */
						})
						.finally(function () {
							window.location.href = redirect_href
						})
				})
		},
	},
}
