import axios from 'axios'

axios.defaults.withCredentials = true

/**
 * Estado de la demo del lead (misión 51).
 *
 * 🔴 La razón de ser de este store es que un cliente real no pague NADA por la demo.
 *
 * `es_demo` arranca en false y **solo lo pone en true `DemoIngreso.vue`**, que es la única
 * puerta de entrada a una sesión de demo. Mientras siga en false, `App.vue` no monta el panel
 * (`v-if`, no `v-show`: el componente no se crea) y nadie llama a `GET /api/demo/plan`. O sea
 * que el arranque de un cliente real agrega **cero** llamadas y cero componentes.
 *
 * Consecuencia asumida y declarada: el marcador vive en memoria, así que si el lead RECARGA la
 * página el panel no vuelve. No se usa `localStorage` —está prohibido en este repo— ni
 * `sessionStorage`, que tendría el mismo problema de ser un estado que sobrevive al logout.
 * La alternativa era preguntarle al backend en cada arranque si corresponde, y eso es
 * exactamente la llamada de más que la misión prohíbe. Está en el INFORME.
 */
export default {
	namespaced: true,
	state: {
		/** Solo lo pone en true el ingreso por token. Es el interruptor de todo el panel. */
		es_demo: false,
		/** Secciones del plan tal como las devuelve GET /api/demo/plan. */
		secciones: [],
		/** Mientras se pide el plan. El panel no se dibuja hasta que hay secciones. */
		cargando: false,
		/**
		 * Ids de los clips cuyo video llegó al final. Se siembra desde el `visto` que devuelve
		 * el plan —o sea desde los eventos ya persistidos— y después se le suman los de esta
		 * sesión. Por eso sobrevive al F5 (misión 52).
		 */
		clips_vistos: [],
		/** Texto de las notas, restaurado del último `nota.escrita` (misión 52). */
		notas: '',
	},
	getters: {
		/**
		 * ¿Esta sesión es una demo?
		 *
		 * Dos fuentes, y la segunda es la que hace que el panel sobreviva al F5 (misión 52):
		 *
		 * 1. `es_demo` en memoria, que prende `DemoIngreso.vue` al canjear el token. Cubre el
		 *    primer montaje, cuando `auth/me` todavía no volvió.
		 * 2. `user.es_sesion_demo`, que viaja en la respuesta de `GET /api/user` — la llamada
		 *    que el arranque **ya paga** para todos los usuarios. Después de recargar, la
		 *    memoria está vacía pero la cookie de sesión sigue, así que esta es la que manda.
		 *
		 * Para un cliente real las dos dan false, así que el panel no se monta y no se pide
		 * ningún plan: cero requests y cero queries agregadas al arranque.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @param {Object} rootState
		 * @returns {Boolean}
		 */
		activa(state, getters, rootState) {
			if (state.es_demo) {
				return true
			}

			const user = rootState.auth ? rootState.auth.user : null

			return Boolean(user && user.es_sesion_demo)
		},
		/**
		 * @param {Object} state
		 * @param {Object} getters
		 * @returns {Boolean} Si hay algo que mostrar en el panel.
		 */
		hay_plan(state, getters) {
			return getters.activa && state.secciones.length > 0
		},
	},
	mutations: {
		setEsDemo(state, valor) {
			state.es_demo = Boolean(valor)
		},
		setSecciones(state, secciones) {
			state.secciones = Array.isArray(secciones) ? secciones : []
		},
		setCargando(state, valor) {
			state.cargando = Boolean(valor)
		},
		/**
		 * Marca un clip como visto. Idempotente: el video puede llegar al final más de una vez.
		 */
		agregarClipVisto(state, clip_id) {
			if (clip_id && state.clips_vistos.indexOf(clip_id) === -1) {
				state.clips_vistos.push(clip_id)
			}
		},
		setNotas(state, texto) {
			state.notas = typeof texto === 'string' ? texto : ''
		},
	},
	actions: {
		/**
		 * Pide el plan de la demo. Se llama UNA vez, desde el panel, y solo cuando
		 * `es_demo` ya es true.
		 *
		 * Un 204 (instancia sin canal, o demo sin plan) deja las secciones vacías y el panel
		 * no se muestra: es un caso previsto, no un error.
		 *
		 * @param {Object} context
		 * @returns {Promise}
		 */
		cargar_plan({ commit, getters }) {
			if (!getters.activa) {
				return Promise.resolve()
			}

			commit('setCargando', true)

			return axios.get('/api/demo/plan')
				.then(function (response) {
					// El 204 llega sin cuerpo: axios deja data en string vacío.
					if (response.status === 204 || !response.data || !response.data.secciones) {
						commit('setSecciones', [])
						return
					}
					commit('setSecciones', response.data.secciones)

					/**
					 * Estado restaurado (misión 52). Sale de los eventos que la instancia ya
					 * tenía persistidos, así que después de un F5 el lead ve marcados los clips
					 * que miró y "Probar" desbloqueado en ellos, en vez de que se le exija
					 * volver a mirarlos enteros.
					 *
					 * Se siembra por mutación, sin despachar `reportar`: montar el panel no es
					 * abrir un clip. Si restaurar emitiera eventos, el registro del admin se
					 * llenaría de aperturas fantasma cada vez que el lead recarga.
					 */
					response.data.secciones.forEach(function (seccion) {
						(seccion.clips || []).forEach(function (clip) {
							if (clip.visto) {
								commit('agregarClipVisto', clip.id)
							}
						})
					})

					commit('setNotas', response.data.notas || '')
				})
				.catch(function (error) {
					// Que no haya plan no puede romperle la demo al lead: entra igual, sin panel.
					console.warn('No se pudo cargar el plan de la demo', error)
					commit('setSecciones', [])
				})
				.then(function () {
					commit('setCargando', false)
				})
		},
		/**
		 * Reporta un evento de UX al bus de la misión 50.
		 *
		 * 🔴 Nunca rechaza: un error al reportar no puede frenar la experiencia. El registro
		 * es la métrica, la demo es el producto. Del lado del servidor los eventos ya se
		 * persisten y se reintentan solos.
		 *
		 * @param {Object} context
		 * @param {Object} payload {nombre, clip_id, datos}
		 * @returns {Promise}
		 */
		reportar({ getters }, payload) {
			if (!getters.activa) {
				return Promise.resolve()
			}

			return axios.post('/api/demo/evento', {
				nombre: payload.nombre,
				clip_id: payload.clip_id || null,
				datos: payload.datos || {},
			})
				.catch(function (error) {
					console.warn('No se pudo reportar el evento de la demo: ' + payload.nombre, error)
				})
		},
	},
}
