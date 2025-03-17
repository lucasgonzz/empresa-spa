import limpiar_item_vender from '@/mixins/vender/limpiar_item_vender'
import price_ranges from '@/mixins/vender/price_ranges'
import check_stock from '@/mixins/vender/check_stock'
import computed from '@/mixins/vender/computed'
import repetidos from '@/mixins/vender/repetidos'
import price_types from '@/mixins/vender/price_types'
import set_items_prices from '@/mixins/vender/set_items_prices'
export default {
	mixins: [
		limpiar_item_vender, 
		price_ranges, 
		check_stock, 
		computed, 
		repetidos, 
		price_types,
		set_items_prices,
	],
	data() {
		return {
			item_para_agregar: null,
		}
	},
	methods: {

		/*
			1- Chequeo que tenga stock
			2- Seteo store/vender/item
			3- Seteo o pregunto la cantidad
			4- Agrego a store/vender/items
			5- Chequeo si esta repetio, si lo esta actualizo la cantidad
			6- Chequeo que haya sifuciente stock para lo que se quiere vender
		*/

		set_item_vender(item, from_mobile = false) {

			console.log('set_item_vender:')
			console.log(item)
			this.item_para_agregar = item  

			if (item.variant_id) {
				this.item_para_agregar.article_variant_id = item.variant_id
			} else {
				this.item_para_agregar.article_variant_id = 0  
			}

			if (this.check_stock_mayor_a_cero(this.item_para_agregar)) {

				if (this.preguntar_cantidad) {
					this.item_para_agregar.amount = ''
				} else {
					this.item_para_agregar.amount = 1
				}


				this.$store.commit('vender/setItem', this.item_para_agregar)


				if (this.preguntar_cantidad) {
					this.foco_input_amount(from_mobile)
				} else {
					this.add_item_vender()
				}
			}
		},
		add_item_vender() {

			this.check_amount_vacia()

			if (this.ya_esta_en_la_venta()) {

				this.actualizar_cantidad()

				return
			} 

			if (this.check_stock_disponible(this.item_vender)) {
				
				this.add_item_to_sale()

				this.setTotal()
			}
		},


		check_amount_vacia() {
			console.log('check_amount_vacia. amount:')
			console.log(this.item_vender.amount)
			if (this.item_vender.amount == '') {

				let valor_input = document.getElementById('article-amount').value 

				if (valor_input == '') {

					this.item_vender.amount = 1
				} else {

					this.item_vender.amount = valor_input
				}
			}
		},


		add_item_to_sale() {

			console.log('add_item_to_sale. amount:')
			console.log(this.item_vender.amount)


			// if (this.item_vender.amount == '') {
			// 	this.item_vender.amount = 1
			// } 

			let item = {
				...this.item_vender,
				price_type_personalizado_id: 0,
			}

			item = this.check_price_type_ranges(item)

			this.$store.commit('vender/addItem', item)

			if (this.index_previus_sales > 0) {
				this.setItemsPrices(true, false)
			} else {
				this.setItemsPrices(true)
			}

			
			this.limpiar_item()
		},

		foco_input_amount(from_mobile) {

			let time = 200

			if (from_mobile) {
				time = 700
			}

			let input = document.getElementById('article-amount')

			setTimeout(() => {
				input.value = ''
			}, 5)

			setTimeout(() => {
				input.focus()

				this.check_focus(input)
			}, time)
		},

		check_focus(input) {

            if (!document.activeElement === input) {
            	console.log('NO se hizo foco, volviendo a llamar')
            	this.foco_input_amount(false)
            } 
		}
	}
}