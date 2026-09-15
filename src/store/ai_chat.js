import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

/**
 * Store del asistente IA (misión "chat IA", 15/8/2026): botón flotante + panel de chat.
 *
 * No usa el factory `__base_store` porque no es un ABM: es una bandeja de conversaciones
 * con una conversación abierta y paginación propia de mensajes, calcada en espíritu de
 * `store/whatsapp_chat.js` pero contra los endpoints nuevos de `ai-conversations`
 * (ver `AiConversationController` en empresa-api, gateados por la extensión `asistente_ia`).
 *
 * Contrato de API (fijado en el plan de la misión, D6-D9 y D17; las tarjetas de carga, en la
 * §2 del plan de la misión "asistente-ia-acciones", 15/9/2026):
 * - GET    ai-conversations                          -> { models: [...] }  (de la PERSONA, orden last_message_at DESC, nulls al final)
 * - POST   ai-conversations                          -> { model }
 * - DELETE ai-conversations/{id}                     -> 200 (borra la conversación, sus mensajes y sus tarjetas)
 * - GET    ai-conversations/{id}/messages            -> { models: paginator } (page/per_page default 30 techo 200, DESC por id)
 * - POST   ai-conversations/{id}/messages            -> 201 { user_message, assistant_message }
 *                                                       | 409 { code: 'respuesta_en_curso' } si ya hay un assistant pendiente
 *                                                       (body { contenido, acciones: true }; ver "Tarjetas de carga")
 * - GET    ai-conversations/{id}/messages/{msg_id}   -> { model } (para el aviso liviano del broadcast y el polling)
 * - POST   ai-conversations/{id}/acciones/{accion_id}/confirmar   (sin body)
 *                                                    -> 200 { model: AccionIa } ('confirmada', con `resultado`)
 *                                                       | 404 { message } (conversación ajena, o tarjeta de otra conversación)
 *                                                       | 409 { code: 'accion_resuelta', message, model } (ya no estaba 'propuesta')
 *                                                       | 422 { message, model } (no se escribió nada: sigue 'propuesta' con `error_mensaje`)
 *                                                       | 500 { message } (error inesperado, sin `model`)
 * - POST   ai-conversations/{id}/acciones/{accion_id}/cancelar    (sin body)
 *                                                    -> 200 { model: AccionIa } ('cancelada') | 404 { message }
 *                                                       | 409 { code: 'accion_resuelta', message, model }
 * - PUT    user/set-chat-ia-preferencias             -> 200 (body { chat_ia_fab_position, chat_ia_sidebar_width, chat_ia_panel_width }, los tres opcionales)
 *
 * El evento `ChatIaMensajeActualizado` (canal privado `chat.user.{auth_user_id}`) avisa solo
 * `{ ai_conversation_id, ai_message_id, estado }`: el texto del mensaje se busca SIEMPRE por
 * REST. La suscripción vive en `components/asistente-ia/FloatingButton.vue`.
 *
 * Mensajes: `rol` es 'user' | 'assistant'; `estado` (del backend) es 'listo' | 'pendiente'
 * | 'error'. Los mensajes del usuario recién enviados llevan además `estado_local`
 * ('enviando' | 'enviado' | 'error') y un `local_id` propio hasta que el POST confirme.
 *
 * Tarjetas de carga (misión "asistente-ia-acciones"): con `acciones: true` el asistente puede
 * PROPONER un gasto, un pago de cliente o a proveedor, una tarea nueva, cambios en una tarea o
 * marcar una tarea como hecha, y nada se registra hasta que la persona toca Confirmar. Cada
 * mensaje trae `acciones: AccionIa[]` (vacío si no hay, ordenado por id):
 *
 *   { id, ai_message_id, tipo, estado,
 *     presentacion: { titulo, renglones: [{ etiqueta, valor }], aviso },
 *     resultado: null | { texto, ruta: null | { name, params, texto } },
 *     error_mensaje, created_at }
 *
 * `estado` ('propuesta' | 'confirmada' | 'cancelada' | 'reemplazada' | 'vencida' | 'descartada')
 * ya viene resuelto por el API (una propuesta de más de 24 h sale 'vencida'): la SPA mira solo
 * eso y pinta los textos que arma el API, sin conocer la semántica de cada `tipo`. La tarjeta
 * es `components/asistente-ia/AccionCard.vue`.
 *
 * Compatibilidad (§5 del plan): un API viejo ignora `acciones` y no manda tarjetas; una
 * pestaña con la SPA vieja no lo manda y el asistente le responde de solo lectura.
 */

/** Contador para acuñar `local_id` de los globos optimistas (no reactivo a propósito). */
let proximo_local_id = 0

/** Payload pendiente y timer del debounce de savePreferences (una escritura por gesto). */
let preferencias_pendientes = null
let preferencias_timer_id = null

/**
 * Estado de la espera de respuesta (polling de respaldo del broadcast, D46).
 * Patrón del modal de importación IA (ai-excel-import, grupos 297/299/303):
 * `token` identifica la corrida y las puertas de los helpers SOLO LO LEEN. El
 * único lugar autorizado a incrementarlo es la acción cancelarEsperaDeRespuesta;
 * las salidas naturales del polling (respuesta lista, 5 fallos de red seguidos,
 * corte a los 180s) simplemente dejan de agendar y limpian el timer.
 */
let espera = {
	token: 0,
	timer_id: null,
	message_id: null,
	conversation_id: null,
}

/**
 * Cierre de una salida NATURAL del polling: limpia timer y referencias sin
 * invalidar el token (ver comentario de arriba).
 */
function terminar_espera_sin_invalidar() {
	if (espera.timer_id) {
		clearTimeout(espera.timer_id)
		espera.timer_id = null
	}
	espera.message_id = null
	espera.conversation_id = null
}

/**
 * POST de confirmar o cancelar una tarjeta de carga del asistente (misión
 * asistente-ia-acciones, §2.4 y §2.5 del plan). Lo comparten las dos acciones porque las
 * respuestas tienen la misma forma y se atienden igual:
 *
 * - 200: se parchea la tarjeta con `model` y resuelve con { model, status, message: null }.
 * - 409 `accion_resuelta` y 422: TAMBIÉN traen `model` (la tarjeta en su estado real, o
 *   'propuesta' con `error_mensaje`), así que se parchea igual y resuelve con
 *   { model, status, message }: la tarjeta ya cuenta lo que pasó. `message` viaja por si el
 *   `error_mensaje` de un 422 llegara vacío (AccionCard lo muestra en su lugar).
 * - Cualquier otra cosa (500, 404, 401/403 de los middlewares, corte de red): la tarjeta no
 *   se toca y rechaza con { status, message, con_json } para que AccionCard elija su texto
 *   de falla. `status` es 0 si no hubo respuesta; `con_json` dice si el cuerpo fue el JSON
 *   del API o no (una página HTML de un proxy, un 504 del hosting), porque sin ese JSON la
 *   tarjeta no puede afirmar que no se registró; `message` es el `message` de ese JSON.
 *
 * 🔴 `skip_global_error_event`, igual que store/mostrador.js: el error lo atiende la
 * tarjeta, y sin la bandera el interceptor de main.js además dispara errorEvent y la persona
 * ve el mismo fallo DOS veces (en la tarjeta y en un toast); con la bandera tampoco sale el
 * toast de "No pudimos conectarnos" ante un corte de red. `skip_global_validation_toast` va
 * de resguardo: el 422 del contrato no trae `errors`, pero si algún día los trajera, el
 * toast de validación saltaría antes de mirar la otra bandera.
 *
 * @param {Function} commit commit del módulo
 * @param {Object} payload { conversation_id, accion }
 * @param {String} verbo 'confirmar' | 'cancelar' (es el último tramo de la URL)
 * @returns {Promise}
 */
function resolver_accion(commit, payload, verbo) {
	let url = '/api/ai-conversations/' + payload.conversation_id + '/acciones/' + payload.accion.id + '/' + verbo
	return axios.post(url, null, {
		skip_global_error_event: true,
		skip_global_validation_toast: true,
	})
		.then(res => {
			commit('patchAccion', res.data.model)
			return { model: res.data.model, status: res.status, message: null }
		})
		.catch(err => {
			let status = err.response ? err.response.status : 0
			let data = err.response ? err.response.data : null
			// axios deja el cuerpo como objeto solo si vino JSON: la página HTML de un proxy o
			// del hosting (un 502, un 504, un error fatal de PHP) llega como texto.
			let con_json = Boolean(data) && typeof data == 'object'
			let message = con_json && typeof data.message == 'string' && data.message ? data.message : null
			let trae_model = con_json && Boolean(data.model)
			let ya_resuelta = status == 409 && con_json && data.code == 'accion_resuelta'
			if (trae_model && (ya_resuelta || status == 422)) {
				commit('patchAccion', data.model)
				return { model: data.model, status: status, message: message }
			}
			console.log(err)
			return Promise.reject({ status: status, message: message, con_json: con_json })
		})
}

/**
 * true si el modal de cuenta corriente (components/ventas/modals/current-acounts/Index.vue,
 * `<b-modal id="current-acounts">`) está abierto. Lo usa refrescarPantallaDeLaAccion.
 *
 * 🔴 No alcanza con que el store current_acount tenga from_model y from_credit_account:
 * nadie los limpia al cerrar el modal (medido con grep el 15/9/2026), así que después de
 * abrir una cuenta corriente quedan cargados toda la sesión. En cambio, un BModal sin
 * `static` no deja nada en el documento mientras está oculto (bootstrap-vue 2.23.1,
 * modal.js: `this.isHidden ? h() : h(BVTransporter, ...)`) y el `.modal` lleva el id: si el
 * elemento está, el modal está abierto.
 *
 * @returns {Boolean}
 */
function modal_de_cuenta_corriente_abierto() {
	if (typeof document == 'undefined') {
		return false
	}
	return Boolean(document.getElementById('current-acounts'))
}

/**
 * true si un mensaje del asistente ya está listo y trae tarjetas de carga. Es la condición
 * para refrescar las tarjetas en 'propuesta' de los mensajes anteriores (ver
 * refrescarTarjetasPropuestas): una respuesta con tarjetas puede haber reemplazado alguna.
 *
 * @param {Object} model mensaje tal cual lo devuelve GET messages/{id}
 * @returns {Boolean}
 */
function trae_tarjetas(model) {
	return Boolean(model) && model.estado == 'listo' && Array.isArray(model.acciones) && model.acciones.length > 0
}

export default {
	namespaced: true,
	state: {
		model_name: 'ai_chat',

		// true cuando el panel del chat está montado (lo abre el botón flotante o
		// `abrir_chat_ia()` del mixin global de route_functions).
		panel_abierto: false,

		// Conversaciones de la persona autenticada, como las devuelve el backend
		// (last_message_at DESC con nulls al final: la [0] es la última con actividad).
		conversations: [],
		// true mientras se pide GET ai-conversations.
		loading_conversations: false,

		// Id de la conversación abierta en el panel. null = conversación nueva sin crear
		// todavía (se crea recién al enviar el primer mensaje, como en Claude).
		selected_conversation_id: null,

		// Mensajes de la conversación abierta, en orden cronológico ascendente para renderizar.
		messages: [],
		// true mientras se pide la primera página de mensajes de una conversación recién abierta.
		loading_messages: false,
		// true mientras se pide una página anterior (scroll infinito hacia arriba).
		loading_more_messages: false,
		// Página actual ya cargada de mensajes (1 = la más reciente).
		messages_page: 1,
		// Última página disponible según el paginator; null hasta la primera carga.
		messages_last_page: null,

		// Ancho elegido de la sidebar del panel en esta sesión. null = usar el que viajó
		// en GET api/user (`user.chat_ia_sidebar_width`) o el default de 260. Vive acá y
		// no solo en el componente porque el panel se desmonta al cerrarse y auth.user
		// no se refresca hasta el próximo arranque.
		sidebar_width: null,

		// Ancho elegido del MODAL ENTERO en esta sesión (19/8/2026). Misma mecánica y
		// mismo motivo que sidebar_width, del que es independiente: uno es la columna de
		// conversaciones y el otro es el modal que la contiene. null = usar
		// `user.chat_ia_panel_width` o el default de 984.
		panel_width: null,

		// true cuando la espera de la respuesta pasó los 180s sin resolverse (el texto
		// de demora lo muestra la conversación; ver R8 del plan: cola compartida).
		respuesta_demorada: false,

		// true cuando el próximo cambio de selección NO tiene que recargar mensajes.
		// Lo prende createConversation al crear en medio de un envío: sin esta marca,
		// el watch del panel pediría la página de una conversación todavía vacía y
		// el setMessages pisaría el globo optimista que acaba de subir.
		seleccion_sin_recarga: false,
	},
	getters: {
		/**
		 * Conversación abierta (o null si es una nueva sin crear).
		 */
		selected_conversation(state) {
			return state.conversations.find(c => c.id == state.selected_conversation_id) || null
		},
		/**
		 * true si la conversación abierta tiene una respuesta del asistente en curso.
		 * Bloquea el composer (la defensa real es el 409 del servidor, D17/R2).
		 */
		hay_respuesta_en_curso(state) {
			return state.messages.some(m => m.rol == 'assistant' && m.estado == 'pendiente')
		},
	},
	mutations: {
		setPanelAbierto(state, value) {
			state.panel_abierto = value
		},
		setConversations(state, value) {
			state.conversations = value || []
		},
		setLoadingConversations(state, value) {
			state.loading_conversations = value
		},
		/**
		 * Inserta o actualiza una conversación y reordena por `last_message_at`
		 * (más reciente primero, nulls al final), igual que el índice del backend.
		 */
		upsertConversation(state, conversation) {
			if (!conversation || !conversation.id) {
				return
			}
			let index = state.conversations.findIndex(c => c.id == conversation.id)
			if (index == -1) {
				state.conversations.unshift(conversation)
			} else {
				// Merge superficial: conserva props que un payload parcial no traiga.
				state.conversations.splice(index, 1, Object.assign({}, state.conversations[index], conversation))
			}
			state.conversations.sort((a, b) => {
				return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
			})
		},
		removeConversation(state, conversation_id) {
			state.conversations = state.conversations.filter(c => c.id != conversation_id)
		},
		setSelectedConversationId(state, id) {
			state.selected_conversation_id = id
		},
		setMessages(state, value) {
			state.messages = value || []
		},
		/**
		 * Antepone una página más vieja de mensajes (scroll infinito hacia arriba).
		 */
		prependMessages(state, value) {
			state.messages = (value || []).concat(state.messages)
		},
		/**
		 * Agrega un mensaje al final (recién enviado, o el assistant pendiente del 201).
		 */
		appendMessage(state, message) {
			state.messages.push(message)
		},
		/**
		 * Actualiza un mensaje existente por id (ej: el assistant pasó de 'pendiente'
		 * a 'listo' vía broadcast/polling). Si no está en la conversación abierta, no hace nada.
		 */
		patchMessage(state, message) {
			let index = state.messages.findIndex(m => m.id == message.id)
			if (index != -1) {
				state.messages.splice(index, 1, Object.assign({}, state.messages[index], message))
			}
		},
		/**
		 * Reemplaza UNA tarjeta de carga adentro de su mensaje con la AccionIa que devolvió
		 * confirmar o cancelar (misión asistente-ia-acciones, §4 del plan). Ubica el mensaje
		 * por `ai_message_id` y la tarjeta por `id`, y la cambia con splice: en Vue 2 una
		 * asignación por índice (`acciones[i] = ...`) no redibuja, splice sí.
		 *
		 * Busca en `state.messages`, que es la conversación en pantalla tanto del panel
		 * flotante como del sidebar del informe del mostrador (los dos leen de acá). Si el
		 * mensaje ya no está (se cambió de conversación mientras viajaba el POST), no hace
		 * nada: al volver a esa conversación la página se pide de nuevo y trae el estado real.
		 */
		patchAccion(state, accion) {
			if (!accion || !accion.id) {
				return
			}
			let message = state.messages.find(m => m.id == accion.ai_message_id)
			if (!message || !Array.isArray(message.acciones)) {
				return
			}
			let index = message.acciones.findIndex(a => a.id == accion.id)
			if (index != -1) {
				message.acciones.splice(index, 1, accion)
			}
		},
		/**
		 * Reemplaza un globo optimista (por `local_id`) con el mensaje real que devolvió el POST.
		 */
		replaceLocalMessage(state, payload) {
			let index = state.messages.findIndex(m => m.local_id == payload.local_id)
			if (index != -1) {
				state.messages.splice(index, 1, payload.message)
			}
		},
		/**
		 * Marca un globo optimista (por `local_id`) con un estado_local nuevo (ej: 'error').
		 */
		patchLocalMessage(state, payload) {
			let index = state.messages.findIndex(m => m.local_id == payload.local_id)
			if (index != -1) {
				state.messages.splice(index, 1, Object.assign({}, state.messages[index], payload.patch))
			}
		},
		removeLocalMessage(state, local_id) {
			state.messages = state.messages.filter(m => m.local_id != local_id)
		},
		setLoadingMessages(state, value) {
			state.loading_messages = value
		},
		setLoadingMoreMessages(state, value) {
			state.loading_more_messages = value
		},
		setMessagesPage(state, value) {
			state.messages_page = value
		},
		setMessagesLastPage(state, value) {
			state.messages_last_page = value
		},
		setSidebarWidth(state, value) {
			state.sidebar_width = value
		},
		setPanelWidth(state, value) {
			state.panel_width = value
		},
		setRespuestaDemorada(state, value) {
			state.respuesta_demorada = value
		},
		setSeleccionSinRecarga(state, value) {
			state.seleccion_sin_recarga = value
		},
	},
	actions: {
		/**
		 * Carga la bandeja de conversaciones de la persona.
		 */
		getConversations({ commit }) {
			commit('setLoadingConversations', true)
			return axios.get('/api/ai-conversations')
				.then(res => {
					commit('setLoadingConversations', false)
					commit('setConversations', res.data.models)
					return res.data.models
				})
				.catch(err => {
					commit('setLoadingConversations', false)
					console.log(err)
				})
		},
		/**
		 * Crea una conversación vacía y la deja seleccionada. La usa `sendMessage`
		 * cuando se escribe el primer mensaje sin conversación abierta.
		 *
		 * @returns {Promise} resuelve con la conversación creada.
		 */
		createConversation({ commit }) {
			return axios.post('/api/ai-conversations')
				.then(res => {
					commit('upsertConversation', res.data.model)
					// La selección no dispara recarga: la conversación recién nace y el
					// globo optimista del primer mensaje ya está en pantalla.
					commit('setSeleccionSinRecarga', true)
					commit('setSelectedConversationId', res.data.model.id)
					return res.data.model
				})
		},
		/**
		 * Borra una conversación (y sus mensajes, del lado del backend). Si era la
		 * abierta, pasa a la siguiente con actividad o deja una conversación nueva.
		 */
		deleteConversation({ commit, state, dispatch }, conversation_id) {
			return axios.delete('/api/ai-conversations/' + conversation_id)
				.then(() => {
					// Si se estaba esperando una respuesta de esta conversación, ya no
					// hay a quién esperarle (R3: la carrera del job con lo borrado).
					if (espera.conversation_id == conversation_id) {
						dispatch('cancelarEsperaDeRespuesta')
					}
					commit('removeConversation', conversation_id)
					if (state.selected_conversation_id == conversation_id) {
						let siguiente = state.conversations.length ? state.conversations[0].id : null
						commit('setSelectedConversationId', siguiente)
						if (!siguiente) {
							commit('setMessages', [])
						}
					}
				})
		},
		/**
		 * Trae una página de mensajes de la conversación indicada.
		 * page=1 reemplaza la conversación (apertura); page>1 antepone (scroll hacia arriba).
		 *
		 * @param {Object} payload { conversation_id, page }
		 */
		getMessages({ commit, state, dispatch }, payload) {
			let conversation_id = payload.conversation_id
			let page = payload.page || 1
			if (page == 1) {
				commit('setLoadingMessages', true)
			} else {
				commit('setLoadingMoreMessages', true)
			}
			return axios.get('/api/ai-conversations/' + conversation_id + '/messages', {
				params: {
					page: page,
				},
			})
				.then(res => {
					// Respuesta tardía de OTRA conversación (scrolleás la A, clickeás la B,
					// la página de A llega después): se apaga solo el loading que esta
					// petición prendió y no se toca nada más — sin el guard, la página de A
					// se mezclaba (prepend) o pisaba (page 1) los mensajes de B en pantalla.
					if (conversation_id != state.selected_conversation_id) {
						commit(page == 1 ? 'setLoadingMessages' : 'setLoadingMoreMessages', false)
						return
					}
					let paginator = res.data.models
					// El backend devuelve DESC (más nuevo primero); para renderizar de arriba
					// a abajo se necesita orden ascendente, así que se invierte cada página.
					let chronological_chunk = paginator.data.slice().reverse()
					if (page == 1) {
						commit('setMessages', chronological_chunk)
						commit('setLoadingMessages', false)
						// Si la conversación quedó con una respuesta a medio generar
						// (reapertura del panel, F5, reconexión), la espera se re-arma:
						// sin esto el pendiente dependería solo del evento de Echo.
						if (chronological_chunk.length) {
							let ultimo = chronological_chunk[chronological_chunk.length - 1]
							if (ultimo.rol == 'assistant' && ultimo.estado == 'pendiente' && espera.message_id != ultimo.id) {
								dispatch('esperarRespuesta', {
									conversation_id: conversation_id,
									message_id: ultimo.id,
								})
							}
						}
					} else {
						commit('prependMessages', chronological_chunk)
						commit('setLoadingMoreMessages', false)
					}
					commit('setMessagesPage', paginator.current_page)
					commit('setMessagesLastPage', paginator.last_page)
				})
				.catch(err => {
					// Mismo guard que el .then: si la conversación pedida ya no es la
					// abierta, esta falla es de una petición descartada — apagar los dos
					// flags acá pisaría el loading de la conversación vigente.
					if (conversation_id != state.selected_conversation_id) {
						commit(page == 1 ? 'setLoadingMessages' : 'setLoadingMoreMessages', false)
						return
					}
					commit('setLoadingMessages', false)
					commit('setLoadingMoreMessages', false)
					console.log(err)
				})
		},
		/**
		 * Envía un mensaje del usuario con globo optimista (D41): sube al toque como
		 * 'enviando', pasa a 'enviado' cuando el 201 confirma, y queda en 'error' con
		 * botón de reintento si el POST falla. Si no hay conversación abierta, primero
		 * la crea (el flujo "escribí y ya" de una conversación nueva).
		 *
		 * Un 409 `respuesta_en_curso` saca el globo y re-lanza para que el composer
		 * reponga el texto y avise (la SPA además bloquea el composer; esto cubre la
		 * carrera de dos pestañas, R2).
		 *
		 * @param {Object} payload { contenido }
		 */
		sendMessage({ commit, state, dispatch }, payload) {
			let contenido = payload.contenido

			proximo_local_id = proximo_local_id + 1
			let local_id = 'local-' + proximo_local_id

			commit('appendMessage', {
				local_id: local_id,
				rol: 'user',
				contenido: contenido,
				estado: 'listo',
				estado_local: 'enviando',
				created_at: new Date().toISOString(),
			})

			// Con conversación abierta se manda directo; sin ella, primero se crea.
			let conversacion_lista
			if (state.selected_conversation_id) {
				conversacion_lista = Promise.resolve(state.selected_conversation_id)
			} else {
				conversacion_lista = dispatch('createConversation')
					.then(conversation => {
						return conversation.id
					})
			}

			return conversacion_lista
				.then(conversation_id => {
					return axios.post('/api/ai-conversations/' + conversation_id + '/messages', {
						contenido: contenido,
						// Habilita las tarjetas de carga para ESTA respuesta (§2.1 del plan de
						// asistente-ia-acciones). Va siempre en true porque esta SPA sabe
						// pintarlas: sin la clave el API responde de solo lectura (que es lo que
						// les pasa a las pestañas con la SPA vieja), y un API viejo la ignora.
						acciones: true,
					})
						.then(res => {
							// Conserva el local_id para que el :key del globo no cambie: si
							// cambiara, Vue re-montaría el nodo y la animación de entrada
							// parpadearía en la transición enviando -> enviado.
							commit('replaceLocalMessage', {
								local_id: local_id,
								message: Object.assign({}, res.data.user_message, {
									estado_local: 'enviado',
									local_id: local_id,
								}),
							})
							commit('appendMessage', res.data.assistant_message)
							// La conversación subió al tope de la bandeja.
							commit('upsertConversation', {
								id: conversation_id,
								last_message_at: new Date().toISOString(),
							})
							// Arranca el polling de respaldo del broadcast (D46).
							dispatch('esperarRespuesta', {
								conversation_id: conversation_id,
								message_id: res.data.assistant_message.id,
							})
							return res.data
						})
				})
				.catch(err => {
					let data = err.response && err.response.data
					if (err.response && err.response.status == 409 && data && data.code == 'respuesta_en_curso') {
						// Ya hay una respuesta generándose: el globo optimista se saca y el
						// composer (que re-lanza) repone el texto para no perder lo escrito.
						commit('removeLocalMessage', local_id)
						throw err
					}
					// Cualquier otra falla deja el globo en error con su texto adentro:
					// el botón "Reintentar" del globo es el aviso, no hace falta toast.
					commit('patchLocalMessage', {
						local_id: local_id,
						patch: { estado_local: 'error' },
					})
					console.log(err)
				})
		},
		/**
		 * Reintenta un globo que quedó en error: lo saca y vuelve a enviar el mismo texto.
		 *
		 * @param {Object} message el mensaje local con estado_local 'error'
		 */
		retryMessage({ commit, dispatch }, message) {
			commit('removeLocalMessage', message.local_id)
			return dispatch('sendMessage', { contenido: message.contenido })
		},
		/**
		 * Confirma una tarjeta de carga: el API registra lo que dice la tarjeta, autenticado
		 * como la persona que hizo clic (§2.4 del plan de asistente-ia-acciones). La
		 * conversación sale del mensaje que trae la tarjeta (`ai_conversation_id`), no de la
		 * seleccionada: la tarjeta también se ve en el sidebar del informe del mostrador.
		 *
		 * Si la tarjeta queda confirmada, avisa a la pantalla donde quedó la carga
		 * (refrescarPantallaDeLaAccion).
		 *
		 * @param {Object} payload { conversation_id, accion, ruta_actual } (`ruta_actual`: name de la ruta en pantalla, lo manda la tarjeta)
		 * @returns {Promise} resuelve con { model, status, message } y la tarjeta ya parcheada (200, 409, 422), o rechaza con { status, message, con_json }.
		 */
		confirmarAccion({ commit, dispatch }, payload) {
			return resolver_accion(commit, payload, 'confirmar')
				.then(resultado => {
					// Un 200 confirmada dejó una carga nueva, y un 409 que devuelve la tarjeta ya
					// confirmada es el reintento después de un corte (el primer pedido sí había
					// llegado): en los dos casos la pantalla donde quedó la carga no se enteró.
					let model = resultado.model
					if (model && model.estado == 'confirmada' && (resultado.status == 200 || resultado.status == 409)) {
						dispatch('refrescarPantallaDeLaAccion', {
							accion: model,
							ruta_actual: payload.ruta_actual,
						})
					}
					return resultado
				})
		},
		/**
		 * Cancela una tarjeta de carga sin registrar nada (§2.5).
		 *
		 * @param {Object} payload { conversation_id, accion }
		 * @returns {Promise} resuelve con { model, status, message } y la tarjeta ya parcheada (200, 409), o rechaza con { status, message, con_json }.
		 */
		cancelarAccion({ commit }, payload) {
			return resolver_accion(commit, payload, 'cancelar')
		},
		/**
		 * Hace que la pantalla donde quedó una carga confirmada se entere (arreglo tras el
		 * chequeo independiente, §4 del plan de asistente-ia-acciones). Sin esto, parado en la
		 * Agenda, "Ver en la Agenda" solo cerraba el panel y la tarea nueva no estaba:
		 * components/agenda/Index.vue no recarga si la vista es la misma y el rango ya está
		 * cargado, y Gastos solo carga cuando se toca un día (ControlFecha.vue).
		 *
		 * La pantalla sale de `resultado.ruta.name` y de nada más: la SPA no conoce la semántica
		 * de cada tipo de tarjeta. Ninguna rama pisa lo que la persona está mirando ni dispara una
		 * carga pesada para una pantalla que no está a la vista:
		 *
		 * - 'pending' -> agenda/cargar, que vuelve a pedir el rango vigente (vista, hoy y mes
		 *   visible del store), solo si la agenda ya se cargó. `desde` es la misma señal que usa
		 *   Agenda/Index.vue para NO recargar al volver, así que refrescarla acá aunque no esté
		 *   montada es lo que evita encontrarla vieja al entrar; y es liviana (60 días o la
		 *   grilla de un mes). La vista Realizadas no se refresca: su rango vive en el componente.
		 * - 'expense' -> expense/getModels, que vuelve a pedir el día o el rango elegido
		 *   (from_date/until_date del store), solo con la pantalla de Gastos a la vista
		 *   (`ruta_actual`) y sin una búsqueda activa (`is_filtered`), que getModels borraría.
		 *   A la vista y no "con modelos": un día sin gastos también es un listado cargado, y un
		 *   rango largo que quedó guardado es una carga pesada para una pantalla que no se ve.
		 * - pago (ruta null) -> current_acount/getModels, solo con el modal de cuenta corriente
		 *   abierto y su cuenta cargada (from_model y from_credit_account).
		 *
		 * @param {Object} payload { accion, ruta_actual } la AccionIa confirmada y el name de la ruta en pantalla
		 */
		refrescarPantallaDeLaAccion({ rootState, dispatch }, payload) {
			let accion = payload ? payload.accion : null
			let ruta = accion && accion.resultado ? accion.resultado.ruta : null
			let destino = ruta && ruta.name ? ruta.name : null

			if (destino == 'pending') {
				if (rootState.agenda && rootState.agenda.desde) {
					dispatch('agenda/cargar', null, { root: true })
				}
				return
			}

			if (destino == 'expense') {
				let gastos = rootState.expense
				if (payload.ruta_actual == 'expense' && gastos && !gastos.is_filtered) {
					dispatch('expense/getModels', null, { root: true })
				}
				return
			}

			if (!destino) {
				let cuenta = rootState.current_acount
				let con_cuenta = Boolean(cuenta && cuenta.from_model && cuenta.from_model.id && cuenta.from_credit_account && cuenta.from_credit_account.id)
				if (con_cuenta && modal_de_cuenta_corriente_abierto()) {
					dispatch('current_acount/getModels', null, { root: true })
				}
			}
		},
		/**
		 * Vuelve a pedir los mensajes en pantalla que tienen alguna tarjeta en 'propuesta'
		 * (arreglo tras el chequeo independiente, §4 del plan de asistente-ia-acciones).
		 *
		 * Por qué: cuando la persona corrige una tarjeta por chat, el API pasa la anterior a
		 * 'reemplazada' (§3.5), pero esa tarjeta vive en OTRO mensaje que la SPA ya tenía y nadie
		 * se lo avisa: seguía ofreciendo Confirmar hasta que la tocabas y volvía el 409. Lo
		 * disparan fetchMessage (el camino del evento de Echo) y el polling de respaldo cuando un
		 * mensaje del asistente pasa a 'listo' con tarjetas (trae_tarjetas).
		 *
		 * Un GET por mensaje, y solo de los que pueden haber cambiado: una tarjeta que ya no está
		 * en 'propuesta' no cambia de estado por una respuesta nueva.
		 *
		 * @param {Object} payload { conversation_id, message_id } el mensaje que acaba de llegar (ese no se vuelve a pedir)
		 */
		refrescarTarjetasPropuestas({ state, commit }, payload) {
			if (state.selected_conversation_id != payload.conversation_id) {
				return
			}
			let con_propuestas = state.messages.filter(m => {
				let tiene_propuesta = Array.isArray(m.acciones) && m.acciones.some(accion => accion.estado == 'propuesta')
				return m.id && m.id != payload.message_id && tiene_propuesta
			})
			con_propuestas.forEach(m => {
				axios.get('/api/ai-conversations/' + payload.conversation_id + '/messages/' + m.id, {
					// Es un refresco de cortesía: si falla, no hay nada que avisarle a la persona.
					skip_global_error_event: true,
				})
					.then(res => {
						// Si mientras tanto se abrió otra conversación, no se pisa la que está en pantalla.
						if (state.selected_conversation_id == payload.conversation_id) {
							commit('patchMessage', res.data.model)
						}
					})
					.catch(err => {
						// La tarjeta queda como estaba; si la tocan, el 409 del API la corrige.
						console.log(err)
					})
			})
		},
		/**
		 * Busca UN mensaje por REST. Es la otra mitad del evento liviano
		 * `ChatIaMensajeActualizado` (D8/D45): el broadcast avisa ids y estado, y el
		 * texto se pide siempre por acá, autenticado. También lo usa el polling.
		 *
		 * @param {Object} payload { conversation_id, message_id }
		 */
		fetchMessage({ state, commit, dispatch }, payload) {
			return axios.get('/api/ai-conversations/' + payload.conversation_id + '/messages/' + payload.message_id)
				.then(res => {
					let model = res.data.model
					// Solo pisa la conversación en pantalla; si el usuario ya está en
					// otra, con refrescar la bandeja alcanza.
					if (state.selected_conversation_id == payload.conversation_id) {
						commit('patchMessage', model)
						// Una respuesta con tarjetas puede haber reemplazado tarjetas de
						// mensajes anteriores: se refrescan las que siguen en 'propuesta'.
						if (trae_tarjetas(model)) {
							dispatch('refrescarTarjetasPropuestas', {
								conversation_id: payload.conversation_id,
								message_id: model.id,
							})
						}
					}
					if (model.estado != 'pendiente') {
						// La respuesta llegó (o quedó en error amigable): si el polling
						// seguía esperando este mensaje, ya no tiene nada que esperar.
						if (espera.message_id == payload.message_id) {
							dispatch('cancelarEsperaDeRespuesta')
						}
						// Refresca la bandeja: sube last_message_at y trae el título que
						// el job de inferencia haya escrito mientras tanto (D20).
						dispatch('getConversations')
					}
					return model
				})
		},
		/**
		 * Polling de respaldo del broadcast (D46), molde ai-excel-import: token de
		 * corrida chequeado en las CUATRO puertas (antes de la consulta, en el .then,
		 * en el .catch y en el agendador), 5 fallos de red seguidos para rendirse,
		 * cadencia de 3s los primeros 30s y 6s después, y corte a los 180s dejando
		 * el aviso de demora (R8: la cola es compartida con las importaciones).
		 * Arranca al enviar y se apaga en cuanto el mensaje deja de estar pendiente,
		 * por evento o por el propio polling.
		 *
		 * @param {Object} payload { conversation_id, message_id }
		 */
		esperarRespuesta({ state, commit, dispatch }, payload) {
			// Una espera nueva invalida cualquier corrida anterior (único ++token).
			dispatch('cancelarEsperaDeRespuesta')

			// El token se captura DESPUÉS de cancelar, que es quien lo incrementó.
			let token_corrida = espera.token
			espera.message_id = payload.message_id
			espera.conversation_id = payload.conversation_id

			let inicio = Date.now()
			let fallos_consecutivos = 0

			function consultar() {

				/* Punto de chequeo: la función que ejecuta la consulta. */
				if (token_corrida !== espera.token) return

				axios.get('/api/ai-conversations/' + payload.conversation_id + '/messages/' + payload.message_id, {
					timeout: 30000,
				})
					.then(res => {

						/* Punto de chequeo: el .then de cada GET de polling. */
						if (token_corrida !== espera.token) return

						fallos_consecutivos = 0
						let model = res.data.model

						if (model.estado != 'pendiente') {
							terminar_espera_sin_invalidar()
							commit('setRespuestaDemorada', false)
							if (state.selected_conversation_id == payload.conversation_id) {
								commit('patchMessage', model)
								// Mismo refresco que fetchMessage: la respuesta puede haber
								// reemplazado tarjetas de mensajes anteriores.
								if (trae_tarjetas(model)) {
									dispatch('refrescarTarjetasPropuestas', {
										conversation_id: payload.conversation_id,
										message_id: model.id,
									})
								}
							}
							dispatch('getConversations')
							return
						}

						agendar_proxima_consulta()
					})
					.catch(err => {

						/* Punto de chequeo: el .catch de cada GET de polling. */
						if (token_corrida !== espera.token) return

						// Un 404 no es un corte de red: la conversación o el mensaje ya
						// no existen (borrados en el medio) y no hay nada que esperar.
						if (err.response && err.response.status == 404) {
							terminar_espera_sin_invalidar()
							return
						}

						// Un fallo suelto no aborta la espera; recién 5 SEGUIDOS rinden
						// el polling (el evento de Echo sigue siendo la otra vía).
						fallos_consecutivos = fallos_consecutivos + 1

						if (fallos_consecutivos >= 5) {
							terminar_espera_sin_invalidar()
							console.log('Polling del chat IA rendido tras 5 fallos de red seguidos')
							return
						}

						agendar_proxima_consulta()
					})
			}

			function agendar_proxima_consulta() {

				/* Punto de chequeo: el agendador del siguiente ciclo. */
				if (token_corrida !== espera.token) return

				let transcurrido = Date.now() - inicio

				if (transcurrido >= 180000) {
					terminar_espera_sin_invalidar()
					// El mensaje sigue 'pendiente' en el backend: el indicador de
					// pensando queda, con el aviso de demora abajo, y si al final la
					// respuesta llega el evento de Echo la registra igual.
					commit('setRespuestaDemorada', true)
					return
				}

				/* Cada 3s el primer medio minuto; cada 6s después (menos ruido). */
				let intervalo = transcurrido < 30000 ? 3000 : 6000

				espera.timer_id = setTimeout(function () {

					/* Punto de chequeo: al disparar el timer. */
					if (token_corrida !== espera.token) return

					consultar()

				}, intervalo)
			}

			consultar()
		},
		/**
		 * ÚNICO lugar autorizado a invalidar el token de la espera (regla del molde,
		 * grupo 303). Lo usan: una espera nueva al arrancar, fetchMessage cuando el
		 * mensaje esperado se resolvió por evento, y el borrado de la conversación.
		 */
		cancelarEsperaDeRespuesta({ commit }) {
			espera.token = espera.token + 1
			if (espera.timer_id) {
				clearTimeout(espera.timer_id)
				espera.timer_id = null
			}
			espera.message_id = null
			espera.conversation_id = null
			commit('setRespuestaDemorada', false)
		},
		/**
		 * Persiste las preferencias de UI de la PERSONA (posición del botón flotante,
		 * ancho de la sidebar, ancho del modal) con un debounce de 500 ms: una sola
		 * escritura por gesto, y si dos gestos se pisan los payloads se funden. El endpoint
		 * resuelve con Auth::user() (mismo criterio que set-dark-mode: es por persona, no
		 * por cuenta).
		 *
		 * ⚠️ El .catch() de abajo se traga el error a propósito (una coordenada perdida no
		 * justifica molestar al usuario), y eso vuelve INVISIBLE un 422 por rango. Los
		 * rangos que valida el endpoint y los que clampa Panel.vue tienen que decir el
		 * mismo número: si divergen, el ancho se pierde en silencio y recién se nota al
		 * recargar.
		 *
		 * @param {Object} payload { chat_ia_fab_position?, chat_ia_sidebar_width?, chat_ia_panel_width? }
		 */
		savePreferences(context, payload) {
			preferencias_pendientes = Object.assign({}, preferencias_pendientes || {}, payload)
			if (preferencias_timer_id) {
				clearTimeout(preferencias_timer_id)
			}
			preferencias_timer_id = setTimeout(() => {
				let body = preferencias_pendientes
				preferencias_pendientes = null
				preferencias_timer_id = null
				axios.put('/api/user/set-chat-ia-preferencias', body)
					.catch(err => {
						// La preferencia quedó igual en localStorage / estado local: no es
						// bloqueante y no se molesta al usuario por una coordenada.
						console.log(err)
					})
			}, 500)
		},
	},
}
