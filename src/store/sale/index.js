import __base_store from '@/store/__base_store'
import axios from 'axios'
import generals from '@/common-vue/mixins/generals'
import ventas_sin_cobrar from '@/store/sale/ventas_sin_cobrar'
import consolidar_facturacion from '@/store/sale/consolidar_facturacion'

/**
 * Store de ventas (modelo `sale`) construido desde el factory común.
 *
 * Notas:
 * - Mantiene módulos internos propios.
 * - Mantiene estados/opciones de filtros de negocio.
 * - Sobrescribe `_getModels` porque `sale` usa un endpoint específico con `modulo` en la URL.
 */
export default __base_store({
	modules: {
		ventas_sin_cobrar,
		consolidar_facturacion,
	},
	state: {
		modulo: 'ventas',

		model_name: 'sale',
		from_dates: true,

		use_per_page: false,
		per_page: 25,
		filter_per_page: 50,

		ventas_cobradas_show_option: 'cobradas-y-no-cobradas',
		afip_ticket_show_option: 'con-y-sin-factura',
		payment_method_show_option: 'todos',

		// Array de descripciones del cálculo del precio de la venta seleccionada para mostrar en el modal
		sale_price_description: [],

		/**
		 * Controla si las ventas contenedoras de facturación (is_consolidacion_facturacion=1)
		 * se muestran u ocultan en el listado general de ventas. Por defecto ocultas.
		 */
		mostrar_consolidadas: false,

		/**
		 * Si el usuario confirma con el checkbox activo, el DELETE envía `compensar_caja` al backend.
		 */
		compensar_caja_delete: true,
	},
	mutations: {
		/**
		 * Guarda la preferencia del modal de borrado: compensar caja o no en el próximo DELETE.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {boolean} value Valor del checkbox en Confirm.vue.
		 * @returns {void}
		 */
		setCompensarCajaDelete(state, value) {
			state.compensar_caja_delete = value
		},
		/**
		 * Cambia el módulo/fuente consultada en endpoint from-date de ventas.
		 */
		set_modulo(state, value) {
			state.modulo = value
		},
		/**
		 * Filtro visual para ventas cobradas/no cobradas.
		 */
		setVentasCobradasShowOption(state, value) {
			state.ventas_cobradas_show_option = value
		},
		/**
		 * Filtro visual para mostrar ventas con/sin factura AFIP.
		 */
		setAfipTicketShowOption(state, value) {
			state.afip_ticket_show_option = value
		},
		/**
		 * Filtro visual por método de pago.
		 */
		set_payment_method_show_option(state, value) {
			state.payment_method_show_option = value
		},
		/**
		 * Guarda el array de descripciones del precio de la venta seleccionada para mostrar en el modal.
		 * Se llama desde PriceDescriptionBtn al hacer click en el botón de una fila de ventas.
		 * @param {Array} value - Array de strings con las líneas descriptivas del cálculo
		 */
		set_sale_price_description(state, value) {
			state.sale_price_description = value
		},
		/**
		 * Alterna la visibilidad de ventas contenedoras de facturación en el listado.
		 */
		toggleMostrarConsolidadas(state) {
			state.mostrar_consolidadas = !state.mostrar_consolidadas
		},
		/**
		 * Mantiene el log de actualización de venta que ya tenía el store original.
		 */
		add(state, value) {
			let index = state.models.findIndex(item => {
				return item.id == value.id
			})
			if (index == -1) {
				state.models.unshift(value)
			} else {
				console.log('se actualizo esta venta:')
				console.log(value)
				state.models.splice(index, 1, value)
			}

			index = state.filtered.findIndex(item => {
				return item.id == value.id
			})
			if (index != -1) {
				state.filtered.splice(index, 1, value)
			}
		},
	},
	actions: {
		/**
		 * Elimina venta en API, opcionalmente pidiendo compensación en caja (`compensar_caja`).
		 *
		 * @param {Object} context commit, state
		 * @returns {Promise}
		 */
		delete({ commit, state }) {
			return axios.delete(`/api/${generals.methods.routeString(state.model_name)}/${state.delete.id}`, {
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
		/**
		 * Override de carga para ventas:
		 * arma URL `/api/sale/from-date/{modulo}/{from_date}/{until_date?}`.
		 */
		_getModels({commit, state, dispatch}) {
			commit('setLoading', true)
			let url = '/api/' + generals.methods.routeString(state.model_name)
			if (state.plural_model_name) {
				if (state.selected_model) {
					url += '/' + state.selected_model.id
				} else {
					url += '/0'
				}
			}

			url += '/from-date/' + state.modulo

			if (state.from_dates) {
				url += '/' + state.from_date
			}

			if (state.until_date != '') {
				url += '/' + state.until_date
			}
			if (state.use_per_page) {
				url += '?page=' + state.page
			}
			return axios.get(url)
				.then(res => {
					if (state.use_per_page) {
						let loaded_models = res.data.models.data
						if (res.data.models.current_page == 1) {
							commit('setTotalPages', res.data.models.last_page)
						}
						console.log('se cargo ' + state.model_name + ' page: ' + state.page)
						commit('incrementPage')
						commit('addModels', loaded_models)
						if (loaded_models.length == state.per_page) {
							dispatch('_getModels')
						} else {
							commit('setLoading', false)
							commit('setPage', 1)
						}
					} else {
						commit('setLoading', false)
						commit('setModels', res.data.models)
					}
				})
				.catch(err => {
					commit('setLoading', false)
					console.log(err)
				})
		},
		/**
		 * Conserva comportamiento original: loader explícito mientras pagina resultados filtrados.
		 */
		loadMoreFiltered({state, commit}) {
			commit('setLoadingFiltered', true)
			commit('incrementFilterPage')
			return axios.post(`/api/search/${generals.methods.routeString(state.model_name)}/null/1?page=${state.filter_page}`, {
				filters: state.filters,
				per_page: state.filter_per_page,
			})
				.then(res => {
					commit('setLoadingFiltered', false)
					commit('addFiltered', res.data.data)
				})
				.catch(err => {
					console.log(err)
					commit('setLoadingFiltered', false)
				})
		},
	},
})

