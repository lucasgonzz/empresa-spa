import axios from 'axios'
import moment from 'moment'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

/**
 * Store del submódulo "Mensajes" de Tienda Online (misión mensajes-tienda-online, 28/9/2026): la
 * bandeja de conversaciones con los compradores de la tienda, el resumen que alimenta los badges,
 * la lista de chats sin leer que muestra Alertas y la conversación abierta en el sidebar.
 *
 * Reemplaza a `store/message.js`, que armaba la bandeja bajando TODOS los compradores al iniciar
 * sesión (GET /api/buyer entero) y filtrando en el navegador. Acá la bandeja viene paginada y ya
 * armada del backend, y lo que pasa en vivo llega por broadcast.
 *
 * No usa el factory `__base_store` por lo mismo que `store/whatsapp_chat.js`: no es un ABM, es una
 * bandeja con paginado propio más una conversación con su propio paginado hacia atrás.
 *
 * Contrato de API (C3 del plan de la misión, lo expone `TiendaChatController` de empresa-api):
 * - GET  tienda-chats?page=&buscar=&solo_no_leidos=0|1
 *        -> { data: [Chat], current_page, last_page, per_page, total }   (30 por página)
 * - GET  tienda-chats/resumen
 *        -> { chats_no_leidos, mensajes_no_leidos, conversaciones_hoy }
 * - GET  tienda-chats/{buyer_id}/mensajes?page=
 *        -> { data: [Mensaje], current_page, last_page, buyer }          (40 por página; la 1 es
 *           la más reciente y ADENTRO de cada página van del más viejo al más nuevo) | 404
 * - POST tienda-chats/{buyer_id}/mensajes  { text }  -> 201 { message } | 422 | 404
 * - POST tienda-chats/{buyer_id}/leer                 -> { unread_count: 0 } | 404
 *
 * Chat    = { buyer_id, buyer, unread_count, messages_count, last_message_at, last_message }
 * Mensaje = { id, buyer_id, user_id, text, type, from_buyer, read, article_id, order_id,
 *             created_at, article }
 *
 * El broadcast (C1) lo escucha `mensajes/SidebarHost.vue` y lo aplica con `aplicarBroadcast`.
 */

/**
 * Opciones de axios de TODOS los pedidos de este store.
 *
 * `skip_navigation_cancel`: el sidebar vive en App.vue y la conversación se abre desde Clientes,
 * Alertas o el toast, así que cambiar de pantalla con un pedido en vuelo es el uso normal y no
 * tiene por qué cancelarlo (mismo criterio que `store/whatsapp_chat.js`, ver main.js).
 */
const OPCIONES_BASE = { skip_navigation_cancel: true }

/**
 * Para los pedidos que el usuario no pidió (el resumen del arranque, las recargas al reconectar,
 * la lista de Alertas): si fallan no tienen por qué tirarle un cartel de error encima. Los envíos
 * también van así, porque el composer muestra su propio aviso y sin esto salían dos.
 */
const OPCIONES_SILENCIOSAS = {
	skip_navigation_cancel: true,
	skip_global_error_event: true,
	skip_global_validation_toast: true,
}

// Largo del preview del último mensaje en la fila de la bandeja. El listado ya lo manda recortado
// a 200; el broadcast manda hasta 2000, así que se recorta acá para que la fila pese lo mismo.
const LARGO_PREVIEW = 200

// Espera antes de volver a pedir el resumen cuando no se lo puede recalcular en memoria: junta en
// un solo pedido la ráfaga de eventos que llega cuando varios compradores escriben a la vez.
const ESPERA_RESUMEN_MS = 800

/*
	Estado de módulo (no reactivo a propósito: no lo lee ningún template).

	`generacion` sube en cada `reset` (cambio de comercio en la misma pestaña). Todo pedido anota
	la generación con la que salió y, si al volver ya es otra, se descarta: la respuesta es de un
	comercio que ya no es el que está mirando la pantalla.

	`pedido_de_chats` y `pedido_de_mensajes` son correlativos para descartar respuestas viejas: si
	el operador busca "ana" y enseguida "anabela", la respuesta de "ana" no puede pisar la otra
	aunque llegue última.

	`version_de_eventos` sube con cada broadcast aplicado: si mientras viajaba el pedido del resumen
	llegó un evento, lo que vuelve puede no incluirlo y se pide otra vez.
*/
let generacion = 0
let pedido_de_chats = 0
let pedido_de_mensajes = 0
let version_de_eventos = 0
let temporizador_resumen = null

function estado_inicial() {
	return {
		// --- Bandeja ------------------------------------------------------------------------
		// Conversaciones cargadas, ordenadas por el id del último mensaje (más reciente arriba),
		// igual que las devuelve el backend.
		chats: [],
		// Última página de la bandeja ya cargada (0 = ninguna todavía).
		chats_page: 0,
		// Última página que existe según el backend (null hasta la primera carga).
		chats_last_page: null,
		// Primera página en vuelo (no silenciosa): "Cargando conversaciones...".
		chats_loading: false,
		// Página siguiente en vuelo (scroll infinito hacia abajo).
		chats_loading_more: false,
		// true una vez que la bandeja se pidió al menos una vez: la recarga al reconectar solo
		// tiene sentido si alguien la está usando.
		chats_cargados: false,
		// Total de conversaciones del comercio (el `total` del listado SIN filtros). null hasta
		// saberlo: una búsqueda activa no dice cuántas hay en total.
		total_conversaciones: null,
		// Texto del buscador (pega a `?buscar=`).
		buscar: '',
		// Filtro "Sin leer" (pega a `?solo_no_leidos=1`).
		solo_no_leidos: false,

		// --- Resumen (badges) ---------------------------------------------------------------
		resumen: {
			chats_no_leidos: 0,
			mensajes_no_leidos: 0,
			conversaciones_hoy: 0,
		},
		resumen_cargado: false,
		// Día (YYYY-MM-DD) en que se pidió el resumen: pasada la medianoche `conversaciones_hoy`
		// ya no se puede ajustar en memoria y se vuelve a pedir.
		resumen_dia: null,

		// --- Chats sin leer (Alertas → Mensajes) ---------------------------------------------
		// Lista APARTE de la bandeja a propósito: Alertas no puede pisar lo que el operador tiene
		// buscado o filtrado en la bandeja, ni al revés.
		chats_no_leidos: [],
		chats_no_leidos_total: 0,
		chats_no_leidos_cargados: false,

		// --- Sidebar y conversación ---------------------------------------------------------
		// El sidebar se abre y se cierra desde acá, igual que el de WhatsApp: hay UNA sola
		// conversación abierta en toda la aplicación y se abre desde cualquier pantalla con
		// `abrir_chat_tienda()` (mixin global de route_functions.js).
		sidebar_abierto: false,
		selected_buyer_id: null,
		// Datos del comprador abierto cuando no están en la bandeja (se abrió desde Clientes, desde
		// Alertas o desde el toast antes de entrar al submódulo). Se completa con el `buyer` que
		// devuelve el pedido de mensajes.
		selected_buyer: null,

		// Mensajes de la conversación abierta, del más viejo al más nuevo.
		messages: [],
		// Última página de mensajes ya cargada (1 = la más reciente; 0 = ninguna).
		messages_page: 0,
		messages_last_page: null,
		messages_loading: false,
		messages_loading_more: false,
		// true mientras viaja el envío de un mensaje (deshabilita el composer).
		sending: false,
	}
}

/**
 * @param {*} valor
 * @returns {Number} el entero, o 0 si no es un número.
 */
function entero(valor) {
	let numero = parseInt(valor, 10)
	return isNaN(numero) ? 0 : numero
}

/**
 * Misma regla que `es_verdadero()` de `mensajes/helpers.js` (se repite porque el store no importa
 * de componentes): true, 1 o '1'.
 *
 * @param {*} valor
 * @returns {Boolean}
 */
function booleano(valor) {
	return valor === true || valor === 1 || valor === '1'
}

/**
 * Se queda solo con lo que la bandeja y el header dibujan. El comprador que llega desde la tabla
 * de Clientes trae el modelo entero (vendedor, direcciones, contraseña visible...), y eso no
 * tiene por qué quedar colgado en este store.
 *
 * @param {Object|null} buyer
 * @returns {Object|null}
 */
function buyer_liviano(buyer) {
	if (!buyer) {
		return null
	}
	let liviano = {
		id: buyer.id,
		name: buyer.name || '',
		surname: buyer.surname || '',
		email: buyer.email || '',
		phone: buyer.phone || '',
	}
	// El vínculo con un cliente del sistema viene en el listado y en la conversación, pero NO en
	// el broadcast: solo se copia si vino, para no pisar con null uno que ya se conocía.
	if (typeof buyer.comercio_city_client_id != 'undefined') {
		liviano.comercio_city_client_id = buyer.comercio_city_client_id
	}
	if (typeof buyer.comercio_city_client != 'undefined') {
		liviano.comercio_city_client = buyer.comercio_city_client
	}
	return liviano
}

/**
 * El último mensaje tal como lo guarda la fila de la bandeja (misma forma que `last_message` del
 * listado).
 *
 * @param {Object} message Mensaje completo (del broadcast o de la respuesta del envío).
 * @returns {Object}
 */
function ultimo_mensaje_liviano(message) {
	let texto = message.text ? String(message.text) : ''
	return {
		id: message.id,
		text: texto.length > LARGO_PREVIEW ? texto.substr(0, LARGO_PREVIEW) : texto,
		from_buyer: booleano(message.from_buyer),
		read: booleano(message.read),
		type: message.type || null,
		created_at: message.created_at,
	}
}

/**
 * Clave de orden de la bandeja: el id del último mensaje, que es lo que usa el backend. Se ordena
 * por id y no por fecha porque dos mensajes del mismo segundo empatan en fecha y no en id.
 *
 * @param {Object} chat
 * @returns {Number}
 */
function id_del_ultimo_mensaje(chat) {
	return chat && chat.last_message ? entero(chat.last_message.id) : 0
}

function ordenar_chats(chats) {
	chats.sort(function (a, b) {
		return id_del_ultimo_mensaje(b) - id_del_ultimo_mensaje(a)
	})
}

/**
 * @param {String|null} fecha
 * @returns {Boolean}
 */
function es_de_hoy(fecha) {
	return !!fecha && moment(fecha).isSame(moment(), 'day')
}

/**
 * Lo que se sabe de un comprador ANTES de aplicar un evento: su fila de la bandeja, o la de la
 * lista de sin leer de Alertas. Si no está en ninguna pero la bandeja está entera cargada y sin
 * filtros, tampoco existe en el backend: no tenía mensajes, así que se lo trata como "cero sin
 * leer, sin actividad". Si no, devuelve null (no se sabe) y el resumen se vuelve a pedir.
 *
 * @param {Object} state
 * @param {Number} buyer_id
 * @returns {Object|null} `{unread_count, last_message_at}` o null.
 */
function fila_conocida(state, buyer_id) {
	let fila = state.chats.find(c => c.buyer_id == buyer_id)
	if (fila) {
		return fila
	}
	fila = state.chats_no_leidos.find(c => c.buyer_id == buyer_id)
	if (fila) {
		return fila
	}
	if (bandeja_completa_sin_filtros(state)) {
		return { unread_count: 0, last_message_at: null }
	}
	return null
}

/**
 * La bandeja tiene TODAS las conversaciones del comercio: se cargó, no hay filtros y no quedan
 * páginas por pedir.
 *
 * @param {Object} state
 * @returns {Boolean}
 */
function bandeja_completa_sin_filtros(state) {
	return state.chats_cargados
		&& !hay_filtros(state)
		&& !!state.chats_last_page
		&& state.chats_page >= state.chats_last_page
}

function hay_filtros(state) {
	return !!String(state.buscar || '').trim() || !!state.solo_no_leidos
}

/**
 * Una fila que la bandeja no tenía, ¿se agrega? Solo si no contradice lo que el operador está
 * mirando: con una búsqueda escrita no se sabe si el comprador coincide (lo decide el LIKE del
 * backend), y con "Sin leer" prendido solo entra si tiene algo sin leer.
 *
 * @param {Object} state
 * @param {Number} unread_count
 * @returns {Boolean}
 */
function puede_insertarse_en_la_bandeja(state, unread_count) {
	if (String(state.buscar || '').trim()) {
		return false
	}
	if (state.solo_no_leidos && unread_count <= 0) {
		return false
	}
	return true
}

export default {
	namespaced: true,
	state: estado_inicial(),
	mutations: {
		/**
		 * Vuelve todo a cero. Lo llama el anfitrión cuando cambia el comercio en la misma pestaña
		 * (cierre de sesión y entrada de otro) o cuando se pierde el permiso: lo que haya en
		 * memoria es de otro negocio y no puede quedar a la vista.
		 */
		reset(state) {
			generacion++
			clearTimeout(temporizador_resumen)
			temporizador_resumen = null
			Object.assign(state, estado_inicial())
		},

		// --- Bandeja --------------------------------------------------------------------------
		setBuscar(state, value) {
			state.buscar = value || ''
		},
		setSoloNoLeidos(state, value) {
			state.solo_no_leidos = !!value
		},
		setChatsLoading(state, value) {
			state.chats_loading = !!value
		},
		setChatsLoadingMore(state, value) {
			state.chats_loading_more = !!value
		},
		setChatsPaginas(state, payload) {
			state.chats_page = entero(payload.page)
			state.chats_last_page = payload.last_page ? entero(payload.last_page) : null
		},
		setChatsCargados(state, value) {
			state.chats_cargados = !!value
		},
		setTotalConversaciones(state, value) {
			state.total_conversaciones = value === null ? null : entero(value)
		},
		/**
		 * Reemplaza la bandeja por la primera página que acaba de llegar.
		 */
		setChats(state, chats) {
			let lista = Array.isArray(chats) ? chats.slice() : []
			ordenar_chats(lista)
			state.chats = lista
		},
		/**
		 * Agrega una página siguiente (scroll infinito).
		 *
		 * 🔴 Sin duplicar: el paginado es por posición, y cada conversación que sube a la cabeza
		 * por un mensaje nuevo corre a las demás un lugar hacia abajo. La que quedaba última en la
		 * página ya cargada reaparece primera en la siguiente. Si ya está, se queda la versión con
		 * el último mensaje más nuevo.
		 */
		agregarChats(state, chats) {
			let lista = state.chats.slice()
			let pagina = Array.isArray(chats) ? chats : []
			pagina.forEach(chat => {
				let index = lista.findIndex(c => c.buyer_id == chat.buyer_id)
				if (index == -1) {
					lista.push(chat)
				} else if (id_del_ultimo_mensaje(chat) > id_del_ultimo_mensaje(lista[index])) {
					lista.splice(index, 1, chat)
				}
			})
			ordenar_chats(lista)
			state.chats = lista
		},
		/**
		 * Recarga silenciosa de la primera página (al reconectar Echo): refresca las filas que
		 * vinieron sin tirar las páginas de más abajo que el operador ya había cargado con el
		 * scroll, para que la lista no le salte debajo del mouse.
		 */
		fusionarChats(state, chats) {
			let frescos = Array.isArray(chats) ? chats : []
			let ids_frescos = frescos.map(c => c.buyer_id)
			let lista = state.chats.filter(c => ids_frescos.indexOf(c.buyer_id) == -1).concat(frescos)
			ordenar_chats(lista)
			state.chats = lista
		},
		/**
		 * Inserta o actualiza UNA fila (por `buyer_id`) y reordena. Merge superficial: conserva lo
		 * que el payload del broadcast no manda (el vínculo con el cliente del sistema, por ejemplo).
		 */
		upsertChat(state, chat) {
			if (!chat || !chat.buyer_id) {
				return
			}
			let lista = state.chats.slice()
			let index = lista.findIndex(c => c.buyer_id == chat.buyer_id)
			if (index == -1) {
				lista.unshift(chat)
			} else {
				lista.splice(index, 1, Object.assign({}, lista[index], chat))
			}
			ordenar_chats(lista)
			state.chats = lista
		},

		// --- Resumen --------------------------------------------------------------------------
		setResumen(state, datos) {
			let resumen = datos || {}
			state.resumen = {
				chats_no_leidos: entero(resumen.chats_no_leidos),
				mensajes_no_leidos: entero(resumen.mensajes_no_leidos),
				conversaciones_hoy: entero(resumen.conversaciones_hoy),
			}
			state.resumen_cargado = true
			state.resumen_dia = moment().format('YYYY-MM-DD')
		},
		/**
		 * Suma (o resta) a los tres contadores lo que cambió con un evento. Nunca baja de cero: un
		 * evento repetido o uno que llegó antes que el resumen no puede dejar un badge en -1.
		 *
		 * @param {Object} state
		 * @param {Object} delta `{chats_no_leidos, mensajes_no_leidos, conversaciones_hoy}`
		 */
		ajustarResumen(state, delta) {
			let cambio = delta || {}
			state.resumen = {
				chats_no_leidos: Math.max(0, state.resumen.chats_no_leidos + entero(cambio.chats_no_leidos)),
				mensajes_no_leidos: Math.max(0, state.resumen.mensajes_no_leidos + entero(cambio.mensajes_no_leidos)),
				conversaciones_hoy: Math.max(0, state.resumen.conversaciones_hoy + entero(cambio.conversaciones_hoy)),
			}
		},

		// --- Chats sin leer (Alertas) ---------------------------------------------------------
		setChatsNoLeidos(state, payload) {
			let lista = Array.isArray(payload.data) ? payload.data.slice() : []
			ordenar_chats(lista)
			state.chats_no_leidos = lista
			state.chats_no_leidos_total = entero(payload.total || lista.length)
			state.chats_no_leidos_cargados = true
		},
		upsertChatNoLeido(state, chat) {
			let lista = state.chats_no_leidos.slice()
			let index = lista.findIndex(c => c.buyer_id == chat.buyer_id)
			if (index == -1) {
				lista.unshift(chat)
				state.chats_no_leidos_total++
			} else {
				lista.splice(index, 1, Object.assign({}, lista[index], chat))
			}
			ordenar_chats(lista)
			state.chats_no_leidos = lista
		},
		quitarChatNoLeido(state, buyer_id) {
			let index = state.chats_no_leidos.findIndex(c => c.buyer_id == buyer_id)
			if (index == -1) {
				return
			}
			state.chats_no_leidos.splice(index, 1)
			state.chats_no_leidos_total = Math.max(0, state.chats_no_leidos_total - 1)
		},

		// --- Sidebar y conversación -----------------------------------------------------------
		setSidebarAbierto(state, value) {
			state.sidebar_abierto = !!value
		},
		setSelectedBuyerId(state, value) {
			state.selected_buyer_id = value || null
		},
		setSelectedBuyer(state, value) {
			state.selected_buyer = value || null
		},
		setMessages(state, value) {
			state.messages = Array.isArray(value) ? value.slice() : []
		},
		/**
		 * Antepone una página más vieja. Sin duplicar, por el mismo corrimiento que la bandeja:
		 * cada mensaje nuevo que entró desde la primera carga empuja uno hacia la página siguiente.
		 */
		prependMessages(state, value) {
			let ids = state.messages.map(m => m.id)
			let viejos = (value || []).filter(m => ids.indexOf(m.id) == -1)
			state.messages = viejos.concat(state.messages)
		},
		/**
		 * Agrega un mensaje al final (el recién enviado, o uno que llegó por broadcast). Si ya
		 * está, lo actualiza en su lugar: el broadcast del mensaje que mandó este mismo operador
		 * puede llegar antes o después de la respuesta del POST, y no puede quedar dos veces.
		 */
		appendMessage(state, message) {
			if (!message || !message.id) {
				return
			}
			let index = state.messages.findIndex(m => m.id == message.id)
			if (index == -1) {
				state.messages.push(message)
			} else {
				state.messages.splice(index, 1, Object.assign({}, state.messages[index], message))
			}
		},
		/**
		 * Recarga silenciosa de la página 1 de la conversación (reconexión, o un mensaje que llegó
		 * recortado por el broadcast): la página fresca reemplaza a los mensajes que cubre y se
		 * conservan los más viejos que el operador ya había cargado scrolleando hacia arriba.
		 */
		fusionarMessages(state, value) {
			let frescos = Array.isArray(value) ? value : []
			if (!frescos.length) {
				state.messages = []
				return
			}
			let id_minimo = frescos.reduce((minimo, m) => Math.min(minimo, entero(m.id)), Infinity)
			let viejos = state.messages.filter(m => entero(m.id) < id_minimo)
			state.messages = viejos.concat(frescos)
		},
		setMessagesPaginas(state, payload) {
			state.messages_page = entero(payload.page)
			state.messages_last_page = payload.last_page ? entero(payload.last_page) : null
		},
		setMessagesLoading(state, value) {
			state.messages_loading = !!value
		},
		setMessagesLoadingMore(state, value) {
			state.messages_loading_more = !!value
		},
		setSending(state, value) {
			state.sending = !!value
		},
		/**
		 * El comercio leyó la conversación: los mensajes del comprador que están en pantalla pasan
		 * a leídos (es lo mismo que hizo el UPDATE del backend).
		 */
		marcarMensajesDelCompradorLeidos(state) {
			state.messages = state.messages.map(m => {
				if (booleano(m.from_buyer) && !booleano(m.read)) {
					return Object.assign({}, m, { read: true })
				}
				return m
			})
		},
	},
	getters: {
		/**
		 * La fila de la bandeja de la conversación abierta, o null si no está cargada.
		 */
		selected_chat(state) {
			if (!state.selected_buyer_id) {
				return null
			}
			return state.chats.find(c => c.buyer_id == state.selected_buyer_id) || null
		},
		/**
		 * El comprador de la conversación abierta, con lo mejor que se tenga: la fila de la bandeja
		 * y, encima, lo que devolvió el pedido de mensajes (que es lo más fresco y es lo único que
		 * trae el vínculo con el cliente del sistema cuando la fila llegó por broadcast).
		 */
		buyer_abierto(state, getters) {
			let de_la_fila = getters.selected_chat && getters.selected_chat.buyer ? getters.selected_chat.buyer : null
			let propio = state.selected_buyer && state.selected_buyer.id == state.selected_buyer_id ? state.selected_buyer : null
			if (!de_la_fila && !propio) {
				return null
			}
			return Object.assign({}, de_la_fila || {}, propio || {})
		},
		hay_mas_chats(state) {
			return !!state.chats_last_page && state.chats_page < state.chats_last_page
		},
		hay_mas_mensajes(state) {
			return !!state.messages_last_page && state.messages_page < state.messages_last_page
		},
		/**
		 * Lo que se sabe de un comprador (fila de la bandeja o de Alertas), para decidir si hace
		 * falta marcar leído al abrir la conversación.
		 */
		fila_de(state) {
			return function (buyer_id) {
				return state.chats.find(c => c.buyer_id == buyer_id)
					|| state.chats_no_leidos.find(c => c.buyer_id == buyer_id)
					|| null
			}
		},
	},
	actions: {
		/**
		 * Pide una página de la bandeja con el buscador y el filtro que haya en el state.
		 *
		 * @param {Object} opciones
		 * @param {Number} [opciones.page] 1 = reemplaza la bandeja; más = agrega abajo.
		 * @param {Boolean} [opciones.silent] Recarga la página 1 sin "Cargando..." y sin tirar las
		 *                                    páginas ya cargadas (reconexión).
		 * @returns {Promise} resuelve siempre (los errores se loguean).
		 */
		getChats({ commit, state }, opciones) {
			let config = opciones || {}
			let page = config.page || 1
			let silent = !!config.silent
			let generacion_del_pedido = generacion
			let este_pedido
			if (page == 1) {
				pedido_de_chats++
				este_pedido = pedido_de_chats
				if (!silent) {
					commit('setChatsLoading', true)
				}
			} else {
				este_pedido = pedido_de_chats
				commit('setChatsLoadingMore', true)
			}
			let buscar = String(state.buscar || '').trim()
			let solo_no_leidos = state.solo_no_leidos
			let params = {
				page: page,
				buscar: buscar,
				solo_no_leidos: solo_no_leidos ? 1 : 0,
			}
			let opciones_axios = Object.assign({ params: params }, silent ? OPCIONES_SILENCIOSAS : OPCIONES_BASE)
			return axios.get('/api/tienda-chats', opciones_axios)
				.then(res => {
					let vigente = generacion_del_pedido == generacion && este_pedido == pedido_de_chats
					if (page == 1 && vigente) {
						commit('setChatsLoading', false)
					}
					if (page > 1) {
						commit('setChatsLoadingMore', false)
					}
					if (!vigente) {
						return
					}
					let datos = res.data || {}
					let lista = Array.isArray(datos.data) ? datos.data : []
					if (page == 1 && !silent) {
						commit('setChats', lista)
						commit('setChatsPaginas', { page: datos.current_page || 1, last_page: datos.last_page })
					} else if (page == 1) {
						commit('fusionarChats', lista)
						commit('setChatsPaginas', { page: Math.max(state.chats_page, 1), last_page: datos.last_page })
					} else {
						commit('agregarChats', lista)
						commit('setChatsPaginas', { page: datos.current_page || page, last_page: datos.last_page })
					}
					commit('setChatsCargados', true)
					// Solo el listado sin filtros dice cuántas conversaciones hay en total.
					if (!buscar && !solo_no_leidos && typeof datos.total != 'undefined') {
						commit('setTotalConversaciones', datos.total)
					}
				})
				.catch(err => {
					if (page == 1 && este_pedido == pedido_de_chats) {
						commit('setChatsLoading', false)
					}
					if (page > 1) {
						commit('setChatsLoadingMore', false)
					}
					console.log(err)
				})
		},
		/**
		 * Scroll infinito de la bandeja: pide la página siguiente si hay y no hay otra en vuelo.
		 */
		getMasChats({ dispatch, state, getters }) {
			if (state.chats_loading || state.chats_loading_more || !getters.hay_mas_chats) {
				return Promise.resolve()
			}
			return dispatch('getChats', { page: state.chats_page + 1 })
		},
		/**
		 * Los tres números de los badges. Lo pide el anfitrión al iniciar sesión (es lo que prende
		 * el badge de Tienda Online desde el login, sin entrar al submódulo) y al reconectar.
		 */
		getResumen({ commit, dispatch }) {
			let generacion_del_pedido = generacion
			let version_al_pedir = version_de_eventos
			return axios.get('/api/tienda-chats/resumen', OPCIONES_SILENCIOSAS)
				.then(res => {
					if (generacion_del_pedido != generacion) {
						return
					}
					commit('setResumen', res.data)
					// Llegó un evento mientras viajaba: lo que volvió puede no incluirlo.
					if (version_al_pedir != version_de_eventos) {
						dispatch('pedirResumenPronto')
					}
				})
				.catch(err => {
					console.log(err)
				})
		},
		/**
		 * Vuelve a pedir el resumen en un rato, juntando en un solo pedido todo lo que llegue en el
		 * medio. Es el camino para cuando el evento no alcanza para recalcular los contadores en
		 * memoria (ver `aplicarBroadcast`).
		 */
		pedirResumenPronto({ dispatch }) {
			clearTimeout(temporizador_resumen)
			temporizador_resumen = setTimeout(function () {
				temporizador_resumen = null
				dispatch('getResumen')
			}, ESPERA_RESUMEN_MS)
		},
		/**
		 * Lista de conversaciones con algo sin leer, para Alertas → Mensajes. Primera página (30):
		 * si hay más, la tabla lo dice y el resto se ve en la bandeja con el filtro "Sin leer".
		 *
		 * @returns {Promise} resuelve siempre: Alertas apaga el cargando global en el `.then()`.
		 */
		getChatsNoLeidos({ commit }) {
			let generacion_del_pedido = generacion
			let opciones_axios = Object.assign({ params: { page: 1, solo_no_leidos: 1, buscar: '' } }, OPCIONES_SILENCIOSAS)
			return axios.get('/api/tienda-chats', opciones_axios)
				.then(res => {
					if (generacion_del_pedido != generacion) {
						return
					}
					let datos = res.data || {}
					commit('setChatsNoLeidos', { data: datos.data, total: datos.total })
				})
				.catch(err => {
					console.log(err)
				})
		},
		/**
		 * Deja el sidebar abierto y parado en la conversación de un comprador. Es la única puerta
		 * de entrada (la usan la bandeja, Clientes, Alertas y el toast, siempre por medio de
		 * `abrir_chat_tienda()`).
		 *
		 * 🔴 Acá NO se piden los mensajes ni se marca leído: eso vive en un solo lugar, el watch de
		 * `conversacion/Index.vue`. Es la misma decisión que tomó el módulo de WhatsApp después de
		 * tener la carga copiada en cada lugar desde donde se abría un chat.
		 *
		 * @param {Object} payload `{ buyer_id, buyer }` (`buyer` opcional: los datos para el header
		 *                         mientras la conversación viaja).
		 * @returns {Promise} resuelve con el `buyer_id` abierto.
		 */
		abrirChat({ commit, state }, payload) {
			let buyer_id = entero(payload.buyer_id)
			if (payload.buyer) {
				commit('setSelectedBuyer', buyer_liviano(Object.assign({}, payload.buyer, { id: buyer_id })))
			} else if (state.selected_buyer && state.selected_buyer.id != buyer_id) {
				commit('setSelectedBuyer', null)
			}
			commit('setSelectedBuyerId', buyer_id)
			commit('setSidebarAbierto', true)
			return Promise.resolve(buyer_id)
		},
		/**
		 * Pide una página de la conversación.
		 *
		 * El backend manda cada página ya en orden cronológico (del más viejo al más nuevo), así
		 * que acá NO se invierte nada, a diferencia de WhatsApp, donde la página viene al revés.
		 *
		 * @param {Object} payload `{ buyer_id, page, silent }`
		 * @returns {Promise} resuelve con la respuesta (o null si ya no corresponde aplicarla) y
		 *                    RECHAZA si el pedido falla: el que llama decide qué decir (un 404
		 *                    quiere decir que el comprador no es de este comercio).
		 */
		getMessages({ commit, state }, payload) {
			let buyer_id = entero(payload.buyer_id)
			let page = payload.page || 1
			let silent = !!payload.silent
			let generacion_del_pedido = generacion
			let este_pedido
			if (page == 1) {
				pedido_de_mensajes++
				este_pedido = pedido_de_mensajes
				if (!silent) {
					commit('setMessagesLoading', true)
				}
			} else {
				este_pedido = pedido_de_mensajes
				commit('setMessagesLoadingMore', true)
			}
			// Siempre sin el aviso global de error: el que llama lo muestra con su propio texto (un
			// 404 acá no es un error del sistema, es "ese comprador no es de tu tienda").
			let opciones_axios = Object.assign({ params: { page: page } }, OPCIONES_SILENCIOSAS)
			return axios.get('/api/tienda-chats/' + buyer_id + '/mensajes', opciones_axios)
				.then(res => {
					let es_el_ultimo = este_pedido == pedido_de_mensajes
					if (page == 1 && es_el_ultimo) {
						commit('setMessagesLoading', false)
					}
					if (page > 1) {
						commit('setMessagesLoadingMore', false)
					}
					// Si mientras viajaba se saltó a otra conversación, esta respuesta es de otro
					// comprador y no se puede mezclar con la que está en pantalla.
					if (generacion_del_pedido != generacion || !es_el_ultimo || state.selected_buyer_id != buyer_id) {
						return null
					}
					let datos = res.data || {}
					let lista = Array.isArray(datos.data) ? datos.data : []
					if (page == 1 && !silent) {
						commit('setMessages', lista)
						commit('setMessagesPaginas', { page: datos.current_page || 1, last_page: datos.last_page })
					} else if (page == 1) {
						commit('fusionarMessages', lista)
						commit('setMessagesPaginas', { page: Math.max(state.messages_page, 1), last_page: datos.last_page })
					} else {
						commit('prependMessages', lista)
						commit('setMessagesPaginas', { page: datos.current_page || page, last_page: datos.last_page })
					}
					if (datos.buyer) {
						commit('setSelectedBuyer', buyer_liviano(datos.buyer))
					}
					return datos
				})
				.catch(err => {
					if (page == 1 && este_pedido == pedido_de_mensajes) {
						commit('setMessagesLoading', false)
					}
					if (page > 1) {
						commit('setMessagesLoadingMore', false)
					}
					throw err
				})
		},
		/**
		 * Manda un mensaje escrito a mano por el comercio.
		 *
		 * @param {Object} payload `{ buyer_id, text }`
		 * @returns {Promise} resuelve con el mensaje creado; RECHAZA si falla (el composer avisa y
		 *                    conserva el texto para reintentar).
		 */
		enviarMensaje({ commit, state, dispatch }, payload) {
			let buyer_id = entero(payload.buyer_id)
			let generacion_del_pedido = generacion
			commit('setSending', true)
			return axios.post('/api/tienda-chats/' + buyer_id + '/mensajes', { text: payload.text }, OPCIONES_SILENCIOSAS)
				.then(res => {
					commit('setSending', false)
					let message = res.data ? res.data.message : null
					if (!message || generacion_del_pedido != generacion) {
						return message
					}
					if (state.selected_buyer_id == buyer_id) {
						commit('appendMessage', message)
					}
					let anterior = state.chats.find(c => c.buyer_id == buyer_id) || null
					// Ya lo aplicó el broadcast (puede llegar antes que esta respuesta): no se cuenta dos veces.
					let ya_aplicado = !!(anterior && anterior.last_message && anterior.last_message.id == message.id)
					if (!ya_aplicado) {
						let conocida = fila_conocida(state, buyer_id)
						if (conocida) {
							if (!es_de_hoy(conocida.last_message_at) && es_de_hoy(message.created_at)) {
								commit('ajustarResumen', { conversaciones_hoy: 1 })
							}
						} else {
							dispatch('pedirResumenPronto')
						}
						let buyer = state.selected_buyer && state.selected_buyer.id == buyer_id ? state.selected_buyer : null
						if (anterior || puede_insertarse_en_la_bandeja(state, 0)) {
							let fila = Object.assign({
								buyer_id: buyer_id,
								buyer: buyer,
								unread_count: 0,
								messages_count: 0,
							}, anterior || {})
							fila.last_message = ultimo_mensaje_liviano(message)
							fila.last_message_at = message.created_at
							fila.messages_count = entero(fila.messages_count) + 1
							if (!anterior && bandeja_completa_sin_filtros(state)) {
								commit('setTotalConversaciones', entero(state.total_conversaciones) + 1)
							}
							commit('upsertChat', fila)
						}
					}
					return message
				})
				.catch(err => {
					commit('setSending', false)
					throw err
				})
		},
		/**
		 * Marca leída la conversación de un comprador.
		 *
		 * Los contadores se bajan en el momento (sin esperar la respuesta) cuando se sabe cuántos
		 * había sin leer; si no se sabe (la conversación se abrió sin la bandeja cargada), el
		 * resumen se vuelve a pedir cuando el backend confirma.
		 *
		 * @param {Number} buyer_id
		 * @returns {Promise} resuelve siempre.
		 */
		marcarLeido({ commit, state, dispatch }, buyer_id) {
			let id = entero(buyer_id)
			let conocida = fila_conocida(state, id)
			if (conocida) {
				let sin_leer = entero(conocida.unread_count)
				if (sin_leer > 0) {
					commit('ajustarResumen', { mensajes_no_leidos: -sin_leer, chats_no_leidos: -1 })
				}
			}
			let fila = state.chats.find(c => c.buyer_id == id)
			if (fila && entero(fila.unread_count) > 0) {
				commit('upsertChat', Object.assign({}, fila, { unread_count: 0 }))
			}
			commit('quitarChatNoLeido', id)
			if (state.selected_buyer_id == id) {
				commit('marcarMensajesDelCompradorLeidos')
			}
			return axios.post('/api/tienda-chats/' + id + '/leer', {}, OPCIONES_SILENCIOSAS)
				.then(() => {
					if (!conocida) {
						dispatch('pedirResumenPronto')
					}
				})
				.catch(err => {
					console.log(err)
					// Los contadores se bajaron antes de tiempo: se vuelven a pedir los de verdad.
					dispatch('pedirResumenPronto')
				})
		},
		/**
		 * Aplica un evento `TiendaChatActualizado` (contrato C1): mueve la conversación a la
		 * cabeza de la bandeja, actualiza su "sin leer", la inserta si no estaba, mantiene al día
		 * la lista de Alertas y los contadores, y agrega el mensaje a la conversación si es la que
		 * está abierta.
		 *
		 * Payload: `{ buyer_id, chat: {buyer_id, unread_count, last_message_at}, buyer, message }`.
		 * `message` viene en null en el evento de "leído" (ahí `unread_count` es 0).
		 *
		 * @returns {Promise} resuelve con `{ mensaje_nuevo_del_comprador, conversacion_abierta, buyer }`
		 *                    para que el anfitrión decida si suena, avisa o marca leído.
		 */
		aplicarBroadcast({ commit, state, dispatch }, payload) {
			let resultado = {
				mensaje_nuevo_del_comprador: false,
				conversacion_abierta: false,
				buyer: null,
			}
			if (!payload || !payload.buyer_id) {
				return resultado
			}
			version_de_eventos++

			let buyer_id = entero(payload.buyer_id)
			let chat_payload = payload.chat || {}
			let unread_nuevo = entero(chat_payload.unread_count)
			let message = payload.message || null
			let anterior = state.chats.find(c => c.buyer_id == buyer_id) || null
			let conocida = fila_conocida(state, buyer_id)
			let conversacion_abierta = state.sidebar_abierto && state.selected_buyer_id == buyer_id

			/*
				¿Es un mensaje que ya se aplicó? Pasa con el que mandó este mismo operador: la
				respuesta del POST y el broadcast llegan los dos, en cualquier orden. También con
				cualquier evento repetido por la reconexión de Pusher.
			*/
			let repetido = false
			if (message) {
				let fila_previa = anterior || state.chats_no_leidos.find(c => c.buyer_id == buyer_id) || null
				if (fila_previa && fila_previa.last_message && fila_previa.last_message.id == message.id) {
					repetido = true
				}
				if (conversacion_abierta && state.messages.some(m => m.id == message.id)) {
					repetido = true
				}
			}

			resultado.conversacion_abierta = conversacion_abierta
			resultado.buyer = payload.buyer
				|| (anterior ? anterior.buyer : null)
				|| (state.selected_buyer && state.selected_buyer.id == buyer_id ? state.selected_buyer : null)
			resultado.mensaje_nuevo_del_comprador = !!message && booleano(message.from_buyer) && !repetido

			// --- 1. Contadores del resumen --------------------------------------------------
			let hoy = moment().format('YYYY-MM-DD')
			if (conocida && state.resumen_dia == hoy) {
				let unread_anterior = entero(conocida.unread_count)
				let delta = {
					mensajes_no_leidos: unread_nuevo - unread_anterior,
					chats_no_leidos: (unread_nuevo > 0 ? 1 : 0) - (unread_anterior > 0 ? 1 : 0),
					conversaciones_hoy: 0,
				}
				if (message && !repetido && es_de_hoy(message.created_at) && !es_de_hoy(conocida.last_message_at)) {
					delta.conversaciones_hoy = 1
				}
				commit('ajustarResumen', delta)
			} else if (state.resumen_cargado) {
				// No se sabe cómo estaba antes (o cambió el día): el resumen se pide de nuevo.
				dispatch('pedirResumenPronto')
			}

			// --- 2. Fila de la bandeja ------------------------------------------------------
			let fila_final = null
			if (message) {
				fila_final = Object.assign({
					buyer_id: buyer_id,
					buyer: null,
					unread_count: 0,
					messages_count: 0,
					last_message_at: null,
					last_message: null,
				}, anterior || {})
				if (payload.buyer) {
					fila_final.buyer = Object.assign({}, fila_final.buyer || {}, buyer_liviano(payload.buyer))
				}
				fila_final.unread_count = unread_nuevo
				if (!repetido) {
					fila_final.last_message = ultimo_mensaje_liviano(message)
					fila_final.last_message_at = chat_payload.last_message_at || message.created_at
					fila_final.messages_count = entero(fila_final.messages_count) + 1
				}
				if (anterior) {
					commit('upsertChat', fila_final)
				} else if (puede_insertarse_en_la_bandeja(state, unread_nuevo)) {
					if (bandeja_completa_sin_filtros(state)) {
						commit('setTotalConversaciones', entero(state.total_conversaciones) + 1)
					}
					commit('upsertChat', fila_final)
				}
			} else if (anterior) {
				fila_final = Object.assign({}, anterior, { unread_count: unread_nuevo })
				commit('upsertChat', fila_final)
			}

			// --- 3. Lista de sin leer de Alertas --------------------------------------------
			if (unread_nuevo > 0 && fila_final) {
				commit('upsertChatNoLeido', fila_final)
			} else if (unread_nuevo <= 0) {
				commit('quitarChatNoLeido', buyer_id)
			}

			// --- 4. Conversación abierta ----------------------------------------------------
			if (conversacion_abierta) {
				if (message) {
					commit('appendMessage', message)
					// El broadcast recorta el texto a 2000 caracteres (Pusher corta a los 10 KB por
					// evento): el mensaje entero se trae de la base sin que la pantalla parpadee.
					if (booleano(message.text_truncado)) {
						dispatch('getMessages', { buyer_id: buyer_id, page: 1, silent: true })
							.catch(err => console.log(err))
					}
				} else if (unread_nuevo <= 0) {
					commit('marcarMensajesDelCompradorLeidos')
				}
			}

			return resultado
		},
	},
}
