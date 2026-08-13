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
		/** Ids de los clips cuyo video llegó al final en esta sesión. */
		clips_vistos: [],
	},
	getters: {
		/**
		 * @param {Object} state
		 * @returns {Boolean} Si hay algo que mostrar en el panel.
		 */
		hay_plan(state) {
			return state.es_demo && state.secciones.length > 0
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
		cargar_plan({ commit, state }) {
			if (!state.es_demo) {
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
		reportar({ state }, payload) {
			if (!state.es_demo) {
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
