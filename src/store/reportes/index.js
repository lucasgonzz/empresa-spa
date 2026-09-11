import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

import moment from 'moment'
import article_performance from '@/store/reportes/article_performance'
import font from '@/store/reportes/font'
import article_purchase from '@/store/reportes/article_purchase'

/**
 * Arma los parametros `desde`/`hasta` (y opcionalmente `moneda`) para los endpoints contables nuevos
 * (estado-resultados, flujo-caja, detalle), en base al selector superior de rango de fechas.
 *
 * En modo 'dia-actual' no hay rango elegido por el usuario, asi que se manda el dia de hoy como
 * unico dia del rango (desde == hasta). En 'rango-de-fechas' se mandan las fechas elegidas.
 *
 * @param {Object} state - state del modulo reportes
 * @param {Boolean} incluir_moneda - si el endpoint acepta dimension de moneda (posicion-fiscal no)
 * @returns {Object} parametros listos para pasar como `params` de axios
 */
function fecha_moneda_params(state, incluir_moneda) {
	let params

	if (state.rango_temporal == 'rango-de-fechas') {
		params = {
			desde: state.mes_inicio,
			hasta: state.mes_fin,
		}
	} else {
		let hoy = moment().format('YYYY-MM-DD')
		params = {
			desde: hoy,
			hasta: hoy,
		}
	}

	if (incluir_moneda) {
		params.moneda = state.moneda
	}

	return params
}

export default {
	namespaced: true,
	state: {
		rango_temporal: 'dia-actual',

		loading: false,

		/* Fechas del rango en formato YYYY-MM-DD; usadas cuando rango_temporal == 'rango-de-fechas' */
		mes_inicio: moment().subtract(30, 'days').format('YYYY-MM-DD'),
		mes_fin: moment().format('YYYY-MM-DD'),

		/* Moneda unica que aplica a Estado de Resultados, Flujo de Caja y Posicion Fiscal (grupo 227) */
		moneda: 'pesos',

		/**
		 * Cola de encadenado de los 4 fetches de esta pantalla (company-performance +
		 * estado-resultados + flujo-caja + posicion-fiscal), usada SOLO mientras hay un
		 * arranque de sesion en curso (auth/arranque_en_curso). Fuera de ese caso queda en
		 * null y no se usa para nada -- ver encolar_fetch_de_widget().
		 */
		cadena_widgets: null,

		/* Estado de Resultados devengado (api/reportes/estado-resultados) */
		estado_resultados: {},
		estado_resultados_loading: false,

		/* Posicion fiscal: IVA / IIBB / Ganancias (api/reportes/posicion-fiscal) */
		posicion_fiscal: {},
		posicion_fiscal_loading: false,

		/* Flujo de caja percibido (api/reportes/flujo-caja) */
		flujo_caja: {},
		flujo_caja_loading: false,

		/* Drill-down paginado por concepto (api/reportes/detalle), usado por el modal de detalle */
		detalle: {
			concepto: null,
			total: 0,
			registros: [],
			paginacion: {
				page: 1,
				per_page: 50,
				total_registros: 0,
			},
			loading: false,
		},

		model: {},
		meses_anteriores: [],
				
		total_vendido		  : 0,
		pagado_en_mostrador   : 0,
		a_cuentas_corrientes  : 0,
		ingresos_pagos_de_cuentas_corrientes  : 0,
		gastos				  : 0,
		rentabilidad		  : 0,
		articulos_vendidos	  : 0,
		cantidad_ventas		  : 0,


		ventas_por_mes: [],
		gastos_por_mes: [],
		metodos_de_pago: [],
	},
	mutations: {
		setLoading(state, value) {
			state.loading = value 
		},
		setModel(state, value) {
			state.model = value 
		},
		setMesesAnteriores(state, value) {
			state.meses_anteriores = value 
		},

		setRangoTemporal(state, value) {
			state.rango_temporal = value 
		},
		setMesInicio(state, value) {
			state.mes_inicio = value 
		},
		setMesFin(state, value) {
			state.mes_fin = value
		},

		/* Moneda unica: 'pesos' | 'dolares' | 'consolidado' (grupo 227) */
		setMoneda(state, value) {
			state.moneda = value
		},

		/* Cola de encadenado de los widgets de esta pantalla. Ver el comentario de cadena_widgets en el state. */
		setCadenaWidgets(state, value) {
			state.cadena_widgets = value
		},

		setEstadoResultados(state, value) {
			state.estado_resultados = value
		},
		setEstadoResultadosLoading(state, value) {
			state.estado_resultados_loading = value
		},

		setPosicionFiscal(state, value) {
			state.posicion_fiscal = value
		},
		setPosicionFiscalLoading(state, value) {
			state.posicion_fiscal_loading = value
		},

		setFlujoCaja(state, value) {
			state.flujo_caja = value
		},
		setFlujoCajaLoading(state, value) {
			state.flujo_caja_loading = value
		},

		/* Carga la pagina de detalle recibida del backend (reemplaza registros y paginacion) */
		setDetalle(state, value) {
			state.detalle.concepto = value.concepto
			state.detalle.total = value.total
			state.detalle.registros = value.registros
			state.detalle.paginacion = value.paginacion
		},
		setDetalleLoading(state, value) {
			state.detalle.loading = value
		},
		/* Limpia el detalle al cerrar el modal, para no mostrar datos de un concepto anterior mientras carga el nuevo */
		resetDetalle(state) {
			state.detalle = {
				concepto: null,
				total: 0,
				registros: [],
				paginacion: {
					page: 1,
					per_page: 50,
					total_registros: 0,
				},
				loading: false,
			}
		},

		setTotalVendido(state, value) {
			state.total_vendido = value 
		},
		setPagadoEnMostrador(state, value) {
			state.pagado_en_mostrador = value 
		},
		setACuentasCorrientes(state, value) {
			state.a_cuentas_corrientes = value 
		},
		setIngresosPagosDeCuentasCorrientes(state, value) {
			state.ingresos_pagos_de_cuentas_corrientes = value 
		},
		setGastos(state, value) {
			state.gastos = value 
		},
		setRentabilidad(state, value) {
			state.rentabilidad = value 
		},
		setArticulosVendidos(state, value) {
			state.articulos_vendidos = value 
		},
		setCantidadVentas(state, value) {
			state.cantidad_ventas = value 
		},


		setVentasPorMes(state, value) {
			state.ventas_por_mes = value 
		},
		setGastosPorMes(state, value) {
			state.gastos_por_mes = value 
		},
		setMetodosDePago(state, metodos_de_pago) {
			let metodos_de_pago_array = []
			Object.values(metodos_de_pago).forEach(metodo_de_pago => {
				metodos_de_pago_array.push({
					nombre: metodo_de_pago.nombre,
					total: Number(metodo_de_pago.total),
				})
			})
			state.metodos_de_pago = metodos_de_pago_array 
			console.log('setMetodosDePago:')
			console.log(state.metodos_de_pago)
		},
	},
	actions: {
		/**
		 * Punto de entrada unico de los 4 fetches de la pantalla de Reportes (company-performance
		 * en Reportes.vue + estado-resultados/flujo-caja/posicion-fiscal en sus 3 hijos). Cada uno
		 * llama a esto en su propio created() en vez de despachar su accion directo.
		 *
		 * - Si HAY un arranque de sesion en curso (auth/arranque_en_curso, seteado por el watch de
		 *   `authenticated` en App.vue): esta pantalla es el aterrizaje por defecto tras un login,
		 *   asi que el fetch se encola detras de ese arranque Y detras del widget anterior que ya
		 *   se haya encolado -- los 4 terminan saliendo uno atras de otro, no en paralelo, que es
		 *   justamente lo que esta mision vino a evitar (ver plan 20260911-arranque-secuencial).
		 * - Si NO hay arranque en curso: es navegacion normal a Reportes durante el dia (el caso
		 *   de siempre, que no se puede romper), y el fetch sale de inmediato, sin encolarse.
		 *
		 * @param {String} nombre_accion Accion de este mismo modulo a disparar (ej. 'getFlujoCaja').
		 * @returns {Promise}
		 */
		encolar_fetch_de_widget({state, commit, dispatch, rootState}, nombre_accion) {
			let arranque = rootState.auth.arranque_en_curso

			if (!arranque) {
				return dispatch(nombre_accion)
			}

			let cola = (state.cadena_widgets || arranque)
			.then(() => dispatch(nombre_accion))
			.catch(err => console.log(err))

			commit('setCadenaWidgets', cola)

			return cola
		},

		/**
		 * Estado de Resultados devengado. Usa el rango de fechas del selector superior (dia actual
		 * o rango elegido) y la moneda unica (pesos/dolares/consolidado).
		 */
		getEstadoResultados({state, commit}) {
			commit('setEstadoResultadosLoading', true)

			axios.get('api/reportes/estado-resultados', {params: fecha_moneda_params(state, true)})
			.then(res => {
				commit('setEstadoResultadosLoading', false)
				commit('setEstadoResultados', res.data.estado_resultados)
			})
			.catch(err => {
				console.log(err)
				commit('setEstadoResultadosLoading', false)
			})
		},

		/**
		 * Posicion fiscal (IVA / IIBB / Ganancias). No tiene dimension de moneda.
		 */
		getPosicionFiscal({state, commit}) {
			commit('setPosicionFiscalLoading', true)

			axios.get('api/reportes/posicion-fiscal', {params: fecha_moneda_params(state, false)})
			.then(res => {
				commit('setPosicionFiscalLoading', false)
				commit('setPosicionFiscal', res.data.posicion_fiscal)
			})
			.catch(err => {
				console.log(err)
				commit('setPosicionFiscalLoading', false)
			})
		},

		/**
		 * Flujo de caja percibido (ingresos/egresos/flujo neto + plata en transito).
		 */
		getFlujoCaja({state, commit}) {
			commit('setFlujoCajaLoading', true)

			axios.get('api/reportes/flujo-caja', {params: fecha_moneda_params(state, true)})
			.then(res => {
				commit('setFlujoCajaLoading', false)
				commit('setFlujoCaja', res.data.flujo_caja)
			})
			.catch(err => {
				console.log(err)
				commit('setFlujoCajaLoading', false)
			})
		},

		/**
		 * Drill-down paginado de un concepto (usado por el modal de detalle). `concepto` tiene que
		 * ser uno de los 13 valores de la whitelist que acepta el backend.
		 *
		 * @param {String} payload.concepto
		 * @param {Number} payload.page numero de pagina a pedir (por defecto 1, nueva busqueda)
		 */
		getDetalle({state, commit}, payload) {
			commit('setDetalleLoading', true)

			let params = fecha_moneda_params(state, true)
			params.concepto = payload.concepto
			params.page = payload.page || 1
			params.per_page = state.detalle.paginacion.per_page

			axios.get('api/reportes/detalle', {params})
			.then(res => {
				commit('setDetalleLoading', false)
				commit('setDetalle', {
					concepto: payload.concepto,
					total: res.data.total,
					registros: res.data.registros,
					paginacion: res.data.paginacion,
				})
			})
			.catch(err => {
				console.log(err)
				commit('setDetalleLoading', false)
			})
		},

		getReportes({state, commit}) {

			console.log(state.rango_temporal)

			commit('setLoading', true)

			let link = 'api/company-performance'

			/* En rango de fechas se envían ambas fechas (YYYY-MM-DD) como parámetros de ruta */
			if (state.rango_temporal == 'rango-de-fechas') {

				link += '/'+state.mes_inicio+'/'+state.mes_fin

			}

			axios.get(link)
			.then(res => {
				console.log('reportes/getReportes')
				console.log(res.data)

				commit('setLoading', false)

				commit('setModel', res.data.model)
				commit('setMesesAnteriores', res.data.meses_anteriores)

				// commit('setTotalVendido', res.data.total_vendido)
				// commit('setPagadoEnMostrador', res.data.pagado_en_mostrador)
				// commit('setACuentasCorrientes', res.data.a_cuentas_corrientes)
				// commit('setIngresosPagosDeCuentasCorrientes', res.data.ingresos_pagos_de_cuentas_corrientes)

				// commit('setGastos', res.data.gastos)
				// commit('setRentabilidad', res.data.rentabilidad)
				// commit('setArticulosVendidos', res.data.articulos_vendidos)
				// commit('setCantidadVentas', res.data.cantidad_ventas)

				// commit('setMetodosDePago', res.data.metodos_de_pago)

				// if (state.rango_temporal == 'rango-de-fechas') {
				// 	commit('setVentasPorMes', res.data.ventas_por_mes)
				// 	commit('setGastosPorMes', res.data.gastos_por_mes)
				// }
			})
			.catch(err => {
				console.log(err)
				commit('setLoading', false)
			})
		}
	},
	modules: {
		article_performance,
		font,
		article_purchase,
	}
}
