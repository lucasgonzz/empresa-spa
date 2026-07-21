import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

/**
 * Store del módulo WhatsApp (grupo 137, Prompt 06): lista de chats + conversación abierta.
 *
 * No usa el factory `__base_store` porque el módulo no es un ABM estándar (filtros, tabla,
 * paginación clásica): es una bandeja de chats + una conversación con paginación propia de
 * mensajes, muy similar en espíritu a `store/message.js` (chat de la tienda online) pero
 * apuntando a los endpoints reales de `whatsapp-chats` (ver `WhatsappChatController` en
 * empresa-api).
 *
 * Contrato de API (confirmado contra empresa-api, grupo 137, Prompts 01-05):
 * - GET    whatsapp-chats?q=              -> { models: [...] }              (chat con client, user)
 * - GET    whatsapp-chats/{id}/messages    -> { models: paginator }          (page/per_page, DESC por created_at)
 * - POST   whatsapp-chats                  -> { model }                     (phone, client_id)
 * - POST   whatsapp-chats/{id}/messages    -> { model }                     (body) | 422 { code: 'fuera_de_ventana' }
 * - POST   whatsapp-chats/{id}/send-template -> { model }                   (template_id, variables[])
 * - PUT    whatsapp-chats/{id}/toggle-ai   -> { model }
 * - PUT    whatsapp-chats/{id}/link-client -> { model }                     (client_id o null)
 * - PUT    whatsapp-chats/{id}/read        -> { model }
 * - POST   whatsapp-chats/{id}/suggest     -> { suggestion }
 * - POST   whatsapp-chats/{id}/summary     -> { summary }
 */
export default {
	namespaced: true,
	state: {
		model_name: 'whatsapp_chat',

		// Chats del owner autenticado, ya ordenados por último mensaje (lo devuelve así el backend).
		chats: [],
		// true mientras se pide GET whatsapp-chats.
		loading_chats: false,
		// Texto de búsqueda actual (pega a `?q=`).
		search_query: '',

		// Id del chat abierto en el panel de conversación (null = ninguno seleccionado).
		selected_chat_id: null,

		// Mensajes del chat abierto, en orden cronológico ascendente (el más viejo primero) para renderizar.
		messages: [],
		// true mientras se pide la primera página de mensajes de un chat recién abierto.
		loading_messages: false,
		// true mientras se pide una página anterior (scroll infinito hacia arriba).
		loading_more_messages: false,
		// Página actual ya cargada de mensajes (1 = la más reciente).
		messages_page: 1,
		// Última página disponible (según el paginator de Laravel); null hasta la primera carga.
		messages_last_page: null,
	},
	mutations: {
		setLoadingChats(state, value) {
			state.loading_chats = value
		},
		setChats(state, value) {
			state.chats = value || []
		},
		setSearchQuery(state, value) {
			state.search_query = value
		},
		/**
		 * Inserta o actualiza un chat en la bandeja y reordena por `last_message_at` (más reciente primero),
		 * igual que hace el índice del backend.
		 */
		upsertChat(state, chat) {
			if (!chat || !chat.id) {
				return
			}
			let index = state.chats.findIndex(c => c.id == chat.id)
			if (index == -1) {
				state.chats.unshift(chat)
			} else {
				// Merge superficial: conserva props que el payload liviano del broadcast no manda (ej: client).
				state.chats.splice(index, 1, Object.assign({}, state.chats[index], chat))
			}
			state.chats.sort((a, b) => {
				return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
			})
		},
		/**
		 * Aplica el payload liviano de `WhatsappChatUpdated` (solo id/unread_count/last_message_at)
		 * sin pisar el resto de props (client, phone, display_name, ai_enabled) que ese evento no manda.
		 */
		patchChatFromBroadcast(state, chat_patch) {
			let index = state.chats.findIndex(c => c.id == chat_patch.id)
			if (index != -1) {
				state.chats.splice(index, 1, Object.assign({}, state.chats[index], chat_patch))
			}
			state.chats.sort((a, b) => {
				return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
			})
		},
		setSelectedChatId(state, id) {
			state.selected_chat_id = id
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
		 * Agrega un mensaje nuevo al final (mensaje recién enviado o recibido por broadcast).
		 */
		appendMessage(state, message) {
			state.messages.push(message)
		},
		/**
		 * Actualiza un mensaje existente por id (ej: cambio de `delivery_status` por webhook de estado).
		 * Si no existe todavía en la conversación abierta, no hace nada.
		 */
		patchMessage(state, message) {
			let index = state.messages.findIndex(m => m.id == message.id)
			if (index != -1) {
				state.messages.splice(index, 1, Object.assign({}, state.messages[index], message))
			}
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
	},
	actions: {
		/**
		 * Carga la bandeja de chats (respeta `state.search_query`).
		 */
		getChats({ commit, state }) {
			commit('setLoadingChats', true)
			return axios.get('/api/whatsapp-chats', {
				params: {
					q: state.search_query || '',
				},
			})
				.then(res => {
					commit('setLoadingChats', false)
					commit('setChats', res.data.models)
				})
				.catch(err => {
					commit('setLoadingChats', false)
					console.log(err)
				})
		},
		/**
		 * Crea (o recupera, si ya existía) un chat por teléfono.
		 *
		 * @param {Object} payload { phone, client_id }
		 * @returns {Promise} resuelve con el chat creado/existente.
		 */
		createChat({ commit }, payload) {
			return axios.post('/api/whatsapp-chats', payload)
				.then(res => {
					commit('upsertChat', res.data.model)
					return res.data.model
				})
		},
		/**
		 * Trae una página de mensajes del chat indicado.
		 * page=1 reemplaza la conversación (apertura de chat); page>1 antepone (scroll hacia arriba).
		 *
		 * @param {Object} payload { chat_id, page }
		 */
		getMessages({ commit }, payload) {
			let chat_id = payload.chat_id
			let page = payload.page || 1
			if (page == 1) {
				commit('setLoadingMessages', true)
			} else {
				commit('setLoadingMoreMessages', true)
			}
			return axios.get('/api/whatsapp-chats/' + chat_id + '/messages', {
				params: {
					page: page,
				},
			})
				.then(res => {
					let paginator = res.data.models
					// El backend devuelve DESC (más nuevo primero); para renderizar de arriba a abajo
					// se necesita orden cronológico ascendente, así que se invierte cada página.
					let chronological_chunk = paginator.data.slice().reverse()
					if (page == 1) {
						commit('setMessages', chronological_chunk)
						commit('setLoadingMessages', false)
					} else {
						commit('prependMessages', chronological_chunk)
						commit('setLoadingMoreMessages', false)
					}
					commit('setMessagesPage', paginator.current_page)
					commit('setMessagesLastPage', paginator.last_page)
				})
				.catch(err => {
					commit('setLoadingMessages', false)
					commit('setLoadingMoreMessages', false)
					console.log(err)
				})
		},
		/**
		 * Envía un mensaje de texto libre. Si la ventana de 24 h está cerrada, el backend
		 * responde 422 con `code: 'fuera_de_ventana'` (el componente que llama decide qué mostrar).
		 *
		 * @param {Object} payload { chat_id, body }
		 */
		sendMessage({ commit }, payload) {
			return axios.post('/api/whatsapp-chats/' + payload.chat_id + '/messages', {
				body: payload.body,
			})
				.then(res => {
					commit('appendMessage', res.data.model)
					return res.data.model
				})
		},
		/**
		 * Envía una plantilla aprobada con sus variables.
		 *
		 * @param {Object} payload { chat_id, template_id, variables }
		 */
		sendTemplate({ commit }, payload) {
			return axios.post('/api/whatsapp-chats/' + payload.chat_id + '/send-template', {
				template_id: payload.template_id,
				variables: payload.variables,
			})
				.then(res => {
					commit('appendMessage', res.data.model)
					return res.data.model
				})
		},
		/**
		 * Prende/apaga la IA para un chat puntual.
		 */
		toggleAi({ commit }, chat_id) {
			return axios.put('/api/whatsapp-chats/' + chat_id + '/toggle-ai')
				.then(res => {
					commit('upsertChat', res.data.model)
					return res.data.model
				})
		},
		/**
		 * Vincula (o desvincula, con client_id null) un cliente del negocio al chat.
		 *
		 * @param {Object} payload { chat_id, client_id }
		 */
		linkClient({ commit }, payload) {
			return axios.put('/api/whatsapp-chats/' + payload.chat_id + '/link-client', {
				client_id: payload.client_id,
			})
				.then(res => {
					commit('upsertChat', res.data.model)
					return res.data.model
				})
		},
		/**
		 * Marca el chat como leído (limpia el badge de no leídos).
		 */
		markRead({ commit }, chat_id) {
			return axios.put('/api/whatsapp-chats/' + chat_id + '/read')
				.then(res => {
					commit('upsertChat', res.data.model)
					return res.data.model
				})
				.catch(err => {
					console.log(err)
				})
		},
		/**
		 * Pide a la IA una sugerencia de respuesta (no se envía ni se persiste).
		 */
		suggest(context, chat_id) {
			return axios.post('/api/whatsapp-chats/' + chat_id + '/suggest')
				.then(res => {
					return res.data.suggestion
				})
		},
		/**
		 * Pide a la IA un resumen de la conversación (no se persiste).
		 */
		summary(context, chat_id) {
			return axios.post('/api/whatsapp-chats/' + chat_id + '/summary')
				.then(res => {
					return res.data.summary
				})
		},
	},
}
