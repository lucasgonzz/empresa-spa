import set_items_prices from '@/mixins/vender/set_items_prices'
export default {
	mixins: [set_items_prices],
	computed: {
		vender_items() {
			return this.$store.state.vender.items 
		},
		discounts_id() {
			return this.$store.state.vender.discounts_id 
		},
		surchages_id() {
			return this.$store.state.vender.surchages_id 
		},
		discounts_in_services: {
			get() {
				return this.$store.state.vender.discounts_in_services
			}, 
			set(value) {
				this.$store.commit('vender/setDiscountsInServices', value)
				this.setTotal()
			},
		},
		budget() {
			return this.$store.state.vender.budget 
		},
		surchages_in_services: {
			get() {
				return this.$store.state.vender.surchages_in_services
			}, 
			set(value) {
				this.$store.commit('vender/setSurchagesInServices', value)
				this.setTotal()
			},
		},
		aplicar_recargos_directo_a_items: {
			get() {
				return this.$store.state.vender.aplicar_recargos_directo_a_items
			}, 
			set(value) {
				this.$store.commit('vender/set_aplicar_recargos_directo_a_items', value)
				this.setTotal()
			},
		},
		discounts_store() {
			return this.$store.state.discount.models 
		},
		surchages_store() {
			return this.$store.state.surchage.models 
		},
		from_pivot() {
			return this.index_previus_sales != 0 || this.budget
		},
		cuota_descuento() {
			return this.$store.state.vender.cuota_descuento 
		},
		cuota_recargo() {
			return this.$store.state.vender.cuota_recargo 
		},
		cantidad_cuotas() {
			return this.$store.state.vender.cantidad_cuotas 
		},
		monto_credito() {
			return this.$store.state.vender.monto_credito 
		},
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods 
		},
		descuento() {
			return this.$store.state.vender.descuento 
		},
		// moneda_id() {
		// 	return this.$store.state.vender.moneda_id 
		// },
		// valor_dolar() {
		// 	return this.$store.state.vender.valor_dolar
		// }
		modal_payment_metohds() {
			return this.$store.state.vender.modal_payment_methods
		},
	},
	data() {
		return {
			total_articles: 0,
			total_services: 0,
			total_combos: 0,
			total_promocion_vinoteca: 0,
			des: '',
		}
	},
	methods: {
		setTotal(total = null) {

			let sub_total = 0  

			this.des = []

			if (!total) {

				total = 0
				
				this.total_articles = 0
				this.total_services = 0
				this.total_combos = 0
				this.total_promocion_vinoteca = 0
				
				let new_items = []

				this.setItemsPrices(false, this.from_pivot)
				
				// total = this.check_moneda(total)


				// en getTotalItem aplico descuentos individuales y y multiplico por la cantidad
				this.vender_items.forEach(item => {
					if (item.is_service) {

						this.total_services += this.getTotalItem(item, false)

					} else if (item.is_article) {

						// console.log(this.getTotalItem(item, false))

						this.total_articles += this.getTotalItem(item, false)

					} else if (item.is_combo) {

						this.total_combos += this.getTotalItem(item, false)

					} else if (item.is_promocion_vinoteca) {

						this.total_promocion_vinoteca += this.getTotalItem(item, false)

					}
					// total += this.getTotalItem(item, false)
					new_items.push(item)
				})

				this.chequear_descuentos_por_metodo_de_pago_y_agregar_info_a_descripcion()

				sub_total = this.total_articles + this.total_services + this.total_combos + this.total_promocion_vinoteca

				this.des.push('SubTotal: '+this.price(sub_total)+' (sumatoria de todos los items con descuentos individuales y descuentos/recargos de metodos de pago aplicados)')

				this.aplicar_descuento()

				this.aplicar_discounts()

				this.aplicar_surchages()

				this.$store.commit('vender/setItems', new_items)
				
				// sub_total = this.total_articles + this.total_services + this.total_combos + this.total_promocion_vinoteca
				total = this.total_articles + this.total_services + this.total_combos + this.total_promocion_vinoteca
				
				this.des.push('Total venta: '+this.price(total))

				total = this.aplicar_payment_method_discounts_a_total_repartido_del_modal(total)

				// this.set_monto_credito(total)

				// total = this.aplicar_cuotas(total)
				
			}
			this.$store.commit('vender/setSubTotal', sub_total)
			this.$store.commit('vender/setTotal', total)

			this.des.push('TOTAL FINAL')
			this.des.push('Total venta: '+this.price(total))

			console.log('setTotal: '+total)

			this.$store.commit('vender/set_total_description', this.des)
			
			// console.log('se puso el sub_total en '+sub_total)
			// console.log('se puso el total en '+total)
		},
		// check_moneda(total) {
		// 	if (this.moneda_id == 2) {
		// 		total = Number(total) / Number(this.valor_dolar) 
		// 	}
		// 	return total
		// },

		chequear_descuentos_por_metodo_de_pago_y_agregar_info_a_descripcion() {
			let descuentos = this.$store.state.current_acount_payment_method_discount.models 

			let metodo_seleccionado_id = this.$store.state.vender.current_acount_payment_method_id
			let metodos_seleccionados = this.$store.state.vender.selected_payment_methods

			if (descuentos.length) {
				console.log('hay descuentos de payment_methods')
				if (metodo_seleccionado_id) {
					console.log('Hay metodo_seleccionado_id: '+metodo_seleccionado_id)

					let descuento = descuentos.find(des => des.current_acount_payment_method_id == metodo_seleccionado_id)
					console.log('Descuento econtroado:')
					console.log(descuento)

					if (typeof descuento != 'undefined') {
						let percentage = Number(descuento.discount_percentage)
						if (percentage > 0) {
							this.des.push('Se aplico descuento del '+percentage+'% del metodo de pago '+descuento.current_acount_payment_method.name)
						} else {
							this.des.push('Se aplico recargo del '+percentage*-1+'% del metodo de pago '+descuento.current_acount_payment_method.name)
						}
					}
				}
			}
		},

		aplicar_payment_method_discounts_a_total_repartido_del_modal(total) {

			/* 
				En modal_payment_metohds tengo guardado los metodos de pago elegidos en la primer instancia de repartir el total,
				tienen seteada la propiedad discount_amount, calculada en vender/modals/payment-methods/buttons.calcular()
	
			*/
			if (this.current_acount_payment_method_discounts.length) {

				let descuento = 0

				if (this.modal_payment_metohds.length) {
					
					this.modal_payment_metohds.forEach(modal_payment_method => {
						
						if (modal_payment_method.discount_amount) {
							
							let descuento = Number(modal_payment_method.discount_amount)
							console.log('descontando '+descuento+' de '+modal_payment_method.name)

							total -= descuento
						}
						
						if (modal_payment_method.surchage_amount) {
							
							let recargo = Number(modal_payment_method.surchage_amount)
							console.log('recargo '+recargo+' de '+modal_payment_method.name)

							total += recargo
						}

					})
				}

			}

			return total
		},

		aplicar_cuotas(total) { 


			if (this.monto_credito) {

				this.des.push('APLICANDO RECARGOS/DESCUENTOS POR CUOTAS')

				/* 
					monto_credito_real: 
						Hace referencia al monto de credito con
							el descuento
							o el recargo
						Aplicados

					cuota_descuento se calcula en vender/remito/hader2/cuotas cuando selecciono la cantidad de cuotas
					cuota_recargo se calcula en vender/remito/hader2/cuotas cuando selecciono la cantidad de cuotas
				*/

				let monto_credito_real = null

				if (this.cuota_descuento) {

					this.des.push('Aplicando descuento de '+this.cuota_descuento+'% por pago en '+this.cantidad_cuotas+' cuotas')

					let monto_descuento = this.monto_credito * Number(this.cuota_descuento) / 100
					this.des.push('Monto descuento: '+this.price(monto_descuento))

					monto_credito_real = this.monto_credito - monto_descuento

					this.$store.commit('vender/set_cuota_monto_descuento', monto_descuento)

					total -= monto_descuento
					this.des.push('Total con descuento: '+this.price(total))
				
				} else if (this.cuota_recargo) {

					this.des.push('Aplicando recargo de '+this.cuota_recargo+'% por pago en '+this.cantidad_cuotas+' cuotas')

					let monto_recargo = this.monto_credito * Number(this.cuota_recargo) / 100
					this.des.push('Monto recargo: '+this.price(monto_recargo))

					monto_credito_real = this.monto_credito + monto_recargo
				
					this.$store.commit('vender/set_cuota_monto_recargo', monto_recargo)

					total += monto_recargo
					this.des.push('Total con recargo: '+this.price(total))
				}

				this.$store.commit('vender/set_monto_credito_real', monto_credito_real)
			}

			return total
		},
		set_monto_credito(total) {

			let monto_credito = 0

			if (this.vender_current_acount_payment_method_id) {

				if (this.es_credito(this.vender_current_acount_payment_method_id)) {

					monto_credito = total  
				}

			} else if (this.selected_payment_methods.length) {

				this.selected_payment_methods.forEach(payment_method => {

					if (this.es_credito(payment_method.id)) {
						monto_credito += payment_method.amount
					}
				})

			} 


			this.$store.commit('vender/set_monto_credito', monto_credito)

		},
		es_credito(payment_method_id) {

			console.log('es_credito para id '+payment_method_id)
			
			let payment_method = this.$store.state.current_acount_payment_method.models.find(p => p.id == payment_method_id)
			
			console.log(payment_method)
			if (
				typeof payment_method != 'undefined'
				&& payment_method.type 
				&& payment_method.type.slug == 'tarjeta_de_credito'
			) {
				return true
			}
			return false

		},
		aplicar_descuento() {
			if (this.descuento) {

				this.des.push('Aplicando descuento del '+this.descuento+'% solo al total de los articulos de '+this.price(this.total_articles))
				this.total_articles -= this.total_articles * Number(this.descuento) / 100 
				this.des.push('Total articulos queda en '+this.price(this.total_articles))

				
				// if (this.discounts_in_services) {
				// 	this.total_services -= this.total_services * Number(discount.percentage) / 100 
				// }
			}
		},
		aplicar_discounts() {
			if (this.discounts_id.length) {

				this.des.push('APLICANDO DESCUENTOS DE VENTA')

				let discounts_store_ = this.discounts_store 

				let sale_discounts = []

				this.discounts_id.forEach(discount_id => {

					let discount_to_add = discounts_store_.find(_discount => _discount.id == discount_id)

					sale_discounts.push(discount_to_add)

				}) 

				sale_discounts.forEach(discount => {

					this.des.push('Aplicando descuento del '+discount.percentage+'%')

					let monto_descuento = this.total_articles * Number(discount.percentage) / 100 
					this.total_articles -= monto_descuento
					if (this.total_articles > 0) {
						this.des.push('Descuento para articulos: '+this.price(monto_descuento))
						this.des.push('Total articulos queda en '+this.price(this.total_articles))
					}

					this.total_combos -= this.total_combos * Number(discount.percentage) / 100 
					if (this.total_combos > 0) {
						this.des.push('Total combos queda en '+this.price(this.total_combos))
					}

					this.total_promocion_vinoteca -= this.total_promocion_vinoteca * Number(discount.percentage) / 100 
					if (this.total_promocion_vinoteca > 0) {
						this.des.push('Total promociones queda en '+this.price(this.total_promocion_vinoteca))
					}

					if (this.discounts_in_services) {
						monto_descuento = this.total_services * Number(discount.percentage) / 100 
						this.total_services -= monto_descuento

						if (this.total_services > 0) {
							this.des.push('Descuento para servicios: '+this.price(monto_descuento))
							this.des.push('Total servicios queda en '+this.price(this.total_services))
						}
					}
				})
			}

		},
		aplicar_surchages() {
			if (
				this.surcahges_models_vender.length
				&& !this.aplicar_recargos_directo_a_items
			) {

				this.des.push('APLICANDO RECARGOS DE VENTA')

				this.surcahges_models_vender.forEach(_surchage => {
					
					this.des.push('Aplicando recargo del '+_surchage.percentage+'%')
					
					let monto_recargo = this.total_articles * Number(_surchage.percentage) / 100 
					this.total_articles += monto_recargo
					if (this.total_articles > 0) {
						this.des.push('Recargo para articulos: '+this.price(monto_recargo))
						this.des.push('Total articulos queda en '+this.price(this.total_articles))
					}

					this.total_combos += this.total_combos * Number(_surchage.percentage) / 100 
					if (this.total_combos > 0) {
						this.des.push('Total combos queda en '+this.price(this.total_combos))
					}

					this.total_promocion_vinoteca += this.total_promocion_vinoteca * Number(_surchage.percentage) / 100 
					if (this.total_promocion_vinoteca > 0) {
						this.des.push('Total promociones queda en '+this.price(this.total_promocion_vinoteca))
					}

					if (this.surchages_in_services) {
						monto_recargo = this.total_services * Number(_surchage.percentage) / 100 
						this.total_services += monto_recargo
						if (this.total_services > 0) {
							this.des.push('Recargo para servicios: '+this.price(monto_recargo))
							this.des.push('Total servicios queda en '+this.price(this.total_services))
						}
					}
				})
			}
		}
	}
}