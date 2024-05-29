import clients from '@/mixins/clients'
import sale_ticket from '@/mixins/sale_ticket'
import afip_ticket from '@/mixins/afip_ticket'
export default {
	mixins: [clients, sale_ticket, afip_ticket],
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
		col_header_lg() {
			let col
			if (this.combos.length) {
				col = 2
			}
			col = 3
			if (!this.user.ask_amount_in_vender) {
				col += 1
			}
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
				this.$store.commit('vender/setTotal')
			},
		},
		surchages_in_services: {
			get() {
				return this.$store.state.vender.surchages_in_services
			}, 
			set(value) {
				this.$store.commit('vender/setSurchagesInServices', value)
				this.$store.commit('vender/setTotal')
			},
		},
		current_acount_payment_method_id: {
			get() {
				return this.$store.state.vender.current_acount_payment_method_id
			}, 
			set(value) {
				this.$store.commit('vender/setCurrentAcountPaymentMethodId', value)
			},
		},
		afip_information_id: {
			get() {
				return this.$store.state.vender.afip_information_id
			}, 
			set(value) {
				this.$store.commit('vender/setAfipInformationId', value)
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
				return item.is_article && item.addresses.length
			})
		},
		guardar_como_presupuesto() {
			return this.$store.state.vender.guardar_como_presupuesto
		},
	},
	data() {
		return {
			intentos_volver_a_llamar_default_articles: 0,
			interval: null,
		}
	},
	methods: {

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
				if (this.articles.length && !this.loading_articles) {
					console.log('entro a setear articulos por defecto')
					let articles = this.articles.filter(article => {
						return article.default_in_vender
					})
					articles.forEach(article => {
						let article_to_add = {
							...article,
							amount: '',
							price_vender: '',
						}
						if (!this.ya_esta_en_los_articulos_para_vender(article_to_add)) {
							console.log('agregando por defecto a vender: '+article_to_add.name)
							this.$store.commit('vender/setArticle', article_to_add)
							this.addArticleToSale(false)
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
					if (!item.default_in_vender) {
						item.price_vender = this.getPriceVender(item, from_pivot) 
					}
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
		vender(print_ticket = false) {
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
						document.getElementById('article-bar-code').focus()
					}
					
					this.limpiar_vender()


					this.setDefaultPaymentMethod()
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
					this.$toast.error('Error al guardar venta')
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
			this.$store.commit('vender/setDiscountsId', [])
			this.$store.commit('vender/setSurchagesId', [])
			this.$store.commit('vender/setClient', null)
			this.$store.commit('vender/setReturnedItems', [])
			this.$store.commit('vender/setSaveNotaCredito', 0)
			this.$store.commit('vender/setNotaCreditoDescription', '')
			this.$store.commit('vender/setTotal')
			this.$store.commit('vender/setObservations', '')
			this.$store.commit('vender/setGuardarComoPresupuesto', 0)
			this.$store.commit('vender/setBudget', null)
			this.$store.commit('vender/setPriceType', null)
			this.$store.commit('vender/setPriceType', null)
			this.$store.commit('vender/set_numero_orden_de_compra', '')
			this.$store.commit('vender/set_omitir_en_cuenta_corriente', 0)

			this.limpiar_descuentos()

			this.limpiar_recargos()
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
		setDefaultPaymentMethod() {
			if (this.owner.default_current_acount_payment_method_id) {
				this.$store.commit('vender/setCurrentAcountPaymentMethodId', this.owner.default_current_acount_payment_method_id)
			}
		},
		check_vender() {
			console.log('check antes de vender')
			console.log(this.hasExtencion('articles_default_in_vender'))
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
			return true 
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
				}
				if (this.user.ask_amount_in_vender) {
					article_to_add.amount = ''
				} else {
					article_to_add.amount = 1
				}
				this.$store.commit('vender/setArticle', article_to_add)
				let time = 500
				if (from_mobile) {
					time = 1000
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
				let store_article = this.$store.state.article.models.find(_article => {
					return _article.id == this.article.id
				})
				if (typeof store_article != 'undefined') {
					if (store_article.stock && Number(store_article.stock) < Number(cantidad_para_vender)) {
						ok = false 
						console.log('stock:')
						console.log(Number(store_article.stock))
						
						console.log('cantidad_para_vender:')
						console.log(Number(cantidad_para_vender))
						this.$toast.error('Solo hay '+store_article.stock+' en stock')
					}
				}
			}
			return ok
		},
		addArticleAndSetTotal(set_price) {
			if (this.article.amount == '') {
				this.article.amount = 1
			} 
			let item = {
				...this.article,
				is_article: true,
			}
			this.$store.commit('vender/addItem', item)
			if (this.index_previus_sales > 0) {
				this.setItemsPrices(true, false)
			} else if (set_price) {
				this.setItemsPrices(true)
			}
			this.$store.commit('vender/setTotal')
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
					this.$store.commit('vender/setTotal')
					// this.clearArticle()
				}
				this.clearArticle()
				return true
			}
		},
		clearArticle() {
			this.$store.commit('vender/setArticle', null)
			let bar_code = document.getElementById('article-bar-code')
			if (bar_code) {
				bar_code.focus()
				document.getElementById('search-article').value = ''
				console.log('Se limpio articulo')
			} else {
				console.log('No se limpio article')
				setTimeout(() => {
					console.log('Llamando denuevo')
					this.clearArticle()
				}, 500)
			}
		},
	}
}