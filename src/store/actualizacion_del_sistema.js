import axios from 'axios'
import {
	es_respuesta_de_actualizacion,
	mensaje_de_actualizacion,
	MENSAJE_SISTEMA_ACTUALIZANDO,
	texto_faltan,
} from '@/utils/actualizacion_del_sistema'
axios.defaults.withCredentials = true

/**
 * Aviso de actualización del sistema (misión aviso-actualizacion-sistema, 25/11/2026).
 *
 * Guarda dos cosas que viajan por contratos distintos con empresa-api (plan §4.3):
 *
 *  - El PEDIDO DE OK (`GET api/actualizacion-del-sistema/estado` y `POST .../respuesta`): cuando el
 *    equipo de soporte necesita actualizar con el negocio abierto, cada computadora con sesión ve un
 *    modal con "Aceptar" / "Ahora no"; quien acepta sigue trabajando y ve cuántas computadoras faltan.
 *  - El BLOQUEO (`bloqueado`, `mensaje`): lo prende el interceptor de main.js cuando cualquier ruta
 *    contesta la marca 503 `sistema_actualizando`, y lo lee la tarjeta de la pantalla de ingreso.
 *    `GET api/actualizacion-del-sistema/publico` (sin sesión) la mantiene al día y avisa cuándo terminó.
 *
 * `sin_soporte`: una API vieja (el SPA nuevo llega antes que la API durante el deploy) contesta 404;
 * entonces se deja de preguntar y nadie ve nada. Para un cliente sin pedido en curso no hace nada:
 * el estado es `libre` y ningún getter muestra nada.
 */
export default {
	namespaced: true,
	state: {
		/* Estado del pedido: 'libre' | 'pidiendo_ok' | 'rechazado' | 'actualizando'. */
		estado: 'libre',
		/* Respuesta de ESTA computadora: null | 'pendiente' | 'acepto'. */
		mi_respuesta: null,
		/* Computadoras conectadas al armar el pedido, las que aceptaron y las que faltan. */
		total: 0,
		aceptaron: 0,
		faltan: 0,
		/* Segundos que quedaban para responder cuando llegó la respuesta, y cuándo llegó (para la cuenta regresiva). */
		segundos_para_responder: 0,
		recibido_at: 0,
		/* La API no tiene el aviso (404): no se vuelve a preguntar. */
		sin_soporte: false,
		/* El sistema está actualizándose: lo prende el interceptor con la marca 503. */
		bloqueado: false,
		mensaje: '',
		/* El bloqueo terminó mientras la pantalla de ingreso estaba abierta: "Ya podés ingresar". */
		terminada: false,
		/*
			Cuántas veces el SERVIDOR dijo que un pedido abierto se rechazó ("Ahora no") o se canceló. Es un
			contador y no un estado: el aviso "se pasó para la noche" lo dispara un cambio de este número y
			nada más. Un reseteo local (logout, marca 503, bloqueo) NO lo toca: `limpiar_pedido` no pasa por acá.
		*/
		cancelaciones: 0,
	},
	getters: {
		/**
		 * El modal del pedido se muestra mientras hay pedido abierto y esta computadora no contestó.
		 *
		 * @param {Object} state
		 * @returns {Boolean}
		 */
		mostrar_modal(state) {
			return state.estado === 'pidiendo_ok' && state.mi_respuesta === 'pendiente'
		},
		/**
		 * La pastilla "Faltan N computadoras" se muestra mientras hay pedido abierto y esta computadora aceptó.
		 *
		 * @param {Object} state
		 * @returns {Boolean}
		 */
		mostrar_faltan(state) {
			return state.estado === 'pidiendo_ok' && state.mi_respuesta === 'acepto'
		},
		/**
		 * Texto de la pastilla ("Faltan 2 computadoras por confirmar").
		 *
		 * @param {Object} state
		 * @returns {String}
		 */
		texto_faltan(state) {
			return texto_faltan(state.faltan)
		},
	},
	mutations: {
		/**
		 * Vuelca una respuesta de `GET estado` / `POST respuesta` (todas las claves son opcionales: una
		 * respuesta parcial no rompe nada). Una respuesta 200 también significa que el sistema no está bloqueado.
		 *
		 * @param {Object} state
		 * @param {Object} datos Cuerpo de la respuesta.
		 * @returns {void}
		 */
		set_estado(state, datos) {
			// Cuerpo tolerante: sin objeto se toma como "libre".
			const cuerpo = datos && typeof datos === 'object' ? datos : {}
			// ¿Había un pedido abierto antes de esta respuesta del servidor?
			const venia_pidiendo_ok = state.estado === 'pidiendo_ok'
			state.estado = cuerpo.estado || 'libre'
			// El servidor cerró el pedido sin pasar a `actualizando`: alguien dijo "Ahora no" o se canceló.
			if (venia_pidiendo_ok && (state.estado === 'rechazado' || state.estado === 'libre')) {
				state.cancelaciones++
			}
			state.mi_respuesta = cuerpo.mi_respuesta || null
			state.total = Number(cuerpo.total) || 0
			state.aceptaron = Number(cuerpo.aceptaron) || 0
			state.faltan = Number(cuerpo.faltan) || 0
			state.segundos_para_responder = Number(cuerpo.segundos_para_responder) || 0
			state.recibido_at = Date.now()
			state.bloqueado = false
			state.terminada = false
		},
		/**
		 * @param {Object} state
		 * @param {Boolean} valor `true` cuando la API no tiene el aviso (404).
		 * @returns {void}
		 */
		set_sin_soporte(state, valor) {
			state.sin_soporte = !!valor
		},
		/**
		 * Prende el bloqueo (la marca 503 llegó). El pedido en curso deja de importar.
		 *
		 * @param {Object} state
		 * @param {String} mensaje Texto de la API; sin él, el de por defecto.
		 * @returns {void}
		 */
		set_bloqueado(state, mensaje) {
			state.bloqueado = true
			state.terminada = false
			state.mensaje = mensaje || MENSAJE_SISTEMA_ACTUALIZANDO
		},
		/**
		 * El público dice "libre": si había bloqueo, terminó la actualización.
		 *
		 * @param {Object} state
		 * @returns {void}
		 */
		set_desbloqueado(state) {
			if (state.bloqueado) {
				state.bloqueado = false
				state.terminada = true
			}
		},
		/**
		 * Apaga el pedido (al cerrar la sesión). No toca el bloqueo: el interceptor lo prende justo
		 * al cerrar la sesión y la pantalla de ingreso lo necesita.
		 *
		 * @param {Object} state
		 * @returns {void}
		 */
		limpiar_pedido(state) {
			state.estado = 'libre'
			state.mi_respuesta = null
			state.total = 0
			state.aceptaron = 0
			state.faltan = 0
			state.segundos_para_responder = 0
		},
	},
	actions: {
		/**
		 * Pregunta el estado del pedido y registra la presencia de esta computadora (lo hace la API).
		 * Se llama cada 60 s y cuando llega un aviso en vivo. En silencio: sin toast ni loading global.
		 * Nunca rechaza: un fallo acá no puede romper la pantalla.
		 *
		 * @param {Object} contexto
		 * @returns {Promise<Object|null>} El cuerpo de la respuesta, o null si no hubo.
		 */
		consultar({ commit, state, rootState }) {
			// API sin el aviso: no se vuelve a pedir.
			if (state.sin_soporte) {
				return Promise.resolve(null)
			}
			return axios.get('/api/actualizacion-del-sistema/estado', {
				skip_global_error_event: true,
				skip_navigation_cancel: true,
			})
			.then(res => {
				commit('set_estado', res.data)
				return res.data
			})
			.catch(err => {
				if (err && err.response && err.response.status === 404) {
					commit('set_sin_soporte', true)
				} else if (err && err.response && err.response.status === 401
					&& rootState.auth && rootState.auth.authenticated === true) {
					/*
						Pestaña zombi: con 2+ pestañas del mismo navegador la primera recibe la marca y la API
						invalida la sesión compartida; las otras reciben 401 (no la marca). Con la sesión del
						front todavía abierta se la cierra, igual que hace el interceptor con la marca, y el
						watch de App.vue lleva al login. NO se prende el bloqueo (no se sabe si es una
						actualización): la tarjeta del login lo averigua con el estado público. Con la sesión
						del front ya cerrada (logout en curso, sesión cerrada en otro dispositivo) no se toca nada.
					*/
					commit('auth/setAuthenticated', false, { root: true })
					commit('auth/setUser', null, { root: true })
				} else if (es_respuesta_de_actualizacion(err)) {
					// El interceptor también lo hace; acá queda cubierto si el pedido salió con otro cliente axios.
					commit('set_bloqueado', mensaje_de_actualizacion(err))
				} else {
					console.log('actualizacion_del_sistema/consultar', err)
				}
				return null
			})
		},
		/**
		 * Manda la respuesta de esta computadora al pedido ("acepto" o "ahora_no").
		 *
		 * @param {Object} contexto
		 * @param {String} respuesta 'acepto' | 'ahora_no'
		 * @returns {Promise<Boolean>} `true` si quedó registrada; nunca rechaza.
		 */
		responder({ commit, dispatch }, respuesta) {
			commit('auth/setMessage', 'Enviando tu respuesta', { root: true })
			commit('auth/setLoading', true, { root: true })
			return axios.post('/api/actualizacion-del-sistema/respuesta', { respuesta: respuesta }, {
				skip_global_error_event: true,
			})
			.then(res => {
				commit('auth/setLoading', false, { root: true })
				commit('auth/setMessage', '', { root: true })
				commit('set_estado', res.data)
				/*
					La última aceptación: el pedido pasó a `actualizando` en esta misma respuesta. Se consulta el
					estado ya, para recibir la marca 503 (que cierra el front y lleva al login) sin esperar el
					siguiente polling, con el resto de las computadoras ya cerradas.
				*/
				if (res.data && res.data.estado === 'actualizando') {
					return dispatch('consultar').then(() => true)
				}
				return true
			})
			.catch(err => {
				commit('auth/setLoading', false, { root: true })
				commit('auth/setMessage', '', { root: true })
				// Sin pedido abierto (ya cerró, o lo cancelaron): se pone al día con el servidor.
				if (err && err.response && err.response.status === 409) {
					return dispatch('consultar').then(() => false)
				}
				console.log('actualizacion_del_sistema/responder', err)
				return false
			})
		},
		/**
		 * Estado público (sin sesión) para la pantalla de ingreso: la marca 503 prende el bloqueo y un
		 * "libre" después de un bloqueo avisa que la actualización terminó. Nunca rechaza.
		 *
		 * @param {Object} contexto
		 * @returns {Promise<String|null>} El estado, 'actualizando' si hubo marca, o null.
		 */
		consultar_publico({ commit }) {
			return axios.get('/api/actualizacion-del-sistema/publico', {
				skip_global_error_event: true,
				skip_navigation_cancel: true,
			})
			.then(res => {
				// Cualquier 200 del público es "no está actualizando" (libre, pidiendo_ok o rechazado).
				commit('set_desbloqueado')
				return res.data && res.data.estado ? res.data.estado : null
			})
			.catch(err => {
				if (es_respuesta_de_actualizacion(err)) {
					commit('set_bloqueado', mensaje_de_actualizacion(err))
					return 'actualizando'
				}
				// 404 (API vieja) o cualquier otro fallo: no se decide nada.
				return null
			})
		},
	},
}
