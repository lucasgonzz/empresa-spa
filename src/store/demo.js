import axios from 'axios'

axios.defaults.withCredentials = true

/**
 * Promesa en vuelo (o ya resuelta) del pedido del plan.
 *
 * 🔴 Vive en el módulo y NO en el state a propósito: no es un dato reactivo, es el enganche que
 * hace que el ingreso y el panel compartan UNA sola llamada. `DemoIngreso.vue` despacha
 * `cargar_plan` para poder esperarlo antes de soltar la pantalla del sistema, y el panel lo
 * vuelve a despachar cuando se monta, unos milisegundos después. Sin este enganche serían dos
 * `GET /api/demo/plan` por ingreso.
 *
 * Por qué no va en el `state`: el state de Vuex es el modelo que la vista dibuja y que las
 * devtools muestran como un snapshot de datos. Una promesa no es un dato, no la renderiza nadie
 * y en el inspector figura como un objeto opaco al lado de `secciones` y `notas`, que sí lo son.
 *
 * (Antes acá decía que Vuex "envolvería la promesa en un observable al pedo". Eso es falso y se
 * corrige para que nadie lo repita: el `observe()` de Vue 2 sólo camina arrays y plain objects
 * —`Object.prototype.toString.call()` tiene que dar `[object Object]`—, y una promesa da
 * `[object Promise]`, así que se saltea. Guardarla en el state no costaría reactividad: costaría
 * ensuciar el modelo.)
 *
 * Se vacía sola en cada carga de la página, que es exactamente la vida útil que necesita.
 */
let promesa_plan = null

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
 * Hay DOS getters y no son intercambiables:
 *
 * - `activa` mira dos fuentes: el marcador `es_demo` que prende `DemoIngreso.vue` al canjear el
 *   token, y `user.es_sesion_demo`, que viaja en la respuesta de `GET /api/user` — la llamada que
 *   el arranque **ya paga** para todos los usuarios. Es el que gatea el plan y los eventos.
 * - `panel_visible` mira solo `es_demo`, y es el que decide si el panel se dibuja.
 *
 * Mientras los dos den false, `App.vue` no monta el panel (`v-if`, no `v-show`: el componente no
 * se crea) y nadie llama a `GET /api/demo/plan`. El arranque de un cliente real agrega **cero**
 * llamadas y cero queries.
 *
 * La segunda fuente de `activa` es la que sobrevive al F5 (misión 52): después de recargar la
 * memoria está vacía pero la cookie de sesión sigue. No se usa `localStorage` —está prohibido en
 * este repo— ni `sessionStorage`.
 *
 * 🔴 Lo que la misión 52 hacía sobrevivir al F5 era el PANEL, y eso se revirtió el 25/8/2026 por
 * pedido de Lucas: el panel sale solo si se entró con el token en la URL. Lo que sí sigue
 * sobreviviendo a la recarga es la sesión de demo para el plan y los eventos, que es de lo que se
 * ocupa `activa`. Ver el docblock de `panel_visible`.
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
		 * El pedido del plan ya terminó, haya traído secciones o no.
		 *
		 * Lo mira el panel para separar "todavía no cargó" de "cargó y vino vacío", que es la
		 * diferencia entre mostrar el esqueleto y mostrar el mensaje de que no hay recorrido.
		 * Con `cargando` solo no alcanza: también es false ANTES de pedir nada.
		 */
		plan_cargado: false,
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
		/**
		 * ¿Se muestra el panel de tutoriales?
		 *
		 * Mira UNA sola fuente —`es_demo`, el marcador en memoria que prende `DemoIngreso.vue`
		 * al canjear el token—, y por eso no es lo mismo que `activa`.
		 *
		 * 🔴 La diferencia entre los dos getters es el pedido de Lucas del 25/8/2026, y no una
		 * duplicación: **el panel sale solo si se entró con el token en la URL, en esta carga de
		 * la página**. La sesión de la demo dura ~2 h en la cookie, así que volver a abrir la
		 * demo sin el `?t=` dejaba al lead adentro y con el panel a la vista. Ahora entra igual
		 * —la sesión que ya tiene se respeta, nadie lo desloguea— pero sin el panel.
		 *
		 * 🔴 Y por eso `activa` NO se tocó, aunque tenga toda la pinta de sobrar: sigue gateando
		 * `cargar_plan` y `reportar`, o sea los eventos que alimentan el recorrido del lead en el
		 * admin. Si el panel y los eventos colgaran del mismo getter, una recarga de página
		 * apagaría también la telemetría, que es información que Lucas mira después de la demo.
		 *
		 * Consecuencia asumida: si el lead recarga la página estando adentro de la demo, pierde
		 * el panel hasta que vuelva a abrir el link con el token. Es exactamente el
		 * comportamiento pedido — la contracara de la misión 52, que había hecho justo lo
		 * contrario (que el panel sobreviviera al F5).
		 *
		 * @param {Object} state
		 * @returns {Boolean}
		 */
		panel_visible(state) {
			return Boolean(state.es_demo)
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
		setPlanCargado(state, valor) {
			state.plan_cargado = Boolean(valor)
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
		 * Pide el plan de la demo. Se llama UNA vez por carga de página, y solo cuando
		 * `es_demo` ya es true.
		 *
		 * Un 204 (instancia sin canal, o demo sin plan) deja las secciones vacías y el panel
		 * no se muestra: es un caso previsto, no un error.
		 *
		 * 🔴 Devuelve SIEMPRE la misma promesa (`promesa_plan`). Desde el 17/8/2026 hay dos
		 * lugares que lo despachan —el ingreso, que lo espera antes de mostrar el sistema, y el
		 * panel al montarse— y sin la memoria serían dos GET idénticos con dos milisegundos de
		 * diferencia. Reintentar no tiene sentido acá: esta acción nunca rechaza, así que un
		 * segundo despacho no arreglaría nada que el primero no haya resuelto ya.
		 *
		 * @param {Object} context
		 * @returns {Promise}
		 */
		cargar_plan({ commit, getters, state }) {
			if (!getters.activa) {
				return Promise.resolve()
			}

			if (promesa_plan) {
				return promesa_plan
			}

			commit('setCargando', true)

			promesa_plan = axios.get('/api/demo/plan')
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
					// Se prende también cuando el plan vino vacío o falló: el ingreso pregunta
					// "¿terminó?", no "¿salió bien?". Una demo sin panel se entra igual.
					commit('setPlanCargado', true)
				})

			return promesa_plan
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
