// import set_employee_vender from '@/mixins/set_employee_vender'
// import vender from '@/mixins/vender'


import vender_set_total from '@/mixins/vender_set_total'
import limpiar_vender from '@/mixins/vender/limpiar_vender'
import limpiar_actualizandose_por from '@/mixins/vender/previus_sale/limpiar_actualizandose_por'
import price_types from '@/mixins/vender/price_types'
import default_payment_method from '@/mixins/vender/default_payment_method'
import price_ranges from '@/mixins/vender/price_ranges'
export default {
	mixins: [price_ranges, limpiar_vender, limpiar_actualizandose_por, price_types, vender_set_total, default_payment_method],
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
	},
	methods: {
		setPreviusSale(sale) {
			this.loading_index = true 
			this.$api.get('previus-next-index/sale/'+sale.id)
			.then(res => {
				this.loading_index = false
				
				if (
					res.data.actualizandose_por
					&& res.data.actualizandose_por.id != this.user.id
				) {
					this.$toast.error('Se esta actualizando por '+res.data.actualizandose_por.name)
				} else {

					this.$store.commit('vender/previus_sales/setIndex', res.data.index)
					this.callGetSale()
					console.log('redirigiendo a vender')
					this.$router.push({name: 'vender', params: {view: 'remito'}})
				}
			})
			.catch(err => {
				this.loading_index = false
				console.log(err)
			})
		},	
		callGetSale() {

			this.$store.commit('auth/setMessage', 'Cargando venta')
			this.$store.commit('auth/setLoading', true)
			this.$store.dispatch('vender/previus_sales/getSale')
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
				}, 500)
			})
			.catch(err => {
				this.$toast.error('Error')
				console.log(err)
				this.$store.commit('auth/setLoading', false)
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

			if (model.current_acount_payment_methods
				&& model.current_acount_payment_methods.length == 1) {
				this.$store.commit('vender/setCurrentAcountPaymentMethodId', model.current_acount_payment_methods[0].id)
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
			this.$store.commit('vender/setObservations', model.observations)
			this.$store.commit('vender/set_omitir_en_cuenta_corriente', model.omitir_en_cuenta_corriente)
			this.$store.commit('vender/set_moneda_id', model.moneda_id)
			this.$store.commit('vender/set_valor_dolar', model.valor_dolar)

			// alert('valor_dolar: '+this.$store.state.vender.valor_dolar)

			// this.setItemsPrices(false, true)

			// this.$store.commit('vender/setTotal')
			this.setTotal()
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
		updateSale() {
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
			})
			.then(res => {
				this.$toast.success('Venta actualizada')
				this.cancelPreviusSale()
			})
			.catch(err => {
				console.log(err)
				this.$toast.error('Error al actualizar venta')
			})
		},
		cancelPreviusSale() {

			this._limpiar_actualizandose_por()

			this.limpiar_vender()
			// this.resetear_vender()

			this.setDefaultPaymentMethod()

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
				item.status = article.status
				item.article_variants = article.article_variants
				item.cost_in_dollars = article.cost_in_dollars
				item.pivot = article.pivot
				item.cost = Number(article.pivot.cost)
				item.price = Number(article.price)
				item.amount = Number(article.pivot.amount)
				item.article_variant_id = Number(article.pivot.article_variant_id)
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
				model.combos.forEach(combo => {
					item.id = combo.id
					item.name = combo.name
					item.articles = combo.articles
					item.pivot = combo.pivot
					// item.price = Number(combo.pivot.price)
					item.amount = Number(combo.pivot.amount)
					item_to_add = {
						...item,
						is_combo: true,
					}
					items.push(item_to_add)
				})
			}
			if (model.promocion_vinotecas) {
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
			console.log('checkear_metodos_de_pago_en_previus_sale')
			if (!this.current_acount_payment_method_id && !this.previus_sale.client_id) {

				if (!this.guardarMetodosPago()) {
					return false 
				} 

			} 
			return true
		}
	}
}