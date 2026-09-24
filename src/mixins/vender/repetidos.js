import computed from '@/mixins/vender/computed'
import vender_set_total from '@/mixins/vender_set_total'
import deteccion_combos from '@/mixins/vender/deteccion_combos'
export default {
	mixins: [computed, vender_set_total, deteccion_combos],
	methods: {
		personalizar_price_en_vender() {

			let finded = this.get_item_repetido()

			if (finded.personalizar_price_en_vender) {

				setTimeout(() => {
					document.getElementById('price-vender-'+finded.id).focus()
				}, 300)
				return true
			}

		},
		ya_esta_en_la_venta() {

			let finded = this.get_item_repetido()

			if (typeof finded == 'undefined') {
				console.log('No esta repetido')
				return false

			} else if (finded.article_variant_id) {
				console.log('esta repetido pero tiene variantes')
				return false
			} else {
				return true
			}
		},
		get_item_repetido() {
			return this.items.find(item => {
				if (
					item.is_article && this.item_vender.is_article
					&& item.id == this.item_vender.id
				) {
					return true
				}
				if (
					item.is_combo && this.item_vender.is_combo
					&& item.id == this.item_vender.id
				) {
					return true
				}
				return false
			})
		},
		actualizar_cantidad() {

			console.log('actualizar_cantidad')

			// if (!is_default_article) {

				let repetido = this.get_item_repetido()

				repetido.amount = Number(repetido.amount)
				
				let amount = this.item_vender.amount

				if (amount == '') {
					amount = 1
				}

				repetido.amount += Number(amount)
				
				if (this.check_stock_disponible(repetido)) {

					repetido = this.check_price_type_ranges(repetido)
					
					repetido = this.check_price_range(repetido)

					/*
						Aca NO va el aviso de ofertas por cantidad, a proposito. Este es el camino
						del articulo que YA ESTA en el remito y al que se le suma cantidad: el
						vendedor ya vio el cartel cuando lo agrego por primera vez, y un comercio
						que pasa diez unidades de a una por el lector se comeria diez toasts
						seguidos. Si algun dia se quiere avisar justo cuando la cantidad CRUZA un
						tramo, hay que comparar el tramo de antes contra el de despues, no
						anunciar las ofertas de nuevo.
					*/
					this.$store.commit('vender/updateItem', repetido)

					/*
						Segundo punto donde cambia la cantidad de algo en el remito: el vendedor
						volvio a pasar un articulo que ya estaba y se le sumo cantidad. Es
						exactamente el caso del ejemplo de Lucas -- carga la tercera mecha y recien
						ahi alcanza para el combo.
					*/
					this.programar_deteccion_de_combos()

					this.setTotal()
					this.limpiar_item()
				}


			// }
		},
	}
}