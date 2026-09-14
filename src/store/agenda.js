import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

import moment from 'moment'
import { rango_grilla_mes } from '@/components/agenda/fechas_agenda'

/**
 * Store del modulo de Agenda (Alertas -> Agenda), mision agenda-tareas-calendario (14/9/2026).
 *
 * No es un ABM: los stores genericos `pending` y `pending_completed` siguen existiendo para la
 * pantalla vieja (components/pendings, hoy sin montar), pero la agenda nueva no trabaja con
 * "modelos" sino con OCURRENCIAS: una tarea recurrente es una sola fila en `pendings` y muchas
 * fechas en pantalla. Quien expande la regla en fechas es la API (`GET pending-agenda`), por dos
 * motivos: el calculo de "el 31 de cada mes" sin desborde vive en un solo lugar, y `completado`
 * de cada ocurrencia sale de una query que la SPA no puede hacer.
 *
 * Contrato: seccion 2 del plan de la mision. Todo con .then()/.catch(), sin async/await.
 */

const FORMATO = 'YYYY-MM-DD'

/**
 * Rango de fechas que pide cada vista.
 *
 * La lista pide de hoy a hoy + 60 dias (las vencidas vienen aparte, sin rango). El calendario
 * pide la grilla completa del mes visible (lunes de la primera semana a domingo de la ultima),
 * porque los dias grises de los bordes tambien muestran sus tareas. Son como mucho 42 dias, bien
 * abajo del tope de 120 que valida la API.
 *
 * @param {String} vista 'lista' | 'calendario'
 * @param {String} hoy YYYY-MM-DD
 * @param {String} mes_visible YYYY-MM
 * @returns {{desde: String, hasta: String}}
 */
function rango_de_la_vista(vista, hoy, mes_visible) {
	if (vista == 'calendario') {
		// Mismo calculo que dibuja la grilla (fechas_agenda.js): una sola fuente para el rango.
		return rango_grilla_mes(mes_visible)
	}
	let desde = moment(hoy, FORMATO)
	return {
		desde: desde.format(FORMATO),
		hasta: desde.clone().add(60, 'days').format(FORMATO),
	}
}

/**
 * Mensaje de error para el usuario a partir de una respuesta de la API.
 *
 * La API responde 409/422 con { message } (no con el mapa `errors` de Laravel), asi que el texto
 * del back es el que se muestra. Sin respuesta o sin message, un texto generico.
 *
 * @param {Object} err error de axios
 * @param {String} generico
 * @returns {String}
 */
function mensaje_de_error(err, generico) {
	if (err && err.response && err.response.data && err.response.data.message) {
		return err.response.data.message
	}
	return generico
}

export default {
	namespaced: true,
	state: {
		/* 'lista' | 'calendario' | 'realizadas' */
		vista: 'lista',

		/*
		 * "Hoy" segun la API (zona de la app). Arranca con la fecha local del navegador para poder
		 * armar el primer rango, y se pisa con la que manda `GET pending-agenda` en cada carga: es
		 * la que decide vencida/hoy, no el reloj de la maquina del usuario.
		 */
		hoy: moment().format(FORMATO),

		/* Rango pedido en la ultima carga (YYYY-MM-DD, inclusive) */
		desde: null,
		hasta: null,

		/* Ocurrencias del rango y vencidas (forma "Ocurrencia" de la seccion 2 del plan) */
		ocurrencias: [],
		vencidas: [],
		loading: false,

		/* Mes de la grilla del calendario, 'YYYY-MM' */
		mes_visible: moment().format('YYYY-MM'),

		/* Dia clickeado en la grilla, 'YYYY-MM-DD' o null */
		dia_seleccionado: null,

		/* Vista Realizadas: PendingCompleted con pending y expense */
		realizadas: [],
		loading_realizadas: false,

		/* Tarea abierta en FormTarea (objeto plano con los campos del body de POST/PUT pending) o null */
		tarea_en_edicion: null,

		/* Ocurrencia con gasto que espera el modal "Marcar como hecha", o null */
		ocurrencia_a_completar: null,

		/*
		 * Ultima ocurrencia marcada como hecha SIN gasto, para la barra "Hecha - Deshacer".
		 * { pending_completed_id, detalle, expense_id }. La barra la limpia sola a los segundos.
		 */
		ultima_hecha: null,

		/* Keys de las ocurrencias con un POST de completar en vuelo (candado del doble clic) */
		en_curso: [],

		/*
		 * Numero de la ultima carga pedida. Cada cargar() lo incrementa y, al volver, descarta la
		 * respuesta si ya no es la ultima: dos clics rapidos en las flechas del calendario podian
		 * dejar en pantalla las ocurrencias del mes anterior con la cabecera ya en el nuevo.
		 */
		secuencia_carga: 0,
	},
	mutations: {
		setVista(state, value) {
			state.vista = value
		},
		setHoy(state, value) {
			if (value) {
				state.hoy = value
			}
		},
		setRango(state, value) {
			state.desde = value.desde
			state.hasta = value.hasta
		},
		setOcurrencias(state, value) {
			state.ocurrencias = Array.isArray(value) ? value : []
		},
		setVencidas(state, value) {
			state.vencidas = Array.isArray(value) ? value : []
		},
		setLoading(state, value) {
			state.loading = value
		},
		setMesVisible(state, value) {
			state.mes_visible = value
		},
		setDiaSeleccionado(state, value) {
			state.dia_seleccionado = value
		},
		setRealizadas(state, value) {
			state.realizadas = Array.isArray(value) ? value : []
		},
		setLoadingRealizadas(state, value) {
			state.loading_realizadas = value
		},
		setTareaEnEdicion(state, value) {
			state.tarea_en_edicion = value
		},
		setOcurrenciaACompletar(state, value) {
			state.ocurrencia_a_completar = value
		},
		setUltimaHecha(state, value) {
			state.ultima_hecha = value
		},
		marcarEnCurso(state, key) {
			if (state.en_curso.indexOf(key) == -1) {
				state.en_curso.push(key)
			}
		},
		liberarEnCurso(state, key) {
			let index = state.en_curso.indexOf(key)
			if (index != -1) {
				state.en_curso.splice(index, 1)
			}
		},
		incrementarSecuenciaCarga(state) {
			state.secuencia_carga++
		},
	},
	actions: {
		/**
		 * Cambia de vista y recarga si la vista nueva pide otro rango. 'realizadas' no pasa por
		 * aca: su carga la dispara el propio componente con el rango de sus inputs.
		 *
		 * @param {String} vista
		 */
		set_vista({commit, dispatch}, vista) {
			commit('setVista', vista)
			if (vista == 'lista' || vista == 'calendario') {
				return dispatch('cargar')
			}
			return Promise.resolve()
		},

		/**
		 * Mueve el mes del calendario (delta en meses, o 0 para volver al mes de hoy) y recarga:
		 * cada mes es otro rango y las ocurrencias de un mes no dicen nada del siguiente.
		 *
		 * @param {Number} delta
		 */
		mover_mes({state, commit, dispatch}, delta) {
			let mes = delta === 0
				? moment(state.hoy, FORMATO)
				: moment(state.mes_visible + '-01', FORMATO).add(delta, 'months')
			commit('setMesVisible', mes.format('YYYY-MM'))
			commit('setDiaSeleccionado', delta === 0 ? state.hoy : null)
			return dispatch('cargar')
		},

		/**
		 * GET pending-agenda/{desde}/{hasta}. Es la unica fuente de las tres listas (vencidas,
		 * ocurrencias, hoy): despues de CUALQUIER escritura se vuelve a llamar en vez de tocar el
		 * estado a mano, porque una tarea recurrente editada cambia todas sus fechas futuras y
		 * eso no se puede reconstruir del lado de la SPA.
		 */
		cargar({state, commit, dispatch}) {
			let vista = state.vista == 'calendario' ? 'calendario' : 'lista'
			let rango = rango_de_la_vista(vista, state.hoy, state.mes_visible)
			commit('setRango', rango)
			commit('setLoading', true)
			commit('incrementarSecuenciaCarga')
			let secuencia = state.secuencia_carga

			return axios.get('api/pending-agenda/' + rango.desde + '/' + rango.hasta)
			.then(res => {
				// Llego una carga mas nueva mientras esta viajaba: lo que trae ya no vale.
				if (secuencia != state.secuencia_carga) {
					return null
				}
				commit('setLoading', false)
				commit('setHoy', res.data.hoy)
				commit('setVencidas', res.data.vencidas)
				commit('setOcurrencias', res.data.ocurrencias)

				/*
				 * El primer rango de la lista se arma con el reloj del navegador, y "hoy" lo
				 * decide la API (zona del comercio). Si no coinciden --usuario de viaje, reloj
				 * adelantado-- las tareas de hoy quedaban afuera del rango pedido y tampoco eran
				 * vencidas: desaparecian. Con el hoy ya corregido se pide una vez mas.
				 */
				if (vista == 'lista' && res.data.hoy && res.data.hoy != rango.desde) {
					return dispatch('cargar')
				}
				return res.data
			})
			.catch(err => {
				console.log(err)
				if (secuencia == state.secuencia_carga) {
					commit('setLoading', false)
				}
				return null
			})
		},

		/**
		 * GET pending-completed/from-date/{desde}/{hasta} -> { models }.
		 *
		 * @param {Object} payload { desde, hasta } en YYYY-MM-DD
		 */
		cargar_realizadas({commit}, payload) {
			commit('setLoadingRealizadas', true)

			return axios.get('api/pending-completed/from-date/' + payload.desde + '/' + payload.hasta)
			.then(res => {
				commit('setLoadingRealizadas', false)
				commit('setRealizadas', res.data.models)
				return res.data.models
			})
			.catch(err => {
				console.log(err)
				commit('setLoadingRealizadas', false)
				return null
			})
		},

		/**
		 * GET pending/{id} -> { model }. Se usa para EDITAR una tarea recurrente: la ocurrencia que
		 * se ve en pantalla tiene la fecha de ESA repeticion, no la fecha base de la regla, y el
		 * form necesita la base para no correr la regla al guardar (una mensual del 31 editada
		 * desde su ocurrencia del 30/4 pasaria a ser "el 30 de cada mes").
		 *
		 * @param {Number} id
		 */
		cargar_tarea(contexto, id) {
			return axios.get('api/pending/' + id, { skip_global_error_event: true })
			.then(res => {
				return res.data.model
			})
			.catch(err => {
				console.log(err)
				return Promise.reject(mensaje_de_error(err, 'No se pudo abrir la tarea.'))
			})
		},

		/**
		 * POST pending (alta) o PUT pending/{id} (edicion). Devuelve el model o rechaza con el
		 * mensaje del back ya resuelto, para que el form lo muestre tal cual.
		 *
		 * Los errores 4xx se manejan aca (skip_global_error_event) y no en el interceptor global:
		 * si no, un 422 del back saldria dos veces, una como warning generico y otra en el toast
		 * del formulario.
		 *
		 * @param {Object} tarea campos del body de la seccion 2 del plan, con `id` si es edicion
		 */
		guardar_tarea({dispatch}, tarea) {
			let body = {
				detalle: tarea.detalle,
				fecha_realizacion: tarea.fecha_realizacion,
				es_recurrente: tarea.es_recurrente ? true : false,
				unidad_frecuencia_id: tarea.es_recurrente ? tarea.unidad_frecuencia_id : null,
				cantidad_frecuencia: tarea.es_recurrente ? tarea.cantidad_frecuencia : null,
				fecha_fin_recurrencia: tarea.es_recurrente && tarea.fecha_fin_recurrencia ? tarea.fecha_fin_recurrencia : null,
				expense_concept_id: tarea.expense_concept_id ? tarea.expense_concept_id : null,
				expense_amount: tarea.expense_concept_id ? tarea.expense_amount : null,
				notas: tarea.notas ? tarea.notas : null,
			}
			let config = { skip_global_error_event: true }
			let pedido = tarea.id
				? axios.put('api/pending/' + tarea.id, body, config)
				: axios.post('api/pending', body, config)

			return pedido
			.then(res => {
				dispatch('cargar')
				return res.data.model
			})
			.catch(err => {
				console.log(err)
				return Promise.reject(mensaje_de_error(err, 'No se pudo guardar la tarea.'))
			})
		},

		/**
		 * PUT pending/{id} con `completado: false`: reabre una puntual que quedo en `completado = 1`
		 * sin realizada (resto de la pantalla vieja). La API exige el resto del body igual que en
		 * una edicion, asi que primero se lee la tarea y se reenvia tal cual con el flag abajo.
		 *
		 * @param {Number} id
		 */
		reabrir_tarea({dispatch}, id) {
			let config = { skip_global_error_event: true }
			return axios.get('api/pending/' + id, config)
			.then(res => {
				let t = res.data.model
				return axios.put('api/pending/' + id, {
					detalle: t.detalle,
					fecha_realizacion: String(t.fecha_realizacion || '').substr(0, 10),
					es_recurrente: t.es_recurrente ? true : false,
					unidad_frecuencia_id: t.unidad_frecuencia_id,
					cantidad_frecuencia: t.cantidad_frecuencia,
					fecha_fin_recurrencia: t.fecha_fin_recurrencia ? String(t.fecha_fin_recurrencia).substr(0, 10) : null,
					expense_concept_id: t.expense_concept_id,
					expense_amount: t.expense_amount,
					notas: t.notas,
					completado: false,
				}, config)
			})
			.then(res => {
				dispatch('cargar')
				return res.data.model
			})
			.catch(err => {
				console.log(err)
				return Promise.reject(mensaje_de_error(err, 'No se pudo volver a pendiente.'))
			})
		},

		/**
		 * DELETE pending/{id}. Borra la regla entera: para una recurrente se van todas las
		 * ocurrencias futuras, y el form lo avisa antes de llamar aca.
		 *
		 * @param {Number} id
		 */
		eliminar_tarea({dispatch}, id) {
			return axios.delete('api/pending/' + id, { skip_global_error_event: true })
			.then(res => {
				dispatch('cargar')
				return res.data
			})
			.catch(err => {
				console.log(err)
				return Promise.reject(mensaje_de_error(err, 'No se pudo eliminar la tarea.'))
			})
		},

		/**
		 * POST pending-completed. El payload es el de la seccion 2 del plan: { pending_id,
		 * fecha_realizacion, notas?, sin_gasto?, expense? }.
		 *
		 * Rechaza con { status, message } y no con el error crudo: quien llama distingue el 409
		 * (ya estaba hecha: se avisa y se recarga) del 422 (falta el gasto o una caja sin apertura:
		 * se muestra el texto del back y el modal sigue abierto).
		 *
		 * @param {Object} payload
		 */
		completar({dispatch}, payload) {
			return axios.post('api/pending-completed', payload, { skip_global_error_event: true })
			.then(res => {
				dispatch('cargar')
				return res.data
			})
			.catch(err => {
				console.log(err)
				let status = err && err.response ? err.response.status : 0
				let message = mensaje_de_error(err, 'No se pudo marcar la tarea como hecha.')
				if (status == 409) {
					// Alguien (o un segundo clic) ya la marco: la recarga es lo que la saca de la lista.
					dispatch('cargar')
				}
				return Promise.reject({ status: status, message: message })
			})
		},

		/**
		 * DELETE pending-completed/{id} ("deshacer"). Responde { expense_id }: si viene con valor,
		 * el gasto que se registro al completar sigue cargado --la API no lo borra, porque
		 * borrarlo implicaria compensar cajas y eso ya tiene su flujo en Gastos--, y quien llama
		 * se lo dice al usuario.
		 *
		 * @param {Number} pending_completed_id
		 */
		deshacer({dispatch}, pending_completed_id) {
			return axios.delete('api/pending-completed/' + pending_completed_id, { skip_global_error_event: true })
			.then(res => {
				dispatch('cargar')
				return res.data
			})
			.catch(err => {
				console.log(err)
				return Promise.reject(mensaje_de_error(err, 'No se pudo deshacer.'))
			})
		},
	},
}
