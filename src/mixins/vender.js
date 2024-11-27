import clients from '@/mixins/clients'
import sale_ticket from '@/mixins/sale_ticket'
import afip_ticket from '@/mixins/afip_ticket'
import select_payment_methods from '@/mixins/vender/select_payment_methods'
import start_methods from '@/mixins/start_methods'
import vender_set_total from '@/mixins/vender_set_total'
import sonido_error from '@/mixins/sonido_error' 
export default {
	mixins: [sonido_error, vender_set_total, clients, sale_ticket, afip_ticket, select_payment_methods, start_methods],
	computed: {
		discounts() {
			return this.$store.state.discount.models
		},
		surchages() {
			return this.$store.state.surchage.models
		},
		total() {
			return this.$store.state.vender.total
		},
		items() {
			return this.$store.state.vender.items
		},
		combos() {
			return this.$store.state.combo.models
		},
		articles() {
			return this.$store.state.article.models
		},
		loading_articles() {
			return this.$store.state.article.loading
		},
		article() {
			return this.$store.state.vender.article
		},
		vendiendo() {
			return this.$store.state.vender.vendiendo
		},
		client() {
			return this.$store.state.vender.client
		},
		services_col_header_lg() {
			let col = 3
			return col 
		},
        maked_sale() {
            return this.$store.state.vender.sale
        },
		save_current_acount: {
			get() {
				return this.$store.state.vender.save_current_acount
			},
			set(value) {
				this.$store.commit('vender/setSaveCurrentAcount', value)
			}
		},
		make_current_acount_pago: {
			get() {
				return this.$store.state.vender.make_current_acount_pago
			},
			set(value) {
				this.$store.commit('vender/setMakeCurrentAcountPago', value)
			}
		},
		returned_articles() {
			return this.$store.state.vender.returned_articles
		},
		index_previus_sales() {
			return this.$store.state.vender.previus_sales.index
		},
		price_type_vender() {
			return this.$store.state.vender.price_type
		},
		budget() {
			return this.$store.state.vender.budget
		},
		numero_orden_de_compra() {
			return this.$store.state.vender.numero_orden_de_compra
		},
		omitir_en_cuenta_corriente() {
			return this.$store.state.vender.omitir_en_cuenta_corriente
		},
		discounts_in_services: {
			get() {
				return this.$store.state.vender.discounts_in_services
			}, 
			set(value) {
				this.$store.commit('vender/setDiscountsInServices', value)
				this.setTotal()
				// this.$store.commit('vender/setTotal')
			},
		},
		surchages_in_services: {
			get() {
				return this.$store.state.vender.surchages_in_services
			}, 
			set(value) {
				this.$store.commit('vender/setSurchagesInServices', value)
				this.setTotal()
				// this.$store.commit('vender/setTotal')
			},
		},
		// current_acount_payment_method_id: {
		// 	get() {
		// 		return this.$store.state.vender.current_acount_payment_method_id
		// 	}, 
		// 	set(value) {
		// 		this.$store.commit('vender/setCurrentAcountPaymentMethodId', value)
		// 	},
		// },
		afip_information_id: {
			get() {
				return this.$store.state.vender.afip_information_id
			}, 
			set(value) {
				this.$store.commit('vender/setAfipInformationId', value)
			},
		},
		afip_tipo_comprobante_id: {
			get() {
				return this.$store.state.vender.afip_tipo_comprobante_id
			}, 
			set(value) {
				this.$store.commit('vender/set_afip_tipo_comprobante_id', value)
			},
		},
		employee_id: {
			get() {
				return this.$store.state.vender.employee_id
			}, 
			set(value) {
				this.$store.commit('vender/setEmployeeId', value)
			},
		},
		address_id: {
			get() {
				return this.$store.state.vender.address_id
			}, 
			set(value) {
				this.$store.commit('vender/setAddressId', value)
				console.log('se seteo la cookie')
				this.$cookies.set('address_id', value, '3y')
			},
		},
		sale_type_id: {
			get() {
				return this.$store.state.vender.sale_type_id
			}, 
			set(value) {
				this.$store.commit('vender/setSaleTypeId', value)
			},
		},
		articulos_con_depositos() {
			return this.items.filter(item => {
				if (item.is_article) {
					if (item.addresses.length) {
						return true 
					}  
					if (item.article_variants.length) {

						let has_addresses = false
						item.article_variants.forEach(variant => {

							if (variant.addresses.length) {
								has_addresses = true 
							}
						})

						return has_addresses
					}
				}
				return false
			})
		},
		guardar_como_presupuesto() {
			return this.$store.state.vender.guardar_como_presupuesto
		},
	},
	data() {
		return {
			intentos_volver_a_llamar_default_articles: 0,
			intentos_volver_a_llamar_default_payment_method: 0,
			intentos_volver_a_llamar_set_omitir_en_cuenta_corriente: 0,
			interval: null,
		}
	},
	methods: {

		col_header_lg(es_para_name_input = false) {
			
			let col = 4

			if (!this.user.ask_amount_in_vender) {
				col += 2
			}

			if (this.hasExtencion('no_usar_codigos_de_barra')) {
				col += 3
			}

			// if (es_para_name_input) {
			// 	col += 1
			// }
			return col 
		},

		setPriceType() {
            if (this.price_types_with_position.length) {
                let price_type_para_vender 
                
                if (this.client && this.client.price_type) {
                    price_type_para_vender = this.client.price_type
                } else {
                    let last_position = 0
                    this.price_types_with_position.forEach(price_type => {
                        if (price_type.position > last_position) {
                            price_type_para_vender = price_type
                            last_position = price_type.position
                        }
                    })
                }
                console.log('price_type para vender:')
                console.log(price_type_para_vender)
                this.$store.commit('vender/setPriceType', price_type_para_vender)
            }

		},

		// Defautl Articles
		setDefaultArticles() {
			console.log('setDefaultArticles')
			if (this.index_previus_sales > 0) {
				return
			}
			if (this.authenticated && this.hasExtencion('articles_default_in_vender')) {
				let articles = this.$store.state.article.models

				if (articles.length && !this.loading_articles) {

					let articles_por_defecto = this.$store.state.article.models.filter(article => {
						return article.default_in_vender
					})
					console.log('articles_por_defecto por defecto:')
					console.log(articles_por_defecto)

					articles_por_defecto.forEach(article => {
						let article_to_add = {
							...article,
							amount: '',
							price_vender: '',
						}
						if (!this.ya_esta_en_los_articulos_para_vender(article_to_add)) {
							console.log('agregando por defecto a vender: '+article_to_add.name)
							this.$store.commit('vender/setArticle', article_to_add)
							this.addArticleToSale(false)
						} else {
							console.log('el articulos '+article.name+' ya estaba en items:')
							console.log(this.items)
						}
					})
				} else {
					console.log('no seteo articulos por defecto')
					this.volver_a_llamar_default_articles()
				}
			} else if (!this.authenticated) {
				console.log('No seteo articulos por defecto por unauthenticated')
				this.volver_a_llamar_default_articles()
			} else if (this.hasExtencion('articles_default_in_vender')) {
				this.volver_a_llamar_default_articles()
			}
		},
		ya_esta_en_los_articulos_para_vender(article) {
			let index = this.items.findIndex(item => {
				return item.id == article.id 
			})
			return index != -1
		},
		volver_a_llamar_default_articles() {
			if (this.intentos_volver_a_llamar_default_articles < 5) {
				setTimeout(() => {
					this.intentos_volver_a_llamar_default_articles++
					this.setDefaultArticles()
				}, 2000)
			}
		},

		setItemsPrices(only_the_last = false, from_pivot = false) {
			if (only_the_last) {
				console.log('setenado precio el ultimo')
				let last_item = this.items[0] 
				last_item.price_vender = this.getPriceVender(last_item) 
			} else {
				console.log('seteando todos los precios. from_pivot: '+from_pivot)
				console.log(this.items)
				this.items.forEach(item => {
					// if (!item.default_in_vender) {
						item.price_vender = this.getPriceVender(item, from_pivot) 
					// }
				})
			}
		},
		callVender() {
			if (!this.is_provider) {
				this.vender()
			}
		},
		get_discounts() {
			let discounts = []

			this.discounts_id.forEach(discount_id => {
				let store_discount = this.$store.state.discount.models.find(discount => {
					return discount.id == discount_id
				})
				if (typeof store_discount != 'undefined') {
					discounts.push(store_discount)
				}
			})

			return discounts
		},
		get_surchages() {
			let surchages = []

			this.surchages_id.forEach(surchage_id => {
				let store_surchage = this.$store.state.surchage.models.find(surchage => {
					return surchage.id == surchage_id
				})
				if (typeof store_surchage != 'undefined') {
					surchages.push(store_surchage)
				}
			})

			return surchages
		},
		vender() {
			console.log('se llamo a vender')
			if (this.check_vender()) {
				console.log('paso check')
				if (!this.download_articles || (this.is_mobile && !this.downloadOnMobile('article') && !this.articles.length)) {

				} else {
					if (!this.to_check && !this.checked) {
						this.$store.commit('article/removeStock', this.items)
					}
				}
				this.$store.dispatch('vender/vender', {
					selected_address: this.selected_address,
					discounts: this.get_discounts(),
					surchages: this.get_surchages(),
				})
				.then(() => {
					if (this.view == 'remito') {
						let bar_code_input = document.getElementById('article-bar-code')
						if (bar_code_input) {
							bar_code_input.focus()
						}
					}
					
					this.limpiar_vender()

					this.setDefaultPaymentMethod()

					this.set_omitir_en_cuenta_corriente()

					if (this.maked_sale.client_id && this.maked_sale.save_current_acount) {
						this.loadModel('client', this.maked_sale.client_id)
					}

					this.setDefaultArticles()

					this.sendAfipTicket()

					if (this.view != 'remito') {
						this.$router.push({name: 'vender', params: {view: 'remito'}})
					}
				})
				.catch(err => {
					this.sonido_error()
					this.$toast.error('Error al guardar venta', {
						duration: 10000
					})
					this.$toast.error(err)
				})
			}
		},
		limpiar_vender() {
			this.$store.commit('vender/previus_sales/setIndex', 0)
			this.$store.commit('vender/previus_sales/setPreviusSale', {})
			this.$store.commit('vender/setToCheck', 0)
			this.$store.commit('vender/setChecked', 0)
			this.$store.commit('vender/setConfirmed', 0)
			this.$store.commit('vender/setItems', [])

			this.$store.commit('vender/set_descuento', null)
			this.$store.commit('vender/setDiscountsId', [])
			this.$store.commit('vender/setSurchagesId', [])

			this.$store.commit('vender/setClient', null)
			this.$store.commit('vender/setReturnedItems', [])
			this.$store.commit('vender/setSaveNotaCredito', 0)
			this.$store.commit('vender/setNotaCreditoDescription', '')
			// this.$store.commit('vender/setTotal')
			this.$store.commit('vender/setObservations', '')
			this.$store.commit('vender/setGuardarComoPresupuesto', 0)
			this.$store.commit('vender/setBudget', null)
			this.$store.commit('vender/setPriceType', null)
			this.$store.commit('vender/set_numero_orden_de_compra', '')
			this.$store.commit('vender/set_omitir_en_cuenta_corriente', 0)
			
			this.$store.commit('vender/setSelectedPaymentMethods', [])

			this.$store.commit('vender/current_acount_payment_methods/set_payment_methods', [])

			this.$store.commit('vender/setDiscountsInServices', 0)
			this.$store.commit('vender/setSurchagesInServices', 0)

			this.$store.commit('vender/set_omitir_en_cuenta_corriente', 0)
			
			this.$store.commit('vender/setSellerId', 0)

			// this.$store.commit('vender/set_caja_id', 0)
			
			// this.$store.commit('vender/set_afip_tipo_comprobante_id', 0)

			this.setTotal()

			this.checkAddressCookie()

			this.limpiar_descuentos()

			this.limpiar_recargos()

			this.limpiar_cuotas()

			this.setPriceType()
		},
		limpiar_cuotas() {
			this.$store.commit('vender/set_cuota_id', 0)
			this.$store.commit('vender/set_cantidad_cuotas', null)
			this.$store.commit('vender/set_cuota_descuento', null)
			this.$store.commit('vender/set_cuota_recargo', null)
		},
		limpiar_descuentos() {

			this.discounts.forEach(discount => {
				if (discount.deleted_at) {
					console.log('sacando el descuento eliminado '+discount.name)
					this.$store.commit('discount/setDelete', discount)
					this.$store.commit('discount/delete')
				} else if (discount.updated_percentage) {
					console.log('se puso el porcentaje actualizado del descuento '+discount.name)
					discount.percentage = discount.updated_percentage
					discount.updated_percentage = null
				}
			})

		},
		limpiar_recargos() {

			this.surchages.forEach(surchage => {
				if (surchage.deleted_at) {
					console.log('sacando el recargo eliminado '+surchage.name)
					this.$store.commit('surchage/setDelete', surchage)
					this.$store.commit('surchage/delete')
				} else if (surchage.updated_percentage) {
					console.log('se puso el porcentaje actualizado del recargo '+surchage.name)
					surchage.percentage = surchage.updated_percentage
					surchage.updated_percentage = null
				}
			})

		},
		set_omitir_en_cuenta_corriente() {
			if (this.authenticated) {
				if (this.owner.siempre_omitir_en_cuenta_corriente) {
					this.$store.commit('vender/set_omitir_en_cuenta_corriente', 1)
				} 
			} else {
				this.volver_a_llamar_set_omitir_en_cuenta_corriente()
			}

		},
		volver_a_llamar_set_omitir_en_cuenta_corriente() {
			if (this.intentos_volver_a_llamar_set_omitir_en_cuenta_corriente < 5) {
				setTimeout(() => {
					this.intentos_volver_a_llamar_set_omitir_en_cuenta_corriente++
					this.set_omitir_en_cuenta_corriente()
				}, 2000)
			}
		},


		setDefaultPaymentMethod() {
			if (this.authenticated) {
				if (this.owner.default_current_acount_payment_method_id) {
					this.$store.commit('vender/setCurrentAcountPaymentMethodId', this.owner.default_current_acount_payment_method_id)
				} else {
					if (!this.current_acount_payment_method_id) {
						this.current_acount_payment_method_id = 3;
					}
				}
			} else {
				this.volver_a_llamar_default_payment_method()
			}
		},
		volver_a_llamar_default_payment_method() {
			if (this.intentos_volver_a_llamar_default_payment_method < 5) {
				setTimeout(() => {
					this.intentos_volver_a_llamar_default_payment_method++
					this.setDefaultPaymentMethod()
				}, 2000)
			}
		},
		check_vender() {
			console.log('check antes de vender')
			console.log(this.hasExtencion('articles_default_in_vender'))

			if (!this.check_article_variants()) {
				return false
			}

			if (!this.check_cajas()) {
				return false
			}

			if (!this.current_acount_payment_method_id 
				&& (!this.client || this.omitir_en_cuenta_corriente)) {

				if (!this.check_sobrante_a_repartir()) {
				// if (!this.guardarMetodosPago()) {
					return false 
				} 

			} 

			console.log('-> Ya chequeo los metodos de pago')

			if (this.check_guardar_ventas_con_cliente()) {
				this.$toast.error('Asigne un cliente para esta venta')
				return false
			}

			if (this.hasExtencion('articles_default_in_vender')) {
				this.checkDefaultArticles()
			}
			if (!this.items.length) {
				this.$toast.error('Ingrese al menos un articulo o servicio')
				return false 
			}
			if (this.$store.state.sale_type.models.length && this.sale_type_id == 0) {
				this.$toast.error('Indique el tipo de venta')
				return false 
			} 
			// if (this.afip_information_id && this.total >= 61500 && !this.client) {
			// 	this.$toast.error('El total de la venta supera los $61.500, debera indicar un cliente que posea CUIL o CUIT para poder realizar la factura')
			// 	return false
			// }
			// if (this.afip_information_id && this.client && this.client.iva_condition_id && this.client.iva_condition_id == 1 && !this.client.cuit) {
			// 	this.$toast.error('Para emitir comprobante tipo A, debe indicar el CUIT del cliente')
			// 	return false
			// }
			if (this.address_id == 0 && this.articulos_con_depositos.length) {
				this.$toast.error('Hay '+this.articulos_con_depositos.length+' articulos con stock en diferentes depositos')
				this.$toast.error('Indique la DIRECCION de la venta para restar el stock en los depositos que correspondan')
				return false
			}
			if (this.afip_information_id) {

				// Esto es para Feito, si es efectivo, no pide que se indique el tipo de comprobante
				if (this.check_metodos_de_pago_para_facturar()) {
					return true
				}
				
				if (!this.afip_tipo_comprobante_id) {

					this.$toast.error('Indique el Tipo de Comprobante a Facturar')
					return false
				}

				if (this.afip_tipo_comprobante_id == 1 
					|| this.afip_tipo_comprobante_id == 4
					|| this.afip_tipo_comprobante_id == 5) {

					if (!this.client) {

						this.$toast.error('Para Factura A, debe indicar un Cliente')
						return false
					}

					if (!this.client.cuit) {

						this.$toast.error('Para Factura A, el Cliente debe tener asignado un CUIT')
						return false
					}
				}

				if (this.total >= 344488) {
						

					if (!this.client) {

						this.$toast.error('Para montos mayores a $344.488, debe indicar el receptor')
						return false
					}			

					if (!this.client.dni && !this.client.cuit) {

						this.$toast.error('Para montos mayores a $344.488, el cliente debe tener asignado un CUIT o DNI')
						return false
					}					
				}
			
			}
			return true 
		},
		check_guardar_ventas_con_cliente() {
			if (this.hasExtencion('check_guardar_ventas_con_cliente')) {

				if (!this.client) {

					if (!this.user.puede_guardar_ventas_sin_cliente
						&& !this.is_admin) {

						return true 
					}
				}
			}
			return false
		},
		check_metodos_de_pago_para_facturar() {
			let metodos_de_pago_para_facturar = this.$store.state.afip_selected_payment_method.models 

			let metodo_de_pago_se_factura = false

			if (this.current_acount_payment_method_id && metodos_de_pago_para_facturar.length) {

				metodos_de_pago_para_facturar.forEach(metodo_de_pago => {
					if (metodo_de_pago.id == this.current_acount_payment_method_id) {
						metodo_de_pago_se_factura = true
					}
				})
			}

			return metodo_de_pago_se_factura
		},	
		check_cajas() {
			if (this.cajas.length) {

				if (!this.cajas_abiertas.length) {
					this.$toast.error('Habra al menos una CAJA para poder indicarla en esta venta')
					return false 
				}

				if (
					!this.$store.state.vender.caja_id
					&& this.selected_payment_methods.length == 0
					&& (
						!this.$store.state.vender.client
						|| this.$store.state.vender.omitir_en_cuenta_corriente
					)
				) {

					console.log('entro con client:')
					console.log(this.$store.state.vender.client)

					console.log('entro con omitir_en_cuenta_corriente:')
					console.log(this.$store.state.vender.omitir_en_cuenta_corriente)

					this.$toast.error('Indique una CAJA para esta venta')
					return false 
				}
			}
			return true 
		},	
		check_article_variants() {
			let ok = true
			this.items.forEach(item => {
				if (item.is_article && item.article_variants.length && item.article_variant_id == 0) {
					ok = false 
					this.$toast.error('Indique la variante de '+item.name)
				}
			})
			return ok
		},
		checkDefaultArticles() {
			console.log('checkDefaultArticles')
			let default_articles = this.items.filter(item => {
				console.log('checkeando '+item.name)
				console.log(item.is_article)
				console.log(item.default_in_vender)
				console.log(item.price_vender)
				return item.is_article 
						&& item.default_in_vender 
						&& (item.price_vender == '' && typeof item.varios_precios == 'undefined')
			})
			default_articles.forEach(article => {
				console.log('quitando article_default con price null '+article.name)
				this.$store.commit('vender/removeItem', article)
			})
		},
		setVenderArticle(article, from_mobile = false) {
			// this.articles.slice(0,33).forEach(art => {
			// 	this.addArticleForSale(art)
			// })
			// if (typeof article == 'undefined' && this.article.bar_code != '') {
			// 	article = this.articles.find(article => {
			// 		return article.bar_code == this.getBarCode(this.article.bar_code)
			// 	})
			// } 
			// if (from_mobile) {
			// 	alert('setVenderArticle: '+article)
			// }
			if (this.checkRegister(article) && this.check_stock(article)) {
				let article_to_add = {
					...article,
					article_variant_id: article.variant_id ? article.variant_id : 0,
				}
				if (this.user.ask_amount_in_vender) {
					article_to_add.amount = ''
				} else {
					article_to_add.amount = 1
				}
				this.$store.commit('vender/setArticle', article_to_add)
				let time = 200
				if (from_mobile) {
					time = 700
				}
				if (this.user.ask_amount_in_vender) {
					setTimeout(() => {
						document.getElementById('article-amount').focus()
					}, time)
				} else {
					this.addArticleToSale()
				}
			}
		},
		addArticleToSale(set_price = true) {
			if (!this.isRepeat(!set_price) && this.check_article_stock()) {
				this.addArticleAndSetTotal(set_price)
			}
		},
		check_article_stock() {
			let ok = true
			if (!this.guardar_como_presupuesto && this.hasExtencion('check_article_stock_en_vender')) {
				let cantidad_para_vender = this.article.amount
				if (cantidad_para_vender == '') {
					cantidad_para_vender = 1
				}

				if (this.article.stock && Number(this.article.stock) < Number(cantidad_para_vender)) {
					ok = false 
					console.log('stock:')
					console.log(Number(this.article.stock))
					
					console.log('cantidad_para_vender:')
					console.log(Number(cantidad_para_vender))
					this.$toast.error('Solo hay '+this.article.stock+' en stock')
				}

				// let store_article = this.$store.state.article.models.find(_article => {
				// 	return _article.id == this.article.id
				// })
				// if (typeof store_article != 'undefined') {
				// 	if (store_article.stock && Number(store_article.stock) < Number(cantidad_para_vender)) {
				// 		ok = false 
				// 		console.log('stock:')
				// 		console.log(Number(store_article.stock))
						
				// 		console.log('cantidad_para_vender:')
				// 		console.log(Number(cantidad_para_vender))
				// 		this.$toast.error('Solo hay '+store_article.stock+' en stock')
				// 	}
				// }
			}
			return ok
		},
		addArticleAndSetTotal(set_price) {
			if (this.article.amount == '') {
				this.article.amount = 1
			} 

			console.log('addArticleAndSetTotal article:')
			console.log(this.article)

			let item = {
				...this.article,
				is_article: true,
				price_type_personalizado_id: 0,
			}

			console.log('se va a agregar este item:')
			console.log(item)

			this.$store.commit('vender/addItem', item)
			if (this.index_previus_sales > 0) {
				this.setItemsPrices(true, false)
			} else if (set_price) {
				this.setItemsPrices(true)
			}
			this.setTotal()
			// this.$store.commit('vender/setTotal')
			console.log('Se agrego item')
			this.clearArticle()
		},
		checkRegister(article) {
			if (!article || typeof article == 'undefined') {
				if (this.can('vender.create_article')) {
					if (this.article.bar_code && this.getBarCode(this.article.bar_code) != '') {
						this.setNewArticle({name: '', bar_code: this.getBarCode(this.article.bar_code)})
					} else {
						console.log('se mostro modal')
						this.setNewArticle({name: this.article.name})
					}
					return false
				} else {
					this.$toast.error('Ese articulo no esta ingresado en el sistema')
					document.getElementById('article-bar-code').value = ''
					return false
				}
			}
			return true
		},
		check_stock(article) {
			if (!this.guardar_como_presupuesto && this.hasExtencion('check_article_stock_en_vender')) {
				if (article.stock === null || article.stock > 0) {
					return true 
				}
				this.$toast.error('Articulo sin stock, NO se agrego')
				return false 
			}
			return true 
		},
		setNewArticle(article) {
			this.$store.commit('vender/setNewArticle', article)
			this.$bvModal.show('new-article')
			setTimeout(() => {
				document.getElementById('new-article-price').focus()
			}, 500)
		},
		isRepeat(is_default_article) {
			console.log('isRepeat items:')
			console.log(this.items)
			let finded = this.items.find(item => {
				return item.id == this.article.id
			})
			if (typeof finded == 'undefined') {
				console.log('No esta repetido')
				return false
			} else if (finded.article_variants.length) {
				console.log('esta repetido pero tiene variantes')
				return false
			} else {
				console.log('Esta repetido')
				if (!is_default_article) {
					finded.amount = Number(finded.amount)
					let amount = this.article.amount
					if (amount == '') {
						amount = 1
					}
					finded.amount += Number(amount)
					this.$store.commit('vender/updateItem', finded)

					this.setTotal()
					// this.$store.commit('vender/setTotal')
					// this.clearArticle()
				}
				this.clearArticle()
				return true
			}
		},
		clearArticle() {
			this.$store.commit('vender/setArticle', null)

			this.limpiar_codigo()

			this.limpiar_nombre()

		},
		limpiar_codigo() {

			if (!this.hasExtencion('no_usar_codigos_de_barra')) {
				
				let bar_code = document.getElementById('article-bar-code')

				if (bar_code) {

					bar_code.value = ''
					bar_code.focus()
					console.log('Se limpio codigo')

				} else {
					console.log('No se limpio codigo')
					setTimeout(() => {
						console.log('Llamando denuevo')
						this.limpiar_codigo()
					}, 500)
				}
			}

		}, 
		limpiar_nombre() {

			let search_name = document.getElementById('search-article')

			if (search_name) {

				search_name.value = ''

				console.log('Se limpio nombre')

				if (this.hasExtencion('no_usar_codigos_de_barra')) {
					search_name.focus()
				}

			} else {
				console.log('No se limpio nombre')
				setTimeout(() => {
					console.log('Llamando denuevo')
					this.limpiar_nombre()
				}, 500)
			}

		}
	}
}