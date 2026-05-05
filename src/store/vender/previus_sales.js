import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL
import previus_sales from '@/store/vender/previus_sales'
import mixin_vender from '@/mixins/vender'
export default {
	namespaced: true,
	state: { 
		previus_sale: {},
		previus_returned_articles: [],
		previus_returned_services: [],
		index: 0,
		loading_previus: false,
		loading_next: false,
		updating: false,
	},
	mutations: {
		incrementIndex(state) {
			state.index++
		},
		decrementIndex(state) {
			state.index--
		},
		setIndex(state, value) {
			state.index = value
		},
		setPreviusSale(state, value) {
			state.previus_sale = value
			console.log('store/setPreviusSale')
			console.log(state.previus_sale)
		},
		setPreviusReturnedArticles(state, value) {
			state.previus_returned_articles = value
		},
		setPreviusReturnedServices(state, value) {
			state.previus_returned_services = value
		},
		setLoadingPrevius(state, value) {
			state.loading_previus = value
		},
		setLoadingNext(state, value) {
			state.loading_next = value
		},
		setUpdating(state, value) {
			state.updating = value
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
		getSale({ commit, state }) {
			return axios.get('/api/previus-next/sale/'+state.index)
			.then(res => {
				console.log(res.data.model)
				commit('setLoadingPrevius', false)
				commit('setLoadingNext', false)
				if (res.data.model) {
					commit('setPreviusSale', res.data.model)
				}
			})
			.catch(err => {
				commit('setLoadingPrevius', false)
				commit('setLoadingNext', false)
				console.log(err)
			})
		},
		updateSale({ commit, state, rootState }, info) {
			// Registra intento de actualización y envía el log acumulado de la sesión de edición.
			commit('vender/append_sale_log', {
				event_key: 'sale_update_attempt',
				source_component: 'vender/previus_sales/updateSale',
				before: null,
				after: {
					sale_id: state.previus_sale.id,
					items_count: rootState.vender.items.length,
					client_id: rootState.vender.client ? rootState.vender.client.id : null,
					total: rootState.vender.total,
				},
				diff: null,
			}, { root: true })
			commit('setUpdating', true)
			console.log('observations:')
			console.log(info.observations)
			return axios.put('/api/sale/'+state.previus_sale.id, {
				selected_payment_methods: info.selected_payment_methods,
				client_id: info.client_id,
				items: info.items,
				discounts: info.discounts,
				surchages: info.surchages,
				save_nota_credito: info.save_nota_credito,
				returned_items: info.returned_items,
				nota_credito_description: info.nota_credito_description,
				discounts_in_services: info.discounts_in_services,
				surchages_in_services: info.surchages_in_services,
				current_acount_payment_method_id: info.current_acount_payment_method_id,
				afip_information_id: info.afip_information_id,
				sale_type_id: info.sale_type_id,
				address_id: info.address_id,
				employee_id: info.employee_id,
				to_check: info.to_check,
				checked: info.checked,
				confirmed: info.confirmed,
				observations: info.observations,
				numero_orden_de_compra: info.numero_orden_de_compra,
				omitir_en_cuenta_corriente: info.omitir_en_cuenta_corriente,
				sub_total: info.sub_total,
				total: info.total,
				seller_id: info.seller_id,
				fecha_entrega: info.fecha_entrega,
				valor_dolar: info.valor_dolar,
				observations_ocultas: info.observations_ocultas,
				aplicar_recargos_directo_a_items: info.aplicar_recargos_directo_a_items,
				sale_status_id: info.sale_status_id,
			// Indica si la venta debe descontar stock al actualizarse
			discount_stock: info.discount_stock,
			// Indica si los precios enviados en la actualización incluyen IVA
			iva_aplicado: info.iva_aplicado,
			// Array de descripciones del cálculo del precio final, serializado como JSON
			price_description: info.price_description,
			// Indica si se debe enviar correo al cliente
			send_mail: info.send_mail,
			// Días opcionales para alerta de cobro (null = reglas globales en backend).
			dias_alerta_venta_no_cobrada_personalizado: info.dias_alerta_venta_no_cobrada_personalizado,
			// Auditoría de acciones realizadas en vender durante la edición de la venta.
			log: rootState.vender.sale_log,
		})
			.then(res => {
				commit('sale/add', res.data.model, {root: true})
				commit('setUpdating', false)
				commit('vender/append_sale_log', {
					event_key: 'sale_update_success',
					source_component: 'vender/previus_sales/updateSale',
					before: null,
					after: {
						sale_id: res.data.model.id,
						sale_num: res.data.model.num,
					},
					diff: null,
				}, { root: true })
			})
			.catch(err => {
				commit('setUpdating', false)
				commit('vender/append_sale_log', {
					event_key: 'sale_update_error',
					source_component: 'vender/previus_sales/updateSale',
					before: null,
					after: {
						message: err && err.message ? err.message : 'unknown_error',
					},
					diff: null,
				}, { root: true })
				alert('Error al actualizar venta')
				console.log(err)
			})
		},
	},
	modules: {
	}
}
