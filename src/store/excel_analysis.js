import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

/*
 * Guardadores de borrador de los modales de importación abiertos: { guardar(), cortar() }. Son
 * funciones y viven fuera del estado de Vuex a propósito (no se serializan ni se observan).
 * `guardar` devuelve una promesa que se resuelve cuando lo editado quedó mandado al servidor;
 * `cortar` apaga timers y reintentos. Los usa el cierre de sesión (ver auth/logout).
 */
let guardadores = []

/*
 * Asegura que el estado sea de `identidad`. Si era de otro usuario se limpia todo; si todavía no
 * tenía dueño (primera carga de la sesión) sólo se lo asigna, sin tirar lo que ya se cargó.
 */
function asegurar_identidad(commit, state, identidad) {
	if (!state || state.identidad === identidad) {
		return
	}
	commit(state.identidad === null ? 'set_identidad' : 'reiniciar', identidad)
}

/* Cuánto espera el cierre de sesión a que se guarde un borrador antes de seguir igual. */
const ESPERA_MAXIMA_DEL_GUARDADO = 4000

/*
 * Identidad de quien está logueado: owner y usuario. Dos usuarios del mismo comercio no comparten
 * pendientes (la API las aísla por auth_user), así que el id del usuario cuenta tanto como el owner.
 * Null si no hay sesión (o el store raíz no la trae).
 */
function identidad_de(root_state) {
	const usuario = root_state && root_state.auth && root_state.auth.user

	if (!usuario || usuario.id === undefined || usuario.id === null) {
		return null
	}

	return String(usuario.owner_id || '') + ':' + String(usuario.id)
}

/*
 * Estado del análisis de Excel con IA que corre en segundo plano.
 *
 * Antes este estado no existía porque no hacía falta: el análisis vivía adentro
 * del modal de importación, con el usuario esperando frente a la pantalla, y
 * cerrar el modal lo cancelaba. Desde que el usuario puede irse a trabajar a
 * otra parte mientras el análisis corre, la corrida le sobrevive al modal — y
 * necesita vivir en algún lado que le sobreviva también.
 *
 * Guarda dos cosas distintas que conviene no confundir:
 *
 *  - `corrida`: la corrida abierta del usuario (la que está procesando, o la que
 *    terminó y todavía no fue a ver). Es lo que alimenta el aviso.
 *  - `abrir_en`: una orden puntual — "abrí el modal de importación en el estado
 *    de esta corrida". La deja el modal de aviso al apretar "Ver resultado" y la
 *    consume el modal de importación; se limpia apenas se consume.
 */
export default {
	namespaced: true,
	state: {
		/*
		 * Corrida abierta del usuario, tal como la devuelve la API:
		 * { uuid, tipo, estado, progreso, paso, error, contexto }.
		 * Null cuando no hay ninguna.
		 */
		corrida: null,

		/*
		 * Orden de apertura para el modal de importación:
		 * { uuid, tipo, model, analysis_uuid }. Null cuando no hay nada pendiente
		 * de abrir. No es lo mismo que `corrida`: puede haber una corrida lista y
		 * el usuario no querer verla nunca.
		 */
		abrir_en: null,

		/*
		 * uuid de la corrida que el usuario está mirando en vivo, con el modal de
		 * importación abierto. Sirve para no dispararle un aviso de "terminó el
		 * análisis" sobre la misma pantalla que se lo acaba de mostrar. Null cuando
		 * no está mirando ninguna.
		 */
		siguiendo_uuid: null,

		/*
		 * uuids de las revisiones de nombres parecidos (clientes y proveedores) que el usuario
		 * salteó con "Seguir sin revisar los nombres" (misión importacion-relaciones-parecidas). La
		 * corrida sigue en el servidor y, al terminar, el aviso por broadcast llega igual: con esta
		 * lista ExcelAnalysisReadyModal sabe que no tiene que abrirse, porque el usuario ya siguió
		 * (y probablemente ya importó). Vive en memoria y alcanza: si la SPA se recarga, la corrida
		 * ya está marcada vista y no se vuelve a ofrecer.
		 */
		salteados: [],

		/*
		 * Importaciones que el usuario dejó a medias y puede retomar, por módulo (article, client,
		 * provider). Es lo que muestra el modal arriba del paso 1. Cada ítem es el de
		 * GET /ai-excel-import/pendientes: { uuid, model, original_filename, estado, progreso, paso,
		 * recomendacion_uuid, creada_en, actualizada_en }. Se recarga cada vez que se abre el modal;
		 * la fuente de verdad es el servidor.
		 */
		pendientes: { article: [], client: [], provider: [] },

		/*
		 * De quién son `pendientes` (ver identidad_de) y época del estado: cada limpieza la sube. Una
		 * respuesta que salió en otra época o con otra identidad es de un usuario anterior y se tira.
		 */
		identidad: null,
		epoca: 0,
	},
	getters: {
		/*
		 * True si hay una corrida todavía trabajando. Lo usa el modal de
		 * importación para no dejar arrancar dos análisis a la vez del mismo
		 * usuario, que competirían por el mismo worker.
		 */
		hay_corrida_en_curso(state) {
			if (!state.corrida) {
				return false
			}
			return state.corrida.estado === 'pendiente' || state.corrida.estado === 'procesando'
		},
		/*
		 * True si esa corrida es una revisión de nombres parecidos que el usuario salteó (ver
		 * `salteados`). Se usa como función: getters['excel_analysis/fue_salteada'](uuid).
		 */
		fue_salteada(state) {
			return function(uuid) {
				return !!uuid && state.salteados.indexOf(uuid) !== -1
			}
		},
	},
	mutations: {
		set_corrida(state, value) {
			state.corrida = value || null
		},
		/*
		 * Limpia la corrida solo si es la que se pasa por parámetro. Evita que el
		 * "ya la vi" de una corrida vieja borre una corrida nueva que el usuario
		 * arrancó mientras tanto.
		 */
		limpiar_corrida_si_es(state, uuid) {
			if (state.corrida && state.corrida.uuid === uuid) {
				state.corrida = null
			}
		},
		set_abrir_en(state, value) {
			state.abrir_en = value || null
		},
		set_siguiendo_uuid(state, value) {
			state.siguiendo_uuid = value || null
		},
		marcar_salteado(state, uuid) {
			if (uuid && state.salteados.indexOf(uuid) === -1) {
				state.salteados.push(uuid)
			}
		},
		/*
		 * Deja el estado de importaciones como recién iniciado y lo asigna a `identidad`: cierre de
		 * sesión o cambio de usuario. Nada del usuario anterior (archivos, fechas, corrida, órdenes)
		 * sobrevive, y la época sube para descartar lo que todavía esté viajando.
		 */
		reiniciar(state, identidad) {
			state.corrida = null
			state.abrir_en = null
			state.siguiendo_uuid = null
			state.salteados = []
			state.pendientes = { article: [], client: [], provider: [] }
			state.identidad = identidad || null
			state.epoca = (state.epoca || 0) + 1
		},
		set_identidad(state, identidad) {
			state.identidad = identidad || null
		},
		/* Reemplaza la lista de pendientes de un módulo. */
		set_pendientes(state, payload) {
			let model = payload && payload.model
			if (!model) {
				return
			}
			state.pendientes = Object.assign({}, state.pendientes, {
				[model]: (payload.lista || []).slice(),
			})
		},
		/* Saca una importación de la lista (la descartó o ya la lanzó), en todos los módulos. */
		quitar_pendiente(state, uuid) {
			let nuevas = {}
			Object.keys(state.pendientes).forEach(function(model) {
				nuevas[model] = state.pendientes[model].filter(function(item) {
					return item.uuid !== uuid
				})
			})
			state.pendientes = nuevas
		},
	},
	actions: {
		/*
		 * Recupera la corrida abierta del usuario. Se llama al iniciar la SPA: el
		 * aviso de "terminó" viaja por broadcast, y un broadcast solo le llega a
		 * quien está conectado en ese momento. Si el usuario encoló el análisis y
		 * cerró la pestaña, el evento pasó sin nadie que lo escuche; esto es lo que
		 * lo recupera.
		 */
		get_en_curso({ commit, state, rootState }) {
			const identidad = identidad_de(rootState)

			asegurar_identidad(commit, state, identidad)

			const epoca = state ? state.epoca : null

			return axios.get('/api/ai-excel-import/analysis-en-curso')
				.then(res => {
					/* Respuesta de un usuario anterior (cerró sesión o cambió mientras viajaba): se tira. */
					if (state && (state.epoca !== epoca || identidad_de(rootState) !== identidad)) {
						return null
					}
					commit('set_corrida', res.data.run)
					return res.data.run
				})
				.catch(err => {
					console.log(err)
					return null
				})
		},
		/*
		 * Marca la corrida como vista para que no se vuelva a ofrecer en la próxima
		 * carga. Se llama tanto al abrir el resultado como al descartar el aviso:
		 * en los dos casos el usuario ya se enteró.
		 */
		marcar_visto({ commit }, uuid) {
			if (!uuid) {
				return Promise.resolve()
			}

			commit('limpiar_corrida_si_es', uuid)

			return axios.post('/api/ai-excel-import/analysis/' + uuid + '/visto')
				.catch(err => {
					/*
					 * Que falle no rompe nada de lo que el usuario está haciendo: en el
					 * peor caso la próxima carga le vuelve a ofrecer un análisis que ya
					 * miró, y lo descarta de nuevo.
					 */
					console.log(err)
				})
		},
		/*
		 * Trae del servidor las importaciones pendientes del usuario para un módulo. Si falla, deja
		 * la lista como estaba: no poder ver los pendientes no tiene que impedir importar.
		 */
		cargar_pendientes({ commit, state, rootState }, model) {
			const identidad = identidad_de(rootState)

			/*
			 * Si la lista que hay es de otro usuario, se limpia ANTES de pedir: si la recarga falla,
			 * no puede quedar a la vista lo del usuario anterior.
			 */
			asegurar_identidad(commit, state, identidad)

			const epoca = state ? state.epoca : null

			return axios.get('/api/ai-excel-import/pendientes', { params: { model: model } })
				.then(res => {
					if (state && (state.epoca !== epoca || identidad_de(rootState) !== identidad)) {
						return []
					}
					commit('set_pendientes', { model: model, lista: res.data.pendientes || [] })
					return res.data.pendientes || []
				})
				.catch(err => {
					console.log(err)
					return []
				})
		},
		/*
		 * Guarda en el servidor lo que el usuario dejó editado en el modal. No le muestra nada si
		 * falla, pero SÍ avisa a quien lo llamó: la promesa se resuelve en true si el servidor lo
		 * guardó y en false si no (error de red o de API), para que el modal no dé por guardado un
		 * borrador que no llegó y lo reintente. Sin uuid o sin borrador no hay nada que guardar: true.
		 */
		guardar_borrador(context, { uuid, borrador }) {
			if (!uuid || !borrador) {
				return Promise.resolve(true)
			}
			return axios.post('/api/ai-excel-import/analysis/' + uuid + '/borrador', { borrador: borrador })
				.then(() => true)
				.catch(err => {
					console.log(err)
					return false
				})
		},
		/* Un modal de importación se registra para que el cierre de sesión espere su guardado. */
		registrar_guardador(context, guardador) {
			if (guardador && guardadores.indexOf(guardador) === -1) {
				guardadores.push(guardador)
			}
		},
		quitar_guardador(context, guardador) {
			guardadores = guardadores.filter(function(g) { return g !== guardador })
		},
		/*
		 * Antes de cerrar la sesión: cada modal manda lo que el usuario dejó editado. Espera como
		 * mucho ESPERA_MAXIMA_DEL_GUARDADO y nunca rechaza: un guardado que falla no puede impedir
		 * salir. Resuelve true si todos quedaron guardados.
		 */
		guardar_antes_de_salir() {
			if (guardadores.length === 0) {
				return Promise.resolve(true)
			}

			let temporizador = null
			const guardados = Promise.all(guardadores.map(function(g) {
				try {
					return Promise.resolve(g.guardar()).catch(function() { return false })
				} catch (err) {
					return Promise.resolve(false)
				}
			})).then(function(resultados) {
				return resultados.every(function(ok) { return ok !== false })
			})
			const limite = new Promise(function(resolver) {
				temporizador = setTimeout(function() { resolver(false) }, ESPERA_MAXIMA_DEL_GUARDADO)
			})

			return Promise.race([guardados, limite]).then(function(ok) {
				clearTimeout(temporizador)
				return ok
			})
		},
		/*
		 * Después de cerrar la sesión: se corta el guardado de cada modal (timers, reintentos) y se
		 * borra todo lo del usuario que se va.
		 */
		limpiar_al_salir({ commit }) {
			guardadores.forEach(function(g) {
				try {
					g.cortar()
				} catch (err) {
					console.log(err)
				}
			})
			commit('reiniciar', null)
		},
		/*
		 * Descarta una importación pendiente. Se saca de la lista primero para que la pantalla no
		 * espere; si el servidor falla, la próxima carga de la lista la vuelve a traer.
		 */
		descartar_pendiente({ commit }, uuid) {
			if (!uuid) {
				return Promise.resolve()
			}
			commit('quitar_pendiente', uuid)
			return axios.post('/api/ai-excel-import/analysis/' + uuid + '/descartar')
				.catch(err => {
					console.log(err)
				})
		},
	},
}
