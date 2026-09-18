import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

/*
 * Procesos en segundo plano del comercio (misión procesos-en-segundo-plano, 18/9/2026).
 *
 * Es la capa de presentación común de todo lo que corre en la cola y el usuario tiene que ver:
 * importaciones, recálculo de precios, masivas, exportaciones... Cada proceso llega por dos
 * caminos y los dos terminan en `models`:
 *
 *  - por broadcast, canal `background_processes.{owner_id}`, evento `.BackgroundProcessUpdated`
 *    con `{ proceso }` (lo suscribe common-vue/mixins/broadcast.js y commitea `upsert`);
 *  - por `GET background-processes` (`getModels`), que es la fuente de verdad cuando el socket no
 *    está: al arrancar, al reconectar Echo y como respaldo cada 15 s mientras haya activos y la
 *    conexión no esté sana (ver Tarjeta.vue).
 *
 * También guarda el ESTADO DE LA CONEXIÓN al broadcast (lo escribe main.js, que es el único lugar
 * donde la conexión de Pusher existe antes que cualquier componente) y lo que el servidor dice de
 * sí mismo (`broadcast_servidor`): un servidor con BROADCAST_DRIVER=log tiene el socket
 * perfectamente conectado y no emite nunca nada. Las dos cosas juntas son el getter `conectado`.
 *
 * Compatibilidad: contra una API vieja `GET background-processes` da 404. Se atrapa, se loguea y la
 * lista queda como está; la píldora no aparece y nada más cambia.
 */

/** Opciones de axios para que un 404 de la API vieja no dispare el toast global de error. */
const OPCIONES_SILENCIOSAS = { skip_global_error_event: true }

/**
 * Milisegundos de una fecha ISO del contrato, o 0 si no vino. Para ordenar sin que un null
 * reviente el sort.
 *
 * @param {String|null} fecha
 * @returns {Number}
 */
function tiempo(fecha) {
	if (!fecha) {
		return 0
	}
	let ms = new Date(fecha).getTime()
	return isNaN(ms) ? 0 : ms
}

/**
 * True si el proceso ya terminó (bien o mal).
 *
 * @param {Object} proceso
 * @returns {Boolean}
 */
function esta_terminado(proceso) {
	return proceso.status === 'completado' || proceso.status === 'fallo'
}

export default {
	namespaced: true,
	state: {
		/** Activos + terminados recientes no vistos, tal como los devuelve el contrato. */
		models: [],
		/** true mientras está en vuelo el GET del listado. */
		loading: false,
		/** true una vez que `getModels` respondió (bien o mal) por primera vez en la sesión. */
		cargado: false,
		/** Detalle abierto en el modal: { proceso, referencia, error }. Null si no hay ninguno. */
		detalle: null,
		/** true mientras está en vuelo el GET del detalle. */
		detalle_loading: false,
		/**
		 * Estado del socket contra Pusher: 'conectado' | 'conectando' | 'desconectado'. Lo escribe
		 * main.js a partir de `connection.state` y de `state_change`.
		 */
		estado_conexion: 'conectando',
		/** Momento (ms) del último evento recibido por el canal. Null si no llegó ninguno. */
		ultimo_evento_at: null,
		/**
		 * Lo que el servidor dice de su propio broadcast (clave `broadcast` de GET background-processes):
		 * `{ driver, habilitado }`. `habilitado: false` = ESE servidor no puede avisar en tiempo real
		 * (driver distinto de pusher o sin clave). `{ null, null }` = todavía no se sabe.
		 */
		broadcast_servidor: { driver: null, habilitado: null },
		/**
		 * Nombre del canal de Echo al que está suscripta esta sesión, para no suscribirse dos veces
		 * y para hacer Echo.leave si cambia el dueño (mismo criterio que order_created_echo_channel
		 * en src/mixins/broadcast.js). Vive acá y no en un data() del mixin porque ese mixin es
		 * GLOBAL (Vue.mixin(app) en main.js): un data() ahí le agregaría una propiedad reactiva a
		 * cada componente del sistema.
		 */
		canal_suscripto: null,
	},
	getters: {
		/**
		 * Procesos todavía en curso, el más reciente primero.
		 *
		 * @returns {Array}
		 */
		activos(state) {
			return state.models
				.filter(proceso => proceso.status === 'pendiente' || proceso.status === 'en_proceso')
				.sort((a, b) => tiempo(b.started_at) - tiempo(a.started_at))
		},
		/**
		 * Terminados (completados o fallidos) que el usuario todavía no cerró, el último primero.
		 *
		 * @returns {Array}
		 */
		recientes(state) {
			return state.models
				.filter(proceso => esta_terminado(proceso))
				.sort((a, b) => tiempo(b.finished_at) - tiempo(a.finished_at))
		},
		cantidad_activos(state, getters) {
			return getters.activos.length
		},
		/**
		 * Promedio entero de los porcentajes de los activos que son medibles. Null si ninguno lo
		 * es: la píldora entonces muestra el anillo girando sin número.
		 *
		 * @returns {Number|null}
		 */
		porcentaje_global(state, getters) {
			let medibles = getters.activos.filter(proceso => {
				return proceso.porcentaje !== null && typeof proceso.porcentaje !== 'undefined'
			})
			if (!medibles.length) {
				return null
			}
			let suma = 0
			medibles.forEach(proceso => {
				suma += Number(proceso.porcentaje) || 0
			})
			return Math.round(suma / medibles.length)
		},
		hay_fallos_recientes(state, getters) {
			return getters.recientes.some(proceso => proceso.status === 'fallo')
		},
		/**
		 * True cuando los avisos en tiempo real de verdad pueden llegar: el socket está conectado
		 * Y el servidor puede emitir. Con `habilitado === false` el socket sano no sirve de nada.
		 *
		 * @returns {Boolean}
		 */
		conectado(state) {
			return state.estado_conexion === 'conectado' && state.broadcast_servidor.habilitado !== false
		},
		/**
		 * Estado que se pinta: Lucas pidió DOS colores, verde o rojo. 'conectando' también es rojo;
		 * el matiz lo da el título.
		 *
		 * @returns {String} 'conectado' | 'desconectado'
		 */
		estado_visual_conexion(state, getters) {
			return getters.conectado ? 'conectado' : 'desconectado'
		},
		/**
		 * Texto explicativo del punto de conexión (va en el `title`). El motivo más grave manda:
		 * un servidor que no puede emitir se explica antes que un socket que está conectando.
		 *
		 * @returns {String}
		 */
		titulo_conexion(state, getters) {
			if (state.broadcast_servidor.habilitado === false) {
				return 'El sistema no está configurado para avisar en tiempo real'
			}
			if (state.estado_conexion === 'conectando') {
				return 'Conectando…'
			}
			if (getters.conectado) {
				return 'Conectado en tiempo real'
			}
			return 'Sin conexión en tiempo real: los avisos pueden demorar'
		},
	},
	mutations: {
		/**
		 * Reemplaza la lista con lo que devolvió el GET. Si para algún id ya había una versión MÁS
		 * NUEVA (un evento que llegó mientras el GET viajaba), se conserva esa: la respuesta es una
		 * foto anterior al evento y no tiene que pisarlo.
		 *
		 * @param {Object} state
		 * @param {Array} lista
		 */
		setModels(state, lista) {
			let nuevos = Array.isArray(lista) ? lista : []
			let resultado = []

			nuevos.forEach(proceso => {
				let actual = state.models.find(modelo => modelo.id === proceso.id)
				if (actual && tiempo(actual.updated_at) > tiempo(proceso.updated_at)) {
					resultado.push(actual)
				} else {
					resultado.push(proceso)
				}
			})

			state.models = resultado
		},
		/**
		 * Alta o reemplazo por `id` de un proceso que llegó por broadcast (o por el detalle). Un
		 * terminado que ya fue visto (visto_at no nulo) se saca en vez de guardarse: no tiene que
		 * aparecer en la lista. Y una versión más vieja que la que ya está no pisa nada: el GET del
		 * detalle puede resolver después de un evento más nuevo.
		 *
		 * @param {Object} state
		 * @param {Object} proceso Payload `proceso` del evento.
		 */
		upsert(state, proceso) {
			if (!proceso || typeof proceso.id === 'undefined' || proceso.id === null) {
				return
			}
			state.ultimo_evento_at = Date.now()

			let indice = state.models.findIndex(modelo => modelo.id === proceso.id)

			if (esta_terminado(proceso) && proceso.visto_at) {
				if (indice !== -1) {
					state.models.splice(indice, 1)
				}
				return
			}

			if (indice === -1) {
				state.models.push(proceso)
				return
			}
			if (tiempo(state.models[indice].updated_at) > tiempo(proceso.updated_at)) {
				return
			}
			state.models.splice(indice, 1, proceso)
		},
		remove(state, id) {
			let indice = state.models.findIndex(modelo => modelo.id === id)
			if (indice !== -1) {
				state.models.splice(indice, 1)
			}
		},
		/**
		 * Marca visto localmente: lo saca de la lista (es lo que el usuario ve como "cerrar").
		 * El servidor se entera por la acción marcar_visto.
		 */
		marcarVisto(state, id) {
			let indice = state.models.findIndex(modelo => modelo.id === id)
			if (indice !== -1) {
				state.models.splice(indice, 1)
			}
		},
		/** Saca de la lista todos los terminados (botón "Limpiar"). */
		limpiarTerminados(state) {
			state.models = state.models.filter(proceso => !esta_terminado(proceso))
		},
		setEstadoConexion(state, estado) {
			state.estado_conexion = estado
		},
		setBroadcastServidor(state, valor) {
			if (!valor || typeof valor !== 'object') {
				return
			}
			state.broadcast_servidor = {
				driver: typeof valor.driver === 'undefined' ? null : valor.driver,
				habilitado: typeof valor.habilitado === 'undefined' ? null : valor.habilitado,
			}
		},
		setDetalle(state, valor) {
			state.detalle = valor || null
		},
		setDetalleLoading(state, valor) {
			state.detalle_loading = !!valor
		},
		setLoading(state, valor) {
			state.loading = !!valor
		},
		setCargado(state, valor) {
			state.cargado = !!valor
		},
		setCanalSuscripto(state, canal) {
			state.canal_suscripto = canal || null
		},
	},
	actions: {
		/**
		 * Trae activos + recientes del comercio y reemplaza la lista entera. Es la fuente de verdad
		 * cuando el broadcast no alcanza (arranque, reconexión, respaldo por polling).
		 *
		 * Contra una API vieja da 404: se atrapa y la lista queda como está. Nunca dispara el toast
		 * global de error.
		 *
		 * @returns {Promise}
		 */
		getModels({ commit }) {
			commit('setLoading', true)

			return axios.get('/api/background-processes', OPCIONES_SILENCIOSAS)
				.then(res => {
					let datos = res.data || {}
					let activos = Array.isArray(datos.activos) ? datos.activos : []
					let recientes = Array.isArray(datos.recientes) ? datos.recientes : []

					commit('setModels', activos.concat(recientes))
					commit('setBroadcastServidor', datos.broadcast)
				})
				.catch(err => {
					console.log('background-processes: no se pudo traer el listado (¿API sin este endpoint?)')
					console.log(err)
				})
				.then(() => {
					commit('setLoading', false)
					commit('setCargado', true)
				})
		},
		/**
		 * Trae un proceso con el registro propio de su flujo (ImportStatus, PriceUpdateRun...).
		 * Si falla, el detalle se arma con lo que ya hay en la lista y sin referencia: mejor un
		 * detalle corto que una vista rota.
		 *
		 * Acepta el id pelado o `{ id, silencioso }`: con `silencioso` no toca `detalle_loading`,
		 * para refrescar los números de un detalle abierto sin que el skeleton parpadee.
		 *
		 * @param {Number|Object} pedido
		 * @returns {Promise}
		 */
		getDetalle({ commit, state }, pedido) {
			let id = pedido && typeof pedido === 'object' ? pedido.id : pedido
			let silencioso = !!(pedido && typeof pedido === 'object' && pedido.silencioso)

			if (!silencioso) {
				commit('setDetalleLoading', true)
			}

			return axios.get('/api/background-processes/' + id, OPCIONES_SILENCIOSAS)
				.then(res => {
					let datos = res.data || {}
					commit('setDetalle', {
						proceso: datos.proceso || null,
						referencia: datos.referencia || null,
						error: false,
					})
					// El detalle trae el proceso más fresco que la lista: se aprovecha.
					if (datos.proceso) {
						commit('upsert', datos.proceso)
					}
				})
				.catch(err => {
					console.log(err)
					// Un refresco silencioso que falla no borra la referencia que ya se mostraba.
					if (silencioso && state.detalle && state.detalle.proceso && state.detalle.proceso.id === id) {
						return
					}
					let en_lista = state.models.find(proceso => proceso.id === id) || null
					commit('setDetalle', {
						proceso: en_lista,
						referencia: null,
						error: true,
					})
				})
				.then(() => {
					if (!silencioso) {
						commit('setDetalleLoading', false)
					}
				})
		},
		/**
		 * Cierra un terminado (la "×" de su fila). Se saca de la lista primero y se avisa después:
		 * si el PUT falla, en el peor caso vuelve a aparecer en el próximo listado.
		 *
		 * @param {Number} id
		 * @returns {Promise}
		 */
		marcar_visto({ commit }, id) {
			commit('marcarVisto', id)

			return axios.put('/api/background-processes/' + id + '/visto', {}, OPCIONES_SILENCIOSAS)
				.catch(err => {
					console.log(err)
				})
		},
		/**
		 * Cierra todos los terminados (botón "Limpiar"). Misma política que marcar_visto.
		 *
		 * @returns {Promise}
		 */
		marcar_vistos({ commit }) {
			commit('limpiarTerminados')

			return axios.put('/api/background-processes/vistos', {}, OPCIONES_SILENCIOSAS)
				.catch(err => {
					console.log(err)
				})
		},
	},
}
