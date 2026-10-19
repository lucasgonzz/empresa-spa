import axios from 'axios'
import { env } from '@/runtime_config'

/**
 * Tipos de hoja (`sheet_types`) de los diseños de PDF: las hojas (A4) y los rollos de comandera
 * (Ticket 55 mm, Ticket 80 mm y los anchos que agregue el negocio).
 *
 * Misión diseno-ticket-comandera (9/10/2026), contrato 3.1:
 * - `GET api/sheet-types` -> {models: [{id, name, width, height, user_id}]}: los del sistema
 *   (`user_id` null) y los del negocio. Un tipo es TICKET cuando `height` es null.
 * - `POST api/sheet-types` {width} -> 201 con el nuevo, o 200 con el que ya existía de ese ancho
 *   (no duplica); 422 si el ancho no es un entero de 40 a 120.
 *
 * No usa el store base de los modelos: no es un ABM, no se descarga al iniciar sesión y no tiene
 * paginación. Lo carga a pedido el selector "Hoja o comandera" del formulario de Diseño de PDF.
 *
 * 🔴 Compatibilidad con una API vieja: ahí la ruta no existe y el GET da 404. Se guarda en
 * `api_soporta = false` y quien lo usa arma las opciones con los tipos de hoja de los diseños ya
 * cargados, sin la opción de agregar un ancho (no hay dónde guardarlo).
 */

/**
 * URL del recurso. Con la URL completa (y no relativa) para no depender de que otro store haya
 * seteado antes `axios.defaults.baseURL`.
 *
 * @returns {string}
 */
function url_de_sheet_types() {
	return env('VUE_APP_API_URL') + '/api/sheet-types'
}

/**
 * Configuración de axios de este store: el error lo maneja quien llama (un 404 de una API vieja
 * es esperable y un 422 se muestra al lado del campo del ancho, no como cartel global).
 */
const CONFIG_SIN_AVISOS_GLOBALES = {
	// La sesión de la API es por cookie (Sanctum): sin esto el pedido sale sin credenciales.
	withCredentials: true,
	skip_global_error_event: true,
	skip_global_validation_toast: true,
}

/**
 * Ordena como lo devuelve la API: primero los rollos de comandera de menor a mayor ancho, después
 * las hojas en el orden en que se crearon.
 *
 * @param {Array} models
 * @returns {Array} una lista nueva.
 */
export function ordenar_tipos_de_hoja(models) {
	const tickets = []
	const hojas = []

	models.forEach(function (model) {
		if (model && model.height === null) {
			tickets.push(model)
		} else if (model) {
			hojas.push(model)
		}
	})

	tickets.sort(function (a, b) {
		return Number(a.width) - Number(b.width)
	})

	hojas.sort(function (a, b) {
		return Number(a.id) - Number(b.id)
	})

	return tickets.concat(hojas)
}

export default {
	namespaced: true,
	state: {
		model_name: 'sheet_type',
		/**
		 * Tipos de hoja que devolvió la API, ordenados con ordenar_tipos_de_hoja().
		 */
		models: [],
		/**
		 * null = todavía no se preguntó; true = la API tiene el recurso; false = API vieja (404).
		 */
		api_soporta: null,
		/**
		 * Hay un GET en curso (para no repetirlo si se montan dos selectores a la vez).
		 */
		cargando: false,
	},
	mutations: {
		setModels(state, models) {
			state.models = ordenar_tipos_de_hoja(Array.isArray(models) ? models : [])
		},
		/**
		 * Agrega (o reemplaza, si ya estaba) un tipo de hoja y deja la lista ordenada.
		 *
		 * @param {Object} state
		 * @param {Object} model
		 */
		add(state, model) {
			if (!model || !model.id) {
				return
			}
			const otros = state.models.filter(function (item) {
				return item.id != model.id
			})
			otros.push(model)
			state.models = ordenar_tipos_de_hoja(otros)
		},
		setApiSoporta(state, value) {
			state.api_soporta = value
		},
		setCargando(state, value) {
			state.cargando = value
		},
	},
	actions: {
		/**
		 * Trae los tipos de hoja. Una sola vez por sesión salvo `forzar`.
		 *
		 * Resuelve siempre (nunca rechaza): el selector se arma igual con lo que haya.
		 *
		 * @param {Object} context
		 * @param {Object} [payload] {forzar: boolean}
		 * @returns {Promise<void>}
		 */
		cargar({ state, commit }, payload) {
			const forzar = !!(payload && payload.forzar)

			if (state.cargando) {
				return Promise.resolve()
			}

			if (!forzar && state.api_soporta !== null) {
				return Promise.resolve()
			}

			commit('setCargando', true)

			return axios.get(url_de_sheet_types(), CONFIG_SIN_AVISOS_GLOBALES)
				.then(function (res) {
					commit('setModels', res.data && res.data.models ? res.data.models : [])
					commit('setApiSoporta', true)
					commit('setCargando', false)
				})
				.catch(function (error) {
					const status = error && error.response ? error.response.status : null
					// 404 = la ruta no existe: API vieja. Cualquier otro error (red, 500) deja
					// "no sé" para volver a probar la próxima vez que se abra el formulario.
					commit('setApiSoporta', status === 404 ? false : null)
					commit('setCargando', false)
				})
		},
		/**
		 * Agrega un ancho de comandera para el negocio (40 a 120 mm).
		 *
		 * Rechaza con el error de axios para que el selector muestre el mensaje del 422 al lado
		 * del campo.
		 *
		 * @param {Object} context
		 * @param {number} width ancho del rollo en mm.
		 * @returns {Promise<{model: Object, ya_existia: boolean}>}
		 */
		agregar_ancho({ commit }, width) {
			return axios.post(url_de_sheet_types(), { width: width }, CONFIG_SIN_AVISOS_GLOBALES)
				.then(function (res) {
					const model = res.data ? res.data.model : null
					commit('add', model)
					return {
						model: model,
						ya_existia: res.status === 200,
					}
				})
		},
	},
}
