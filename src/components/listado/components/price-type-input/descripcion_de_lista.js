/**
 * Boton "?" de la tarjeta de una lista de precio del modal del articulo: pide el desglose del
 * precio de ESA lista y lo muestra en el modal que ya usa el precio final unico
 * (modal-props/FinalPrice.vue): mismo mutation, mismo modal.
 *
 * Lo comparten las dos formas de la tarjeta:
 *   - ContPriceType.vue (cuenta sin `ventas_en_dolares`): un precio por lista;
 *   - PriceTypeMonedas.vue (cuenta con `ventas_en_dolares`): un precio por lista Y por moneda,
 *     asi que el pedido lleva ademas la moneda.
 *
 * El pedido va a `article/price-type-description/{articulo}/{lista}` y, con moneda, le suma
 * `?moneda_id=`: parametro opcional del back, que sin el contesta lo de siempre.
 */
export default {
	methods: {
		/**
		 * Pide el desglose del precio de una lista (y moneda) y lo muestra en el modal.
		 *
		 * 🔴 El modal se abre ANTES de disparar el pedido, no en el .then(). Importa mas que en el
		 * precio final unico: el modal del articulo dibuja una tarjeta por lista (y una moneda por
		 * tarjeta), asi que hay varios "?" a la vista y tocar dos seguidos es lo normal. De ahi el
		 * contador de pedido, que evita que la respuesta del primero pise el desglose del segundo
		 * o le apague el spinner.
		 *
		 * @param {Number} price_type_id Id de la lista de precio.
		 * @param {Number|null} moneda_id Id de la moneda (solo con `ventas_en_dolares`).
		 */
		info_de_lista(price_type_id, moneda_id = null) {
			let self = this
			let article = this.$store.state.article.model
			let mi_pedido = this.$store.state.article.final_price_description_pedido + 1

			// Se limpia lo anterior: sin esto se ve un instante el desglose de la lista que se miro
			// antes, que es peor que no ver nada.
			this.$store.commit('article/set_final_price_description', [])
			this.$store.commit('article/set_final_price_detalle', [])
			this.$store.commit('article/set_final_price_description_error', null)
			this.$store.commit('article/set_final_price_description_cargando', true)
			this.$store.commit('article/set_final_price_description_pedido', mi_pedido)

			this.$bvModal.show('final-price-description')

			let url = 'article/price-type-description/'+article.id+'/'+price_type_id

			if (moneda_id) {
				url += '?moneda_id='+moneda_id
			}

			this.$api.get(url)
			.then(res => {
				// Llego una respuesta vieja: ya hay otro pedido en vuelo y este no toca nada.
				if (self.$store.state.article.final_price_description_pedido !== mi_pedido) {
					return
				}

				// Array.isArray y no un truthy pelado: si la respuesta trae algo que no es un array
				// (pasa cuando el back no tiene nada que calcular), un objeto es truthy y terminaria
				// guardado en un state declarado como Array, con warning de Vue y el modal vacio.
				self.$store.commit('article/set_final_price_detalle', Array.isArray(res.data.detalle) ? res.data.detalle : [])
				self.$store.commit('article/set_final_price_description', res.data.description)
				self.$store.commit('article/set_final_price_description_cargando', false)
			})
			.catch(err => {
				console.log(err)

				if (self.$store.state.article.final_price_description_pedido !== mi_pedido) {
					return
				}

				// Mismo motivo que en modal-props/FinalPrice.vue: el interceptor global ya avisa, y
				// el mensaje que importa es el que queda adentro del modal abierto.
				self.$store.commit('article/set_final_price_description_error', 'No se pudo obtener el calculo del precio')
				self.$store.commit('article/set_final_price_description_cargando', false)
			})
		},
	},
}
