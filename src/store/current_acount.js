import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

import generals from '@/common-vue/mixins/generals'

// ─── Período de la cuenta corriente (1/10/2026) ───────────────────────────────────────────────
// Las fechas se arman con el calendario LOCAL del navegador y no con toISOString(): ese pasa por
// UTC y, de noche, devolvería el día de mañana. Y se calculan al momento de pedir, no al cargar el
// módulo, porque la SPA puede quedar abierta varios días.
export const FECHA_INICIO_HISTORIAL = '2000-01-01'

// Mínimo de movimientos que se garantiza SOLO en la carga por defecto. Si el usuario elige un
// período a mano se le muestra exactamente ese, aunque tenga cero.
const MINIMO_POR_DEFECTO = 10

export function fechaLocal(fecha) {
	let mes = String(fecha.getMonth() + 1).padStart(2, '0')
	let dia = String(fecha.getDate()).padStart(2, '0')
	return fecha.getFullYear() + '-' + mes + '-' + dia
}

/**
 * Rango {desde, hasta} de un atajo, calculado con "hoy" de este momento.
 * `hasta` null significa sin tope superior (solo "Todo el historial").
 */
export function rangoDeAtajo(clave) {
	let hoy = new Date()
	let anio = hoy.getFullYear()
	let mes = hoy.getMonth()
	switch (clave) {
		case 'este_mes':
			return { desde: fechaLocal(new Date(anio, mes, 1)), hasta: fechaLocal(hoy) }
		case 'mes_anterior':
			// El día 0 del mes siguiente es el último del mes anterior.
			return { desde: fechaLocal(new Date(anio, mes - 1, 1)), hasta: fechaLocal(new Date(anio, mes, 0)) }
		case 'ultimos_30_dias':
			return { desde: fechaLocal(new Date(anio, mes, hoy.getDate() - 30)), hasta: fechaLocal(hoy) }
		case 'ultimos_3_meses': {
			// Si hoy es 31 y el mes de hace tres no tiene 31, `new Date` se desbordaría al mes
			// siguiente: se topea al último día de ese mes.
			let ultimo_dia = new Date(anio, mes - 2, 0).getDate()
			return { desde: fechaLocal(new Date(anio, mes - 3, Math.min(hoy.getDate(), ultimo_dia))), hasta: fechaLocal(hoy) }
		}
		case 'este_anio':
			return { desde: fechaLocal(new Date(anio, 0, 1)), hasta: fechaLocal(hoy) }
		case 'todo':
			return { desde: FECHA_INICIO_HISTORIAL, hasta: null }
		default:
			// 'defecto': del 1.º del mes anterior a hoy.
			return { desde: fechaLocal(new Date(anio, mes - 1, 1)), hasta: fechaLocal(hoy) }
	}
}

/**
 * Parámetros que se piden a la API para un período del store. `minimo` solo viaja en el por defecto.
 *
 * El por defecto NO manda `hasta`: un pago cargado con fecha posterior a hoy tiene que seguir
 * apareciendo en la lista, como antes de que existiera el período.
 *
 * Los atajos se recalculan en cada pedido y no usan las fechas guardadas al hacer clic: con el modal
 * abierto pasada la medianoche, un `getModels` posterior pediría un `hasta` de ayer. Solo el
 * personalizado respeta las fechas que el usuario eligió.
 */
export function paramsDePeriodo(periodo) {
	if (periodo.modo == 'defecto') {
		return { desde: rangoDeAtajo('defecto').desde, minimo: MINIMO_POR_DEFECTO }
	}
	let rango = periodo.modo == 'atajo' ? rangoDeAtajo(periodo.clave) : periodo
	let params = { desde: rango.desde }
	if (rango.hasta) {
		params.hasta = rango.hasta
	}
	return params
}

// Contador de pedidos de getModels a nivel de módulo (no de estado: no hace falta que sea
// reactivo). Gana la última respuesta PEDIDA, no la última en llegar: si se elige "Todo el
// historial" y enseguida "Este mes", o se cambia de cuenta rápido, la respuesta lenta del primer
// pedido no puede pisar a la del segundo.
let ultimo_pedido = 0

function periodoPorDefecto() {
	return { modo: 'defecto', clave: 'defecto', desde: null, hasta: null }
}

export default {
	namespaced: true,
	state: {
		model_name: 'current_acount',

		from_model_name: 'client',

		models: [],
		model: {},
		to_show: [],

		months_ago: 1,

		// Período pedido. En 'defecto' las fechas quedan en null a propósito: se calculan en cada
		// pedido (ver paramsDePeriodo), no se congelan acá.
		periodo: periodoPorDefecto(),
		// Lo que la API dice que aplicó (res.data.periodo). null si todavía no respondió o si es
		// una API vieja que ignora las fechas.
		periodo_efectivo: null,
		from_credit_account: {},
		from_model: {},
		selected: [],
		to_show_payment_methods: {},
		to_pay: null,

		delete: null,
		delete_image: null,

		/**
		 * Checkbox del modal de borrado de movimiento CC: enviar `compensar_caja` en DELETE.
		 */
		compensar_caja_delete: true,

		display: 'table',

		loading: false,

		// Mismo nombre y misma forma que __base_store.js: es lo que column_preferences_helper.js
		// pide para reconocer que este módulo soporta el botón de "Propiedades para mostrar"
		// (module_supports_props_to_show exige un Array acá, no undefined).
		props_to_show: [],
	},
	mutations: {
		set_props_to_show(state, value) {
			state.props_to_show = value
		},
		/**
		 * Guarda el valor del checkbox antes de borrar un movimiento de cuenta corriente.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {boolean} value Checkbox compensar caja.
		 * @returns {void}
		 */
		setCompensarCajaDelete(state, value) {
			state.compensar_caja_delete = value
		},
		setFromModelName(state, value) {
			state.from_model_name = value 
		},
		setLoading(state, value) {
			state.loading = value
		},
		setModel(state, value) {
			if (value.model) {
				state.model = value.model
				if (value.properties.length) {
					value.properties.forEach(prop => {
						state.model[prop.key] = prop.value 
					})
				}
			} else {
				let obj = {
					id: null
				}
				require(`@/models/${state.model_name}`).default.properties.forEach(prop => {
					obj[prop.key] = prop.value 
				})
				if (value.properties.length) {
					value.properties.forEach(prop => {
						obj[prop.key] = prop.value 
					})
				}
				state.model = obj
			}
		},
		setModels(state, value) {
			if (value) {
				state.models = value
			} else {
				state.models = []
			}
		},
		setToShow(state, value) {
			if (value) {
				state.to_show = value
			} else {
				state.to_show = state.models.slice(0, 20)
			}
		},
		addToShow(state, value) {
			state.to_show = state.to_show.concat(state.models.slice(state.to_show.length, state.to_show.length + 20))
		},
		set_periodo(state, value) {
			state.periodo = value
			// El período efectivo anterior ya no corresponde. Es seguro limpiarlo porque quien cambia
			// el período recarga en el mismo tick (getModels pone loading en true antes del render),
			// y mientras carga el texto muestra lo pedido, no "Últimos 10 movimientos".
			state.periodo_efectivo = null
		},
		set_periodo_efectivo(state, value) {
			state.periodo_efectivo = value
		},
		setMonthsAgo(state, value) {
			state.months_ago = value 
		},
		setFromModel(state, value) {
			state.from_model = value 
		},
		set_from_credit_account(state, value) {
			state.from_credit_account = value  
			// Cada vez que se abre una cuenta --aunque sea la misma de nuevo-- el período arranca
			// por defecto. El reset vive acá y no en cada llamador porque esta mutación se llama
			// antes de getModels desde una decena de lugares.
			state.periodo = periodoPorDefecto()
			state.periodo_efectivo = null
		},
		setSelected(state, value) {
			state.selected = value 
		},
		setToShowPaymentMethods(state, value) {
			state.to_show_payment_methods = value 
		},
		setToPay(state, value) {
			state.to_pay = value 
		},
		add(state, value) {
			let index = state.models.findIndex(item => {
				return item.id == value.id
			})
			if (index == -1) {
				state.models.unshift(value)
			} else {
				state.models.splice(index, 1, value)
			}
		},
		setDelete(state, value) {
			state.delete = value
		},
		delete(state) {
			let index = state.models.findIndex(model => {
				return model.id == state.delete.id
			})
			state.models.splice(index, 1)
		},
		setDeleteImage(state, value) {
			state.delete_image = value
		},
		deleteImage(state, value) {
			let index = state.models.images.findIndex(model => {
				return model.id == state.delete.id
			})
			state.models.splice(index, 1)
		},
		setDisplay(state, value) {
			state.display = value 
		},
		incrementFilterPage(state) {
			state.filter_page++
		},
		setFilterPage(state, value) {
			state.filter_page = value 
		},
		setTotalFilterPages(state, value) {
			state.total_filter_pages = value 
		},
		setTotalFilterResults(state, value) {
			state.total_filter_results = value 
		},
		addFiltered(state, value) {
			state.filtered = state.filtered.concat(value)
		},
		setLoadingFiltered(state, value) {
			state.loading_filtered = value 
		},
	},
	actions: {
		getModels({ commit, state }) {
			commit('setLoading', true)
			let pedido = ++ultimo_pedido
			// return axios.get(`/api/${generals.methods.routeString(state.model_name)}/${state.from_model_name}/${state.from_model.id}/${state.months_ago}`)
			// La ruta no cambia: el segmento de cantidad queda en 10 y es el que usa una API vieja,
			// que ignora los params de fecha.
			return axios.get(`/api/${generals.methods.routeString(state.model_name)}/${state.from_credit_account.id}/10`, {
				params: paramsDePeriodo(state.periodo),
			})
			.then(res => {
				if (pedido != ultimo_pedido) {
					return
				}
				commit('setLoading', false)
				commit('set_periodo_efectivo', res.data.periodo ? res.data.periodo : null)
				commit('setModels', res.data.models)
				commit('setToShow')
			})
			.catch(err => {
				if (pedido != ultimo_pedido) {
					return
				}
				commit('setLoading', false)
				console.log(err)
			})
		},
		delete({ commit, state }) {
			return axios.delete(`/api/${generals.methods.routeString(state.model_name)}/${state.from_model_name}/${state.delete.id}`, {
				params: {
					compensar_caja: state.compensar_caja_delete ? 1 : 0,
				},
			})
				.then(() => {
					commit('delete')
				})
				.catch((err) => {
					console.log(err)
					return Promise.reject(err)
				})
		},
		deleteImage({ commit, state }) {
			return axios.delete(`/api/${generals.methods.routeString(state.model_name)}/image/${state.delete_image.id}`)
			.then((res) => {
				commit('add', res.data.model)
			})
			.catch((err) => {
				console.log(err)
			})
		},
	},
}
