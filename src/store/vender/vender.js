// import Vue from 'vue'
import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import previus_sales from '@/store/vender/previus_sales'
import current_acount_payment_methods from '@/store/vender/current_acount_payment_methods'
import current_acount_payment_methods_with_discounts from '@/store/vender/current_acount_payment_methods_with_discounts'

// import mixin_vender from '@/mixins/vender'
import model_functions from '@/mixins/model_functions'

/**
 * Obtiene una copia segura en JSON para evitar referencias reactivas.
 * Si el valor no se puede serializar, retorna null para no romper el flujo.
 */
function get_safe_clone(value) {
	try {
		return JSON.parse(JSON.stringify(value))
	} catch (error) {
		return null
	}
}

/**
 * Construye una clave corta para deduplicar eventos muy cercanos en el tiempo.
 * Se usa principalmente para evitar ruido de recálculos consecutivos.
 */
function get_log_dedupe_key(event_key, source_component, after) {
	let after_signature = ''
	if (after && typeof after === 'object') {
		after_signature = JSON.stringify(after)
	}
	return `${event_key}|${source_component}|${after_signature}`
}

/**
 * Devuelve la descripción del evento en español para persistir en `event_key`.
 */
function get_event_key_es(event_key) {
	// Mapa centralizado para mantener naming consistente del log de auditoría.
	const event_map = {
		item_selected: 'Se seleccionó un artículo para vender',
		item_added: 'Se agregó un artículo al remito',
		item_updated: 'Se modificó un artículo del remito',
		item_removed: 'Se eliminó un artículo del remito',
		client_changed: 'Se cambió el cliente de la venta',
		discounts_changed: 'Se modificaron los descuentos de la venta',
		surchages_changed: 'Se modificaron los recargos de la venta',
		price_list_changed: 'Se cambió la lista de precios de la venta',
		payment_method_changed: 'Se cambió el método de pago principal',
		selected_payment_methods_changed: 'Se modificaron los métodos de pago seleccionados',
		caja_changed: 'Se cambió la caja de la venta',
		sale_sub_total_changed: 'Se actualizó el subtotal de la venta',
		sale_total_changed: 'Se actualizó el total de la venta',
		apply_surchages_direct_to_items_changed: 'Se cambió la aplicación de recargos directos a ítems',
		sale_submit_attempt: 'Se intentó guardar la venta',
		sale_submit_success: 'La venta se guardó correctamente',
		sale_submit_error: 'Ocurrió un error al guardar la venta',
		sale_update_attempt: 'Se intentó actualizar la venta',
		sale_update_success: 'La venta se actualizó correctamente',
		sale_update_error: 'Ocurrió un error al actualizar la venta',
	}
	return event_map[event_key] || event_key
}

/**
 * Extrae un subconjunto del modelo artículo con propiedades relevantes para auditoría.
 */
function get_article_log_model(article) {
	if (!article || typeof article !== 'object') {
		return null
	}
	// Campos solicitados para trazabilidad del item implicado.
	return {
		name: article.name || null,
		amount: article.amount || null,
		price_vender: article.price_vender || null,
		price_vender_personalizado: article.price_vender_personalizado || null,
		discount: article.discount || null,
		price_type_id: article.price_type_id || null,
		total: article.total || null,
	}
}

/**
 * Selecciona el objeto de dominio implicado en la acción para guardarlo en `model`.
 */
function get_event_model(state, log_data) {
	if (log_data.model) {
		return get_safe_clone(log_data.model)
	}

	if (log_data.event_key === 'item_added' || log_data.event_key === 'item_updated' || log_data.event_key === 'item_selected') {
		return get_article_log_model(log_data.after)
	}

	if (log_data.event_key === 'item_removed') {
		return get_article_log_model(log_data.item)
	}

	if (log_data.event_key === 'payment_method_changed') {
		// Para método principal guardamos id y, si existe, objeto encontrado en selección múltiple.
		const selected_method = state.selected_payment_methods.find(method => {
			return method.current_acount_payment_method_id == state.current_acount_payment_method_id
				|| method.id == state.current_acount_payment_method_id
		})
		return selected_method ? get_safe_clone(selected_method) : { current_acount_payment_method_id: state.current_acount_payment_method_id }
	}

	if (log_data.event_key === 'selected_payment_methods_changed') {
		return get_safe_clone(log_data.after)
	}

	if (log_data.event_key === 'client_changed') {
		const client = log_data.after
		if (!client || typeof client !== 'object') {
			return null
		}
		// Para cliente solo persistimos campos clave solicitados para auditoría.
		return {
			id: client.id || null,
			name: client.name || null,
			price_type_id: client.price_type_id || null,
		}
	}

	if (log_data.event_key === 'caja_changed') {
		return { caja_id: state.caja_id }
	}

	return get_safe_clone(log_data.after)
}

/**
 * Agrega una entrada de auditoría en la venta con estructura detallada.
 * Incluye before/after/diff y snapshot de totales del momento.
 */
function append_sale_log_entry(state, log_data) {
	// No registrar eventos mientras se hidrata el store al abrir una venta existente.
	if (state.sale_log_paused) {
		return
	}
	/* 
		La ventana corta evita duplicación de logs técnicos repetidos
		(350 ms cubre varios commits encadenados de la misma interacción).
	*/
	const dedupe_window_ms = 350
	const now_ms = Date.now()
	const dedupe_key = get_log_dedupe_key(log_data.event_key, log_data.source_component, log_data.after)

	if (
		state.last_sale_log_dedupe_key === dedupe_key
		&& (now_ms - state.last_sale_log_dedupe_ms) <= dedupe_window_ms
	) {
		return
	}

	// Snapshot acotado de totales para auditoría financiera.
	const totals_snapshot = {
		sub_total: state.sub_total,
		total: state.total,
		items_count: state.items.length,
	}

	// Entrada normalizada consumible por frontend y backend.
	const log_entry = {
		event_key: get_event_key_es(log_data.event_key),
		source_component: log_data.source_component,
		model: get_event_model(state, log_data),
		created_at: new Date(now_ms).toISOString(),
		// user_id: null,
		// before: get_safe_clone(log_data.before),
		// after: get_safe_clone(log_data.after),
		// diff: get_safe_clone(log_data.diff),
		// totals_snapshot: totals_snapshot,
	}

	state.sale_log.push(log_entry)
	state.last_sale_log_dedupe_key = dedupe_key
	state.last_sale_log_dedupe_ms = now_ms
}

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

		// Días personalizados hasta alertar venta no cobrada; null = usar reglas globales del usuario.
		dias_alerta_venta_no_cobrada_personalizado: null,

		// Adjuntos pendientes de subir (para ventas nuevas, antes de que exista sale_id)
		pending_attachments: [],

		// Adjuntos ya guardados de la venta que se está editando (precargados)
		sale_attachments: [],

		// Array de auditoría detallada de acciones realizadas en el módulo vender.
		sale_log: [],

		// Metadatos para deduplicar entradas de log repetidas en pocos milisegundos.
		last_sale_log_dedupe_key: null,
		last_sale_log_dedupe_ms: 0,

		// En true, no se agregan entradas a sale_log (carga inicial al editar venta).
		sale_log_paused: false,
	},
	mutations: {
		/**
		 * Activa o desactiva el registro de auditoría (p. ej. durante hidratación al editar).
		 */
		set_sale_log_paused(state, value) {
			state.sale_log_paused = !!value
		},
		/**
		 * Reinicia el log de la venta actual, por ejemplo al entrar en Vender.
		 */
		init_sale_log(state) {
			state.sale_log = []
			state.last_sale_log_dedupe_key = null
			state.last_sale_log_dedupe_ms = 0
		},
		/**
		 * Limpia completamente el log de auditoría de la venta en curso.
		 */
		clear_sale_log(state) {
			state.sale_log = []
			state.last_sale_log_dedupe_key = null
			state.last_sale_log_dedupe_ms = 0
			state.sale_log_paused = false
		},
		/**
		 * Agrega manualmente una entrada de log detallada.
		 */
		append_sale_log(state, value) {
			append_sale_log_entry(state, value)
		},
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
		/**
		 * Días opcionales para alerta de cobro de esta venta; null deja el umbral global del negocio.
		 */
		set_dias_alerta_venta_no_cobrada_personalizado(state, value) {
			if (value === '' || value === undefined) {
				state.dias_alerta_venta_no_cobrada_personalizado = null
			} else if (value === null) {
				state.dias_alerta_venta_no_cobrada_personalizado = null
			} else {
				const parsed = parseInt(value, 10)
				state.dias_alerta_venta_no_cobrada_personalizado = isNaN(parsed) ? null : Math.max(0, parsed)
			}
		},
		set_total_description(state, value) {
			state.total_description = value
		},
		set_aplicar_recargos_directo_a_items(state, value) {
			const previous_value = state.aplicar_recargos_directo_a_items
			state.aplicar_recargos_directo_a_items = value 
			append_sale_log_entry(state, {
				event_key: 'apply_surchages_direct_to_items_changed',
				source_component: 'vender/set_aplicar_recargos_directo_a_items',
				before: { aplicar_recargos_directo_a_items: previous_value },
				after: { aplicar_recargos_directo_a_items: value },
				diff: { changed: previous_value !== value },
			})
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
			const previous_payment_methods = get_safe_clone(state.selected_payment_methods)
			state.selected_payment_methods = value
			append_sale_log_entry(state, {
				event_key: 'selected_payment_methods_changed',
				source_component: 'vender/setSelectedPaymentMethods',
				before: previous_payment_methods,
				after: value,
				diff: {
					before_count: previous_payment_methods ? previous_payment_methods.length : 0,
					after_count: value ? value.length : 0,
				},
			})
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
			// Guardamos estado anterior para registrar cambios de item editado.
			let previous_item = null
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
				previous_item = get_safe_clone(state.items[index])
				console.log('quitando item')
				state.items.splice(index, 1, value)
				append_sale_log_entry(state, {
					event_key: 'item_updated',
					source_component: 'vender/replceItem',
					before: previous_item,
					after: value,
					diff: {
						item_id: value.id,
						is_article: !!value.is_article,
						is_combo: !!value.is_combo,
					},
				})
			} 
		},
		setItem(state, value) { 
			// Estado previo para detectar selección/limpieza del item activo en cabecera.
			const previous_item = get_safe_clone(state.item)
			if (!value) {
				state.item = {
					bar_code: '',
					name: '',
					amount: '',
				}
			} else {
				state.item = value
				append_sale_log_entry(state, {
					event_key: 'item_selected',
					source_component: 'vender/setItem',
					before: previous_item,
					after: state.item,
					diff: {
						has_selected_item: !!value,
					},
				})
			}
			
			// console.log('setItem:')
			// console.log(value)
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
			append_sale_log_entry(state, {
				event_key: 'item_added',
				source_component: 'vender/addItem',
				before: null,
				after: item,
				diff: {
					items_count_after: state.items.length,
				},
			})
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
			const previous_discounts = get_safe_clone(state.discounts_id)
			state.discounts_id = value
			append_sale_log_entry(state, {
				event_key: 'discounts_changed',
				source_component: 'vender/setDiscountsId',
				before: previous_discounts,
				after: value,
				diff: {
					before_count: previous_discounts ? previous_discounts.length : 0,
					after_count: value ? value.length : 0,
				},
			})
		},
		addDiscountId(state, value) {
			state.discounts_id.push(value)
		},
		setSurchagesId(state, value) {
			const previous_surchages = get_safe_clone(state.surchages_id)
			state.surchages_id = value
			append_sale_log_entry(state, {
				event_key: 'surchages_changed',
				source_component: 'vender/setSurchagesId',
				before: previous_surchages,
				after: value,
				diff: {
					before_count: previous_surchages ? previous_surchages.length : 0,
					after_count: value ? value.length : 0,
				},
			})
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
			const previous_price_type = get_safe_clone(state.price_type)
			state.price_type = value
			append_sale_log_entry(state, {
				event_key: 'price_list_changed',
				source_component: 'vender/setPriceType',
				before: previous_price_type,
				after: value,
				diff: {
					before_id: previous_price_type ? previous_price_type.id : null,
					after_id: value ? value.id : null,
				},
			})
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
			const previous_payment_method_id = state.current_acount_payment_method_id
			state.current_acount_payment_method_id = value
			append_sale_log_entry(state, {
				event_key: 'payment_method_changed',
				source_component: 'vender/setCurrentAcountPaymentMethodId',
				before: { current_acount_payment_method_id: previous_payment_method_id },
				after: { current_acount_payment_method_id: value },
				diff: {
					before_id: previous_payment_method_id,
					after_id: value,
				},
			})
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
			const previous_client = get_safe_clone(state.client)
			state.client = value
			append_sale_log_entry(state, {
				event_key: 'client_changed',
				source_component: 'vender/setClient',
				before: previous_client,
				after: value,
				diff: {
					before_id: previous_client ? previous_client.id : null,
					after_id: value ? value.id : null,
				},
			})
		},
		setSale(state, value) {
			state.sale = value
		},
		setSubTotal(state, sub_total = null) {
			const previous_sub_total = state.sub_total
			state.sub_total = sub_total
			// if (previous_sub_total !== sub_total) {
			// 	append_sale_log_entry(state, {
			// 		event_key: 'sale_sub_total_changed',
			// 		source_component: 'vender/setSubTotal',
			// 		before: { sub_total: previous_sub_total },
			// 		after: { sub_total: sub_total },
			// 		diff: { changed: true },
			// 	})
			// }
		},
		setTotal(state, total = null) {
			const previous_total = state.total
			state.total = total
			if (previous_total !== total) {
				append_sale_log_entry(state, {
					event_key: 'sale_total_changed',
					source_component: 'vender/setTotal',
					before: { total: previous_total },
					after: { total: total },
					diff: { changed: true },
				})
			}
		},
		set_caja_id(state, value) {
			const previous_caja_id = state.caja_id
			state.caja_id = value 
			append_sale_log_entry(state, {
				event_key: 'caja_changed',
				source_component: 'vender/set_caja_id',
				before: { caja_id: previous_caja_id },
				after: { caja_id: value },
				diff: {
					before_id: previous_caja_id,
					after_id: value,
				},
			})
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
			// Estado previo para registrar la eliminación del item.
			const previous_items = get_safe_clone(state.items)
			let index = state.items.findIndex(i => {
				return i.id == item.id
			})
			state.items.splice(index, 1)
			append_sale_log_entry(state, {
				event_key: 'item_removed',
				source_component: 'vender/removeItem',
				item: item,
				before: previous_items,
				after: state.items,
				diff: {
					removed_item_id: item.id,
					items_count_after: state.items.length,
				},
			})
		},
		updateItem(state, item) {
			const previous_item = get_safe_clone(state.items.find(art => art.id == item.id))
			let index = state.items.findIndex(art => {
				return art.id == item.id
			})
			state.items.splice(index, 1, item)
			append_sale_log_entry(state, {
				event_key: 'item_updated',
				source_component: 'vender/updateItem',
				before: previous_item,
				after: item,
				diff: {
					item_id: item.id,
				},
			})
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
			// Log previo al envío para auditar el estado final con el que se intenta guardar.
			commit('append_sale_log', {
				event_key: 'sale_submit_attempt',
				source_component: 'vender/action_vender',
				before: null,
				after: {
					items_count: state.items.length,
					client_id: state.client ? state.client.id : null,
					total: state.total,
				},
				diff: null,
			})
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
			// Días opcionales para alerta de cobro (null = reglas globales en backend).
			dias_alerta_venta_no_cobrada_personalizado: state.dias_alerta_venta_no_cobrada_personalizado,
			// Array de auditoría completo de acciones realizadas durante la venta.
			log: state.sale_log,
		})
			.then(res => {
				console.log('vendido')
				let sale = res.data.model
				console.log(sale)
				commit('setSale', sale)
				commit('setVendiendo', false)
				commit('append_sale_log', {
					event_key: 'sale_submit_success',
					source_component: 'vender/action_vender',
					before: null,
					after: {
						sale_id: sale.id,
						sale_num: sale.num,
					},
					diff: null,
				})
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
				commit('append_sale_log', {
					event_key: 'sale_submit_error',
					source_component: 'vender/action_vender',
					before: null,
					after: {
						message: err && err.message ? err.message : 'unknown_error',
					},
					diff: null,
				})
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
