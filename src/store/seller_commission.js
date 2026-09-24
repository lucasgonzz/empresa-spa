import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

import moment from 'moment'
import generals from '@/common-vue/mixins/generals'

/*
	Panel de comisiones de un vendedor (misión comisiones-vendedor-tablas, 24/9/2026).

	El modal pide tres cosas por separado a `seller-commission-panel/{seller}/{moneda}/...`:
	el resumen (las tres tarjetas), las liquidadas paginadas y las pendientes paginadas. Van
	separadas para que cambiar de página o de filtro en una tabla no vuelva a pedir la otra.

	Cada pedido lleva un número de turno: si el usuario cambia rápido de página, de moneda o de
	rango, una respuesta vieja que llega tarde no pisa a la más nueva.
*/
let turno_resumen = 0
let turno_liquidadas = 0
let turno_pendientes = 0

/**
 * Paginación vacía, con la misma forma que el paginador de Laravel que devuelve la API.
 *
 * @returns {Object}
 */
function meta_vacia() {
	return {
		current_page: 1,
		last_page: 1,
		total: 0,
		per_page: 15,
	}
}

/**
 * Arma el prefijo de las rutas del panel para el vendedor y la moneda que están elegidos.
 *
 * @param {Object} state
 * @returns {String}
 */
function url_panel(state) {
	let seller_id = state.selected_model ? state.selected_model.id : 0
	return '/api/seller-commission-panel/'+seller_id+'/'+state.moneda_id
}

/**
 * Query params del rango. Solo viajan los que tienen valor: sin rango es el histórico completo.
 *
 * @param {Object} state
 * @returns {Object}
 */
function params_rango(state) {
	let params = {}
	if (state.panel_desde) {
		params.desde = state.panel_desde
	}
	if (state.panel_hasta) {
		params.hasta = state.panel_hasta
	}
	return params
}

/**
 * Saca del paginador de Laravel solo los cuatro datos que usa la tabla.
 *
 * @param {Object} data respuesta cruda del endpoint paginado
 * @returns {Object}
 */
function meta_desde_paginador(data) {
	return {
		current_page: Number(data.current_page) || 1,
		last_page: Number(data.last_page) || 1,
		total: Number(data.total) || 0,
		per_page: Number(data.per_page) || 15,
	}
}

export default {
	namespaced: true,
	state: {
		model_name: 'seller_commission',
		from_dates: true,
		is_selecteable: false,

		// Se usa cuando es belongs_to_many_from_dates. Por ejemplo para ver los pagos de un cliente
		plural_model_name: 'seller_commissions',
		selected_model: null,
		from_date: moment().subtract(1, 'months').format('YYYY-MM-DD'),
		until_date: moment().format('YYYY-MM-DD'),
 
		// from_date: moment().format('YYYY-MM-DD'),
		// until_date: '',

		models: [],
		liquidadas: [],
		pendientes: [],
		// Totales HISTÓRICOS (sin rango). Los lee `Pago.vue` para "Pagar el total" y para avisar
		// que el pago supera el saldo: ahí el saldo tiene que ser el de hoy, no el de un cierre
		// elegido en el filtro. Las tarjetas del modal leen `panel_totales`.
		totales: {},
		moneda_id: 1,

		// Estado del panel de comisiones.
		panel_totales: {},
		panel_desde: '',
		panel_hasta: '',
		panel_tipo: 'todos',
		liquidadas_page: 1,
		pendientes_page: 1,
		liquidadas_meta: meta_vacia(),
		pendientes_meta: meta_vacia(),
		loading_resumen: false,
		loading_liquidadas: false,
		loading_pendientes: false,
		model: {},
		selected: [],
		filters: [],
		filtered: [],
		is_filtered: false,
		filter_page: 1,
		total_filter_pages: null,
		total_filter_results: 0,
		loading_filtered: false,

		delete: null,
		delete_image_prop: null,
		delete_image_model: null,
		
		prop_model_to_delete: null,

		display: 'table',

		loading: false,

		props_to_show: [],
	},
	mutations: {
		set_props_to_show(state, value) {
			state.props_to_show = value
		},
		setLoading(state, value) {
			state.loading = value
		},
		setFilters(state, value) {
			state.filters = value
		},
		addFilter(state, filter_to_add) {
			let index = state.filters.findIndex(filter => {
				return filter.key == filter_to_add.key
			})

			if (index == -1) {
				state.filters.unshift(filter_to_add)
			} else {
				state.filters.splice(index, 1, filter_to_add)
			}
		},
		setFiltered(state, value) {
			state.filtered = value
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
		setLiquidadas(state, value) {
			state.liquidadas = value || []
			// Alias: mientras algo del repo siga leyendo `models`, lo sigue encontrando.
			state.models = state.liquidadas
		},
		setPendientes(state, value) {
			state.pendientes = value || []
		},
		setTotales(state, value) {
			state.totales = value || {}
		},
		setMonedaId(state, value) {
			state.moneda_id = value
		},
		setPanelTotales(state, value) {
			state.panel_totales = value || {}
		},
		setPanelDesde(state, value) {
			state.panel_desde = value || ''
		},
		setPanelHasta(state, value) {
			state.panel_hasta = value || ''
		},
		setPanelTipo(state, value) {
			state.panel_tipo = value || 'todos'
		},
		setLiquidadasPage(state, value) {
			state.liquidadas_page = value
		},
		setPendientesPage(state, value) {
			state.pendientes_page = value
		},
		setLiquidadasMeta(state, value) {
			state.liquidadas_meta = value || meta_vacia()
		},
		setPendientesMeta(state, value) {
			state.pendientes_meta = value || meta_vacia()
		},
		setLoadingResumen(state, value) {
			state.loading_resumen = value
		},
		setLoadingLiquidadas(state, value) {
			state.loading_liquidadas = value
		},
		setLoadingPendientes(state, value) {
			state.loading_pendientes = value
		},
		// Vuelve el panel a su estado de entrada: histórico completo, filtro Todos, página 1.
		resetPanel(state) {
			state.panel_desde = ''
			state.panel_hasta = ''
			state.panel_tipo = 'todos'
			state.liquidadas_page = 1
			state.pendientes_page = 1
		},
		setSelectedModel(state, value) {
			// Al abrir el modal de OTRO vendedor, el rango y el filtro del anterior no se arrastran:
			// cada vendedor entra con su histórico completo, que es lo que dice la definición.
			let id_anterior = state.selected_model ? state.selected_model.id : null
			let id_nuevo = value ? value.id : null
			if (id_anterior != id_nuevo) {
				state.panel_desde = ''
				state.panel_hasta = ''
				state.panel_tipo = 'todos'
				state.liquidadas_page = 1
				state.pendientes_page = 1
			}
			state.selected_model = value
		},
		setSelected(state, value) {
			state.selected = value
		},
		setFiltered(state, value) {
			state.filtered = value
		},
		setIsFiltered(state, value) {
			state.is_filtered = value
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

			index = state.filtered.findIndex(item => {
				return item.id == value.id
			})
			if (index != -1) {
				state.filtered.splice(index, 1, value)
			} 
		},
		setDelete(state, value) {
			state.delete = value
		},
		delete(state) {
			// Models
			let index = state.models.findIndex(model => {
				return model.id == state.delete.id
			})
			state.models.splice(index, 1)

			// Filtereds
			index = state.filtered.findIndex(model => {
				return model.id == state.delete.id
			})
			if (index != -1) {
				state.models.splice(index, 1)
			}

			if (state.selected_model && state.selected_model[state.plural_model_name]) {
				index = state.selected_model[state.plural_model_name].findIndex(model => {
					return model.id == state.delete.id
				})
				state.selected_model[state.plural_model_name].splice(index, 1)
			}
		},
		setDeleteImageProp(state, value) {
			state.delete_image_prop = value
		},
		setDeleteImageModel(state, value) {
			state.delete_image_model = value
		},
		deleteImage(state, value) {
			let index = state.models.images.findIndex(model => {
				return model.id == state.delete_image.id
			})
			if (index != -1) {
				state.model.images.splice(index, 1)
			}
		},
		setPropModelToDelete(state, value) {
			state.prop_model_to_delete = value
		},
		deletePropModel(state) {
			let index = state.model[state.prop_model_to_delete.key].findIndex(model => {
				return model.id == state.prop_model_to_delete.id
			})
			state.model[state.prop_model_to_delete.key].splice(index, 1)
		},
		setDisplay(state, value) {
			state.display = value 
		},
		setFromDate(state, value) {
			state.from_date = value
		},
		setUntilDate(state, value) {
			state.until_date = value
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
		/*
			Punto de entrada histórico: lo llaman `sellers/Index.vue` al abrir el modal y
			`Pago.vue` / `SaldoInicial.vue` después de guardar. Antes pedía la ruta vieja con
			`from_date` fijo en "hoy menos un mes" (y por eso un vendedor sin movimientos en 30 días
			veía saldo $0 aunque se le debiera). Ahora vuelve las dos tablas a la página 1 —lo
			recién guardado es lo más nuevo y cae ahí— y delega en el panel. El rango y el filtro
			que el usuario eligió se respetan.
		*/
		getModels({ commit, dispatch }) {
			commit('setLiquidadasPage', 1)
			commit('setPendientesPage', 1)
			return dispatch('getPanel')
		},
		/*
			Pide las partes del panel en paralelo: tarjetas, liquidadas y pendientes. La tabla de
			pendientes solo se muestra si el vendedor liquida al saldar la venta: si no, no se pide
			(no tendría dónde verse).
		*/
		getPanel({ commit, dispatch, state }) {
			commit('setLoading', true)
			let pedidos = [
				dispatch('getResumen'),
				dispatch('getLiquidadas'),
			]
			if (state.selected_model && state.selected_model.commission_after_pay_sale) {
				pedidos.push(dispatch('getPendientes'))
			}
			return Promise.all(pedidos)
			.then(() => {
				commit('setLoading', false)
			})
		},
		/*
			Las tres tarjetas. `panel_totales` es lo que muestra el modal (con el rango elegido);
			`totales` queda siempre con el histórico, porque lo usa `Pago.vue` para pagar el saldo
			de HOY. Solo `hasta` mueve el saldo (`desde` no: un saldo es acumulado), así que el
			segundo pedido, sin rango, se hace únicamente cuando hay `hasta`.
		*/
		getResumen({ commit, state }) {
			turno_resumen++
			let turno = turno_resumen
			commit('setLoadingResumen', true)
			let url = url_panel(state)+'/resumen'
			let con_hasta = !!state.panel_hasta
			let pedidos = [
				axios.get(url, { params: params_rango(state) }),
			]
			if (con_hasta) {
				pedidos.push(axios.get(url))
			}
			return Promise.all(pedidos)
			.then(respuestas => {
				if (turno != turno_resumen) {
					return
				}
				let totales_panel = respuestas[0].data.totales || {}
				commit('setPanelTotales', totales_panel)
				if (con_hasta) {
					commit('setTotales', respuestas[1].data.totales || {})
				} else {
					commit('setTotales', totales_panel)
				}
				commit('setLoadingResumen', false)
			})
			.catch(err => {
				if (turno == turno_resumen) {
					commit('setLoadingResumen', false)
				}
				console.log(err)
			})
		},
		// Tabla de liquidadas (comisiones liquidadas + pagos), con rango, tipo y página.
		getLiquidadas({ commit, state, dispatch }) {
			turno_liquidadas++
			let turno = turno_liquidadas
			commit('setLoadingLiquidadas', true)
			let params = params_rango(state)
			params.tipo = state.panel_tipo
			params.page = state.liquidadas_page
			return axios.get(url_panel(state)+'/liquidadas', { params: params })
			.then(res => {
				if (turno != turno_liquidadas) {
					return
				}
				let meta = meta_desde_paginador(res.data)
				// Si la página pedida ya no existe (por ejemplo, quedaron menos filas), se va a la
				// última que sí tiene datos en vez de mostrar una tabla vacía.
				if (state.liquidadas_page > meta.last_page) {
					commit('setLiquidadasPage', meta.last_page)
					return dispatch('getLiquidadas')
				}
				commit('setLiquidadas', res.data.data)
				commit('setLiquidadasMeta', meta)
				commit('setLoadingLiquidadas', false)
			})
			.catch(err => {
				if (turno == turno_liquidadas) {
					commit('setLoadingLiquidadas', false)
				}
				console.log(err)
			})
		},
		// Tabla de pendientes (comisiones que esperan que se salde su venta), con rango y página.
		getPendientes({ commit, state, dispatch }) {
			turno_pendientes++
			let turno = turno_pendientes
			commit('setLoadingPendientes', true)
			let params = params_rango(state)
			params.page = state.pendientes_page
			return axios.get(url_panel(state)+'/pendientes', { params: params })
			.then(res => {
				if (turno != turno_pendientes) {
					return
				}
				let meta = meta_desde_paginador(res.data)
				if (state.pendientes_page > meta.last_page) {
					commit('setPendientesPage', meta.last_page)
					return dispatch('getPendientes')
				}
				commit('setPendientes', res.data.data)
				commit('setPendientesMeta', meta)
				commit('setLoadingPendientes', false)
			})
			.catch(err => {
				if (turno == turno_pendientes) {
					commit('setLoadingPendientes', false)
				}
				console.log(err)
			})
		},
		// Cambia el rango (desde/hasta, 'YYYY-MM-DD' o vacío) y recarga todo desde la página 1.
		setPanelRango({ commit, dispatch }, rango) {
			commit('setPanelDesde', rango ? rango.desde : '')
			commit('setPanelHasta', rango ? rango.hasta : '')
			commit('setLiquidadasPage', 1)
			commit('setPendientesPage', 1)
			return dispatch('getPanel')
		},
		// Filtro Todos / Comisiones / Pagos: solo afecta a la tabla de liquidadas.
		setPanelTipo({ commit, dispatch }, tipo) {
			commit('setPanelTipo', tipo)
			commit('setLiquidadasPage', 1)
			return dispatch('getLiquidadas')
		},
		// Cambio de página de la tabla de liquidadas.
		setLiquidadasPage({ commit, dispatch }, page) {
			commit('setLiquidadasPage', page)
			return dispatch('getLiquidadas')
		},
		// Cambio de página de la tabla de pendientes.
		setPendientesPage({ commit, dispatch }, page) {
			commit('setPendientesPage', page)
			return dispatch('getPendientes')
		},
		// Cambio de moneda: el panel entero vuelve a la página 1 en la moneda nueva.
		setMoneda({ commit, dispatch }, value) {
			commit('setMonedaId', value)
			commit('setLiquidadasPage', 1)
			commit('setPendientesPage', 1)
			return dispatch('getPanel')
		},
		delete({ commit, state }) {
			return axios.delete(`/api/${generals.methods.routeString(state.model_name)}/${state.delete.id}`)
			.then(() => {
				commit('delete')
			})
			.catch((err) => {
				console.log(err)
			})
		},
		deleteImageProp({ commit, state }) {
			return axios.delete(`/api/delete-image-prop/${generals.methods.routeString(state.model_name)}/${state.model.id}/${state.delete_image_prop}`)
			.then((res) => {
				commit('add', res.data.model)
			})
			.catch((err) => {
				console.log(err)
			})
		},
		deleteImageModel({ commit, state }) {
			return axios.delete(`/api/delete-image-model/${generals.methods.routeString(state.model_name)}/${state.model.id}/${state.delete_image_model.id}`)
			.then((res) => {
				commit('add', res.data.model)
			})
			.catch((err) => {
				console.log(err)
			})
		},
		deletePropModel({ commit, state }) {
			return axios.delete(`/api/${generals.methods.routeString(state.prop_model_to_delete.has_many.model_name)}/${state.prop_model_to_delete.id}`)
			.then(res => {
				commit('deletePropModel')
			})
			.catch(err => {
				console.log(err)
			})
		}
	},
}
