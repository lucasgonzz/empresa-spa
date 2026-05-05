import axios from 'axios'

/**
 * Alinea axios con la misma configuración que el store de auth (cookies / API base).
 */
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

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

export default {
	methods: {
		/**
		 * Si el usuario autenticado está en un host distinto al `default_version`, cierra sesión
		 * en el host actual y redirige al default. Así no queda sesión “colgada” en la versión vieja
		 * sin poder usar el menú para cerrar sesión (la UI se redirige antes de montarse).
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
			 * Logout directo vía HTTP: no usar `auth/logout` del store porque pondría
			 * `authenticated` en false y el watch de `App.vue` navegaría a `home` antes
			 * de salir del dominio viejo.
			 */
			axios
				.post('/logout')
				.catch(function () {
					/* ignorar: igualmente se fuerza salida redirigiendo */
				})
				.finally(function () {
					window.location.href = redirect_href
				})
		},
	},
}
