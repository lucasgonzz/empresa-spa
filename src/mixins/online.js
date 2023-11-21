export default {
	computed: {
		buyers() {
			return this.$store.state.buyer.models
		},
		selected_buyer() {
			return this.$store.state.message.selected_buyer
		},
	},
	methods: {
		setMessagesRead(_buyer = null) {
			if (!_buyer) {
				_buyer = this.selected_buyer
			}
			let buyer = this.buyers.find(model => {
				return model.id == _buyer.id
			})
			buyer.messages.forEach(message => {
				if (message.from_buyer && !message.read) {
					message.read = 1
				}
			})
			this.$store.commit('buyer/add', buyer)
			this.$store.dispatch('message/setMessagesRead')
		},
		addBuyerMessage(message) {
			let buyer = this.buyers.find(b => {
				return b.id == message.buyer_id
			})
			if (typeof buyer != 'undefined') {
				buyer.messages.push(message)
				this.$store.commit('buyer/add', buyer)
			}
		},
		hasPaymentUpdated(order) {
			if (order.payment) {
				return order.payment.updated
			}
			return false
		},
		getImagesFromSelectedColor(article) {
			return article.images.filter(image => {
				return image.color_id == article.color.id
			})
		},
		showMap(address) {
			let location = {
				lat: Number(address.lat),
				lng: Number(address.lng),
			}
			this.$store.commit('map/setLocation', location)
			this.$store.commit('map/setTitle', this.getAddress(address))
			this.$bvModal.show('map-address')
			console.log('se mostro mapa')
		},
		hasArticle(message) {
			return message.article
		},
		getAddress(address) {
			if (address) {
				return address.street + ' ' + address.street_number 
			}
		},
		sendMessage(buyer) {
			this.$router.push({name: 'Online', params: {view: 'mensajes', chat_id: buyer.id}})
			this.$store.commit('message/setSelectedBuyer', buyer)
			this.$bvModal.hide('order-details')
		},
		messagesNotRead(buyer) {
			let messages_not_read = 0
			buyer.messages.forEach(message => {
				if (message.from_buyer && !message.read) {
					messages_not_read++
				} 
			})
			return messages_not_read
		},
		total(order, with_cupon = true, with_delivery_zone = true) {
			if (order.articles) {
				let total = 0
				order.articles.forEach(article => {
					total += this.articlePrice(article, true, false) * article.pivot.amount 
				})
				if (with_cupon) {
					total = this.discountCupon(order, total)
				}
				if (with_delivery_zone) {
					if (order.delivery_zone) {
						total += Number(order.delivery_zone.price)
					}
				}
				return total 
			}
			return null
		},
		discountCupon(order, total) {
			if (order.cupon) {
				if (order.cupon.amount) {
					total -= order.cupon.amount
				} else {
					total -= total * order.cupon.percentage / 100
				}
			}
			return total
		},
		totalArticles(order) {
			if (order.articles) {
				let total = 0
				order.articles.forEach(article => {
					total += article.pivot.amount 
				})
				return total
			}
			return null
		},
		buyerName(order) {
			if (order.buyer) {
				return `${order.buyer.name} ${order.buyer.surname}`
			}
			return null
		},
		articleName(article) {
			if (article.pivot.variant_id) {
				return article.name + ' ' + this.getVariant(article).description
			}
			return article.name
		},
	}
}