import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

/*
 * Asignaciones de imágenes inteligentes (misión imagenes-catalogo-completo, 27/9/2026).
 *
 * Cada vez que el sistema busca imágenes para varios artículos —desde el listado (selección o
 * filtro), desde el asistente o, con el acceso maestro, para todo el catálogo— la API crea una
 * "asignación" (`image_assignment_runs`) con un item por artículo. Este store es la capa de la SPA
 * sobre el contrato §5 del plan de la misión:
 *
 *  - `resumen` ({a_revisar, sin_ver, en_proceso}) alimenta el número rojo de la solapa
 *    Alertas → Imágenes y la campana del menú. Se pide al loguear (start_methods.js), al volver a
 *    tocar la solapa activa y cada vez que algo lo mueve (aprobar, rechazar, fin de corrida).
 *  - `models` + el paginador son la página visible de la tabla de asignaciones de esa solapa.
 *  - Las acciones que traen o cambian UNA asignación o sus items (detalle, aprobar, rechazar,
 *    quitar, catálogo, detener, reanudar) no guardan nada propio: devuelven la respuesta y el
 *    componente que las llamó decide qué mostrar. Solo si la asignación que vuelve está en la
 *    página visible se reemplaza la fila, para que la tabla no quede con números viejos.
 *
 * Errores: los pedidos que dispara una persona (abrir un detalle, aprobar, lanzar...) pasan por el
 * interceptor global de main.js, que muestra el `message` de la API (un 422 {message} sale como
 * aviso amarillo). Los pedidos de fondo (el badge, el refresco periódico) van silenciosos: un
 * error ahí no le tiene que tirar un cartel a nadie cada 15 segundos.
 *
 * 🔴 TODOS los pedidos de este módulo van con `skip_navigation_cancel`. main.js cancela en cada
 * navegación los pedidos en vuelo, y en esta pantalla hay navegaciones que solo cambian la query
 * (abrir o cerrar el detalle por link directo, "Revisar en Alertas"): sin la marca, cerrar el
 * detalle antes de que llegara la tabla la cancelaba y se veía "No pudimos traer las búsquedas de
 * imágenes" sin que nada hubiera fallado. Por las dudas, una cancelación igual se trata como "no
 * pasó nada" y nunca como error (`axios.isCancel`).
 */

/**
 * Opciones de axios de TODOS los pedidos de este módulo (ver el 🔴 de arriba).
 */
const OPCIONES_BASE = { skip_navigation_cancel: true }

/**
 * Opciones de axios para los pedidos de fondo: además, sin el toast del interceptor global.
 */
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
 * Contador de pedidos del listado. El listado se pide desde varios lados (entrar a la solapa,
 * paginar, el refresco cada 15 s mientras hay una asignación corriendo, lanzar el catálogo) y una
 * respuesta vieja que llega tarde no puede pisar a una más nueva: solo se aplica la del último
 * pedido. Vive fuera del state porque no es información que se muestre.
 */
let ultimo_pedido_de_listado = 0

/**
 * Contador de pedidos del RESUMEN del badge. El resumen llega por dos caminos —`get_resumen` y
 * adentro de la respuesta del listado— y los dos comparten este contador: el que se pidió último
 * es el único que se aplica. Sin eso, un resumen viejo que llegaba tarde (por ejemplo, el del
 * listado pedido antes de aprobar) volvía a subir el número rojo.
 */
let ultimo_pedido_de_resumen = 0

/**
 * Resumen vacío: lo que vale el badge mientras la API no contestó (o si no contestó nunca).
 *
 * @returns {Object} {a_revisar, sin_ver, en_proceso}
 */
function resumen_vacio() {
	return { a_revisar: 0, sin_ver: 0, en_proceso: 0 }
}

/**
 * Normaliza el resumen que manda la API: números siempre (MySQL puede mandar los conteos como
 * texto) y ceros en lo que no vino. Un valor que no es objeto devuelve el resumen vacío.
 *
 * @param {Object|null} valor Resumen tal como llegó.
 * @returns {Object} {a_revisar, sin_ver, en_proceso}
 */
function normalizar_resumen(valor) {
	if (!valor || typeof valor !== 'object') {
		return resumen_vacio()
	}
	return {
		a_revisar: Number(valor.a_revisar) || 0,
		sin_ver: Number(valor.sin_ver) || 0,
		en_proceso: Number(valor.en_proceso) || 0,
	}
}

/**
 * True si la asignación todavía está corriendo (o esperando turno en la cola).
 *
 * @param {Object} asignacion RunPayload.
 * @returns {Boolean}
 */
function esta_activa(asignacion) {
	return !!asignacion && (asignacion.status === 'pendiente' || asignacion.status === 'en_proceso')
}

export default {
	namespaced: true,
	state: {
		/** Números del badge: {a_revisar, sin_ver, en_proceso}. */
		resumen: resumen_vacio(),
		/** Página visible de asignaciones (RunPayload), las más nuevas primero. */
		models: [],
		/** Página pedida al listado. */
		page: 1,
		/** Asignaciones por página (el contrato dice 25 por defecto). */
		per_page: 25,
		/** Total de asignaciones del comercio, según el paginador. */
		total: 0,
		/** Última página, según el paginador. */
		last_page: 1,
		/** true mientras está en vuelo un pedido NO silencioso del listado. */
		loading: false,
		/** true una vez que el listado respondió (bien o mal) por primera vez. */
		cargado: false,
		/** true si el último pedido del listado falló. */
		error: false,
	},
	getters: {
		/**
		 * Número rojo de la solapa y lo que suma a la campana: imágenes esperando que alguien las
		 * apruebe o las rechace, más asignaciones terminadas que nadie abrió todavía.
		 *
		 * @returns {Number}
		 */
		badge(state) {
			return state.resumen.a_revisar + state.resumen.sin_ver
		},
		/**
		 * True si alguna asignación de la página visible sigue corriendo: la solapa la usa para
		 * decidir si vale la pena refrescar la tabla sola.
		 *
		 * @returns {Boolean}
		 */
		hay_activas(state) {
			return state.models.some(asignacion => esta_activa(asignacion))
		},
	},
	mutations: {
		set_resumen(state, valor) {
			state.resumen = normalizar_resumen(valor)
		},
		/**
		 * Aplica una página del paginador de Laravel ({data, total, last_page, current_page,
		 * per_page}). Si no vino un paginador, la tabla queda vacía.
		 *
		 * @param {Object} state
		 * @param {Object|null} paginador
		 */
		set_pagina(state, paginador) {
			if (!paginador || !Array.isArray(paginador.data)) {
				state.models = []
				state.total = 0
				state.last_page = 1
				return
			}
			state.models = paginador.data
			state.total = Number(paginador.total) || 0
			state.last_page = Number(paginador.last_page) || 1
			if (paginador.current_page) {
				state.page = Number(paginador.current_page) || 1
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
		/**
		 * Reemplaza por id una asignación de la página visible con una versión más nueva (la que
		 * devolvió el detalle, detener o reanudar). Si no está en la página, no hace nada: la
		 * tabla la va a traer fresca cuando se vuelva a pedir.
		 *
		 * @param {Object} state
		 * @param {Object} asignacion RunPayload.
		 */
		actualizar_asignacion(state, asignacion) {
			if (!asignacion || typeof asignacion.id === 'undefined') {
				return
			}
			let indice = state.models.findIndex(modelo => modelo.id === asignacion.id)
			if (indice !== -1) {
				state.models.splice(indice, 1, asignacion)
			}
		},
	},
	actions: {
		/**
		 * Trae el resumen liviano del badge. Silencioso: contra un error (o una API que todavía
		 * no tiene el endpoint) el badge queda como estaba y no se muestra nada. Resuelve
		 * siempre, porque start_methods.js lo encadena con el resto del arranque.
		 *
		 * Solo se aplica si es el último resumen pedido (ver `ultimo_pedido_de_resumen`).
		 *
		 * @returns {Promise}
		 */
		get_resumen({ commit }) {
			ultimo_pedido_de_resumen++
			let este_resumen = ultimo_pedido_de_resumen

			return axios.get('/api/image-assignment-runs/resumen', OPCIONES_SILENCIOSAS)
				.then(res => {
					if (este_resumen !== ultimo_pedido_de_resumen) {
						return
					}
					commit('set_resumen', res.data)
				})
				.catch(err => {
					if (es_cancelacion(err)) {
						return
					}
					console.log('image-assignment-runs/resumen: no se pudo traer el resumen del badge')
					console.log(err)
				})
		},
		/**
		 * Trae la página `state.page` del listado de asignaciones (las más nuevas primero) y, de
		 * paso, el resumen del badge que viene en la misma respuesta.
		 *
		 * Con `{ silencioso: true }` no prende `loading` (la tabla no parpadea) y un error no se
		 * anuncia: es el refresco periódico mientras hay una asignación corriendo.
		 *
		 * Si la página pedida ya no existe (el total bajó mientras se miraba otra cosa: la API
		 * contesta `data: []` con current_page > last_page), se pide la última que sí existe, igual
		 * que hace el detalle con sus artículos.
		 *
		 * Una cancelación no es un error: se vuelve a pedir una vez (ver el 🔴 del principio).
		 *
		 * Resuelve siempre: quien lo llama (la solapa, Alertas.vue al re-clickear la pestaña) solo
		 * necesita saber cuándo terminó, y el error queda en `state.error`.
		 *
		 * @param {Object} context
		 * @param {Object} pedido { silencioso: Boolean, reintento: Boolean }
		 * @returns {Promise}
		 */
		get_asignaciones({ commit, state, dispatch }, pedido) {
			let silencioso = !!(pedido && pedido.silencioso)
			let es_reintento = !!(pedido && pedido.reintento)
			ultimo_pedido_de_listado++
			let este_pedido = ultimo_pedido_de_listado
			ultimo_pedido_de_resumen++
			let este_resumen = ultimo_pedido_de_resumen

			if (!silencioso) {
				commit('set_loading', true)
			}

			let config = opciones({
				params: {
					page: state.page,
					per_page: state.per_page,
				},
			})
			if (silencioso) {
				config.skip_global_error_event = true
			}

			return axios.get('/api/image-assignment-runs', config)
				.then(res => {
					if (este_pedido !== ultimo_pedido_de_listado) {
						return
					}
					let datos = res.data || {}
					let paginador = datos.models

					// Página fuera de rango: se pide la última que exista. La respuesta de este
					// pedido no se aplica; el pedido nuevo es el que deja todo como corresponde.
					if (paginador && Array.isArray(paginador.data) && !paginador.data.length
						&& Number(paginador.total) > 0
						&& Number(paginador.current_page) > Number(paginador.last_page)) {
						commit('set_page', Number(paginador.last_page) || 1)
						return dispatch('get_asignaciones', pedido)
					}

					commit('set_pagina', paginador)
					if (datos.resumen && este_resumen === ultimo_pedido_de_resumen) {
						commit('set_resumen', datos.resumen)
					}
					commit('set_error', false)
				})
				.catch(err => {
					if (este_pedido !== ultimo_pedido_de_listado) {
						return
					}
					if (es_cancelacion(err)) {
						// No falló nada: se vuelve a pedir una vez, y ese pedido es el que vale.
						if (!es_reintento) {
							return dispatch('get_asignaciones', Object.assign({}, pedido || {}, { reintento: true }))
						}
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
		 * Trae una asignación por id. Del lado de la API esto la marca como vista (si ya salió de
		 * proceso), así que el badge puede bajar: quien la llama decide cuándo volver a pedir el
		 * resumen.
		 *
		 * Rechaza si falla, para que el detalle pueda mostrar su propio estado de error. Una
		 * cancelación rechaza marcada (ver `es_cancelacion`).
		 *
		 * @param {Object} context
		 * @param {Number|Object} pedido El id, o `{ id, silencioso }`.
		 * @returns {Promise<Object>} RunPayload.
		 */
		get_asignacion({ commit }, pedido) {
			let id = pedido && typeof pedido === 'object' ? pedido.id : pedido
			let silencioso = !!(pedido && typeof pedido === 'object' && pedido.silencioso)

			return axios.get('/api/image-assignment-runs/' + id, silencioso ? OPCIONES_SILENCIOSAS : opciones())
				.then(res => {
					let asignacion = res.data ? res.data.model : null
					commit('actualizar_asignacion', asignacion)
					return asignacion
				})
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Trae una asignación por el uuid que devolvió `google/batch-assign-images` (es el
		 * `batch_uuid` del evento de Pusher). Lo usa el aviso de fin de corrida. Silencioso: si
		 * falla, el aviso cae al payload de Pusher y no hace falta ningún cartel de error.
		 *
		 * @param {Object} context
		 * @param {String} uuid
		 * @returns {Promise<Object>} RunPayload.
		 */
		get_asignacion_por_uuid({ commit }, uuid) {
			return axios.get('/api/image-assignment-runs/por-uuid/' + encodeURIComponent(uuid), OPCIONES_SILENCIOSAS)
				.then(res => {
					let asignacion = res.data ? res.data.model : null
					commit('actualizar_asignacion', asignacion)
					return asignacion
				})
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Trae una página de los artículos de una asignación, de UNA solapa. Una cancelación
		 * rechaza marcada, para que el detalle no la muestre como error (ver `es_cancelacion`).
		 *
		 * @param {Object} context
		 * @param {Object} pedido {asignacion_id, solapa, page, per_page, buscar, silencioso}
		 * @returns {Promise<Object>} {models: paginador de ItemPayload, conteos}
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
			return axios.get('/api/image-assignment-runs/' + pedido.asignacion_id + '/items', config)
				.then(res => res.data || {})
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Aprueba la imagen de un artículo "a revisar": la API la asigna al artículo (pasa a verse
		 * en la tienda) y el item queda `aprobada`. 422 si ya no estaba para revisar o si el
		 * artículo se borró; el interceptor global muestra el motivo.
		 *
		 * @param {Object} context
		 * @param {Number} item_id
		 * @returns {Promise<Object>} ItemPayload.
		 */
		aprobar(context, item_id) {
			return axios.post('/api/image-assignment-items/' + item_id + '/aprobar', {}, opciones())
				.then(res => (res.data ? res.data.model : null))
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Rechaza la imagen de un artículo "a revisar": la API borra la imagen candidata y el
		 * artículo queda sin imagen (item `rechazada`, que cuenta como no asignado).
		 *
		 * @param {Object} context
		 * @param {Number} item_id
		 * @returns {Promise<Object>} ItemPayload.
		 */
		rechazar(context, item_id) {
			return axios.post('/api/image-assignment-items/' + item_id + '/rechazar', {}, opciones())
				.then(res => (res.data ? res.data.model : null))
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
			return axios.post('/api/image-assignment-items/aprobar-varios', { ids: ids }, opciones())
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
			return axios.post('/api/image-assignment-items/rechazar-varios', { ids: ids }, opciones())
				.then(res => res.data || {})
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Quita del artículo una imagen que la asignación le había puesto (sola o aprobada). La
		 * API la borra con la misma lógica que el borrado manual de imágenes, así Tienda Nube se
		 * entera; el item queda `quitada`.
		 *
		 * @param {Object} context
		 * @param {Number} item_id
		 * @returns {Promise<Object>} ItemPayload.
		 */
		quitar(context, item_id) {
			return axios.post('/api/image-assignment-items/' + item_id + '/quitar', {}, opciones())
				.then(res => (res.data ? res.data.model : null))
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Previa de "todo el catálogo" (solo acceso maestro): cuántos artículos hay sin imagen,
		 * cuántos se buscarían ahora, qué se excluye y por qué, la estimación, si ya hay una
		 * corriendo y si la validación con IA está configurada (`ia_configurada`, `ia_motivo`).
		 *
		 * @returns {Promise<Object>} Contrato §5.4 más los agregados de §13.
		 */
		get_previa_catalogo() {
			return axios.get('/api/image-assignment-runs/catalogo/previa', opciones())
				.then(res => res.data || {})
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Lanza la asignación de todo el catálogo (solo acceso maestro). 422 con `message` si no
		 * hay proveedor configurado, si no está configurada la validación con IA (plan §13), si no
		 * hay artículos para buscar o si ya hay otra corriendo.
		 *
		 * @returns {Promise<Object>} RunPayload de la asignación creada.
		 */
		lanzar_catalogo() {
			return axios.post('/api/image-assignment-runs/catalogo', {}, opciones())
				.then(res => (res.data ? res.data.model : null))
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Detiene una asignación (las de todo el catálogo, solo con el acceso maestro; las demás,
		 * cualquiera que las ve, plan §13): lo ya procesado queda y lo pendiente no se
		 * busca.
		 *
		 * @param {Object} context
		 * @param {Number} id
		 * @returns {Promise<Object>} RunPayload.
		 */
		detener({ commit }, id) {
			return axios.post('/api/image-assignment-runs/' + id + '/detener', {}, opciones())
				.then(res => {
					let asignacion = res.data ? res.data.model : null
					commit('actualizar_asignacion', asignacion)
					return asignacion
				})
				.catch(relanzar_marcando_la_cancelacion)
		},
		/**
		 * Reanuda una asignación detenida, fallida o trabada (las de todo el catálogo, solo con el
		 * acceso maestro; las demás, cualquiera que las ve, plan §13): sigue desde el
		 * primer artículo pendiente.
		 *
		 * @param {Object} context
		 * @param {Number} id
		 * @returns {Promise<Object>} RunPayload.
		 */
		reanudar({ commit }, id) {
			return axios.post('/api/image-assignment-runs/' + id + '/reanudar', {}, opciones())
				.then(res => {
					let asignacion = res.data ? res.data.model : null
					commit('actualizar_asignacion', asignacion)
					return asignacion
				})
				.catch(relanzar_marcando_la_cancelacion)
		},
	},
}
