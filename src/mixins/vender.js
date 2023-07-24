import clients from '@/mixins/clients'
import sale_ticket from '@/mixins/sale_ticket'
export default {
	mixins: [clients, sale_ticket],
	computed: {
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
				this.$cookies.set('address_id', value)
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
	},
	methods: {
		setItemsPrices(only_the_last = false, from_pivot = false) {
			if (only_the_last) {
				console.log('setenado precio el ultimo')
				let last_item = this.items[0] 
				last_item.price_vender = this.getPriceVender(last_item) 
			} else {
				console.log('seteando todos los precios. from_pivot: '+from_pivot)
				this.items.forEach(item => {
					item.price_vender = this.getPriceVender(item, from_pivot) 
				})
			}
		},
		callVender() {
			if (!this.is_provider) {
				this.vender()
			}
		},
		vender(print_ticket = false) {
			if (this.check()) {
				if ((!this.download_articles && !this.articles.length) || (this.is_mobile && !this.downloadOnMobile('article') && !this.articles.length)) {

				} else {
					this.$store.commit('article/removeStock', this.items)
				}
				this.$store.dispatch('vender/vender', {
					selected_address: this.selected_address
				})
				.then(() => {
					if (this.view == 'remito') {
						document.getElementById('article-bar-code').focus()
					}
					this.$store.commit('vender/previus_sales/setIndex', 0)
					this.$store.commit('vender/previus_sales/setPreviusSale', {})
					if (this.maked_sale.client_id) {
						this.loadModel('client', this.maked_sale.client_id)
					}
				})
			}
		},
		check() {
			if (!this.items.length) {
				this.$toast.error('Ingrese al menos un articulo o servicio')
				return false 
			}
			if (this.$store.state.sale_type.models.length && this.sale_type_id == 0) {
				this.$toast.error('Indique el tipo de venta')
				return false 
			} 
			if (this.afip_information_id && this.total >= 61500 && !this.client) {
				this.$toast.error('El total de la venta supera los $61.500, debera indicar un cliente que posea CUIL o CUIT para poder realizar la factura')
				return false
			}
			return true 
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
			if (this.checkRegister(article)) {
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
		addArticleToSale() {
			if (!this.isRepeat()) {
				this.addArticleAndSetTotal()
			} 
		},
		addArticleAndSetTotal() {
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
			} else {
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
		setNewArticle(article) {
			this.$store.commit('vender/setNewArticle', article)
			this.$bvModal.show('new-article')
			setTimeout(() => {
				document.getElementById('new-article-price').focus()
			}, 500)
		},
		isRepeat() {
			let finded = this.items.find(item => {
				return item.id == this.article.id
			})
			if (typeof finded == 'undefined') {
				console.log('No esta repetido')
				return false
			} else {
				console.log('Esta repetido')
				finded.amount = Number(finded.amount)
				let amount = this.article.amount
				if (amount == '') {
					amount = 1
				}
				finded.amount += Number(amount)
				this.$store.commit('vender/updateItem', finded)
				this.$store.commit('vender/setTotal')
				this.clearArticle()
				return true
			}
		},
		clearArticle() {
			this.$store.commit('vender/setArticle', null)
			document.getElementById('article-bar-code').focus()
			document.getElementById('search-article').value = ''
			console.log('Se limpio articulo')
		},
	}
}