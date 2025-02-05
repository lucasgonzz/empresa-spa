import computed from '@/mixins/vender/computed'
import vender_set_total from '@/mixins/vender_set_total'
export default {
	mixins: [computed, vender_set_total],
	methods: {

		ya_esta_en_la_venta() {

			let finded = this.get_item_repetido()

			if (typeof finded == 'undefined') {
				console.log('No esta repetido')
				return false

			} else if (finded.article_variants.length) {
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

					this.$store.commit('vender/updateItem', repetido)

					this.setTotal()
					this.limpiar_item()
				}


			// }
		},
	}
}