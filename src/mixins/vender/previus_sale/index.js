// import set_employee_vender from '@/mixins/set_employee_vender'
// import vender from '@/mixins/vender'


import vender_set_total from '@/mixins/vender_set_total'
import limpiar_vender from '@/mixins/vender/limpiar_vender'
import limpiar_actualizandose_por from '@/mixins/vender/previus_sale/limpiar_actualizandose_por'
import price_types from '@/mixins/vender/price_types'
import default_payment_method from '@/mixins/vender/default_payment_method'
import price_ranges from '@/mixins/vender/price_ranges'
import axios from 'axios'
import payment_methods from '@/mixins/vender/guardar_venta/chequeos/payment_methods'
export default {
	mixins: [price_ranges, limpiar_vender, limpiar_actualizandose_por, price_types, vender_set_total, default_payment_method, payment_methods],
	// mixins: [vender, set_employee_vender, vender_set_total],
	data() {
		return {
			loading_index: false,
		}
	},
	computed: {
		fecha_entrega() {
			return this.$store.state.vender.fecha_entrega
		},
		valor_dolar() {
			return this.$store.state.vender.valor_dolar
		},
		seller_id() {
			return this.$store.state.vender.seller_id
		},
		total() {
			return this.$store.state.vender.total
		},
		sub_total() {
			return this.$store.state.vender.sub_total
		},
	},
	methods: {
		/*
			Abre una venta guardada para actualizarla.

			Ya no hay round-trip por la posicion de la venta: se llama derecho a la carga por id.
			El chequeo de `actualizandose_por` que habia aca estaba inerte —el endpoint nunca
			devolvio ese campo, el codigo que lo devolvia esta comentado en el controlador— y se
			deja inerte a proposito: hay valores viejos de actualizandose_por_id en produccion y
			activarlo empezaria a bloquear ventas que no esta editando nadie.

			El flag va ANTES de navegar y de forma sincrona: es lo que le dice a
			set_default_articles() que hay una venta en camino, y ese guard corre en el created()
			de Vender.vue, medio segundo antes de que la venta llegue.
		*/
		setPreviusSale(sale) {
			this.$store.commit('vender/previus_sales/set_abriendo_venta_previa', true)
			this.callGetSale(sale.id)
			console.log('redirigiendo a vender')
			this.$router.push({name: 'vender', params: {view: 'remito'}})
		},
		callGetSale(sale_id) {

			this.$store.commit('auth/setMessage', 'Cargando venta')
			this.$store.commit('auth/setLoading', true)
			this.$store.dispatch('vender/previus_sales/getSaleById', sale_id)
			.then(() => {

				setTimeout(() => {
					this.$store.commit('auth/setLoading', false)
					
					// Cuando cambia el total, seteo los metodos de pago desde el modal

					this.$store.commit('vender/setToCheck', this.previus_sale.to_check)
					this.$store.commit('vender/setChecked', this.previus_sale.checked)
					this.$store.commit('vender/setConfirmed', this.previus_sale.confirmed)

					this.set_datos_para_actualizar_en_vender(this.previus_sale)
					
					this.setPreviusReturnedArticles()
					this.setPreviusReturnedServices()

					// Precargar adjuntos de la venta
					if (this.previus_sale && this.previus_sale.id) {
						this.load_previus_sale_attachments(this.previus_sale.id)
					}
				}, 500)
			})
			.catch(err => {
				/*
					Antes esto era un console.log y nada mas: la venta no cargaba, VENDER quedaba
					vacio y el usuario no se enteraba de que habia fallado algo.
				*/
				console.log(err)
				this.$toast.error('No se pudo cargar la venta')
				this.$store.commit('auth/setLoading', false)

				/*
					🔴 limpiar_vender() y no solo apagar el flag: al llegar aca el created() de
					Vender.vue YA corrio y ya se salteo los cinco defaults del comercio -porque
					para el se estaba abriendo una venta guardada- y ya dejo marcada la venta como
					inicializada. Si solo se apagara el flag, el operador quedaria en una venta
					nueva sin lista de precios, sin metodo de pago, sin caja, sin articulos por
					defecto y sin siempre_omitir_en_cuenta_corriente, y salir del modulo y volver
					no lo arreglaria: la marca de inicializada ya esta puesta. El caso mas caro es
					justo el ultimo, porque el comercio terminaria registrando la venta en la
					cuenta corriente del cliente contra su propia configuracion.

					limpiar_vender() apaga el flag, apaga esa marca y vuelve a aplicar los
					defaults, que es exactamente el estado al que hay que volver cuando la venta
					que se pidio abrir no se pudo abrir.
				*/
				this.limpiar_vender()
			})
		},
		load_previus_sale_attachments(sale_id) {
			axios.get(process.env.VUE_APP_API_URL + '/api/sale-article-attachment/by-sale/' + sale_id)
				.then(res => {
					this.$store.commit('vender/setSaleAttachments', res.data.models)
				})
				.catch(err => {
					console.log('Error al cargar adjuntos:', err)
				})
		},
		set_discounts_store_with_pivot_percetage(previus_discounts) {

			previus_discounts.forEach(previus_discount => {

				let store_discount = this.$store.state.discount.models.find(discount => {
					return discount.id == previus_discount.id 
				})

				if (typeof store_discount == 'undefined') {
					previus_discount.percentage = previus_discount.pivot.percentage
					this.$store.commit('discount/add', previus_discount)
				} else {

					if (previus_discount.pivot.percentage != store_discount.percentage) {

						store_discount.updated_percentage = store_discount.percentage
						store_discount.percentage = previus_discount.pivot.percentage

					}
				}
			})
		},
		set_surchages_store_with_pivot_percetage(previus_surchages) {

			previus_surchages.forEach(previus_surchage => {

				let store_surchage = this.$store.state.surchage.models.find(surchage => {
					return surchage.id == previus_surchage.id 
				})

				if (typeof store_surchage == 'undefined') {
					previus_surchage.percentage = previus_surchage.pivot.percentage
					this.$store.commit('surchage/add', previus_surchage)
				} else {

					if (previus_surchage.pivot.percentage != store_surchage.percentage) {

						store_surchage.updated_percentage = store_surchage.percentage
						store_surchage.percentage = previus_surchage.pivot.percentage

					}

				}

			})

		},
		set_datos_para_actualizar_en_vender(model) {
			// Evita que la hidratación del store genere entradas falsas en sale_log.
			this.$store.commit('vender/set_sale_log_paused', true)
			console.log('set_datos_para_actualizar_en_vender model')
			console.log(model)
			let items = this.getItemsPreviusSale(model)
			this.$store.commit('vender/setItems', items)
			console.log('quedaron estos items:')
			console.log(items)



			this.$store.commit('vender/setDiscountsInServices', model.discounts_in_services)
			this.$store.commit('vender/setSurchagesInServices', model.surchages_in_services)

			if (model.discounts.length) {
				
				this.set_discounts_store_with_pivot_percetage(model.discounts)

				let discounts = model.discounts.map(discount => discount.id)

				this.$store.commit('vender/setDiscountsId', discounts)

			} else {
				this.$store.commit('vender/setDiscountsId', [])
			}
			if (model.surchages.length) {

				this.set_surchages_store_with_pivot_percetage(model.surchages)

				let surchages = model.surchages.map(discount => discount.id)

				this.$store.commit('vender/setSurchagesId', surchages)

			} else {
				this.$store.commit('vender/setSurchagesId', [])
			}
			if (model.client) {
				this.$store.commit('vender/setClient', model.client)
			} else {
				this.$store.commit('vender/setClient', null)
				this.$store.commit('vender/setPriceType', null)
			}

			if (model.price_type) {
				this.$store.commit('vender/setPriceType', model.price_type)
			} else if (model.client && model.client.price_type_id) {
				this.$store.commit('vender/setPriceType', model.client.price_type_id)
			} else {
				this.$store.commit('vender/setPriceType', null)
			}

			// this.setPriceType()
			
			this.$store.commit('vender/setSellerId', model.seller_id)
			
			if (model.current_acount_payment_method_id) {
				this.$store.commit('vender/setCurrentAcountPaymentMethodId', model.current_acount_payment_method_id)
			} else {
				this.$store.commit('vender/setCurrentAcountPaymentMethodId', 0)
			}

			/*
				La venta que se esta cargando trae su propio reparto (o ninguno): los montos de
				descuento/recargo que hayan quedado del reparto anterior no tienen nada que ver
				con ella. Se limpian antes de setear el reparto nuevo, no dentro de cada rama.
			*/
			this.$store.commit('vender/set_modal_payment_methods', [])

			if (model.current_acount_payment_methods
				&& model.current_acount_payment_methods.length == 1) {
				// Venta con un único método de pago: se setea el id y se limpia el reparto múltiple.
				this.$store.commit('vender/setCurrentAcountPaymentMethodId', model.current_acount_payment_methods[0].id)
				this.$store.commit('vender/setSelectedPaymentMethods', [])
			} else if (model.current_acount_payment_methods
				&& model.current_acount_payment_methods.length > 1) {
				// Venta con múltiples métodos de pago: no hay un único método, se precarga
				// el reparto (selected_payment_methods) reconstruyendo cada entrada desde el
				// pivot de current_acount_payment_methods, con las mismas llaves que espera
				// el backend (PaymentMethodHelper::attach_payment_methods) para poder
				// actualizar la venta sin re-ingresar los métodos.
				this.$store.commit('vender/setCurrentAcountPaymentMethodId', 0)
				// Array donde se arma el reparto de métodos de pago precargado.
				let selected_payment_methods = []
				model.current_acount_payment_methods.forEach(pm => {
					selected_payment_methods.push({
						current_acount_payment_method_id: pm.id,
						amount: pm.pivot.amount,
						amount_cotizado: pm.pivot.amount_cotizado,
						cotizacion: pm.pivot.cotizacion,
						moneda_id: pm.pivot.moneda_id,
						cuota_id: pm.pivot.cuota_id ? pm.pivot.cuota_id : 0,
						caja_id: pm.pivot.caja_id ? pm.pivot.caja_id : 0,
						discount_amount: pm.pivot.discount_amount,
					})
				})
				this.$store.commit('vender/setSelectedPaymentMethods', selected_payment_methods)
			} else {
				// Sin métodos de pago (o venta a cuenta corriente): se limpia el reparto
				// para que no herede el de una venta previa cargada anteriormente.
				this.$store.commit('vender/setSelectedPaymentMethods', [])
			}

			if (model.afip_information_id) {
				this.$store.commit('vender/setAfipInformationId', model.afip_information_id)
			}
			if (model.employee_id) {
				this.$store.commit('vender/setEmployeeId', model.employee_id)
			}
			if (model.address_id) {
				this.$store.commit('vender/setAddressId', model.address_id)
			} else {
				this.$store.commit('vender/setAddressId', 0)
			}
			if (model.sale_type_id) {
				this.$store.commit('vender/setSaleTypeId', model.sale_type_id)
			}
			if (model.numero_orden_de_compra) {
				this.$store.commit('vender/set_numero_orden_de_compra', model.numero_orden_de_compra)
			}
			if (model.fecha_entrega) {
				this.$store.commit('vender/set_fecha_entrega', model.fecha_entrega.split('T')[0])
			}
			this.$store.commit('vender/set_omitir_en_cuenta_corriente', model.omitir_en_cuenta_corriente)

			this.$store.commit('vender/setObservations', model.observations)
			this.$store.commit('vender/setObservationsOcultas', model.observations_ocultas)
			this.$store.commit('vender/set_omitir_en_cuenta_corriente', model.omitir_en_cuenta_corriente)
			this.$store.commit('vender/set_moneda_id', model.moneda_id)
			this.$store.commit('vender/set_valor_dolar', model.valor_dolar)
			this.$store.commit('vender/set_sale_status_id', model.sale_status_id)
			// Seteamos discount_stock desde la venta que se está actualizando
			this.$store.commit('vender/set_discount_stock', model.discount_stock)
			// Seteamos iva_aplicado desde la venta que se está actualizando
			this.$store.commit('vender/set_iva_aplicado', model.iva_aplicado)
			this.$store.commit('vender/set_send_mail', Number(model.send_mail))

			// Umbral opcional de alerta de cobro persistido en la venta (null = usar reglas globales).
			if (model.dias_alerta_venta_no_cobrada_personalizado !== undefined && model.dias_alerta_venta_no_cobrada_personalizado !== null) {
				this.$store.commit('vender/set_dias_alerta_venta_no_cobrada_personalizado', model.dias_alerta_venta_no_cobrada_personalizado)
			} else {
				this.$store.commit('vender/set_dias_alerta_venta_no_cobrada_personalizado', null)
			}

			// alert('valor_dolar: '+this.$store.state.vender.valor_dolar)

			// this.setItemsPrices(false, true)

			/*
				🔴 EL CANJE DE PUNTOS DE LA VENTA QUE SE ESTA EDITANDO. VA ANTES DEL setTotal()
				DE ABAJO, NO DESPUES.

				setTotal() sin argumento recalcula el total desde los items, y adentro de esa
				cuenta aplicar_canje_de_puntos() (mixins/vender_set_total.js) lee
				`vender.descuento_puntos` del store. Si el canje no esta commiteado todavia, ese
				metodo sale por su early return y EL TOTAL QUEDA BRUTO: abrir una venta con canje
				para editarla la subia sola --de $58.600 a $73.000-- sin que nadie tocara nada, y
				el comprobante ya impreso dejaba de coincidir con lo guardado.

				Se commitea siempre, tambien la rama sin canje: limpiar_vender() deja estos dos
				campos en null, pero cargar una venta sin canje despues de una con canje tiene que
				limpiarlos igual, y depender de que alguien mas lo haya hecho es como aparecio
				este bug.

				Number() y no la verdad del valor a secas: son decimal(20,2) de la base y Laravel
				los serializa como string, asi que un "0.00" seria truthy.
			*/
			if (Number(model.puntos_canjeados) > 0) {
				this.$store.commit('vender/set_puntos_canjeados', Number(model.puntos_canjeados))
				this.$store.commit('vender/set_descuento_puntos', Number(model.descuento_puntos))
			} else {
				this.$store.commit('vender/set_puntos_canjeados', null)
				this.$store.commit('vender/set_descuento_puntos', null)
			}

			// this.$store.commit('vender/setTotal')
			this.setTotal()
			// Log limpio solo para cambios posteriores a la carga de la venta a editar.
			this.$store.commit('vender/init_sale_log')
			this.$store.commit('vender/set_sale_log_paused', false)
		},
		setPreviusReturnedArticles() {
			let returned_articles = []
			this.previus_sale.articles.forEach(article => {
				if (article.pivot.returned_amount) {
					returned_articles.push(article)
				}
			})
			this.$store.commit('vender/previus_sales/setPreviusReturnedArticles', returned_articles)
		},
		setPreviusReturnedServices() {
			let returned_services = []
			this.previus_sale.services.forEach(service => {
				if (service.pivot.returned_amount) {
					returned_services.push(service)
				}
			})
			this.$store.commit('vender/previus_sales/setPreviusReturnedServices', returned_services)
		},
		async upload_pending_attachments(sale_id, pending_attachments) {
			const total = pending_attachments.length
			let uploaded = 0
			let errors = 0

			this.$toast.info(`Guardando ${total} archivo${total !== 1 ? 's' : ''} adjunto${total !== 1 ? 's' : ''}...`, { duration: 4000 })

			for (const att of pending_attachments) {
				const form = new FormData()
				form.append('sale_id', sale_id)
				form.append('article_id', att.article_id)
				form.append('file', att.file)
				form.append('observation', att.observation || '')
				try {
					await axios.post(
						process.env.VUE_APP_API_URL + '/api/sale-article-attachment',
						form,
						{ headers: { 'Content-Type': 'multipart/form-data' } }
					)
					uploaded++
					if (total > 1) {
						this.$toast.info(`Adjuntos: ${uploaded}/${total} subidos`, { duration: 2000 })
					}
				} catch {
					errors++
				}
			}

			if (errors === 0) {
				this.$toast.success(`${total} archivo${total !== 1 ? 's' : ''} adjunto${total !== 1 ? 's' : ''} guardado${total !== 1 ? 's' : ''}`)
			} else {
				this.$toast.warning(`Se guardaron ${uploaded} de ${total} archivos adjuntos. ${errors} no se pud${errors !== 1 ? 'ieron' : 'o'} subir.`)
			}
		},
		updateSale() {
			const sale_id = this.previus_sale ? this.previus_sale.id : null
			const pending = [...this.$store.state.vender.pending_attachments]

			this.$store.dispatch('vender/previus_sales/updateSale', {
				client_id: this.client ? this.client.id : null, 
				discounts: this.get_discounts(), 
				surchages: this.get_surchages(), 
				items: this.items, 
				save_nota_credito: this.save_nota_credito,
				returned_items: this.returned_items,
				nota_credito_description: this.nota_credito_description,
				discounts_in_services: this.discounts_in_services,
				surchages_in_services: this.surchages_in_services,
				current_acount_payment_method_id: this.current_acount_payment_method_id,
				afip_information_id: this.afip_information_id,
				sale_type_id: this.sale_type_id,
				address_id: this.address_id,
				employee_id: this.employee_id,
				to_check: this.to_check,
				checked: this.checked,
				confirmed: this.confirmed,
				observations: this.observations,
				numero_orden_de_compra: this.numero_orden_de_compra,
				omitir_en_cuenta_corriente: this.omitir_en_cuenta_corriente,
				selected_payment_methods: this.selected_payment_methods,
				seller_id: this.seller_id,
				sub_total: this.sub_total,
				total: this.total,
				fecha_entrega: this.fecha_entrega,
				valor_dolar: this.valor_dolar,
				observations_ocultas: this.$store.state.vender.observations_ocultas,
				aplicar_recargos_directo_a_items: this.$store.state.vender.aplicar_recargos_directo_a_items,
				sale_status_id: this.$store.state.vender.sale_status_id,
				// Enviamos el valor actual de discount_stock al actualizar la venta
				discount_stock: this.$store.state.vender.discount_stock,
				// Enviamos el valor actual de iva_aplicado al actualizar la venta
				iva_aplicado: this.$store.state.vender.iva_aplicado,
				// Array de descripciones del cálculo del precio final, serializado como JSON
				price_description: JSON.stringify(this.$store.state.vender.total_description),
				// Indica si se debe enviar correo al cliente
				send_mail: this.$store.state.vender.send_mail,
				dias_alerta_venta_no_cobrada_personalizado: this.$store.state.vender.dias_alerta_venta_no_cobrada_personalizado,
				/*
					Canje de puntos. Tienen que viajar SIEMPRE, con valor o en null: el motivo
					completo esta en el PUT de store/vender/previus_sales.js, que es donde alguien
					los va a querer sacar por "limpieza".
				*/
				puntos_canjeados: this.$store.state.vender.puntos_canjeados,
				descuento_puntos: this.$store.state.vender.descuento_puntos,
			})
			.then(res => {
				if (sale_id && pending.length) {
					this.upload_pending_attachments(sale_id, pending)
				}
				this.$toast.success('Venta actualizada')
				this.cancelPreviusSale()
			})
			.catch(err => {
				console.log(err)

				/* El backend rechaza con 409 y un motivo legible (venta facturada, cerrada o con varios metodos de pago) */
				if (
					err.response
					&& err.response.data
					&& err.response.data.message
				) {
					this.$toast.error(err.response.data.message, {
						duration: 6000
					})
				} else {
					this.$toast.error('Error al actualizar venta')
				}
			})
		},
		cancelPreviusSale() {

			this._limpiar_actualizandose_por()

			this.$store.commit('vender/clear_sale_log')

			this.limpiar_vender()
			// this.resetear_vender()

			this.setDefaultPaymentMethod(true)

			this.setPriceType()
			if (this.view != 'remito') {
				this.$router.push({name: 'vender', params: {view: 'remito'}})
			}
			this.setEmployeeVender()

			// this.limpiar_methodos_de_pago_seleccionados()

		},
		// limpiar_methodos_de_pago_seleccionados() {
		// 	return
		// 	this.$store.commit('vender/current_acount_payment_methods/set_metodos_de_pago_seleccionados', [])
		// 	this.$store.commit('vender/current_acount_payment_methods/set_total_a_repartir', 0)
		// 	this.$store.commit('vender/current_acount_payment_methods/set_total_repartido', 0)
		// },
		getItemsPreviusSale(model) {
			let items = []
			let item = {}
			let item_to_add 
			model.articles.forEach(article => {
				item.id = article.id
				item.bar_code = article.bar_code
				item.name = article.name
				// Se recarga el nombre personalizado por línea (guardado en pivot.name) para
				// que reaparezca en el input de ArticlesTable.vue al reabrir una venta o
				// presupuesto para editar. Si no hay pivot.name, queda en null.
				item.name_vender_personalizado = (article.pivot && article.pivot.name) ? article.pivot.name : null
				item.status = article.status
				item.article_variants = article.article_variants
				item.cost_in_dollars = article.cost_in_dollars
				item.pivot = article.pivot
				item.cost = Number(article.pivot.cost)
				item.price = Number(article.price)
				// getPriceVender usa final_price cuando corresponde el precio actual del articulo en vez del
				// guardado (extension lista_de_precios_por_rango_de_cantidad_vendida). Si no se copia aca queda
				// undefined y la linea se pinta en $0. Es la causa del bug de precios en 0 de San Cayetano.
				item.final_price = article.final_price
				item.final_price_blanco = article.final_price_blanco
				item.amount = Number(article.pivot.amount)
				item.article_variant_id = Number(article.pivot.article_variant_id)
				// Se conserva iva_id para recalcular precio segun iva_aplicado al editar.
				item.iva_id = article.iva_id
				// Se conserva la relacion iva para disponer del porcentaje en frontend.
				item.iva = article.iva
				item.discount = this.get_pivot_amount(article.pivot.discount ? article.pivot.discount : article.pivot.bonus)
				item.checked_amount = this.get_pivot_amount(article.pivot.checked_amount)
				item.returned_amount = this.get_pivot_amount(article.pivot.returned_amount)
				item.delivered_amount = this.get_pivot_amount(article.pivot.delivered_amount)
				item.price_type_personalizado_id = this.get_price_type_personalizado_id(article)
				item.addresses = article.addresses
				item.price_types = article.price_types
				item.category_id = article.category_id
				item.sub_category_id = article.sub_category_id
				item_to_add = {
					...item,
					is_article: true,
				}

				if (!item_to_add.price_type_personalizado_id) {
					item_to_add = this.check_price_type_ranges(item_to_add)
				}

				items.push(item_to_add)
			})
			if (model.combos) {
				item = {}
				model.combos.forEach(combo => {
					item.id = combo.id
					item.name = combo.name
					item.articles = combo.articles
					item.pivot = combo.pivot
					item.price = Number(combo.pivot.price)
					item.amount = Number(combo.pivot.amount)
					item_to_add = {
						...item,
						is_combo: true,
					}
					console.log('agregando comobo de previus_sale:')
					console.log(item_to_add)
					items.push(item_to_add)
				})
			}
			if (model.promocion_vinotecas) {
				item = {}
				model.promocion_vinotecas.forEach(promo => {
					item.id = promo.id
					item.name = promo.name
					item.articles = promo.articles
					item.pivot = promo.pivot
					// item.price = Number(promo.pivot.price)
					item.amount = Number(promo.pivot.amount)
					item_to_add = {
						...item,
						is_promocion_vinoteca: true,
					}
					items.push(item_to_add)
				})
			}
			if (model.services) {
				item = {}
				model.services.forEach(service => {
					item.id = service.id
					item.name = service.name
					item.pivot = service.pivot
					// item.price = Number(service.pivot.price)
					item.discount = Number(service.pivot.discount)
					item.amount = Number(service.pivot.amount)
					item.returned_amount = Number(service.pivot.returned_amount)
					item_to_add = {
						...item,
						is_service: true,
					}
					items.push(item_to_add)
				})
			}
			return items
		},
		get_pivot_amount(amount) {
			if (amount === null) {
				return ''
			}
			return Number(amount)
		},
		get_price_type_personalizado_id(item) {
			if (!item.pivot.price_type_personalizado_id) {
				return 0
			}
			return item.pivot.price_type_personalizado_id
		},
		checkear_metodos_de_pago_en_previus_sale() {
			// Venta a cuenta corriente: no exige método de pago de contado
			if (this.previus_sale.client_id && !this.previus_sale.omitir_en_cuenta_corriente) {
				return true
			}
			// Método de pago único seleccionado
			if (this.current_acount_payment_method_id) {
				return true
			}
			// Múltiples métodos de pago: el modal ya validó que el total quede repartido
			if (this.selected_payment_methods.length) {
				return true
			}
			// No hay ningún método de pago definido
			this.$toast.error('Seleccione un método de pago', { duration: 5000 })
			return false
		}
	}
}