// import Vue from 'vue'
import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import previus_sales from '@/store/vender/previus_sales'
import current_acount_payment_methods from '@/store/vender/current_acount_payment_methods'
import current_acount_payment_methods_with_discounts from '@/store/vender/current_acount_payment_methods_with_discounts'

// import mixin_vender from '@/mixins/vender'
import model_functions from '@/mixins/model_functions'

export default {
	namespaced: true,
	state: {
		items: [],
		item: {bar_code: '', provider_code: '', num: '', name: '', amount: ''},
		new_article: '',
		article_for_sale: {},

		/* 
			sub_total es la suma de la venta 
			sin aplicar descuentos de los metodos de pago
		*/
		sub_total: 0,

		/* 
			total es la suma de la venta 
			aplicando descuentos de los metodos de pago
		*/
		total: 0,

		caja_id: 0,

		moneda_id: 1,
		valor_dolar: null,
		

		cuota_id: 0,
		monto_credito: 0, 
		cantidad_cuotas: 0,
		cuota_descuento: null,
		cuota_recargo: null,

		cuota_monto_descuento: null,
		cuota_monto_recargo: null,

		monto_credito_real: null,

		afip_tipo_comprobante_id: 0,

		incoterms: 0,

		descuento: null,

		client: null,
		discounts_id: [],
		surchages_id: [],
		to_check: 0,
		checked: 0,
		confirmed: 0,
		price_type: null,
		save_current_acount: 1,
		omitir_en_cuenta_corriente: 0,
		make_current_acount_pago: 0,
		save_nota_credito: 0,
		nota_credito_description: '',
		save_afip_ticket: 0,
		discounts_in_services: 0,
		surchages_in_services: 0,
		current_acount_payment_method_id: 3,
		afip_information_id: 0,
		employee_id: 0,
		address_id: 0,
		sale_type_id: 0,
		observations: '',
		observations_ocultas: '',
		numero_orden_de_compra: '',

		guardar_como_presupuesto: 0,
		budget: null,

		seller_id: 0,

		returned_items: [],

		// Este se usa para guardar los metodos de pago seleccionados sin haber aplicado desceuntos de metodos de pago aun
		modal_payment_methods: [],

		// Aca guardo los metodos de pago con sus cantidades final, es el que se envia finalmente al back
		selected_payment_methods: [],

		vendiendo: false,
		sale: null,

		afip_results: null,

		discount_percentage: null,
		discount_amount: null,

		fecha_entrega: null,

		aplicar_recargos_directo_a_items: 0,

		total_description: [],

		sale_status_id: 0,

		// Indica si la venta debe descontar stock. Por defecto en true (1).
		discount_stock: 1,
		// Indica si los precios de los items se interpretan con IVA aplicado. Por defecto en true (1).
		iva_aplicado: 1,
		// Indica si se debe enviar un correo al cliente al crear la venta.
		send_mail: 0,

		// Adjuntos pendientes de subir (para ventas nuevas, antes de que exista sale_id)
		pending_attachments: [],

		// Adjuntos ya guardados de la venta que se está editando (precargados)
		sale_attachments: [],
	},
	mutations: {
		set_sale_status_id(state, value) {
			state.sale_status_id = value
		},
		addPendingAttachment(state, attachment) {
			state.pending_attachments.push(attachment)
		},
		removePendingAttachment(state, temp_id) {
			const index = state.pending_attachments.findIndex(a => a.temp_id === temp_id)
			if (index !== -1) {
				state.pending_attachments.splice(index, 1)
			}
		},
		clearPendingAttachments(state) {
			state.pending_attachments = []
		},
		setSaleAttachments(state, attachments) {
			state.sale_attachments = attachments
		},
		addSaleAttachment(state, attachment) {
			state.sale_attachments.push(attachment)
		},
		removeSaleAttachment(state, id) {
			state.sale_attachments = state.sale_attachments.filter(a => a.id !== id)
		},
		// Mutation para controlar si la venta descuenta stock
		set_discount_stock(state, value) {
			state.discount_stock = value
		},
		// Mutation para controlar si los precios incluyen IVA
		set_iva_aplicado(state, value) {
			state.iva_aplicado = value
		},
		// Mutation para controlar si se envía correo al cliente
		set_send_mail(state, value) {
			state.send_mail = value
		},
		set_total_description(state, value) {
			state.total_description = value
		},
		set_aplicar_recargos_directo_a_items(state, value) {
			state.aplicar_recargos_directo_a_items = value 
		},
		set_fecha_entrega(state, value) {
			state.fecha_entrega = value
			console.log('se seteo fecha_entrega con:')
			console.log(state.fecha_entrega)
		},
		set_payment_method_discount_percentage(state, value) {
			state.discount_percentage = value
		},
		set_payment_method_discount_amount(state, value) {
			state.discount_amount = value
		},

		set_modal_payment_methods(state, value){
			state.modal_payment_methods = value
		},
		setSelectedPaymentMethods(state, value){
			state.selected_payment_methods = value
		},
		setGuardarComoPresupuesto(state, value) {
			state.guardar_como_presupuesto = value 
		},
		setBudget(state, value) {
			state.budget = value 
		},
		setSellerId(state, value) {
			state.seller_id = value 
		},
		setItems(state, value) {
			// console.log('vender/setItems')
			state.items = value
			// console.log(state.items)
		},
		addItem(state, value) {
			state.items.unshift(value)
		},
		replceItem(state, value) {
			let index = state.items.findIndex(item => {
				if (
					value
					&& item.is_article && value.is_article
					&& item.id == value.id	
				) {
					return true
				}
				if (
					value
					&& item.is_combo && value.is_combo
					&& item.id == value.id	
				) {
					return true
				}
				return false
			})
			if (index != -1) {
				console.log('quitando item')
				state.items.splice(index, 1, value)
			} 
		},
		setItem(state, value) { 
			if (!value) {
				state.item = {
					bar_code: '',
					name: '',
					amount: '',
				}
			} else {
				state.item = value
			}
			
			console.log('setItem:')
			console.log(value)
		},
		addCombo(state, value) {
			state.items.unshift(value)
		},
		setNewArticle(state, value) {
			state.new_article = value
		},
		addItem(state, item) {
			console.log('addItem:')
			console.log(item)
			state.items.unshift(item)
		},
		setArticleForSale(state, value) {
			state.article_for_sale = value
		},
		setVendiendo(state, value) {
			state.vendiendo = value
		},
		set_descuento(state, value) {
			state.descuento = value
		},
		setDiscountsId(state, value) {
			state.discounts_id = value
		},
		addDiscountId(state, value) {
			state.discounts_id.push(value)
		},
		setSurchagesId(state, value) {
			state.surchages_id = value
		},
		addSurchageId(state, value) {
			state.surchages_id.push(value)
		},
		setToCheck(state, value) {
			state.to_check = value
		},
		setChecked(state, value) {
			state.checked = value
		},
		setConfirmed(state, value) {
			state.confirmed = value
		},
		setPriceType(state, value) {
			state.price_type = value
		},
		setSaveCurrentAcount(state, value) {
			state.save_current_acount = value
		},
		set_omitir_en_cuenta_corriente(state, value) {
			state.omitir_en_cuenta_corriente = value 
		},
		setMakeCurrentAcountPago(state, value) {
			state.make_current_acount_pago = value
		},
		setSaveNotaCredito(state, value) {
			state.save_nota_credito = value
		},
		setNotaCreditoDescription(state, value) {
			state.nota_credito_description = value
		},
		setSaveAfipTicket(state, value) {
			state.save_afip_ticket = value
		},
		setDiscountsInServices(state, value) {
			state.discounts_in_services = value
		},
		setSurchagesInServices(state, value) {
			state.surchages_in_services = value
		},
		setCurrentAcountPaymentMethodId(state, value) {
			state.current_acount_payment_method_id = value
		},
		setAfipInformationId(state, value) {
			state.afip_information_id = value
		},
		setEmployeeId(state, value) {
			state.employee_id = value
		},
		setAddressId(state, value) {
			state.address_id = value
		},
		setReturnedItems(state, value) {
			state.returned_items = value
		},
		addReturnedItem(state, value) {
			let index = state.returned_items.findIndex(item => {
				return item.id == value.id 
			})
			if (index == -1) {
				state.returned_items.push(value)
			} else {
				state.returned_items.splice(index, 1, value)
			}
		},
		setSaleTypeId(state, value) {
			state.sale_type_id = value
		},
		setObservations(state, value) {
			state.observations = value
		},
		setObservationsOcultas(state, value) {
			state.observations_ocultas = value
		},
		set_numero_orden_de_compra(state, value) {
			state.numero_orden_de_compra = value
		},
		setClient(state, value) {
			state.client = value
		},
		setSale(state, value) {
			state.sale = value
		},
		setSubTotal(state, sub_total = null) {
			state.sub_total = sub_total
		},
		setTotal(state, total = null) {
			state.total = total
		},
		set_caja_id(state, value) {
			state.caja_id = value 
		},
		set_moneda_id(state, value) {
			state.moneda_id = value 
		},
		set_valor_dolar(state, value) {
			state.valor_dolar = value 
		},
		set_cuota_id(state, value) {
			state.cuota_id = value 
		},
		set_monto_credito(state, value) {
			state.monto_credito = value 
		},
		set_cantidad_cuotas(state, value) {
			state.cantidad_cuotas = value 
		},
		set_cuota_descuento(state, value) {
			state.cuota_descuento = value 
		},
		set_cuota_recargo(state, value) {
			state.cuota_recargo = value 
		},
		set_cuota_monto_descuento(state, value) {
			state.cuota_monto_descuento = value 
		},
		set_cuota_monto_recargo(state, value) {
			state.cuota_monto_recargo = value 
		},
		set_monto_credito_real(state, value) {
			state.monto_credito_real = value 
		},
		set_afip_tipo_comprobante_id(state, value) {
			state.afip_tipo_comprobante_id = value 
		},
		set_incoterms(state, value) {
			state.incoterms = value 
		},
		removeItem(state, item) {
			let index = state.items.findIndex(i => {
				return i.id == item.id
			})
			state.items.splice(index, 1)
		},
		updateItem(state, item) {
			let index = state.items.findIndex(art => {
				return art.id == item.id
			})
			state.items.splice(index, 1, item)
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
		setAfipResult(state, value) {
			state.afip_results = value 
		},
	},
	actions: {
		vender({ commit, state }, info) {
			commit('setVendiendo', true)
			return axios.post('/api/sale', {
				save_afip_ticket: state.save_afip_ticket,
				items: state.items,
				client_id: state.client ? state.client.id : null ,
				discounts: info.discounts,
				surchages: info.surchages,
				save_current_acount: state.save_current_acount,
				make_current_acount_pago: state.make_current_acount_pago,
				sale_type_id: state.sale_type_id,
				discounts_in_services: state.discounts_in_services,
				surchages_in_services: state.surchages_in_services,
				current_acount_payment_method_id: state.current_acount_payment_method_id,
				afip_information_id: state.afip_information_id,
				employee_id: state.employee_id,
				address_id: state.address_id,
				to_check: state.to_check,
				checked: state.checked,
				confirmed: state.confirmed,
				observations: state.observations,
				omitir_en_cuenta_corriente: state.omitir_en_cuenta_corriente,
				numero_orden_de_compra: state.numero_orden_de_compra,
				selected_payment_methods: state.selected_payment_methods,
				discount_percentage: state.discount_percentage,
				discount_amount: state.discount_amount,
				sub_total: state.sub_total,
				price_type_id: state.price_type ? state.price_type.id : null,
				total: state.total,
				seller_id: state.seller_id,
				cuota_id: state.cuota_id,
				cantidad_cuotas: state.cantidad_cuotas,
				cuota_descuento: state.cuota_descuento,
				cuota_recargo: state.cuota_recargo,
				monto_credito_real: state.monto_credito_real,
				caja_id: state.caja_id,
				moneda_id: state.moneda_id,
				valor_dolar: state.valor_dolar,
				afip_tipo_comprobante_id: state.afip_tipo_comprobante_id,
				descuento: state.descuento,
				fecha_entrega: state.fecha_entrega,
				incoterms: state.incoterms,
				observations_ocultas: state.observations_ocultas,
				aplicar_recargos_directo_a_items: state.aplicar_recargos_directo_a_items,
				sale_type_id: state.sale_type_id,
				sale_status_id: state.sale_status_id,
			// Indica si la venta debe descontar stock al crearse
			discount_stock: state.discount_stock,
			// Indica si los precios enviados en la venta incluyen IVA
			iva_aplicado: state.iva_aplicado,
			// Array de descripciones del cálculo del precio final, serializado como JSON
			price_description: JSON.stringify(state.total_description),
			// Indica si se debe enviar correo al cliente al crear la venta
			send_mail: state.send_mail,
		})
			.then(res => {
				console.log('vendido')
				let sale = res.data.model
				console.log(sale)
				commit('setSale', sale)
				commit('setVendiendo', false)
				// commit('setItems', [])
				// commit('setDiscountsId', [])
				// commit('setSurchagesId', [])
				// // commit('setSaleTypeId', 1)
				// commit('setClient', null)
				// commit('setObservations', '')
				// commit('setTotal', 0)
				commit('sale/add', sale, {root: true})
			})
			.catch(err => {
				commit('setVendiendo', false)
				console.log(err)
				throw err
			})
		}
	},
	modules: {
		previus_sales,
		current_acount_payment_methods,
		current_acount_payment_methods_with_discounts,
	}
}
