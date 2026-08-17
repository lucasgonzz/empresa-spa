import axios from 'axios'
import moment from 'moment'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

/**
 * ¿El chat está adentro de la ventana de 24 h de Meta, o sea que se le puede mandar texto
 * libre?
 *
 * 🔴 ES EL ESPEJO EXACTO de `WhatsappChat::is_within_service_window()` (empresa-api,
 * `app/Models/WhatsappChat.php:76-83`), y se calcula acá porque el modelo NO manda la
 * respuesta ya masticada: `WhatsappChat` no tiene `$appends` ni accessor de ventana, así que
 * lo único que viaja en el JSON es la columna `last_inbound_at` (verificado en el modelo y en
 * `WhatsappChatController::store()`, que devuelve `fullModel('WhatsappChat', ...)`, o sea el
 * modelo entero con sus columnas).
 *
 * Las dos mitades de la regla, y ninguna es de adorno:
 * - `last_inbound_at` en null ⇒ ventana CERRADA. Es el estado de TODO chat recién creado por
 *   un botón del sistema, que es exactamente el caso del aviso de una oferta: el comercio le
 *   escribe primero y el cliente todavía no contestó nunca.
 * - Pasadas 24 h desde el último entrante ⇒ cerrada.
 *
 * `moment().diff(..., 'hours')` trunca igual que el `diffInHours()` de Carbon, así que el
 * `< 24` corta en el mismo lugar de los dos lados. Y `last_inbound_at` viaja casteado a
 * datetime, o sea en ISO-8601 con zona: `moment()` lo lee como instante absoluto y no hay
 * corrimiento posible por zona horaria (es el mismo `moment(datetime)` que ya usa
 * `chats-list/ChatRow.vue` sobre `last_message_at`).
 *
 * @param {Object|null} chat Modelo de whatsapp_chats como lo devuelve el backend.
 * @returns {Boolean}
 */
function ventana_de_24h_abierta(chat) {
	if (!chat || !chat.last_inbound_at) {
		return false
	}
	return moment().diff(moment(chat.last_inbound_at), 'hours') < 24
}

/**
 * Cierra la pestaña que se había abierto por las dudas, si sigue viva.
 *
 * @param {Window|null} pestana
 * @returns {void}
 */
function cerrar_pestana(pestana) {
	if (pestana && !pestana.closed) {
		pestana.close()
	}
}

/**
 * Manda a la URL externa la pestaña que el click del operador ya abrió.
 *
 * 🔴 POR QUÉ LA PESTAÑA LLEGA ABIERTA Y VACÍA DESDE EL COMPONENTE, Y NO SE ABRE ACÁ.
 * Este código corre adentro de un `.then()`, o sea después de que la promesa del POST volvió,
 * y para entonces el navegador YA NO CONSIDERA que estamos atendiendo el click del operador:
 * un `window.open()` disparado ahí lo come el bloqueador de pop-ups y el aviso no sale nunca,
 * en silencio. Por eso el que atiende el click abre la pestaña en blanco SINCRÓNICAMENTE
 * —ahí el gesto todavía vale— y acá solo se la navega (o se la cierra, si al final el mensaje
 * sale por el agente). El precio es un parpadeo de pestaña en blanco en el caso en que no
 * hace falta; el precio de "simplificarlo" es un botón que no manda nada.
 *
 * @param {Window|null} pestana Pestaña abierta en el click, o null si el navegador no la dio.
 * @param {String} url
 * @returns {Boolean} false SOLO si había una URL para abrir y el navegador no dejó abrirla.
 */
function navegar_pestana(pestana, url) {
	if (!url) {
		// No puede pasar desde los botones de la oferta (no se dibujan sin `whatsapp_url`),
		// pero si pasara, la pestaña en blanco no se queda colgada.
		cerrar_pestana(pestana)
		return true
	}
	let destino = pestana
	if (!destino || destino.closed) {
		// La pestaña se pidió sincrónicamente y aun así no está: o el bloqueador ganó, o el
		// operador la cerró. Se reintenta —ya fuera del gesto, así que puede volver a fallar—
		// y si tampoco sale, el que llamó tiene que DECIRLO: un aviso que no salió no puede
		// terminar en silencio.
		destino = window.open(url, '_blank')
		if (!destino) {
			return false
		}
	}
	// Mismo `rel="noopener"` que lleva el `<a>` del repliegue: la pestaña externa no se queda
	// con una referencia viva a la ventana del ERP. Se anula ANTES de navegar, mientras la
	// pestaña todavía es `about:blank` y accesible.
	destino.opener = null
	destino.location.href = url
	return true
}

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
 *
 * Contrato agregado en la misión whatsapp-agente (confirmado contra empresa-api):
 * - POST   whatsapp-bot/simulate-inbound   -> 201 { model } (phone, body) | 403 no dueño | 429 throttle 10/min
 * - PUT    whatsapp-chats/messages/{id}/confirm -> { model } | 422 { code: 'ya_en_envio' | 'ya_no_esta_pendiente' | 'fuera_de_ventana' | 'envio_fallido' }
 * - DELETE whatsapp-chats/messages/{id}    -> { message } | 422 { code: 'ya_en_envio' | 'ya_no_esta_pendiente' }
 *
 * Contrato agregado en la misión whatsapp-sidebar-multimedia (confirmado contra empresa-api):
 * - POST   whatsapp-chats/{id}/media       -> 201 { model, enviado } (multipart: file, caption)
 *                                             | 422 { code: 'fuera_de_ventana' } | 422 { message } (tipo o tamaño)
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

		/*
			El sidebar de conversación se abre y se cierra desde acá, y no con una prop del
			componente, porque este store es un singleton: hay UNA sola `selected_chat_id` y UN
			solo array `messages` en toda la aplicación. Una prop `chat` sería una segunda fuente
			de verdad para lo mismo. Además el botón de Compradores despacha desde
			`mixins/model_functions.js`, donde no hay componente ni template en el que colgar una
			prop. Es el mismo camino que ya usa el asistente IA (`ai_chat.panel_abierto`).
		*/
		sidebar_abierto: false,
		// URL de la imagen que se está mirando a pantalla completa (null = visor cerrado).
		lightbox_url: null,

		/*
			Texto que el que abrió la conversación quiere dejar cargado en el composer (hoy: el
			mensaje de una oferta). `{chat_id, texto}` o null.

			Lleva el `chat_id` adentro porque entre que se deja y se lee puede haber un POST de
			por medio, y el composer tiene que poder confirmar que el borrador es de la
			conversación que está mirando.

			🔴 QUÉ PASA DE VERDAD CON ESTE VALOR, que hasta el 17/8/2026 este comentario contaba
			mal. Decía "es de UN SOLO USO: el composer lo consume y lo borra, así que no puede
			reaparecer al volver a este chat": lo segundo era mentira. `tomar_borrador()` se
			llamaba solo desde el `created()` y desde el watch de `chat_id`, y cuando el sidebar
			YA estaba abierto en ese mismo chat no corría ninguno de los dos (el componente ya
			existe y `selected_chat_id` no cambia de valor, así que Vue no dispara el watch). El
			borrador quedaba vivo en el state y aparecía escrito minutos después, la próxima vez
			que el operador saliera de ese chat y volviera.

			Hoy sí es de un solo uso, y es de un solo uso porque el composer lo mira en LOS TRES
			momentos en que puede llegar (ver el docblock de `tomar_borrador()` en
			`conversation/Composer.vue`). Además `abrirChat` lo pisa —con el borrador nuevo o
			con null— en cada apertura, así que ni siquiera un borrador que nadie llegó a
			consumir puede sobrevivir a la apertura siguiente.

			Lo que sí era verdad desde el principio, y lo sigue siendo: no se puede filtrar a
			otro chat. El composer solo se lo queda si el `chat_id` del borrador es el que tiene
			abierto.
		*/
		borrador: null,
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
		/**
		 * Saca un mensaje de la conversación abierta: el backend BORRA la fila cuando se
		 * descarta una respuesta del agente (`DELETE whatsapp-chats/messages/{id}`), así que
		 * acá no hay nada que actualizar, hay que sacarlo.
		 */
		removeMessage(state, message_id) {
			state.messages = state.messages.filter(m => m.id != message_id)
		},
		/**
		 * Saca de la conversación abierta TODAS las respuestas del agente que estaban esperando
		 * confirmación (`ai_status = 'a_confirmar'`).
		 *
		 * Espeja lo que hace `WhatsappChatHelper::discard_pending_ai_messages()` en el backend:
		 * cada vez que una persona interviene en el chat —contesta a mano, manda una plantilla o
		 * apaga la IA— esas filas se BORRAN, para que la IA no crea que ya contestó y para que
		 * nadie vea en la conversación un mensaje que el cliente jamás recibió. El broadcast de
		 * ese borrado viaja sin mensaje adjunto (no se puede "actualizar" una fila que ya no
		 * existe), así que sin este espejo el globo pendiente quedaba colgado en pantalla hasta
		 * recargar.
		 */
		removePendingAiMessages(state) {
			state.messages = state.messages.filter(m => m.ai_status != 'a_confirmar')
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
		setSidebarAbierto(state, value) {
			state.sidebar_abierto = !!value
		},
		/**
		 * Abre (con una URL) o cierra (con null) el visor de imagen a pantalla completa.
		 */
		setLightboxUrl(state, value) {
			state.lightbox_url = value || null
		},
		/**
		 * Deja (con `{chat_id, texto}`) o consume (con null) el borrador del composer.
		 *
		 * @param {Object|null} value
		 */
		setBorrador(state, value) {
			state.borrador = value || null
		},
	},
	getters: {
		/**
		 * Chat abierto en el panel de conversación (null si no hay ninguno seleccionado).
		 */
		selected_chat(state) {
			if (!state.selected_chat_id) {
				return null
			}
			return state.chats.find(c => c.id == state.selected_chat_id) || null
		},
		/**
		 * El chat abierto está en modo simulación: su último mensaje entrante lo inyectó el
		 * dueño desde "Simular mensaje" y no lo escribió el cliente.
		 *
		 * Mientras esté así, el backend FRENA todo envío de texto o documento hacia WhatsApp
		 * (`WhatsappBotSendService::chat_en_simulacion()`): la fila se guarda igual y se ve en
		 * la conversación, pero al cliente no le llega nada. Es lo que el composer y las
		 * burbujas tienen que avisar.
		 *
		 * 🔴 Se mira PRIMERO el último entrante ya cargado en la conversación y recién después
		 * la columna `last_inbound_simulated` del chat, y el orden no es un detalle: el
		 * broadcast `WhatsappChatUpdated` manda un chat liviano (solo id, unread_count y
		 * last_message_at) que NO trae esa columna, así que cuando el cliente escribe de verdad
		 * y el chat sale de simulación, la marca del chat se queda vieja hasta la próxima
		 * recarga de la bandeja. El mensaje, en cambio, viaja entero con su `is_simulated`, así
		 * que mirándolo a él la conversación abierta se corrige sola.
		 *
		 * Las comparaciones van con `==` a propósito: `is_simulated` llega booleano (está
		 * casteado en el modelo) pero `last_inbound_simulated` no lo está y puede llegar como
		 * 0/1. Con `==` los dos casos salen bien, y `'0'` —que sería `true` con `!!`— también.
		 */
		chat_en_simulacion(state, getters) {
			for (let i = state.messages.length - 1; i >= 0; i--) {
				if (state.messages[i].direction == 'in') {
					return state.messages[i].is_simulated == 1
				}
			}
			let chat = getters.selected_chat
			return !!chat && chat.last_inbound_simulated == 1
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
		 * Deja el sidebar abierto y parado en una conversación. Es la única puerta de entrada
		 * al sidebar desde el resto del sistema (bandeja, Clientes, Pedidos, Compradores).
		 *
		 * 🔴 Acá NO se cargan los mensajes ni se marca leído a propósito. Eso lo dispara el
		 * `watch` de `selected_chat_id` que vive adentro de `conversation/Index.vue`: si la
		 * carga la hiciera cada quien que selecciona un chat, volveríamos a tener el trío
		 * `setSelectedChatId` + `setMessages([])` + `getMessages()` copiado en cada llamador —
		 * que es exactamente el acoplamiento que este refactor viene a sacar, y el motivo por
		 * el que entrar por link directo a /whatsapp/{id} abría la conversación vacía.
		 *
		 * Con `phone` no hace falta chequear antes si el chat existe: `createChat` es
		 * idempotente por teléfono (el backend busca por `user_id` + `phone` y solo crea si no
		 * lo encuentra), así que despachar y abrir alcanza.
		 *
		 * 🔴 EL PAYLOAD SE REARMA CAMPO POR CAMPO, ASÍ QUE UN CAMPO NUEVO HAY QUE AGREGARLO ACÁ
		 * TAMBIÉN. No es paranoia: `display_name` se agregó en los tres botones, en el mixin, en
		 * la validación del endpoint y en la columna, y aun así el contacto seguía apareciendo
		 * como un número pelado — porque esta función lo descartaba en silencio antes del POST.
		 * Si mañana se suma otro dato del contacto y solo se toca el botón, va a pasar lo mismo.
		 *
		 * @param {Object} payload { chat_id } o { phone, client_id, display_name }
		 * @param {string} [payload.borrador] Texto para dejar escrito en el composer al abrir
		 *                                    (hoy: el mensaje de una oferta). NO viaja al backend.
		 * @returns {Promise} resuelve con el id del chat abierto.
		 */
		abrirChat({ commit, dispatch }, payload) {
			// El borrador se commitea ANTES de seleccionar el chat, en las dos ramas: el composer lo
			// busca tanto en su created() como en su watch de chat_id, y los dos corren después.
			if (payload.chat_id) {
				commit('setBorrador', payload.borrador ? {chat_id: payload.chat_id, texto: payload.borrador} : null)
				commit('setSelectedChatId', payload.chat_id)
				commit('setSidebarAbierto', true)
				return Promise.resolve(payload.chat_id)
			}
			let self_commit = commit
			let borrador = payload.borrador || ''
			// 🔴 `borrador` NO viaja en este POST: `WhatsappChatController::store()` espera phone,
			// client_id y display_name, y nada más. Es el mismo campo-por-campo que el docblock de
			// arriba avisa, mirado del otro lado: lo que va al backend se elige a mano, y lo que es
			// del front se queda acá.
			return dispatch('createChat', {
				phone: payload.phone,
				client_id: payload.client_id || null,
				display_name: payload.display_name || null,
			})
				.then(function (model) {
					self_commit('setBorrador', borrador ? {chat_id: model.id, texto: borrador} : null)
					self_commit('setSelectedChatId', model.id)
					self_commit('setSidebarAbierto', true)
					return model.id
				})
		},
		/**
		 * Abre la conversación en el sidebar SOLO si el agente la puede entregar de verdad; si
		 * no, manda el aviso por el link externo de WhatsApp, que es el camino que siempre
		 * funcionó.
		 *
		 * 🔴 EL PORQUÉ, QUE ES TODO EL PUNTO DE ESTA ACCIÓN.
		 * El aviso de una oferta es un mensaje SALIENTE EN FRÍO: el comercio le escribe primero
		 * al cliente. Pero el agente sale por la Cloud API de Meta, y ahí un saliente en frío no
		 * se puede mandar: `WhatsappChatController::send_message()` corta con 422
		 * `fuera_de_ventana` cuando `is_within_service_window()` da false, y eso pasa SIEMPRE en
		 * un chat recién creado, porque `last_inbound_at` viene en null. O sea que abrir el
		 * sidebar con el mensaje escrito, tal cual, terminaba con el operador apretando Enter y
		 * comiéndose "pasaron más de 24 h desde el último mensaje del cliente", con el texto
		 * descartado. El link externo que este botón reemplazó abría el WhatsApp propio del
		 * comerciante y NO tiene esa restricción: el mensaje salía.
		 *
		 * Por eso el repliegue cubre DOS condiciones y no una: sin la extensión `whatsapp` (eso
		 * lo decide el componente, que es el que tiene `hasExtencion`) O con la ventana de 24 h
		 * cerrada (eso se decide acá). El sidebar queda para cuando el mensaje va a salir.
		 *
		 * 🔴 LA VENTANA NO SE PUEDE SABER ANTES DE TENER EL CHAT, y por eso hay un POST de por
		 * medio aunque después no usemos el sidebar. `createChat` es idempotente por teléfono
		 * (el backend busca por `user_id` + `phone` y solo crea si no lo encuentra), así que
		 * pedirlo no duplica nada: deja la conversación armada para cuando el cliente conteste,
		 * y de paso devuelve el `last_inbound_at` que es lo único que contesta la pregunta.
		 * Si el POST falla, el aviso NO se pierde: se cae al link externo igual.
		 *
		 * @param {Object} payload
		 * @param {String} payload.phone Teléfono normalizado (solo dígitos).
		 * @param {Number|null} payload.client_id
		 * @param {String|null} payload.display_name
		 * @param {String} payload.borrador Texto a dejar escrito en el composer.
		 * @param {String} payload.url_externa El `whatsapp_url` de la oferta (el repliegue).
		 * @param {Window|null} payload.pestana Pestaña que el componente abrió en el click, para
		 *                                      esquivar el bloqueador de pop-ups (ver
		 *                                      `navegar_pestana()`).
		 * @returns {Promise} resuelve con {por_el_agente, link_bloqueado}. `link_bloqueado` es
		 *                    true cuando había que abrir la pestaña externa y el navegador no
		 *                    dejó: el que llama tiene que avisarlo en pantalla.
		 */
		abrirChatOLinkExterno({ dispatch }, payload) {
			let pestana = payload.pestana || null
			let url = payload.url_externa || ''
			let borrador = payload.borrador || ''
			return dispatch('createChat', {
				phone: payload.phone,
				client_id: payload.client_id || null,
				display_name: payload.display_name || null,
			})
				.catch(function (err) {
					// Un chat que no se pudo crear se trata igual que una ventana cerrada: no
					// hay agente posible, pero el aviso tiene que salir igual.
					console.log(err)
					return null
				})
				.then(function (model) {
					if (!ventana_de_24h_abierta(model)) {
						return {
							por_el_agente: false,
							link_bloqueado: !navegar_pestana(pestana, url),
						}
					}
					cerrar_pestana(pestana)
					return dispatch('abrirChat', {
						chat_id: model.id,
						borrador: borrador,
					})
						.then(function () {
							return {
								por_el_agente: true,
								link_bloqueado: false,
							}
						})
				})
		},
		/**
		 * Trae una página de mensajes del chat indicado.
		 * page=1 reemplaza la conversación (apertura de chat); page>1 antepone (scroll hacia arriba).
		 *
		 * @param {Object} payload { chat_id, page, silent }
		 * @param {boolean} payload.silent Recarga la página 1 SIN prender el indicador de carga.
		 *                                 Se usa para reconciliar la conversación con la base
		 *                                 (ver `Messages.vue`) cuando ya hay mensajes en
		 *                                 pantalla: con el indicador prendido la conversación
		 *                                 entera parpadeaba a "Cargando mensajes..." por una
		 *                                 recarga que el operador ni pidió.
		 */
		getMessages({ commit }, payload) {
			let chat_id = payload.chat_id
			let page = payload.page || 1
			let silent = !!payload.silent
			if (page == 1) {
				if (!silent) {
					commit('setLoadingMessages', true)
				}
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
					// El backend descarta las respuestas del agente que esperaban confirmación
					// ANTES de mandar lo que escribió el operador (es una intervención humana:
					// si no, el cliente recibiría dos respuestas descoordinadas). Se espeja acá
					// porque esas filas ya no existen en la base.
					commit('removePendingAiMessages')
					commit('appendMessage', res.data.model)
					return res.data.model
				})
		},
		/**
		 * Manda una foto o una nota de voz que el operador armó en el composer.
		 *
		 * Es el único envío del módulo que NO viaja como JSON: el archivo es binario, así que
		 * va en un `FormData` (multipart). El `Content-Type` con el boundary lo pone axios solo
		 * al detectar el FormData; declararlo a mano rompe el multipart porque el boundary se
		 * pierde.
		 *
		 * Devuelve `res.data` entero y no solo el modelo, a diferencia de `sendMessage`: el
		 * backend contesta `201 { model, enviado }` y el componente necesita los dos, `model`
		 * para dibujar la burbuja y `enviado` para saber si el archivo SALIÓ de verdad hacia
		 * WhatsApp (la fila se guarda igual cuando no sale).
		 *
		 * Sin `.catch()` a propósito, igual que `sendMessage`: los 422 —`fuera_de_ventana`, el
		 * tipo de archivo y el tamaño— los tiene que poder distinguir el componente para decir
		 * algo distinto en cada caso.
		 *
		 * @param {Object} payload { chat_id, file, caption }
		 * @param {File} payload.file Archivo a mandar (imagen o audio ogg de una nota de voz).
		 * @param {string} payload.caption Epígrafe, solo para imágenes (el audio no acepta).
		 * @returns {Promise} resuelve con { model, enviado }.
		 */
		sendMedia({ commit }, payload) {
			let form_data = new FormData()
			form_data.append('file', payload.file)
			form_data.append('caption', payload.caption || '')
			return axios.post('/api/whatsapp-chats/' + payload.chat_id + '/media', form_data)
				.then(res => {
					// Misma intervención humana que en sendMessage(): el backend descarta las
					// respuestas del agente que esperaban confirmación antes de mandar el
					// archivo, así que esas filas ya no existen en la base.
					commit('removePendingAiMessages')
					commit('appendMessage', res.data.model)
					return res.data
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
					// Misma intervención humana que en sendMessage(): el backend borra lo que
					// el agente dejó esperando confirmación antes de mandar la plantilla.
					commit('removePendingAiMessages')
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
					// Apagar la IA del chat también es una intervención humana y el backend
					// descarta ahí mismo lo que el agente dejó esperando confirmación
					// (`WhatsappChatController::toggle_ai()`). Al prender no hay nada que sacar.
					if (!res.data.model.ai_enabled) {
						commit('removePendingAiMessages')
					}
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
		/**
		 * Inyecta un mensaje entrante como si lo hubiera escrito el cliente por WhatsApp
		 * (misión whatsapp-agente). Solo el dueño puede: el backend devuelve 403 al resto.
		 *
		 * El mensaje recorre el mismo camino que uno real (persistencia, ventana de 24 h,
		 * agrupación con su demora y agente), pero queda marcado como simulado y lo que el
		 * agente conteste NO sale hacia WhatsApp. La respuesta 201 trae el chat completo, así
		 * que se hace upsert en la bandeja: viene con `last_inbound_simulated` ya en true.
		 *
		 * Sin `.catch()` a propósito: el 429 del throttle (10 por minuto) y el 403 los tiene
		 * que poder distinguir el componente para decir algo distinto en cada caso.
		 *
		 * @param {Object} payload { phone, body }
		 * @returns {Promise} resuelve con el chat (o null si el backend no lo pudo recuperar).
		 */
		simulateInbound({ commit }, payload) {
			return axios.post('/api/whatsapp-bot/simulate-inbound', {
				phone: payload.phone,
				body: payload.body,
			})
				.then(res => {
					if (res.data.model) {
						commit('upsertChat', res.data.model)
					}
					return res.data.model
				})
		},
		/**
		 * Confirma y manda ahora una respuesta del agente que estaba esperando aprobación.
		 * Devuelve el mensaje ya actualizado (`ai_status = 'enviado'`).
		 *
		 * Sin `.catch()`: los 422 con `code` ('ya_en_envio', 'ya_no_esta_pendiente',
		 * 'fuera_de_ventana', 'envio_fallido') los interpreta el componente.
		 *
		 * @param {number} message_id
		 */
		confirmAiMessage({ commit }, message_id) {
			return axios.put('/api/whatsapp-chats/messages/' + message_id + '/confirm')
				.then(res => {
					commit('patchMessage', res.data.model)
					return res.data.model
				})
		},
		/**
		 * Descarta una respuesta del agente que estaba esperando aprobación: el backend cancela
		 * el auto-envío y BORRA la fila, así que acá se saca de la conversación.
		 *
		 * @param {number} message_id
		 */
		discardAiMessage({ commit }, message_id) {
			return axios.delete('/api/whatsapp-chats/messages/' + message_id)
				.then(res => {
					commit('removeMessage', message_id)
					return res.data
				})
		},
	},
}
