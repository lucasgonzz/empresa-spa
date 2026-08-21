import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

/**
 * Store del modulo de puntos para clientes.
 *
 * No es un ABM (para eso esta `sistema_de_puntos`): es el estado de lectura del modulo, que
 * consumen VENDER (el panel de canje), la ficha del cliente y el reporte del pasivo.
 *
 * Los tres leen el saldo del MISMO lugar a proposito. El saldo es siempre `SUM(puntos)` del
 * libro de movimientos y lo resuelve la API: si cada pantalla se lo calculara por su cuenta,
 * la primera que se olvide de excluir los vencidos o los revertidos muestra otro numero.
 *
 * Contrato de los endpoints: seccion 7 del plan de la mision. Todos viven adentro del grupo
 * gateado por la extension `puntos_clientes`, asi que sin extension responden 403 y las
 * pantallas ya se montan con v-if="hasExtencion('puntos_clientes')".
 */
export default {
	namespaced: true,
	state: {
		loading: false,

		/* Cliente cuyo saldo esta cargado ahora mismo. null = todavia no se pidio nada. */
		client_id: null,

		/* Saldo vivo en puntos del cliente (SUM(puntos) del libro, ya sin vencidos ni revertidos) */
		saldo_cliente: 0,

		/* Cuanto vale ese saldo en pesos, calculado por la API con el valor_punto del programa */
		equivalencia_pesos: 0,

		/* Puntos del cliente que vencen dentro de los proximos 90 dias (solo lo trae la ficha) */
		por_vencer_90_dias: 0,

		/**
		 * Config del programa activo, tal como la devuelve /api/puntos/disponible.
		 * Se guarda acá y no en el store del ABM porque el vendedor no tiene por que poder
		 * leer la configuracion entera para canjear.
		 */
		config: {
			valor_punto: 0,
			minimo_canje: 0,
			tope_porcentaje: 0,
		},

		/* La API ya decide si el cliente puede canjear (saldo >= minimo_canje): no se repite la cuenta acá */
		puede_canjear: false,

		/* Movimientos del cliente para la ficha, paginados y ordenados por created_at DESC */
		movimientos: [],
		movimientos_paginacion: {
			page: 1,
			per_page: 25,
			total_registros: 0,
		},
		movimientos_loading: false,

		/* Reporte del pasivo del programa (emitidos / canjeados / vencidos / revertidos / ajustes / saldo_vivo) */
		reporte: {},
		reporte_loading: false,

		/* Drill-down paginado del reporte, mismo contrato que los *_detalle() de contabilidad */
		detalle: {
			tipo: null,
			total: 0,
			registros: [],
			paginacion: {
				page: 1,
				per_page: 50,
				total_registros: 0,
			},
			loading: false,
		},
	},
	mutations: {
		setLoading(state, value) {
			state.loading = value
		},
		setClientId(state, value) {
			state.client_id = value
		},
		setSaldoCliente(state, value) {
			state.saldo_cliente = Number(value)
		},
		setEquivalenciaPesos(state, value) {
			state.equivalencia_pesos = Number(value)
		},
		setPorVencer90Dias(state, value) {
			state.por_vencer_90_dias = Number(value)
		},
		setConfig(state, value) {
			state.config = {
				valor_punto: Number(value.valor_punto),
				minimo_canje: Number(value.minimo_canje),
				tope_porcentaje: Number(value.tope_porcentaje),
			}
		},
		setPuedeCanjear(state, value) {
			state.puede_canjear = !!value
		},

		setMovimientos(state, value) {
			state.movimientos = value
		},
		setMovimientosPaginacion(state, value) {
			state.movimientos_paginacion = value
		},
		setMovimientosLoading(state, value) {
			state.movimientos_loading = value
		},

		setReporte(state, value) {
			state.reporte = value
		},
		setReporteLoading(state, value) {
			state.reporte_loading = value
		},

		setDetalle(state, value) {
			state.detalle.tipo = value.tipo
			state.detalle.total = value.total
			state.detalle.registros = value.registros
			state.detalle.paginacion = value.paginacion
		},
		setDetalleLoading(state, value) {
			state.detalle.loading = value
		},
		resetDetalle(state) {
			state.detalle = {
				tipo: null,
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

		/**
		 * Deja el saldo en cero. Se llama cuando en VENDER se saca el cliente de la venta:
		 * si no, el panel de canje sigue mostrando el saldo del cliente anterior.
		 */
		limpiarCliente(state) {
			state.client_id = null
			state.saldo_cliente = 0
			state.equivalencia_pesos = 0
			state.por_vencer_90_dias = 0
			state.puede_canjear = false
			state.movimientos = []
		},
	},
	actions: {
		/**
		 * Lo que VENDER pide al elegir un cliente: saldo + los tres numeros del programa que
		 * hacen falta para armar el panel de canje. Es liviano a proposito (una sola query de
		 * SUM del lado de la API), porque corre en cada cambio de cliente de la venta.
		 *
		 * @param {Number} client_id
		 */
		getDisponible({commit}, client_id) {
			if (!client_id) {
				commit('limpiarCliente')
				return Promise.resolve(null)
			}

			commit('setLoading', true)
			commit('setClientId', client_id)

			return axios.get('api/puntos/disponible/' + client_id)
			.then(res => {
				commit('setLoading', false)
				commit('setSaldoCliente', res.data.saldo)
				commit('setEquivalenciaPesos', res.data.equivalencia_pesos)
				commit('setConfig', {
					valor_punto: res.data.valor_punto,
					minimo_canje: res.data.minimo_canje,
					tope_porcentaje: res.data.tope_porcentaje,
				})
				commit('setPuedeCanjear', res.data.puede_canjear)
				return res.data
			})
			.catch(err => {
				console.log(err)
				commit('setLoading', false)
				// Se limpia y no se deja el saldo viejo: mostrar puntos de otro cliente es peor
				// que no mostrar ninguno, porque el vendedor los ofrece en el mostrador.
				commit('limpiarCliente')
				return null
			})
		},

		/**
		 * La ficha del cliente: saldo, lo que le vence en 90 dias y el libro de movimientos.
		 *
		 * @param {Object} payload
		 * @param {Number} payload.client_id
		 * @param {Number} payload.page
		 */
		getCliente({commit}, payload) {
			let client_id = payload.client_id
			let page = payload.page ? payload.page : 1

			commit('setClientId', client_id)
			commit('setMovimientosLoading', true)

			return axios.get('api/puntos/cliente/' + client_id, {params: {page: page}})
			.then(res => {
				commit('setMovimientosLoading', false)
				commit('setSaldoCliente', res.data.saldo)
				commit('setPorVencer90Dias', res.data.por_vencer_90_dias)
				commit('setMovimientos', res.data.movimientos)

				if (res.data.paginacion) {
					commit('setMovimientosPaginacion', res.data.paginacion)
				}
				return res.data
			})
			.catch(err => {
				console.log(err)
				commit('setMovimientosLoading', false)
				return null
			})
		},

		/**
		 * Ajuste manual de puntos, en mas o en menos. `puntos` viaja SIGNADO: positivo suma un
		 * lote nuevo, negativo consume los lotes mas viejos igual que un canje.
		 *
		 * Devuelve la promesa para que el formulario sepa si cerrar el modal o mostrar el error;
		 * el 422 lo arma la API y lo muestra el interceptor de siempre.
		 *
		 * @param {Object} payload
		 * @param {Number} payload.client_id
		 * @param {Number} payload.puntos
		 * @param {String} payload.detalle
		 */
		ajuste({commit, dispatch}, payload) {
			commit('setLoading', true)

			return axios.post('api/puntos/ajuste', {
				client_id: payload.client_id,
				puntos: payload.puntos,
				detalle: payload.detalle,
			})
			.then(res => {
				commit('setLoading', false)
				// Se recarga la ficha entera y no se toca el saldo a mano: el saldo lo dice la
				// API, y sumarle el ajuste acá seria decidir el mismo numero con dos criterios.
				dispatch('getCliente', {client_id: payload.client_id, page: 1})
				return res.data
			})
			.catch(err => {
				console.log(err)
				commit('setLoading', false)
				return Promise.reject(err)
			})
		},

		/**
		 * Reporte del pasivo del programa en un periodo.
		 *
		 * @param {Object} payload
		 * @param {String} payload.desde YYYY-MM-DD
		 * @param {String} payload.hasta YYYY-MM-DD
		 */
		getReporte({commit}, payload) {
			commit('setReporteLoading', true)

			return axios.get('api/puntos/reporte', {params: {desde: payload.desde, hasta: payload.hasta}})
			.then(res => {
				commit('setReporteLoading', false)
				// La seccion 7 del plan escribe el cuerpo como { emitidos, canjeados, ... } plano,
				// pero el precedente del repo (api/reportes/estado-resultados) lo envuelve en una
				// clave. Se aceptan las dos formas porque la API la construye otro agente en
				// paralelo y esto es lo unico del contrato que el plan no fijo con literales.
				let reporte = res.data.reporte ? res.data.reporte : res.data
				commit('setReporte', reporte)
				return reporte
			})
			.catch(err => {
				console.log(err)
				commit('setReporteLoading', false)
				return null
			})
		},

		/**
		 * Drill-down paginado del reporte por tipo de movimiento.
		 *
		 * @param {Object} payload
		 * @param {String} payload.desde
		 * @param {String} payload.hasta
		 * @param {String} payload.tipo ganados | canjeados | vencidos | revertidos | ajuste
		 * @param {Number} payload.page
		 */
		getReporteDetalle({commit}, payload) {
			commit('setDetalleLoading', true)

			return axios.get('api/puntos/reporte/detalle', {
				params: {
					desde: payload.desde,
					hasta: payload.hasta,
					tipo: payload.tipo,
					page: payload.page ? payload.page : 1,
				},
			})
			.then(res => {
				commit('setDetalleLoading', false)
				// El plan dice "el mismo contrato que ContabilidadRepository::*_detalle()". El real,
				// leido de ReporteDetalleController.php:228, es { total, registros, paginacion:
				// {page, per_page, total_registros} } -- NO el { registros, total, page, per_page }
				// plano que escribe la tabla de la seccion 7. Se prioriza el precedente y se acepta
				// el plano como respaldo.
				let paginacion = res.data.paginacion
				if (!paginacion) {
					paginacion = {
						page: res.data.page ? res.data.page : payload.page,
						per_page: res.data.per_page ? res.data.per_page : 50,
						total_registros: res.data.total_registros ? res.data.total_registros : 0,
					}
				}
				commit('setDetalle', {
					tipo: payload.tipo,
					total: res.data.total,
					registros: res.data.registros,
					paginacion: paginacion,
				})
				return res.data
			})
			.catch(err => {
				console.log(err)
				commit('setDetalleLoading', false)
				return null
			})
		},
	},
}
