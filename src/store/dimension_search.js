import axios from 'axios'
import { env } from '@/runtime_config'
import {
	normalizar_resumen,
	resumen_vacio,
	normalizar_corrida,
	normalizar_items,
	normalizar_conteos,
	normalizar_previa,
	extraer_paginador,
	extraer_modelo,
	a_numero,
	a_lista,
} from '@/utils/medidas_de_catalogo'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

/*
 * Búsqueda masiva de peso y medidas de los artículos (misión medidas-masivas-catalogo, 27/10/2026).
 *
 * Cada vez que se busca el peso y las medidas (alto, ancho, largo) de los artículos de un negocio
 * —hoy, con el acceso maestro, de todo el catálogo; después, quizás, desde el listado— la API crea una
 * "corrida" (`dimension_search_runs`) con un item por artículo. Este store es la capa de la SPA sobre
 * el contrato §2.6 del plan de la misión, calcado de `image_assignment.js`:
 *
 *  - `resumen` ({a_revisar, sin_ver, badge, en_proceso}) alimenta el número rojo de la sub-solapa
 *    Alertas → Catálogo → Medidas, el de la solapa Catálogo y la campana del menú. Se pide al iniciar
 *    sesión (start_methods.js), al volver a tocar la pestaña y cada vez que algo lo mueve (aprobar,
 *    rechazar, fin de corrida). El `badge` es el que manda la API: no se recalcula acá.
 *  - `models` + el paginador son la página visible de la tabla de corridas de esa sub-solapa.
 *  - Las acciones que traen o cambian UNA corrida o sus items (detalle, aprobar, rechazar, quitar,
 *    lote, catálogo, detener, reanudar) no guardan nada propio: devuelven la respuesta ya normalizada
 *    y el componente que las llamó decide qué mostrar. Solo si la corrida que vuelve está en la página
 *    visible se reemplaza la fila, para que la tabla no quede con números viejos.
 *
 * Compatibilidad hacia atrás (plan §4): contra una API que todavía no tiene estas rutas (404), o a la que
 * le falta la extensión `agentes_ia` (403), ni el resumen ni el listado de corridas muestran NINGÚN error. Los dos van silenciosos (sin el toast del
 * interceptor global): el número queda en cero y la sección dice "todavía no disponible"
 * (`state.no_disponible`). Es lo mismo que hace la revisión de Descripciones. Las acciones que dispara
 * una persona (abrir un detalle, aprobar, lanzar...) pasan por el interceptor global de main.js, que
 * muestra el `message` de la API (un 4xx con `message` sale como aviso): quien las llama NO repite el
 * toast de error.
 *
 * Forma de las respuestas: el contrato dice que el listado es `{data: [...], total, ...}`; las rutas
 * de imágenes mandan `{models: paginador, resumen}` y `{model: ...}`. Se aceptan las dos formas
 * (ver `extraer_paginador` y `extraer_modelo` en utils/medidas_de_catalogo.js).
 *
 * 🔴 TODOS los pedidos de este módulo van con `skip_navigation_cancel`. main.js cancela en cada
 * navegación los pedidos en vuelo, y en esta pantalla hay navegaciones que solo cambian la query
 * (abrir o cerrar el detalle por link directo): sin la marca, cerrar el detalle antes de que llegara
 * la tabla la cancelaba y se veía un error sin que nada hubiera fallado. Por las dudas, una
 * cancelación igual se trata como "no pasó nada" y nunca como error (`es_cancelacion`).
 */

/** Prefijo de las rutas de corridas. */
const RUTA_DE_CORRIDAS = '/api/dimension-search-runs'

/** Prefijo de las rutas de items (aprobar, rechazar, quitar). */
const RUTA_DE_ITEMS = '/api/dimension-search-items'

/** Opciones de axios de TODOS los pedidos de este módulo (ver el 🔴 de arriba). */
const OPCIONES_BASE = { skip_navigation_cancel: true }

/** Opciones de axios para los pedidos de fondo: además, sin el toast del interceptor global. */
const OPCIONES_SILENCIOSAS = { skip_global_error_event: true, skip_navigation_cancel: true }

/**
 * Opciones de un pedido de este módulo: las de base más las propias del pedido.
 *
 * @param {Object} propias Por ejemplo `{ params }` o `{ skip_global_error_event: true }`.
 * @returns {Object}
 */
function opciones(propias) {
	return Object.assign({}, OPCIONES_BASE, propias || {})
}

/**
 * True si un error es en realidad un pedido cancelado (por axios, o marcado por
 * `relanzar_marcando_la_cancelacion`). Se exporta para que el detalle y el modal de catálogo no
 * muestren una cancelación como si fuera un error: no falló nada, el pedido no llegó a volver.
 *
 * @param {*} err
 * @returns {Boolean}
 */
export function es_cancelacion(err) {
	return !!err && (err.cancelado === true || axios.isCancel(err))
}

/**
 * True si el error dice que la API no ofrece esta pantalla: un 404 (una API que todavía no tiene las
 * rutas) o un 403 (las rutas existen pero el negocio no tiene la extensión `agentes_ia`, de la que
 * dependen: la API contesta 403 «Extensión requerida»). Para el resumen y el listado, los dos son lo
 * mismo: «todavía no disponible», sin errores ni toasts.
 *
 * @param {*} err
 * @returns {Boolean}
 */
export function es_ruta_no_disponible(err) {
	return !!err && !!err.response && (err.response.status === 404 || err.response.status === 403)
}

/**
 * `catch` de las acciones que devuelven la respuesta a quien las llamó: vuelve a rechazar, pero si
 * fue una cancelación rechaza con un error marcado (`cancelado: true`), para que quien llamó pueda
 * reconocerlo con `es_cancelacion` sin importar axios.
 *
 * @param {*} err
 * @returns {Promise} Siempre rechazada.
 */
function relanzar_marcando_la_cancelacion(err) {
	if (axios.isCancel(err)) {
		let cancelacion = new Error('Pedido cancelado')
		cancelacion.cancelado = true
		return Promise.reject(cancelacion)
	}
	return Promise.reject(err)
}

/**
 * Contador de pedidos del listado. El listado se pide desde varios lados (entrar a la sub-solapa,
 * paginar, el refresco cada 15 s mientras hay una corrida activa, lanzar el catálogo) y una respuesta
 * vieja que llega tarde no puede pisar a una más nueva: solo se aplica la del último pedido. Vive
 * fuera del state porque no es información que se muestre.
 */
let ultimo_pedido_de_listado = 0

/**
 * Contador de pedidos del RESUMEN del badge. El resumen llega por dos caminos —`get_resumen` y, si la
 * API lo manda, adentro de la respuesta del listado— y los dos comparten este contador: el que se
 * pidió último es el único que se aplica. Sin eso, un resumen viejo que llegaba tarde volvía a subir
 * el número rojo.
 */
let ultimo_pedido_de_resumen = 0

/**
 * Contador de pedidos de la previa del catálogo. La previa se vuelve a pedir cada vez que se cambia
 * «Solo artículos con stock»: solo vale la del último pedido.
 */
let ultimo_pedido_de_previa = 0

/**
 * True si la corrida todavía está corriendo (o esperando turno en la cola).
 *
 * @param {Object} corrida RunPayload normalizado.
 * @returns {Boolean}
 */
function esta_activa(corrida) {
	return !!corrida && (corrida.status === 'pendiente' || corrida.status === 'en_proceso')
}

/**
 * Lo que devuelve una acción sobre un item: el item normalizado (o null si la respuesta no trajo
 * ninguno reconocible).
 *
 * @param {*} cuerpo `res.data`.
 * @returns {Object|null}
 */
function item_de_la_respuesta(cuerpo) {
	let items = normalizar_items([extraer_modelo(cuerpo)])
	return items.length ? items[0] : null
}

export default {
	namespaced: true,
	state: {
		/** Números del badge: {a_revisar, sin_ver, badge, en_proceso}. */
		resumen: resumen_vacio(),
		/** Página visible de corridas (RunPayload normalizado), las más nuevas primero. */
		models: [],
		/** Página pedida al listado. */
		page: 1,
		/** Corridas por página. */
		per_page: 25,
		/** Total de corridas del comercio, según el paginador. */
		total: 0,
		/** Última página, según el paginador. */
		last_page: 1,
		/** true mientras está en vuelo un pedido NO silencioso del listado. */
		loading: false,
		/** true una vez que el listado respondió (bien o mal) por primera vez. */
		cargado: false,
		/** true si el último pedido del listado falló. */
		error: false,
		/** true si la API contestó 404 al listado: todavía no tiene la búsqueda de medidas. */
		no_disponible: false,
	},
	getters: {
		/**
		 * Número rojo de la sub-solapa y lo que suma a la solapa Catálogo y a la campana: el `badge`
		 * que manda la API (propuestas esperando que alguien las apruebe o las rechace, más corridas
		 * terminadas que nadie abrió todavía).
		 *
		 * @returns {Number}
		 */
		badge(state) {
			return state.resumen.badge
		},
		/**
		 * True si alguna corrida de la página visible sigue corriendo: la sección lo usa para decidir
		 * si vale la pena refrescar la tabla sola.
		 *
		 * @returns {Boolean}
		 */
		hay_activas(state) {
			return state.models.some(corrida => esta_activa(corrida))
		},
	},
	mutations: {
		set_resumen(state, valor) {
			state.resumen = normalizar_resumen(valor)
		},
		/**
		 * Aplica una página del paginador ({data, total, last_page, current_page}). Si no vino un
		 * paginador, la tabla queda vacía. Las corridas se normalizan acá: lo que se dibuja ya tiene
		 * todos los campos.
		 *
		 * @param {Object} state
		 * @param {Object|null} paginador Lo que devuelve `extraer_paginador`.
		 */
		set_pagina(state, paginador) {
			if (!paginador) {
				state.models = []
				state.total = 0
				state.last_page = 1
				return
			}
			let corridas = []
			a_lista(paginador.data).forEach(function (crudo) {
				let corrida = normalizar_corrida(crudo)
				if (corrida) {
					corridas.push(corrida)
				}
			})
			state.models = corridas
			state.total = a_numero(paginador.total)
			state.last_page = a_numero(paginador.last_page) || 1
			if (paginador.current_page) {
				state.page = a_numero(paginador.current_page) || 1
			}
		},
		set_page(state, valor) {
			state.page = Number(valor) || 1
		},
		set_loading(state, valor) {
			state.loading = !!valor
		},
		set_cargado(state, valor) {
			state.cargado = !!valor
		},
		set_error(state, valor) {
			state.error = !!valor
		},
		set_no_disponible(state, valor) {
			state.no_disponible = !!valor
		},
		/**
		 * Reemplaza por id una corrida de la página visible con una versión más nueva (la que
		 * devolvió el detalle, detener o reanudar). Si no está en la página, no hace nada: la tabla la
		 * va a traer fresca cuando se vuelva a pedir.
		 *
		 * @param {Object} state
		 * @param {Object} corrida RunPayload normalizado.
		 */
		actualizar_corrida(state, corrida) {
			if (!corrida || typeof corrida.id === 'undefined') {
				return
			}
			let indice = state.models.findIndex(modelo => modelo.id === corrida.id)
			if (indice !== -1) {
				state.models.splice(indice, 1, corrida)
			}
		},
	},
	actions: {
		/**
		 * Trae el resumen liviano del badge. Silencioso: contra un error el badge queda como estaba y
		 * no se muestra nada; contra una API que todavía no tiene la ruta (404) queda en cero. Resuelve
		 * siempre, porque start_methods.js lo encadena con el resto del arranque.
		 *
		 * Solo se aplica si es el último resumen pedido (ver `ultimo_pedido_de_resumen`).
		 *
		 * @returns {Promise}
		 */
		get_resumen({ commit }) {
			ultimo_pedido_de_resumen++
			let este_resumen = ultimo_pedido_de_resumen

			return axios.get(RUTA_DE_CORRIDAS + '/resumen', OPCIONES_SILENCIOSAS)
				.then(res => {
					if (este_resumen !== ultimo_pedido_de_resumen) {
						return
					}
					commit('set_resumen', res.data)
				})
				.catch(err => {
					if (es_cancelacion(err) || este_resumen !== ultimo_pedido_de_resumen) {
						return
					}
					// 404/403: la API no ofrece esta pantalla (sin rutas o sin la extensión): el número vale cero y no se anuncia.
					if (es_ruta_no_disponible(err)) {
						commit('set_resumen', resumen_vacio())
						return
					}
					console.log('dimension-search-runs/resumen: no se pudo traer el resumen del badge')
					console.log(err)
				})
		},
		/**
		 * Trae la página `state.page` del listado de corridas (las más nuevas primero) y, si la
		 * respuesta lo trae, el resumen del badge.
		 *
		 * SIEMPRE silencioso hacia el interceptor global (un 404 de una API sin estas rutas no puede
		 * mostrar un toast): la sección dibuja su propio estado de error con «Reintentar» y, con 404,
		 * el estado neutro «todavía no disponible». Con `{ silencioso: true }` además no prende
		 * `loading` (la tabla no parpadea) y un error no borra lo que ya se mostraba: es el refresco
		 * periódico mientras hay una corrida activa.
		 *
		 * Si la página pedida ya no existe (el total bajó mientras se miraba otra cosa), se pide la
		 * última que sí existe. Una cancelación no es un error: se vuelve a pedir una vez.
		 *
		 * Resuelve siempre: quien lo llama solo necesita saber cuándo terminó; el error queda en
		 * `state.error`.
		 *
		 * @param {Object} context
		 * @param {Object} pedido { silencioso: Boolean, reintento: Boolean }
		 * @returns {Promise}
		 */
		get_corridas({ commit, state, dispatch }, pedido) {
			let silencioso = !!(pedido && pedido.silencioso)
			let es_reintento = !!(pedido && pedido.reintento)
			ultimo_pedido_de_listado++
			let este_pedido = ultimo_pedido_de_listado
			ultimo_pedido_de_resumen++
			let este_resumen = ultimo_pedido_de_resumen

			if (!silencioso) {
				commit('set_loading', true)
			}

			let config = Object.assign({}, OPCIONES_SILENCIOSAS, {
				params: {
					page: state.page,
					per_page: state.per_page,
				},
			})

			return axios.get(RUTA_DE_CORRIDAS, config)
				.then(res => {
					if (este_pedido !== ultimo_pedido_de_listado) {
						return
					}
					let cuerpo = res.data || {}
					let paginador = extraer_paginador(cuerpo)

					// Página fuera de rango: se pide la última que exista. La respuesta de este pedido
					// no se aplica; el pedido nuevo es el que deja todo como corresponde.
					if (paginador && !paginador.data.length && paginador.total > 0
						&& paginador.current_page && paginador.current_page > paginador.last_page) {
						commit('set_page', paginador.last_page || 1)
						return dispatch('get_corridas', pedido)
					}

					commit('set_pagina', paginador)
					if (cuerpo.resumen && este_resumen === ultimo_pedido_de_resumen) {
						commit('set_resumen', cuerpo.resumen)
					}
					commit('set_error', false)
					commit('set_no_disponible', false)
				})
				.catch(err => {
					if (este_pedido !== ultimo_pedido_de_listado) {
						return
					}
					if (es_cancelacion(err)) {
						// No falló nada: se vuelve a pedir una vez, y ese pedido es el que vale.
						if (!es_reintento) {
							return dispatch('get_corridas', Object.assign({}, pedido || {}, { reintento: true }))
						}
						return
					}
					// 404/403: la API no ofrece la búsqueda de medidas (todavía no, o sin la extensión). Estado neutro, sin error.
					if (es_ruta_no_disponible(err)) {
						commit('set_pagina', null)
						commit('set_no_disponible', true)
						commit('set_error', false)
						commit('set_resumen', resumen_vacio())
						return
					}
					console.log(err)
					// Un refresco silencioso que falla no borra la tabla que ya se estaba mostrando.
					if (!silencioso) {
						commit('set_error', true)
					}
				})
				.then(() => {
					if (este_pedido !== ultimo_pedido_de_listado) {
						return
					}
					commit('set_loading', false)
					commit('set_cargado', true)
				})
		},
		/**
		 * Trae una corrida por id. Del lado de la API esto la marca como vista (si ya salió de
		 * proceso), así que el badge puede bajar: quien la llama decide cuándo volver a pedir el
		 * resumen.
		 *
		 * Rechaza si falla, para que el detalle pueda mostrar su propio estado de error. Una
		 * cancelación rechaza marcada (ver `es_cancelacion`).
		 *
		 * @param {Object} context
		 * @param {Number|Object} pedido El id, o `{ id, silencioso }`.
		 * @returns {Promise<Object>} RunPayload normalizado (null si la respuesta no trajo una corrida).
		 */
		get_corrida({ commit }, pedido) {
			let id = pedido && typeof pedido === 'object' ? pedido.id : pedido
			let silencioso = !!(pedido && typeof pedido === 'object' && pedido.silencioso)

			return axios.get(RUTA_DE_CORRIDAS + '/' + id, silencioso ? OPCIONES_SILENCIOSAS : opciones())
				.then(res => {
					let corrida = normalizar_corrida(extraer_modelo(res.data))
					commit('actualizar_corrida', corrida)
					return corrida
				})
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Trae una página de los artículos de una corrida, de UNA solapa. Una cancelación rechaza
		 * marcada, para que el detalle no la muestre como error (ver `es_cancelacion`).
		 *
		 * @param {Object} context
		 * @param {Object} pedido {corrida_id, solapa, page, per_page, buscar, silencioso}
		 * @returns {Promise<Object>} {items, total, ultima_pagina, conteos}: los items ya normalizados.
		 */
		get_items(context, pedido) {
			let params = {
				solapa: pedido.solapa,
				page: pedido.page || 1,
				per_page: pedido.per_page || 25,
			}
			// El buscador vacío no viaja: la API lo trata como "sin filtro" igual, pero así la URL
			// queda limpia en la pestaña de red y en los logs.
			if (pedido.buscar) {
				params.buscar = pedido.buscar
			}
			let config = opciones({ params: params })
			if (pedido.silencioso) {
				config.skip_global_error_event = true
			}
			return axios.get(RUTA_DE_CORRIDAS + '/' + pedido.corrida_id + '/items', config)
				.then(res => {
					let cuerpo = res.data || {}
					let paginador = extraer_paginador(cuerpo)
					let conteos = cuerpo.conteos
					if (!conteos && cuerpo.models && !Array.isArray(cuerpo.models)) {
						conteos = cuerpo.models.conteos
					}
					return {
						items: normalizar_items(paginador ? paginador.data : []),
						total: paginador ? paginador.total : 0,
						ultima_pagina: paginador ? paginador.last_page : 1,
						conteos: conteos ? normalizar_conteos(conteos) : null,
					}
				})
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Aprueba la propuesta de un artículo "a revisar": la API escribe las medidas en el artículo
		 * (solo en los campos que sigan vacíos, decisión D5) y el item queda `aprobada`.
		 *
		 * Sin `valores`, se aprueba lo que propuso el sistema. Con `valores` ({peso, alto, ancho,
		 * profundidad}, en kg y cm; solo los campos con número) se escriben los editados. 422 con
		 * `message` si un valor es inválido; 409 si el artículo ya tiene esos campos cargados; el
		 * interceptor global muestra el motivo.
		 *
		 * @param {Object} context
		 * @param {Number|Object} datos El id del item, o {id, valores}.
		 * @returns {Promise<Object>} ItemPayload normalizado (null si no vino).
		 */
		aprobar(context, datos) {
			let con_cuerpo = datos !== null && typeof datos === 'object'
			let item_id = con_cuerpo ? datos.id : datos
			let cuerpo = con_cuerpo && datos.valores && typeof datos.valores === 'object' ? { valores: datos.valores } : {}
			return axios.post(RUTA_DE_ITEMS + '/' + item_id + '/aprobar', cuerpo, opciones())
				.then(res => item_de_la_respuesta(res.data))
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Rechaza la propuesta de un artículo "a revisar": no se escribe nada en el artículo.
		 *
		 * @param {Object} context
		 * @param {Number} item_id
		 * @returns {Promise<Object>} ItemPayload normalizado (null si no vino).
		 */
		rechazar(context, item_id) {
			return axios.post(RUTA_DE_ITEMS + '/' + item_id + '/rechazar', {}, opciones())
				.then(res => item_de_la_respuesta(res.data))
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Quita del artículo las medidas que la búsqueda le había puesto (solas o aprobadas): vuelven
		 * a su valor anterior (vacío) si siguen siendo las que puso la búsqueda (decisión D6).
		 *
		 * @param {Object} context
		 * @param {Number} item_id
		 * @returns {Promise<Object>} ItemPayload normalizado (null si no vino).
		 */
		quitar(context, item_id) {
			return axios.post(RUTA_DE_ITEMS + '/' + item_id + '/quitar', {}, opciones())
				.then(res => item_de_la_respuesta(res.data))
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Aprueba varias a la vez.
		 *
		 * @param {Object} context
		 * @param {Array} ids Ids de items.
		 * @returns {Promise<Object>} {aprobados: n, fallidos: [{id, message}]}
		 */
		aprobar_varios(context, ids) {
			return axios.post(RUTA_DE_ITEMS + '/aprobar-varios', { ids: ids }, opciones())
				.then(res => res.data || {})
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Rechaza varias a la vez.
		 *
		 * @param {Object} context
		 * @param {Array} ids Ids de items.
		 * @returns {Promise<Object>} {rechazados: n, fallidos: [{id, message}]}
		 */
		rechazar_varios(context, ids) {
			return axios.post(RUTA_DE_ITEMS + '/rechazar-varios', { ids: ids }, opciones())
				.then(res => res.data || {})
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Previa de "todo el catálogo" (solo acceso maestro): cuántos artículos entrarían, cuántos no y
		 * por qué, la estimación de tiempo, consultas y costo, y si falta el buscador o la IA.
		 *
		 * Solo vale la respuesta del último pedido: al cambiar «Solo artículos con stock» se vuelve a
		 * pedir y una previa vieja que llega tarde no puede pisar a la nueva (en ese caso resuelve
		 * `undefined`, y quien llamó la ignora).
		 *
		 * @param {Object} context
		 * @param {Object} [pedido] {solo_con_stock: Boolean}
		 * @returns {Promise<Object|undefined>} Previa normalizada.
		 */
		get_previa_catalogo(context, pedido) {
			ultimo_pedido_de_previa++
			let esta_previa = ultimo_pedido_de_previa
			let solo_con_stock = !!(pedido && pedido.solo_con_stock)

			return axios.get(RUTA_DE_CORRIDAS + '/catalogo/previa', opciones({ params: { solo_con_stock: solo_con_stock ? 1 : 0 } }))
				.then(res => {
					if (esta_previa !== ultimo_pedido_de_previa) {
						return undefined
					}
					return normalizar_previa(res.data)
				})
				.catch(err => {
					if (esta_previa !== ultimo_pedido_de_previa) {
						return undefined
					}
					return relanzar_marcando_la_cancelacion(err)
				})
		},
		/**
		 * Lanza la búsqueda de medidas de todo el catálogo (solo acceso maestro). 422 con `message` si
		 * falta el buscador o la IA, si no hay artículos para buscar o si ya hay otra corriendo.
		 *
		 * @param {Object} context
		 * @param {Object} pedido {solo_con_stock: Boolean, limite: Number|null}
		 * @returns {Promise<Object>} RunPayload normalizado de la corrida creada.
		 */
		lanzar_catalogo(context, pedido) {
			let cuerpo = { solo_con_stock: !!(pedido && pedido.solo_con_stock) }
			if (pedido && Number(pedido.limite) > 0) {
				cuerpo.limite = Number(pedido.limite)
			}
			return axios.post(RUTA_DE_CORRIDAS + '/catalogo', cuerpo, opciones())
				.then(res => normalizar_corrida(extraer_modelo(res.data)))
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Detiene una corrida (solo con el acceso maestro): lo ya procesado queda y lo pendiente no se
		 * busca.
		 *
		 * @param {Object} context
		 * @param {Number} id
		 * @returns {Promise<Object>} RunPayload normalizado.
		 */
		detener({ commit }, id) {
			return axios.post(RUTA_DE_CORRIDAS + '/' + id + '/detener', {}, opciones())
				.then(res => {
					let corrida = normalizar_corrida(extraer_modelo(res.data))
					commit('actualizar_corrida', corrida)
					return corrida
				})
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Reanuda una corrida detenida, fallida o trabada (solo con el acceso maestro): sigue desde el
		 * primer artículo pendiente.
		 *
		 * @param {Object} context
		 * @param {Number} id
		 * @returns {Promise<Object>} RunPayload normalizado.
		 */
		reanudar({ commit }, id) {
			return axios.post(RUTA_DE_CORRIDAS + '/' + id + '/reanudar', {}, opciones())
				.then(res => {
					let corrida = normalizar_corrida(extraer_modelo(res.data))
					commit('actualizar_corrida', corrida)
					return corrida
				})
				.catch(relanzar_marcando_la_cancelacion)
		},
	},
}
