import limpiar_item_vender from '@/mixins/vender/limpiar_item_vender'
import price_ranges from '@/mixins/vender/price_ranges'
import article_price_range from '@/mixins/vender/article_price_range'
import check_stock from '@/mixins/vender/check_stock'
import computed from '@/mixins/vender/computed'
import repetidos from '@/mixins/vender/repetidos'
import price_types from '@/mixins/vender/price_types'
import set_items_prices from '@/mixins/vender/set_items_prices'
export default {
	mixins: [
		limpiar_item_vender, 
		price_ranges,
		article_price_range, 
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

		/**
		 * Prepara un artículo/combo en cabecera y lo agrega o pide cantidad según configuración.
		 *
		 * @param {Object} item - Artículo o combo a vender
		 * @param {boolean} from_mobile - Ajusta tiempos de foco en dispositivos móviles
		 * @param {boolean} setear_amount - Si false, respeta la cantidad ya definida (p. ej. balanza PLU)
		 * @param {boolean} desde_buscador_nombre - Si true, espera el cierre del modal de búsqueda antes del foco
		 */
		set_item_vender(item, from_mobile = false, setear_amount = true, desde_buscador_nombre = false) {

			//  cuando busco por PLU, le paso setear_amount en FALSE para que use la cantidad que viene del api
			console.log('set_item_vender:')
			console.log(item)
			this.item_para_agregar = item  

			if (item.variant_id) {
				this.item_para_agregar.article_variant_id = item.variant_id
			} else {
				this.item_para_agregar.article_variant_id = 0  
			}

			if (this.check_stock_mayor_a_cero(this.item_para_agregar)) {

				if (setear_amount) {

					if (this.preguntar_cantidad) {
						this.item_para_agregar.amount = ''
					} else {
						this.item_para_agregar.amount = 1
					}
				}


				this.$store.commit('vender/setItem', this.item_para_agregar)


				if (this.preguntar_cantidad && setear_amount) {
					this.foco_input_amount(from_mobile, desde_buscador_nombre)
				} else {
					this.add_item_vender()
				}
			}
		},
		add_item_vender() {

			this.check_amount_vacia()

			if (this.ya_esta_en_la_venta()) {

				if (this.personalizar_price_en_vender()) {
					return
				}

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
				article_variant_id: this.item_vender.is_variant ? this.item_vender.variant_id : 0 
			}

			item = this.check_price_type_ranges(item)
			
			item = this.check_price_range(item)

			this.$store.commit('vender/addItem', item)

			if (this.index_previus_sales > 0) {
				this.setItemsPrices(true, false)
			} else {
				this.setItemsPrices(true)
			}

			
			this.limpiar_item()

			this.check_foco_to_precio_personalizado(item)
		},


		check_foco_to_precio_personalizado(item) {
			console.log('check_foco_to_precio_personalizado: ')
			console.log(item)
			if (item.personalizar_price_en_vender) {
				setTimeout(() => {

					document.getElementById('price-vender-'+item.id).focus()
				}, 500)
			}
		},
		

		/**
		 * Enfoca el input de cantidad tras seleccionar un artículo con ask_amount_in_vender.
		 *
		 * @param {boolean} from_mobile - Mayor demora en móvil
		 * @param {boolean} desde_buscador_nombre - Mayor demora tras cerrar modal de búsqueda por nombre
		 * @param {number} intento - Reintentos internos si el foco no se aplicó
		 */
		foco_input_amount(from_mobile = false, desde_buscador_nombre = false, intento = 0) {

			let time = 400

			if (from_mobile) {
				time = 700
			}

			// El modal de búsqueda restaura foco ~500 ms después de cerrarse
			if (desde_buscador_nombre) {
				time = 650
			}

			const input = document.getElementById('article-amount')

			if (!input) {
				if (intento < 5) {
					setTimeout(() => {
						this.foco_input_amount(from_mobile, desde_buscador_nombre, intento + 1)
					}, 200)
				}
				return
			}

			setTimeout(() => {
				input.value = ''
			}, 5)

			setTimeout(() => {
				input.focus()

				if (typeof input.select === 'function') {
					input.select()
				}

				this.check_focus(input, from_mobile, desde_buscador_nombre, intento)
			}, time)
		},

		/**
		 * Reintenta el foco en cantidad si otro control (p. ej. modal de búsqueda) lo interceptó.
		 *
		 * @param {HTMLElement} input - Input #article-amount
		 * @param {boolean} from_mobile
		 * @param {boolean} desde_buscador_nombre
		 * @param {number} intento
		 */
		check_focus(input, from_mobile = false, desde_buscador_nombre = false, intento = 0) {

			if (document.activeElement !== input && intento < 3) {
				console.log('NO se hizo foco, volviendo a llamar')
				this.foco_input_amount(from_mobile, desde_buscador_nombre, intento + 1)
			}
		}
	}
}