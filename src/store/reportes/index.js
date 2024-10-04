import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import moment from 'moment'
import article_performance from '@/store/reportes/article_performance'
import font from '@/store/reportes/font'
export default {
	namespaced: true,
	state: {
		rango_temporal: 'dia-actual',

		loading: false,

		mes_inicio: moment().subtract(4, 'months').format('YYYY-MM'),
		mes_fin: moment().format('YYYY-MM'),

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
		getReportes({state, commit}) {

			console.log(state.rango_temporal)

			commit('setLoading', true)

			let link = 'api/company-performance'

			if (state.rango_temporal == 'rango-de-fechas') {

				link += '/'+state.mes_inicio+'/'+state.mes_fin

			} else if (state.rango_temporal == 'dia-en-especifico') {

				link += '/'+state.mes_inicio

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
	}
}
