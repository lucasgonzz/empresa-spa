import axios from 'axios'

axios.defaults.withCredentials = true

/**
 * Ids de las secciones cuyos clips de núcleo ya están todos vistos.
 *
 * Se calcula al restaurar para sembrar `secciones_reportadas`: una sección que ya estaba
 * completa antes del F5 no puede volver a reportar `seccion.completada`.
 *
 * @param {Array} secciones
 * @returns {Array}
 */
function secciones_completas(secciones) {
	if (!Array.isArray(secciones)) {
		return []
	}

	return secciones.filter(function (seccion) {
		const nucleo = (seccion.clips || []).filter(function (clip) {
			return clip.tipo !== 'biblioteca'
		})

		return nucleo.length > 0 && nucleo.every(function (clip) {
			return Boolean(clip.visto)
		})
	}).map(function (seccion) {
		return seccion.id
	})
}

/**
 * Estado de la demo del lead (misión 51).
 *
 * 🔴 La razón de ser de este store es que un cliente real no pague NADA por la demo.
 *
 * El panel se monta si el getter `activa` da true, y ese getter mira dos fuentes: el marcador
 * `es_demo` que prende `DemoIngreso.vue` al canjear el token, y `user.es_sesion_demo`, que viaja
 * en la respuesta de `GET /api/user` — la llamada que el arranque **ya paga** para todos los
 * usuarios. Mientras las dos den false, `App.vue` no monta el panel (`v-if`, no `v-show`: el
 * componente no se crea) y nadie llama a `GET /api/demo/plan`. El arranque de un cliente real
 * agrega **cero** llamadas y cero queries.
 *
 * La segunda fuente es la que hace que el panel sobreviva al F5 (misión 52): después de recargar
 * la memoria está vacía pero la cookie de sesión sigue. No se usa `localStorage` —está prohibido
 * en este repo— ni `sessionStorage`. La misión 51 había resuelto esto sólo con memoria y declaró
 * la limitación; la 52 la corrigió sin pagar una llamada nueva.
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
		/**
		 * Secciones que ya reportaron `seccion.completada`. Vive acá y no en el componente
		 * porque tiene que sobrevivir al F5 igual que `clips_vistos`: si sólo sobreviviera uno
		 * de los dos, el evento se re-emitiría en cada recarga (misión 52).
		 */
		secciones_reportadas: [],
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
		setSeccionesReportadas(state, ids) {
			state.secciones_reportadas = Array.isArray(ids) ? ids : []
		},
		agregarSeccionReportada(state, seccion_id) {
			if (seccion_id && state.secciones_reportadas.indexOf(seccion_id) === -1) {
				state.secciones_reportadas.push(seccion_id)
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
		cargar_plan({ commit, getters, state }) {
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

					/**
					 * 🔴 Las notas se siembran SOLO si el lead todavía no escribió nada.
					 *
					 * El textarea está usable desde el primer frame, y este plan vuelve unos
					 * cientos de milisegundos después. Si el lead ya empezó a tipear, sembrar
					 * le pisa el store con el texto viejo —el DOM no, porque Vue no toca un
					 * campo con foco— y el debounce que ya estaba armado termina reportando un
					 * `nota.escrita` con contenido que el lead nunca escribió, mientras lo que
					 * sí escribió se pierde. Por eso la siembra cede ante lo que haya en curso.
					 */
					if (state.notas === '') {
						commit('setNotas', response.data.notas || '')
					}

					/**
					 * Secciones que ya estaban completas antes de recargar. Sin esto,
					 * `seccion.completada` se re-emitía después de cada F5: `clips_vistos` sí
					 * sobrevivía a la recarga y el registro de "ya lo reporté" no, así que el
					 * estado que DISPARA el evento volvía y el que lo FRENA no.
					 */
					commit('setSeccionesReportadas', secciones_completas(response.data.secciones))
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
