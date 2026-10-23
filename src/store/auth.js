import axios from 'axios'
import { env } from '@/runtime_config'
import { set_canales_en_vivo } from '@/utils/canales_en_vivo'
import { leer_sesion, es_falta_de_conexion } from '@/offline/sesion_sin_conexion'
import Vue from 'vue'
axios.defaults.withCredentials = true

/**
 * Muestra un toast desde el store (que no tiene `this.$toast`), con el mismo plugin que registra
 * main.js en `Vue.$toast`. Si el plugin todavía no está, no hace nada.
 *
 * @param {string} tipo 'success' | 'warning' | 'error' | 'info'
 * @param {string} mensaje
 * @returns {void}
 */
function mostrar_aviso(tipo, mensaje) {
	if (Vue.$toast && typeof Vue.$toast.open === 'function') {
		Vue.$toast.open({ message: mensaje, type: tipo, duration: 10000 })
	}
}
axios.defaults.baseURL = env('VUE_APP_API_URL')
// axios.defaults.baseURL = 'https://micovid.online'
// axios.defaults.baseURL = 'http://localhost:8000'
export default {
	namespaced: true,
	state: {
		authenticated: null,
		permissions: [],
		user: null,
		selected_address: null,
		schedule_edit: {},
		loading: false,
		message: '',
		online: true,

		/**
		 * Promesa de la cadena de arranque post-login (App.vue, watch de `authenticated`), o
		 * `null` cuando no hay ninguna en curso. Mision 11/9/2026 (arranque secuencial): los
		 * widgets de Reportes la usan para saber si tienen que esperar su turno (llegaron como
		 * pantalla de aterrizaje de un login) o disparar su fetch ya mismo (navegacion normal
		 * durante el dia). No es un flag boolean porque lo que hace falta no es solo saber SI
		 * hay arranque en curso, sino poder engancharse (`.then()`) a CUANDO termina.
		 */
		arranque_en_curso: null,

		/**
		 * Candado de sesión por pestaña (misión candado-sesion-por-pestana, 19/9/2026): `true`
		 * cuando `GET /api/user` respondió 403 con `misma_sesion_otra_pestana` -esta cuenta ya
		 * está abierta en otra pestaña de este MISMO navegador, y el owner activó el modo
		 * estricto-. Lo mira `MismaSesionOtraPestanaModal.vue` (siempre montado en App.vue,
		 * mismo patrón que `SesionCerradaOtroDispositivoModal.vue`) para mostrarse solo.
		 */
		misma_sesion_otra_pestana: false,

		/**
		 * Bloqueo de una app instalada (PWA) que quedó en una dirección vieja (misión
		 * redireccion-version-antes-del-login, 24/9/2026). `null` mientras no haya ninguno;
		 * cuando lo hay es `{direccion, motivo}` -la dirección a la que hay que entrar por el
		 * navegador y por qué se bloqueó- y lo mira `AppInstaladaVieja.vue`, montado en
		 * App.vue, que tapa toda la aplicación y no tiene botón de cerrar.
		 *
		 * Una PWA es por origen y no se puede mudar: redirigirla al frente nuevo da error
		 * adentro de la app instalada, así que en vez de redirigir se bloquea. Ver
		 * `src/utils/version_de_direccion.js` y `src/mixins/check_version.js`.
		 */
		version_bloqueada: null,

		/**
		 * Sesión restaurada desde el equipo porque se abrió el sistema sin conexión con el servidor
		 * (misión ingreso-sin-internet, 23/10/2026). `null` en una sesión normal; cuando la sesión
		 * salió de la copia del equipo es la fecha ISO en que el servidor la confirmó por última vez.
		 *
		 * Mientras está prendida: no se pide la cadena de arranque, los catálogos salen del equipo,
		 * Vender guarda las ventas sin conexión aunque `navigator.onLine` diga lo contrario, y el
		 * sistema revalida la sesión contra el servidor apenas vuelve la red. Ver
		 * `src/offline/sesion_sin_conexion.js` y el watch de `authenticated` en App.vue.
		 */
		sesion_sin_conexion: null,

		/**
		 * Cuántas ventas hechas sin conexión siguen guardadas en este equipo esperando subir al
		 * servidor. La mantiene al día el mixin offline (src/offline/index.js) y la muestra el aviso
		 * de conexión (components/common/AvisoSinConexion.vue).
		 */
		ventas_sin_subir: 0,

		/**
		 * De esas, cuántas ya rechazó el servidor (4xx). Ver `contar_ventas_del_equipo()` en
		 * src/offline/sync_sales.js.
		 */
		ventas_rechazadas: 0,
	},
	getters: {
		authenticated(state) {
			return state.authenticated
		},
		user(state) {
			return state.user
		},
	},
	mutations: {
		set_online(state, value) {
			state.online = value
		},
		/* Ver el comentario de `sesion_sin_conexion` en el state. */
		set_sesion_sin_conexion(state, value) {
			state.sesion_sin_conexion = value
		},
		/* Ver el comentario de `ventas_sin_subir` en el state. */
		set_ventas_sin_subir(state, value) {
			state.ventas_sin_subir = Number(value) || 0
		},
		/* Ver el comentario de `ventas_rechazadas` en el state. */
		set_ventas_rechazadas(state, value) {
			state.ventas_rechazadas = Number(value) || 0
		},
		/* Promesa de arranque en curso (o null). Ver el comentario de arranque_en_curso en el state. */
		set_arranque_en_curso(state, value) {
			state.arranque_en_curso = value
		},
		setAuthenticated(state, value) {
			state.authenticated = value
		},
		/**
		 * Ver el comentario de `misma_sesion_otra_pestana` en el state.
		 */
		setMismaSesionOtraPestana(state, value) {
			state.misma_sesion_otra_pestana = value
		},
		/**
		 * Ver el comentario de `version_bloqueada` en el state.
		 *
		 * @param {object} state
		 * @param {{direccion: string, motivo: string}|null} value
		 */
		setVersionBloqueada(state, value) {
			state.version_bloqueada = value
		},
		setUser(state, user) {
			/*
				`es_acceso_maestro` (misión imagenes-catalogo-completo, 27/9/2026) lo arma la API
				SOLO en el login y en GET /api/user: sale de la sesión del login maestro, no de una
				columna. Otros lugares reemplazan al usuario con el `model` que devuelve un endpoint
				que no lo sabe (la foto de perfil en Cropper.vue, deleteImage de acá abajo), y sin
				esto el flag se perdía a mitad de la sesión: el botón de "todo el catálogo" y
				Detener / Reanudar desaparecían hasta recargar.

				Por eso: si llega el MISMO usuario (mismo id) sin la clave, se conserva la que ya
				había. Si la clave viene (true o false), manda la que viene; y si es otro usuario (se
				cerró sesión y entró otro), no se arrastra nada.
			*/
			if (user && state.user && user.id === state.user.id
				&& typeof user.es_acceso_maestro === 'undefined'
				&& typeof state.user.es_acceso_maestro !== 'undefined') {
				user.es_acceso_maestro = state.user.es_acceso_maestro
			}
			/*
				Espacio de los canales en vivo (misión pusher-canales-por-sistema, 19/10/2026): se
				guarda ANTES de asignar `state.user`, porque las suscripciones de Echo arrancan con los
				watchers de `user.id` y `authenticated`, y tienen que encontrar el espacio ya cargado
				para pedir el nombre físico del canal. Vive en su propio módulo y no en `state.user`:
				los reemplazos del usuario que vienen sin la clave (la foto de perfil, las direcciones)
				no lo borran. Ver `src/utils/canales_en_vivo.js`.
			*/
			if (user && user.canales_en_vivo) {
				set_canales_en_vivo(user.canales_en_vivo)
			}
			if (user && user.owner_id) {
				user.addresses = user.owner_addresses
				window.localStorage.setItem('user_id', user.owner_id)
			} else if (user) {
				window.localStorage.setItem('user_id', user.id)
			}
			if (!user) {
				window.localStorage.clear()
				/*
					Sin usuario no hay sesión restaurada (misión ingreso-sin-internet): si se cerró
					sesión estando sin conexión, la marca no puede sobrevivir al próximo login, que
					correría el arranque sin conexión con un usuario recién confirmado por el servidor.
				*/
				state.sesion_sin_conexion = null
				state.online = typeof navigator === 'undefined' || navigator.onLine !== false
			}
			state.user = user
		},
		setSelectedAddress(state, value) {
			state.selected_address = value
		},
		/**
		 * Actualiza la preferencia de modo oscuro del usuario autenticado en el estado local.
		 *
		 * Reemplaza el objeto `user` entero con `Object.assign` en vez de mutar `dark_mode`
		 * directamente: Vue 2 no detecta reactivamente una propiedad que no existía en el objeto
		 * original (por ejemplo, si `dark_mode` todavía no llegó del backend en algún punto), y
		 * este patrón lo evita sin depender de `Vue.set` (este archivo no importa Vue).
		 */
		setDarkMode(state, value) {
			if (!state.user) {
				return
			}
			state.user = Object.assign({}, state.user, { dark_mode: value ? 1 : 0 })
		},
		/**
		 * Impresora del Ticket 2.0 de la persona autenticada.
		 *
		 * Mismo patrón que setDarkMode, y por el mismo motivo: se reemplaza el objeto
		 * entero en vez de asignar la propiedad suelta, para no depender de `Vue.set`
		 * (este archivo no importa Vue).
		 */
		setImpresora(state, value) {
			if (!state.user) {
				return
			}
			state.user = Object.assign({}, state.user, { impresora: value })
		},
		addAddress(state, value) {
			state.user.addresses.push(value)
		},
		deleteAddress(state, value) {
			let index = state.user.addresses.findIndex(address => {
				return address.id == value.id
			})
			state.user.addresses.splice(index, 1)
		},
		setUserWorkdaysId(state) {
			state.user.workdays_id = []
			state.user.workdays.forEach(workday => {
				state.user.workdays_id.push(workday.id)
			})
		},
		setLoading(state, value) {
			state.loading = value
		},
		setMessage(state, value) {
			state.message = value
		},
		setScheduleEdit(state, value) {
			state.schedule_edit = value
		},
		incrementFilterPage(state) {
			state.filter_page++
		},
		setFilterPage(state, value) {
			state.filter_page = value 
		},
		setTotalFilterPages(state, value) {
			state.total_filter_pages = value 
		},
		setTotalFilterResults(state, value) {
			state.total_filter_results = value 
		},
		addFiltered(state, value) {
			state.filtered = state.filtered.concat(value)
		},
		setLoadingFiltered(state, value) {
			state.loading_filtered = value 
		},
	},
	actions: {
		me({commit, dispatch}) {
			commit('setLoading', true)

			/*
				Sin red según el navegador: ni se intenta. Los dos pedidos fallarían igual, y
				esperarlos solo demora la entrada con la sesión guardada en el equipo.
			*/
			if (typeof navigator !== 'undefined' && navigator.onLine === false) {
				return dispatch('restaurar_sesion_sin_conexion')
			}

			// Se retorna la cadena de promesas para que quien haga `dispatch('auth/me')`
			// pueda encadenar `.then()` y saber cuándo terminó de resolverse (antes no
			// se retornaba y el dispatch se resolvía antes de terminar las llamadas HTTP reales).
			return axios.get('/sanctum/csrf-cookie')
			.then(() => {
				return axios.get('/api/user')
				.then(res => {
					commit('setLoading', false)

					console.log('auth/me::')
					console.log(res)
					console.log(typeof res.data.user)
					console.log(res.data.user)
					if (res && res.data.user) {
						console.log('authenticado')
						commit('setUser', res.data.user)
						commit('setAuthenticated', true)
					} else {
						console.log('NO autenticado')
						commit('setAuthenticated', false)
						commit('setUser', null)
					}
					// commit('setUserWorkdaysId')
				})
				.catch(err => {
					commit('setLoading', false)

					// Misión candado-sesion-por-pestana (19/9/2026): este 403 puntual NO
					// significa "no autenticado" -la cookie es válida, AuthController::get_user()
					// ya confirmó Auth::check() antes de armar la respuesta-, sino "esta cuenta
					// ya está abierta en otra pestaña de este mismo navegador y el owner activó
					// el modo estricto". Por eso NO se pisa authenticated/user acá: si el usuario
					// resuelve el candado con el botón del modal nuevo, el arranque sigue normal
					// con el usuario que devuelve forzar-pestana, sin haber pasado por un
					// setAuthenticated(false) que después haya que deshacer.
					if (err && err.response && err.response.status === 403
						&& err.response.data && err.response.data.misma_sesion_otra_pestana) {
						commit('setMismaSesionOtraPestana', true)
						return
					}

					/*
						🔴 Sin conexión con el servidor NO es "no hay sesión" (misión
						ingreso-sin-internet, 23/10/2026). Hasta acá este catch trataba igual un
						corte de red que un 401, y abrir el sistema sin internet terminaba en el
						login con `localStorage` vaciado, sin forma de entrar. Ahora: si el
						servidor no contestó (o contestó 5xx), se entra con la sesión guardada en
						el equipo, si la hay. Un 401/419 sigue siendo "no hay sesión".
					*/
					if (es_falta_de_conexion(err)) {
						return dispatch('restaurar_sesion_sin_conexion')
					}

					console.log('NO ESTA AUTH')
					commit('setAuthenticated', false)
					commit('setUser', null)
				})
			})
			.catch(err => {
				/*
					Lo que llega acá es la caída del `sanctum/csrf-cookie`, el primer pedido (el
					catch de adentro atrapa todo lo de `api/user`). Antes no tenía catch: la promesa
					rechazaba suelta, `authenticated` se quedaba en null para siempre y el usuario
					veía el login sin que el arranque decidiera nada.
				*/
				commit('setLoading', false)
				if (es_falta_de_conexion(err)) {
					return dispatch('restaurar_sesion_sin_conexion')
				}
				console.log('auth/me: fallo sanctum/csrf-cookie', err)
				commit('setAuthenticated', false)
				commit('setUser', null)
			})
		},
		/**
		 * Entra con la sesión guardada en este equipo, porque el servidor no está al alcance.
		 *
		 * Con sesión guardada: deja la marca `sesion_sin_conexion` (con la fecha en que el servidor
		 * la confirmó por última vez) y `online` en false ANTES de `setAuthenticated(true)`, porque
		 * el watch de `authenticated` de App.vue decide con ellas qué arranque correr, y Vender busca
		 * los artículos en el equipo cuando `online` es false.
		 *
		 * Sin sesión guardada: lo mismo que pasaba antes con un corte de red (no hay sesión, al
		 * login), más un aviso que explica por qué no se puede entrar.
		 *
		 * @param {object} context Contexto Vuex del módulo auth.
		 * @returns {Promise<void>}
		 */
		restaurar_sesion_sin_conexion({ commit, state }) {
			/*
				`auth/me` también se despacha a mitad de una sesión ya abierta (al cambiar la
				cotización del dólar, desde algún modelo). Si justo en ese momento no hay servidor, la
				sesión que hay en memoria es la buena: no se la reemplaza por la copia del equipo ni se
				la cierra (antes, ese corte la cerraba y mandaba al login). Solo se restaura en el
				arranque, cuando todavía no se sabe si hay sesión.
			*/
			if (state.authenticated === true) {
				commit('setLoading', false)
				commit('setMessage', '')
				return Promise.resolve()
			}
			return leer_sesion()
			.then(sesion => {
				commit('setLoading', false)
				commit('setMessage', '')

				if (!sesion) {
					commit('setAuthenticated', false)
					commit('setUser', null)
					mostrar_aviso('warning', 'No hay conexión con el servidor. Para entrar sin internet, este equipo tiene que haber iniciado sesión antes con internet y con el modo sin conexión activado.')
					return
				}

				commit('set_online', false)
				commit('set_sesion_sin_conexion', sesion.guardada_at)
				commit('setUser', sesion.user)
				commit('setAuthenticated', true)
			})
		},
		/**
		 * Vuelve a preguntarle al servidor por la sesión que se restauró desde el equipo.
		 *
		 * La llama el mixin offline cuando vuelve la red (evento `online` y un reintento periódico,
		 * por si el evento no llega nunca: un equipo con wifi pero sin salida a internet tiene
		 * `navigator.onLine` en true todo el tiempo). Devuelve qué pasó, y el que llama decide:
		 *
		 * - 'valida': el servidor confirmó la sesión. Se apaga la marca, `online` vuelve a true y se
		 *   commitea el usuario fresco (el plugin de sesión lo guarda de nuevo).
		 * - 'vencida': el servidor dijo que no hay sesión (401/419, o 200 sin usuario). Se apaga la
		 *   marca y se cierra la sesión en el front: el watch de App.vue manda al login. Las ventas
		 *   sin subir siguen en el equipo y suben con el próximo inicio de sesión.
		 * - 'sin_conexion': todavía no hay servidor. No cambia nada.
		 * - 'otra_pestana': el servidor pide resolver el candado de sesión por pestaña; se muestra
		 *   el mismo aviso de siempre y se sigue sin conexión hasta el próximo reintento.
		 *
		 * Los pedidos van sin los avisos globales del interceptor: este reintento corre solo, en
		 * segundo plano, y no tiene que tirar un toast de "No pudimos conectarnos" cada 30 segundos.
		 *
		 * @param {object} context Contexto Vuex del módulo auth.
		 * @returns {Promise<string>} 'valida' | 'vencida' | 'sin_conexion' | 'otra_pestana'
		 */
		revalidar_sesion({ commit }) {
			/** Opciones de axios que apagan los avisos globales del interceptor (main.js). */
			let sin_avisos = {
				skip_global_error_event: true,
				skip_global_validation_toast: true,
				// Corre en segundo plano: un cambio de pantalla no lo tiene que cancelar (main.js).
				skip_navigation_cancel: true,
			}
			return axios.get('/sanctum/csrf-cookie', sin_avisos)
			.then(() => axios.get('/api/user', sin_avisos))
			.then(res => {
				if (res && res.data && res.data.user) {
					commit('set_sesion_sin_conexion', null)
					commit('set_online', true)
					commit('setUser', res.data.user)
					commit('setAuthenticated', true)
					return 'valida'
				}
				commit('set_sesion_sin_conexion', null)
				commit('set_online', navigator.onLine !== false)
				commit('setAuthenticated', false)
				commit('setUser', null)
				return 'vencida'
			})
			.catch(err => {
				if (es_falta_de_conexion(err)) {
					return 'sin_conexion'
				}
				if (err && err.response && err.response.status === 403
					&& err.response.data && err.response.data.misma_sesion_otra_pestana) {
					commit('setMismaSesionOtraPestana', true)
					return 'otra_pestana'
				}
				/*
					Cualquier otro 4xx (401/419 de sesión vencida, un 403 de cuenta bloqueada): el
					servidor contestó y dijo que no. Si se lo tomara como "sin conexión", la sesión
					restaurada no saldría nunca de ese modo: las ventas no subirían y el aviso diría
					"Sin conexión" con internet andando. Se cierra la sesión y el login cuenta lo que
					pase; las ventas del equipo suben con el próximo inicio de sesión.
				*/
				if (err && err.response && err.response.status >= 400 && err.response.status < 500) {
					commit('set_sesion_sin_conexion', null)
					commit('set_online', navigator.onLine !== false)
					commit('setAuthenticated', false)
					commit('setUser', null)
					return 'vencida'
				}
				/*
					Un error que no es de axios: no se decide nada con eso. Se sigue sin conexión y se
					vuelve a preguntar en el próximo intento. (Un 5xx ya salió arriba como "sin
					conexión": con el servidor caído, trabajar sin conexión es justamente lo correcto.)
				*/
				console.log('revalidar_sesion: respuesta no esperada', err)
				return 'sin_conexion'
			})
		},
		/**
		 * Cierra sesión en el backend y limpia el estado local aunque falle el POST.
		 *
		 * @param {object} context Contexto Vuex del módulo auth.
		 * @returns {Promise<void>}
		 */
		logout({ commit }) {
			commit('setLoading', true)
			return axios.get('/sanctum/csrf-cookie')
				.then(() => {
					return axios.post('/logout')
				})
				.then(() => {
					commit('setLoading', false)
					commit('setAuthenticated', false)
					commit('setUser', null)
				})
				.catch(err => {
					console.log(err)
					commit('setLoading', false)
					commit('setAuthenticated', false)
					commit('setUser', null)
				})
		},
		/**
		 * Refresca `auth.user` (y `owner` vía respuesta de API) sin overlay global de carga.
		 * Se usa tras broadcast cuando otro usuario del mismo comercio guardó su perfil/config.
		 */
		refresh_user_from_api_silent({ commit }) {
			return axios.get('/api/user')
				.then(res => {
					if (res && res.data.user) {
						commit('setUser', res.data.user)
					}
				})
				.catch(err => {
					console.log(err)
				})
		},
		/**
		 * Guarda la preferencia de modo oscuro en el backend y confirma contra lo que responde
		 * (no contra lo que se mandó). Sin `.catch`: lo maneja quien llama, que es el que tiene
		 * que revertir la perilla si la llamada falla.
		 *
		 * @param {object} context Contexto Vuex del módulo auth.
		 * @param {boolean} value Nuevo valor a guardar.
		 * @returns {Promise<number>} El valor persistido (0 o 1) según respondió el backend.
		 */
		set_dark_mode({ commit }, value) {
			return axios.put('/api/user/set-dark-mode/' + (value ? 1 : 0))
			.then(res => {
				commit('setDarkMode', res.data.dark_mode)
				return res.data.dark_mode
			})
		},
		/**
		 * Guarda la impresora del Ticket 2.0 de la persona autenticada.
		 *
		 * @param {object} context Contexto Vuex del módulo auth.
		 * @param {string} value Nombre de la impresora elegida.
		 * @returns {Promise<string>} El nombre persistido según respondió el backend.
		 */
		set_impresora({ commit }, value) {
			return axios.put('/api/user/set-impresora', { impresora: value })
			.then(res => {
				commit('setImpresora', res.data.impresora)
				return res.data.impresora
			})
		},
		deleteImage({ commit, state }) {
			// return axios.delete(`/api/delete-current-image/user/${state.user.id}`)
			return axios.delete(`/api/delete-image-prop/user/${state.user.id}/image_url`)
			.then((res) => {
				commit('setUser', res.data.model)
			})
			.catch((err) => {
				console.log(err)
				return Promise.reject(err)
			})
		},
	},
	modules: {
	}
}
