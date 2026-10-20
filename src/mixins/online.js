/*
	Mixin de Tienda Online. Hasta la mision mensajes-tienda-online (28/9/2026) tambien tenia el
	manejo de los mensajes del modulo viejo (buyers, selected_buyer, setMessagesRead,
	addBuyerMessage, messagesNotRead, sendMessage, hasArticle): se sacaron porque el submodulo
	nuevo de Mensajes tiene su propio store (store/tienda_mensajes.js) y el modulo viejo se borro.
*/
import { precio_de_forma_propia } from '@/utils/formas_de_envio'

export default {
	methods: {
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
		getAddress(address) {
			if (address) {
				return address.street + ' ' + address.street_number 
			}
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
					// Una forma de envío propia con el costo a convenir aporta 0: no se cobró en
					// la tienda (misión formas-envio-direcciones-maps, ver utils/formas_de_envio.js).
					total += precio_de_forma_propia(order.delivery_zone)
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