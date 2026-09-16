import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

/**
 * Store del mostrador (módulo IA, misión "modulo-ia-mostrador", 14/9/2026): el
 * escritorio de informes del dueño y el informe abierto.
 *
 * No usa el factory `__base_store` porque no es un ABM: es una lista fija de informes
 * partida en "últimos" y "anteriores" más un informe abierto, igual que `ai_chat`.
 *
 * Contrato de API (plan §1.5, todo bajo Sanctum + check_extencion_empresa:asistente_ia,
 * y SOLO para el dueño: un empleado sin admin_access recibe 403):
 * - GET  mostrador/reportes                       -> { ultimos: [reporte...], anteriores: [reporte...] }
 *        reporte = { id, tipo, fecha, titulo, resumen, generado_at, leido_at, conversation_id }
 *        (sin contenido ni hechos). `ultimos` es el más nuevo de cada tipo, `anteriores` el
 *        resto de los últimos 30 días.
 * - GET  mostrador/reportes/{id}                  -> { model: { ...reporte, contenido } } y estampa leido_at
 * - POST mostrador/reportes/{id}/conversacion     -> { model: conversation } (idempotente por informe y persona)
 *
 * La conversación del informe es una AiConversation común (origen 'mostrador_reporte'):
 * de acá en más habla el store `ai_chat` (getMessages / sendMessage / esperarRespuesta),
 * no se duplica nada de eso.
 *
 * 🔴 Un 404 en GET mostrador/reportes NO es un error: es un API viejo que todavía no tiene
 * el módulo (plan §4). Se muestra el estado vacío, sin toast rojo. Por eso las llamadas van
 * con `skip_global_error_event`: el error se atiende acá y no en el interceptor global.
 */
/**
 * Token de la ÚLTIMA apertura pedida (molde de la espera de ai_chat: los helpers lo
 * leen, y solo abrirReporte y cerrarReporte lo incrementan). Cada abrirReporte captura
 * el valor al salir y, cuando la respuesta llega, pinta solo si sigue siendo el vigente:
 * si se abrió A y después B, se pinta B aunque A responda última; si se cerró (o se
 * salió del módulo) antes de que responda, no se pinta nada. No es reactivo a
 * propósito: nadie lo mira desde un template.
 */
let apertura = {
	token: 0,
}

/**
 * Apaga el indicador de carga del informe (el del store y el global).
 *
 * @param {Function} commit
 */
function apagar_loading_reporte(commit) {
	commit('setLoadingReporte', false)
	commit('auth/setLoading', false, { root: true })
	commit('auth/setMessage', '', { root: true })
}

/**
 * Pone leido_at (si no lo tenía) en los informes de la lista cuyo id esté en `ids`.
 *
 * @param {Object} state
 * @param {Array<number>} ids
 */
function estampar_leidos(state, ids) {
	if (!ids || !ids.length) {
		return
	}
	let ahora = new Date().toISOString()
	state.ultimos.concat(state.anteriores).forEach(reporte => {
		// == a propósito: el id de la ruta llega como número, el de la carpeta también,
		// pero no vale la pena que un string en algún llamador deje el punto prendido.
		let leido = ids.some(id => id == reporte.id)
		if (leido && !reporte.leido_at) {
			reporte.leido_at = ahora
		}
	})
}

export default {
	namespaced: true,
	state: {
		model_name: 'mostrador',

		// El informe más nuevo de cada tipo (máx 5, orden fijo dia, caja, tienda, compras, stock).
		ultimos: [],
		// El resto de los últimos 30 días, fecha desc.
		anteriores: [],
		// true después de la primera respuesta (buena o mala) de GET mostrador/reportes:
		// distingue "todavía no pedí" de "pedí y no hay".
		reportes_cargados: false,
		// true mientras se pide la lista.
		loading: false,
		// Por qué no hay nada que mostrar, para que el escritorio elija el texto:
		// null (hay informes) | 'sin_informes' | 'sin_modulo' (404: API sin el módulo)
		// | 'solo_dueno' (403) | 'error' (cualquier otra falla).
		motivo_vacio: null,

		// Ids de los informes abiertos en esta sesión. Sirve para que el punto de
		// "nuevo" de la carpeta se apague aunque el informe se haya abierto ANTES de
		// que llegara la lista (carga fría por /ia/:id: el GET del informe y el del
		// escritorio salen a la vez, y marcarLeido sobre una lista vacía no marca nada).
		// setReportes lo vuelve a aplicar cuando la lista llega.
		leidos_en_sesion: [],

		// El informe abierto a pantalla completa, con su `contenido`. null = cerrado.
		reporte_abierto: null,
		// true mientras se pide GET mostrador/reportes/{id}.
		loading_reporte: false,
	},
	getters: {
		hay_reportes(state) {
			return state.ultimos.length > 0 || state.anteriores.length > 0
		},
	},
	mutations: {
		setReportes(state, payload) {
			state.ultimos = (payload && payload.ultimos) || []
			state.anteriores = (payload && payload.anteriores) || []
			// Lo leído en esta sesión se re-estampa sobre la lista recién llegada: si el
			// backend ya lo trae con leido_at, no cambia nada; si la lista es anterior a
			// la apertura (o llegó después), el punto de "nuevo" se apaga igual.
			estampar_leidos(state, state.leidos_en_sesion)
		},
		setReportesCargados(state, value) {
			state.reportes_cargados = value
		},
		setLoading(state, value) {
			state.loading = value
		},
		setMotivoVacio(state, value) {
			state.motivo_vacio = value
		},
		setReporteAbierto(state, reporte) {
			state.reporte_abierto = reporte
		},
		setLoadingReporte(state, value) {
			state.loading_reporte = value
		},
		/**
		 * Estampa leido_at en la lista para que el punto de "nuevo" de la carpeta se
		 * apague al abrirla (el backend lo estampa en GET reportes/{id}; acá se refleja
		 * sin volver a pedir la lista). Si la lista todavía no llegó, el id queda en
		 * leidos_en_sesion y setReportes lo estampa cuando llegue.
		 */
		marcarLeido(state, reporte_id) {
			let id = Number(reporte_id)
			if (state.leidos_en_sesion.indexOf(id) == -1) {
				state.leidos_en_sesion.push(id)
			}
			estampar_leidos(state, [id])
		},
		/**
		 * Cuelga la conversación recién creada del informe: en el abierto y en la lista,
		 * para que al reabrirlo el sidebar aparezca sin pedir nada.
		 */
		setConversationId(state, payload) {
			state.ultimos.concat(state.anteriores).forEach(reporte => {
				if (reporte.id == payload.reporte_id) {
					reporte.conversation_id = payload.conversation_id
				}
			})
			if (state.reporte_abierto && state.reporte_abierto.id == payload.reporte_id) {
				state.reporte_abierto = Object.assign({}, state.reporte_abierto, {
					conversation_id: payload.conversation_id,
				})
			}
		},
	},
	actions: {
		/**
		 * Carga el escritorio. Con el indicador global de carga, como el resto del
		 * sistema. Nunca rechaza: la falla queda en motivo_vacio y el escritorio la
		 * explica.
		 */
		getReportes({ commit }) {
			commit('setLoading', true)
			commit('auth/setMessage', 'Buscando tus informes', { root: true })
			commit('auth/setLoading', true, { root: true })
			return axios.get('/api/mostrador/reportes', {
				skip_global_error_event: true,
			})
				.then(res => {
					commit('setReportes', res.data)
					let hay = (res.data.ultimos && res.data.ultimos.length) || (res.data.anteriores && res.data.anteriores.length)
					commit('setMotivoVacio', hay ? null : 'sin_informes')
					commit('setReportesCargados', true)
					commit('setLoading', false)
					commit('auth/setLoading', false, { root: true })
					commit('auth/setMessage', '', { root: true })
				})
				.catch(err => {
					let status = err.response ? err.response.status : null
					commit('setReportes', null)
					if (status == 404) {
						// API viejo, sin el módulo: se trata como "sin informes" (plan §4).
						commit('setMotivoVacio', 'sin_modulo')
					} else if (status == 403) {
						commit('setMotivoVacio', 'solo_dueno')
					} else {
						commit('setMotivoVacio', 'error')
						console.log(err)
					}
					commit('setReportesCargados', true)
					commit('setLoading', false)
					commit('auth/setLoading', false, { root: true })
					commit('auth/setMessage', '', { root: true })
				})
		},
		/**
		 * Abre un informe: trae el contenido completo y lo deja en reporte_abierto (el
		 * overlay se muestra por estado). Recibe el objeto liviano de la carpeta o
		 * `{ id }` cuando viene de la ruta /ia/:id.
		 *
		 * Rechaza si el GET falla (404: no es del dueño o no está listo), para que el
		 * componente avise; el loading global se apaga acá en los dos caminos.
		 *
		 * 🔴 Solo pinta la ÚLTIMA apertura pedida (ver `apertura` arriba). Una respuesta
		 * vencida —se abrió otro informe después, o se cerró antes de que llegara— no
		 * toca el estado ni el loading (lo apaga la corrida vigente, o ya lo apagó
		 * cerrarReporte) y resuelve con null sin rechazar, para que el componente no
		 * avise de un fallo que la persona ya no está esperando.
		 *
		 * @param {Object} reporte { id, ... }
		 */
		abrirReporte({ commit }, reporte) {
			apertura.token = apertura.token + 1
			let token_corrida = apertura.token
			commit('setLoadingReporte', true)
			commit('auth/setMessage', 'Abriendo el informe', { root: true })
			commit('auth/setLoading', true, { root: true })
			return axios.get('/api/mostrador/reportes/' + reporte.id, {
				skip_global_error_event: true,
			})
				.then(res => {
					if (token_corrida !== apertura.token) {
						return null
					}
					commit('setReporteAbierto', res.data.model)
					commit('marcarLeido', reporte.id)
					apagar_loading_reporte(commit)
					return res.data.model
				})
				.catch(err => {
					if (token_corrida !== apertura.token) {
						return null
					}
					apagar_loading_reporte(commit)
					console.log(err)
					throw err
				})
		},
		/**
		 * Cierra el informe. Invalida cualquier apertura en vuelo (su respuesta no tiene
		 * que reabrir el overlay, ni al volver a /ia) y, si había una, apaga el loading
		 * que esa corrida ya no va a apagar.
		 */
		cerrarReporte({ commit, state }) {
			apertura.token = apertura.token + 1
			if (state.loading_reporte) {
				apagar_loading_reporte(commit)
			}
			commit('setReporteAbierto', null)
		},
		/**
		 * Primera pregunta sobre un informe sin conversación: la crea (idempotente del
		 * lado del backend) y la deja seleccionada en el store ai_chat, lista para que
		 * `ai_chat/sendMessage` mande el mensaje a ESA conversación y no cree una
		 * suelta.
		 *
		 * El POST distingue dos casos por el status, y acá se tratan distinto:
		 * - 201: la conversación recién nace, vacía. Se deja seleccionada con la lista
		 *   de mensajes en blanco y con la marca de "sin recarga".
		 * - 200: ya existía (se creó desde otra pestaña, o la lista de informes de esta
		 *   pestaña es vieja y no traía el conversation_id). Tiene historia, así que sus
		 *   mensajes se cargan ANTES de resolver: el globo optimista del mensaje que
		 *   viene atrás se suma a esa historia en vez de quedar solo sobre una lista
		 *   vacía que el sidebar después pisaba con la recarga.
		 *
		 * 🔴 setSeleccionSinRecarga(true) es la misma marca que usa
		 * ai_chat/createConversation: le dice al que reaccione a la selección (el
		 * sidebar del informe, que se monta cuando setConversationId le cuelga la
		 * conversación al informe) que NO pida mensajes, porque el GET pisaría el globo
		 * optimista del primer mensaje. En el caso 200 se prende recién DESPUÉS de cargar,
		 * por lo mismo. Y solo si el informe sigue abierto: si se cerró mientras el POST
		 * viajaba, el sidebar no se monta, nadie consume la marca y quedaría colgada para
		 * la próxima selección del panel flotante.
		 *
		 * @param {number} reporte_id
		 * @returns {Promise} resuelve con la conversación.
		 */
		crearConversacion({ commit, dispatch, state }, reporte_id) {
			// skip_global_error_event, como getReportes: la falla la atiende
			// PreguntaInput (repone el texto y avisa con su propio toast). Sin la
			// bandera, el interceptor de main.js además disparaba errorEvent y el
			// dueño veía DOS toasts por el mismo fallo.
			return axios.post('/api/mostrador/reportes/' + reporte_id + '/conversacion', null, {
				skip_global_error_event: true,
			})
				.then(res => {
					let conversation = res.data.model
					let ya_existia = res.status == 200
					commit('ai_chat/upsertConversation', conversation, { root: true })
					commit('ai_chat/setMessages', [], { root: true })

					let mensajes_listos
					if (ya_existia) {
						// La selección va antes del GET: ai_chat/getMessages descarta la
						// respuesta si la conversación pedida no es la seleccionada.
						commit('ai_chat/setSelectedConversationId', conversation.id, { root: true })
						mensajes_listos = dispatch('ai_chat/getMessages', {
							conversation_id: conversation.id,
							page: 1,
						}, { root: true })
					} else {
						mensajes_listos = Promise.resolve()
					}

					return mensajes_listos
						.then(() => {
							let informe_sigue_abierto = !!(state.reporte_abierto && state.reporte_abierto.id == reporte_id)
							if (informe_sigue_abierto) {
								commit('ai_chat/setSeleccionSinRecarga', true, { root: true })
							}
							if (!ya_existia) {
								commit('ai_chat/setSelectedConversationId', conversation.id, { root: true })
							}
							commit('setConversationId', {
								reporte_id: reporte_id,
								conversation_id: conversation.id,
							})
							return conversation
						})
				})
		},
	},
}
